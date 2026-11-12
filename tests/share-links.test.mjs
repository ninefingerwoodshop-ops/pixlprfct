import test from 'node:test';
import assert from 'node:assert/strict';
import {teamFixture} from './helpers/team-fixture.mjs';
import {guestRoute} from '../server/share-links.mjs';
const document={version:1,name:'Shared by link',shapes:[]};
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
const tokenOf=url=>new URL(url).searchParams.get('join');

test('a share link lets a signed-in outsider view one file and nothing else',async()=>{
 const f=await teamFixture();try{
  const {owner:a,designer:b,outsider:x,path,query,config}=f,id=ok(await a.call('/api/documents'+query,document),201).id,other=ok(await a.call('/api/documents'+query,{...document,name:'Private'}),201).id;
  // Off by default. Only a manager turns it on; any member can read and copy it.
  assert.deepEqual(ok(await a.call(path(id,'/link'))),{enabled:false,url:null,manage:true,guests:[]});
  assert.equal((await b.call(path(id,'/link'),{action:'create'})).status,403);assert.equal((await x.call(path(id,'/link'))).status,403);
  const link=ok(await a.call(path(id,'/link'),{action:'create'}));assert.ok(link.enabled);assert.ok(link.url.startsWith(config.baseURL+'/editor/account.html?join='));
  const token=tokenOf(link.url);assert.match(token,/^[A-Za-z0-9_-]{43}$/);
  assert.equal(ok(await a.call(path(id,'/link'),{action:'create'})).url,link.url);assert.deepEqual(ok(await b.call(path(id,'/link'))),{enabled:true,url:link.url,manage:false,guests:[]});
  // Before redeeming, the outsider has nothing. A wrong or malformed token is refused the same way.
  assert.equal((await x.call(path(id))).status,403);
  for(const bad of ['nope',token.slice(0,-1)+(token.endsWith('A')?'B':'A'),'',null])assert.equal((await x.call('/api/share-links/redeem',{token:bad})).status,404);
  assert.equal((await f.client().call('/api/share-links/redeem',{token})).status,401);
  assert.deepEqual(ok(await x.call('/api/share-links/redeem',{token})),{id,workspace:'org:'+f.org.id,name:'Shared by link',role:'viewer'});
  ok(await x.call('/api/share-links/redeem',{token}));
  // The file opens read-only, with its editing state, comments and presence.
  const opened=ok(await x.call(path(id)));assert.deepEqual([opened.name,opened.role,opened.can_edit],['Shared by link','viewer',false]);
  const state=ok(await x.call(path(id,'/editing')));assert.deepEqual([state.guest,state.role,state.canEdit,state.canComment,state.manage,'members' in state],[true,'viewer',false,false,false,false]);
  ok(await x.call(path(id,'/comments')));assert.deepEqual(ok(await x.call(path(id,'/presence'),{})).presence.map(p=>p.name),['Simulated Outsider']);
  assert.deepEqual(ok(await a.call(path(id,'/link'))).guests.map(g=>g.name),['Simulated Outsider']);assert.deepEqual(ok(await b.call(path(id,'/link'))).guests,[]);
  // Nothing else in the workspace answers, whatever the workspace default role is.
  const refused=[[path(id),{...document,name:'Hacked'},{method:'PUT',revision:1}],[path(id),undefined,{method:'DELETE'}],[path(id,'/editing'),{action:'acquire'}],[path(id,'/comments'),{id:crypto.randomUUID(),body:'hi'}],
   [path(id,'/sharing')],[path(id,'/members')],[path(id,'/link')],[path(id,'/link'),{action:'replace'}],[path(id,'/live'),{since:1}],[path(id,'/reviews')],[path(id,'/versions')],
   [path(other)],[path(other,'/presence'),{}],[path(other,'/editing')],['/api/documents'+query],['/api/documents'+query,document],['/api/libraries'+query],['/api/onboarding'+query],['/api/teams/'+crypto.randomUUID()+'/members']];
  for(const [url,body,options] of refused){const r=await x.call(url,body,options);assert.ok([403,404].includes(r.status)&&r.status!==200,`${options?.method??(body?'POST':'GET')} ${url} → ${r.status}`);}
  assert.equal(ok(await a.call(path(id))).name,'Shared by link');assert.deepEqual(ok(await x.call('/api/workspaces')).organizations,[]);
  // A member who redeems keeps their own role and is not listed as a guest; a member blocked from the file stays blocked.
  assert.equal(ok(await b.call('/api/share-links/redeem',{token})).role,'member');assert.equal(ok(await a.call(path(id,'/link'))).guests.length,1);
  let sharing=ok(await a.call(path(id,'/sharing')));ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{[b.user.id]:'none'}},{method:'PUT',revision:sharing.revision}));
  assert.equal((await b.call('/api/share-links/redeem',{token})).status,403);assert.equal((await b.call(path(id))).status,403);
  // Removing one guest, replacing the link and turning it off each end access at once.
  ok(await a.call(path(id,'/link'),{action:'remove',userId:x.user.id}));assert.equal((await x.call(path(id))).status,403);
  ok(await x.call('/api/share-links/redeem',{token}));ok(await x.call(path(id)));
  const replaced=ok(await a.call(path(id,'/link'),{action:'replace'}));assert.notEqual(replaced.url,link.url);assert.deepEqual(replaced.guests,[]);
  assert.equal((await x.call(path(id))).status,403);assert.equal((await x.call('/api/share-links/redeem',{token})).status,404);
  ok(await x.call('/api/share-links/redeem',{token:tokenOf(replaced.url)}));ok(await x.call(path(id)));
  assert.deepEqual(ok(await a.call(path(id,'/link'),{action:'disable'})),{enabled:false,url:null,manage:true,guests:[]});
  assert.equal((await x.call(path(id))).status,403);assert.equal((await x.call('/api/share-links/redeem',{token:tokenOf(replaced.url)})).status,404);
  assert.equal((await a.call(path(id,'/link'),{action:'explode'})).status,400);assert.equal((await a.call(path(id,'/link'),undefined,{method:'DELETE'})).status,405);
  // A file in Trash cannot be joined, and deleting it for good removes the link and its guests.
  const again=tokenOf(ok(await a.call(path(id,'/link'),{action:'create'})).url);ok(await x.call('/api/share-links/redeem',{token:again}));ok(await a.call(path(id,'/link'),{action:'remove',userId:x.user.id}));
  ok(await x.call('/api/share-links/redeem',{token:again}));
  const revision=ok(await a.call(path(id))).revision;ok(await a.call(path(id),undefined,{method:'DELETE',revision}));
  ok(await a.call(path(id,'/link'),{action:'remove',userId:x.user.id}));assert.equal((await x.call('/api/share-links/redeem',{token:again})).status,404);
  assert.equal((await a.call(path(id,'/link'),{action:'replace'})).status,409);
  assert.equal((await f.db.query('SELECT COUNT(*) AS n FROM document_links WHERE document_id=?',[id]))[0].n,1);
  const gone=await a.call(path(id)+'&permanent=1',undefined,{method:'DELETE',revision:ok(await a.call(path(id))).revision});assert.ok([200,204].includes(gone.status),JSON.stringify(gone));
  for(const table of ['document_links','document_guests'])assert.equal((await f.db.query(`SELECT COUNT(*) AS n FROM ${table} WHERE document_id=?`,[id]))[0].n,0,table);
 }finally{await f.close();}
});
test('the guest route list is exact',()=>{
 const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',docs=[id];
 for(const [method,suffix] of [['GET',''],['GET','/editing'],['GET','/comments'],['POST','/presence'],['DELETE','/presence']])assert.equal(guestRoute(method,'/api/documents/'+id+suffix,docs),true,method+suffix);
 assert.equal(guestRoute('GET','/api/documents/'+id.toUpperCase(),docs),true);
 for(const [method,path] of [['PUT','/api/documents/'+id],['DELETE','/api/documents/'+id],['POST','/api/documents/'+id+'/editing'],['POST','/api/documents/'+id+'/comments'],['GET','/api/documents/'+id+'/sharing'],['GET','/api/documents/'+id+'/versions'],['GET','/api/documents/'+id+'/presence'],['GET','/api/documents/'+other],['GET','/api/documents'],['GET','/api/libraries'],['GET','/api/documents/'+id+'/editing/x'],['GET','/api/documents/'+id+'/../'+other]])assert.equal(guestRoute(method,path,docs),false,method+' '+path);
});
