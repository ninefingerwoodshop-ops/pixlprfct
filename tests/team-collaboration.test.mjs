import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {teamFixture} from './helpers/team-fixture.mjs';
const document={version:1,name:'Simulated team project',shapes:[]};
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};

test('simulated teammates enforce roles, editing ownership, handoff, revisions, revocation and restart',async()=>{
 const f=await teamFixture();try{
  const {owner:a,designer:b,reviewer:c,viewer:v,outsider:x,path,query}=f;
  const file=ok(await a.call('/api/documents'+query,document),201),id=file.id;
  let sharing=ok(await a.call(path(id,'/sharing')));
  const overrides={[c.user.id]:'commenter',[v.user.id]:'viewer'};
  sharing=ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides},{method:'PUT',revision:sharing.revision}));
  assert.equal((await v.call(path(id))).status,200);assert.equal((await x.call(path(id))).status,403);
  assert.equal((await c.call(path(id),document,{method:'PUT',revision:1})).status,403);
  assert.equal((await v.call(path(id,'/editing'),{action:'acquire'})).status,403);
  assert.equal((await b.call(path(id),document,{method:'PUT',revision:1})).status,423);
  let edit=ok(await a.call(path(id,'/editing'),{action:'acquire'})),token=edit.lease.token;
  assert.equal((await b.call(path(id,'/editing'),{action:'acquire'})).status,423);
  const observed=ok(await b.call(path(id,'/editing')));assert.equal(observed.lease.name,'Simulated Owner');assert.equal(observed.lease.token,undefined);
  assert.equal((await b.call(path(id),document,{method:'PUT',revision:1,token})).status,423);
  ok(await a.call(path(id),{...document,name:'Saved by owner'},{method:'PUT',revision:1,token}));
  ok(await b.call(path(id,'/editing'),{action:'request'}));edit=ok(await a.call(path(id,'/editing')));assert.equal(edit.requests.length,1);
  ok(await a.call(path(id,'/editing'),{action:'handoff',requestId:edit.requests[0].id},{token}));
  assert.equal((await a.call(path(id),document,{method:'PUT',revision:2,token})).status,423);
  edit=ok(await b.call(path(id,'/editing')));token=edit.lease.token;assert(edit.lease.mine);
  assert.equal((await b.call(path(id),document,{method:'PUT',revision:1,token})).status,409);
  ok(await b.call(path(id),{...document,name:'Saved by designer'},{method:'PUT',revision:2,token}));
  f.restart();assert.equal(ok(await b.call(path(id,'/editing'))).lease.token,token);
  ok(await b.call(path(id,'/editing'),{action:'renew'},{token}));
  sharing=ok(await a.call(path(id,'/sharing')));ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{...overrides,[b.user.id]:'none'}},{method:'PUT',revision:sharing.revision}));
  assert.equal((await b.call(path(id),document,{method:'PUT',revision:3,token})).status,403);assert.equal((await b.call(path(id,'/editing'))).status,403);assert.equal((await b.call('/api/documents'+query)).data.documents.length,0);
  assert.equal(ok(await a.call(path(id))).name,'Saved by designer');
 }finally{await f.close();}
});

test('reviewers create attributed idempotent threads without a design lease; viewers and outsiders cannot write',async()=>{
 const f=await teamFixture();try{
  const {owner:a,reviewer:c,viewer:v,outsider:x,path,query}=f,id=ok(await a.call('/api/documents'+query,document),201).id;
  const sharing=ok(await a.call(path(id,'/sharing')));ok(await a.call(path(id,'/sharing'),{defaultRole:'viewer',overrides:{[c.user.id]:'commenter'}},{method:'PUT',revision:sharing.revision}));
  const comment={id:randomUUID(),body:'Please check this spacing.',anchor:{page:1}};
  ok(await c.call(path(id,'/comments'),comment),201);ok(await c.call(path(id,'/comments'),comment));
  const reply={id:randomUUID(),threadId:comment.id,body:'Updated in the next edit.'};ok(await a.call(path(id,'/comments'),reply),201);
  const list=ok(await v.call(path(id,'/comments')));assert.equal(list.comments.length,2);assert.equal(list.comments.find(c=>c.id===comment.id).author_name,'Simulated Reviewer');
  assert.equal((await v.call(path(id,'/comments'),{id:randomUUID(),body:'Tamper'})).status,403);assert.equal((await x.call(path(id,'/comments'))).status,403);
  ok(await c.call(path(id,'/comments'),{id:comment.id,resolved:true},{method:'PATCH',revision:1}));assert.equal((await c.call(path(id,'/comments'),{id:comment.id,resolved:false},{method:'PATCH',revision:1})).status,409);
  assert.equal(ok(await a.call(path(id))).revision,1);assert.equal(ok(await a.call(path(id,'/comments'))).comments.find(c=>c.id===comment.id).resolved,true);
 }finally{await f.close();}
});

