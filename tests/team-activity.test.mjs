import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {teamFixture} from './helpers/team-fixture.mjs';
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
test('notifications survive retries/restart, honor preferences, and disappear after access revocation',async()=>{
 const f=await teamFixture();try{
  const {owner:a,designer:b,reviewer:c,viewer:v,path,query}=f;
  const id=ok(await a.call('/api/documents'+query,{version:1,name:'Review fixture',shapes:[]}),201).id;
  const policy=ok(await a.call(path(id,'/sharing')));
  ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{[c.user.id]:'commenter',[v.user.id]:'viewer'}},{method:'PUT',revision:policy.revision}));
  const comment={id:randomUUID(),body:`Please check @[${c.user.name}](${c.user.id})`,anchor:{page:1}};
  ok(await a.call(path(id,'/comments'),comment),201);ok(await a.call(path(id,'/comments'),comment));
  let inbox=ok(await c.call('/api/notifications'));assert.equal(inbox.notifications.length,1);assert.equal(inbox.notifications[0].kind,'mention');
  assert.equal(ok(await b.call('/api/notifications')).notifications.length,0);
  ok(await b.call('/api/notifications/preferences',{mode:'all',email:false},{method:'PUT'}));assert.equal(ok(await b.call('/api/notifications')).notifications.length,1);
  ok(await c.call('/api/notifications',{ids:[inbox.notifications[0].id],read:true},{method:'PATCH'}));assert.equal(ok(await c.call('/api/notifications?unread=1')).notifications.length,0);
  await f.restart();assert.equal(ok(await c.call('/api/notifications')).notifications[0].read,true);
  const review={id:randomUUID(),reviewerId:c.user.id,documentRevision:1,note:'Review spacing'};
  ok(await a.call(path(id,'/reviews'),review));ok(await a.call(path(id,'/reviews'),review));assert.equal(ok(await c.call('/api/notifications?unread=1')).notifications.length,1);
  assert.equal((await v.call(path(id,'/reviews'),{id:review.id,status:'approved'},{method:'PATCH',revision:1})).status,403);
  ok(await c.call(path(id,'/reviews'),{id:review.id,status:'approved'},{method:'PATCH',revision:1}));
  assert.equal(ok(await a.call('/api/notifications')).notifications.find(n=>n.kind==='review_approved').documentId,id);
  const edit=ok(await a.call(path(id,'/editing'),{action:'acquire'}));
  ok(await a.call(path(id),{version:1,name:'Changed after review',shapes:[]},{method:'PUT',revision:1,token:edit.lease.token}));
  assert.equal(ok(await a.call(path(id,'/reviews'))).reviews[0].stale,true);
  assert.equal((await c.call(path(id,'/reviews'),{id:review.id,status:'approved'},{method:'PATCH',revision:2})).status,409);
  let sharing=ok(await a.call(path(id,'/sharing')));ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{[c.user.id]:'none'}},{method:'PUT',revision:sharing.revision}));
  assert.equal(ok(await c.call('/api/notifications')).notifications.length,0);
  assert.equal((await c.call(path(id,'/reviews'))).status,403);
  ok(await b.call('/api/notifications/preferences',{mode:'none',email:false},{method:'PUT'}));assert.equal(ok(await b.call('/api/notifications')).notifications.length,0);
 }finally{await f.close();}
});