test('expired and revoked leases cannot renew or write, while a new editor can acquire',async()=>{
 const f=await teamFixture();try{
  const {owner:a,designer:b,path,query}=f,id=ok(await a.call('/api/documents'+query,document),201).id;
  const first=ok(await a.call(path(id,'/editing'),{action:'acquire'}));
  await f.db.query('UPDATE document_collaboration SET lease_expires=0 WHERE document_id=?',[id],'run');
  assert.equal((await a.call(path(id,'/editing'),{action:'renew'},{token:first.lease.token})).status,423);
  const second=ok(await b.call(path(id,'/editing'),{action:'acquire'}));assert.notEqual(first.lease.token,second.lease.token);
  assert.equal((await a.call(path(id),document,{method:'PUT',revision:1,token:first.lease.token})).status,423);
  ok(await b.call(path(id),document,{method:'PUT',revision:1,token:second.lease.token}));
  const org=await a.call('/api/auth/organization/remove-member',{organizationId:f.org.id,memberIdOrEmail:b.user.email});ok(org);
  assert.equal((await b.call(path(id),document,{method:'PUT',revision:2,token:second.lease.token})).status,403);
  assert(ok(await a.call(path(id,'/editing'),{action:'acquire'})).lease.mine);
 }finally{await f.close();}
});

test('commit-time fencing rejects a slow upload after handoff or membership removal',async()=>{
 const f=await teamFixture();try{
  const {owner:a,designer:b,path,query}=f,id=ok(await a.call('/api/documents'+query,document),201).id;
  for(const reason of ['handoff','expiry','revoked']){
   const revoke=reason==='revoked';
   const lease=ok(await b.call(path(id,'/editing'),{action:'acquire'}));
   // Pause a >1.5 MB upload at immutable-body persistence, after access checks.
   const original=f.db.query;let release,arrived;
   const barrier=new Promise(r=>release=r),ready=new Promise(r=>arrived=r);
   f.db.query=async(sql,...args)=>{if(sql.includes('INTO document_bodies')){arrived();await barrier;}return original(sql,...args);};
   const pending=b.call(path(id),{...document,name:revoke?'Revoked upload':'Stale upload',padding:'x'.repeat(1_600_000)},{method:'PUT',revision:1,token:lease.lease.token});
   await ready;
   if(revoke)ok(await a.call('/api/auth/organization/remove-member',{organizationId:f.org.id,memberIdOrEmail:b.user.email}));
   else if(reason==='expiry')await f.db.query('UPDATE document_collaboration SET lease_expires=0 WHERE document_id=?',[id],'run');
   else{ok(await a.call(path(id,'/editing'),{action:'request'}));const state=ok(await b.call(path(id,'/editing')));ok(await b.call(path(id,'/editing'),{action:'handoff',requestId:state.requests[0].id},{token:lease.lease.token}));}
   release();assert.equal((await pending).status,409);f.db.query=original;assert.equal(ok(await a.call(path(id))).name,document.name);
   if(reason==='handoff'){const state=ok(await a.call(path(id,'/editing')));ok(await a.call(path(id,'/editing'),{action:'release'},{token:state.lease.token}));}
  }
 }finally{await f.close();}
});
