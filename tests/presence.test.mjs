import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {teamFixture} from './helpers/team-fixture.mjs';
import {Presence,personColor,initials,followView,blendView,PRESENCE_COLORS,FAST_BEAT,SLOW_BEAT} from '../web/presence.js';
import {presenceState,PRESENCE_TTL} from '../server/presence.mjs';
const document={version:1,name:'Presence project',shapes:[]};
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
const view={page:1,x:10,y:20,width:800,height:600},cursor={page:1,x:5,y:6};

test('everyone who can see a file appears in it, in either editing mode, and only there',async()=>{
 const f=await teamFixture();try{
  const {owner:a,designer:b,viewer:v,outsider:x,path,query}=f,id=ok(await a.call('/api/documents'+query,document),201).id,other=ok(await a.call('/api/documents'+query,document),201).id;
  let sharing=ok(await a.call(path(id,'/sharing')));sharing=ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{[v.user.id]:'viewer'}},{method:'PUT',revision:sharing.revision}));
  // Nobody is editing: the file is only open for review, and a view-only person still shows.
  assert.deepEqual(ok(await a.call(path(id,'/presence'),{cursor,view})).presence,[{client:a.clientId,userId:a.user.id,name:'Simulated Owner',cursor,view,following:null,mine:true}]);
  const seen=ok(await v.call(path(id,'/presence'),{cursor:null,view:{...view,x:400},following:a.clientId})).presence;
  assert.deepEqual(seen.map(p=>[p.name,p.mine,p.following]).sort(),[['Simulated Owner',false,null],['Simulated Viewer',true,a.clientId]]);
  assert.deepEqual(seen.find(p=>!p.mine).view,view);
  // A second window of the same person is a second entry; another file has its own list.
  const second=randomUUID();ok(await b.call(path(id,'/presence'),{},{headers:{'x-pixl-client':second}}));ok(await b.call(path(id,'/presence'),{}));
  assert.equal(ok(await a.call(path(id,'/presence'),{})).presence.filter(p=>p.userId===b.user.id).length,2);
  assert.deepEqual(ok(await a.call(path(other,'/presence'),{})).presence.map(p=>p.name),['Simulated Owner']);
  // The same list is kept when the file switches to editing together.
  ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{[v.user.id]:'viewer'},editingMode:'live'},{method:'PUT',revision:sharing.revision}));
  assert.equal(ok(await v.call(path(id,'/presence'),{})).presence.length,4);
  // Outsiders, a stolen window id, bad input and other methods are refused.
  assert.equal((await x.call(path(id,'/presence'),{})).status,403);
  assert.equal((await b.call(path(id,'/presence'),{},{headers:{'x-pixl-client':a.clientId}})).status,409);
  assert.equal((await a.call(path(id,'/presence'),{},{headers:{'x-pixl-client':'nope'}})).status,400);
  for(const bad of [{cursor:{page:1,x:'a',y:2}},{view:{...view,width:0}},{view:{...view,x:1e12}},{following:'someone'},{cursor:{page:1.5,x:1,y:2}}])assert.equal((await a.call(path(id,'/presence'),bad)).status,400,JSON.stringify(bad));
  assert.equal((await a.call(path(id,'/presence'))).status,405);
  // Leaving removes that window at once; losing access removes a person at their next heartbeat.
  ok(await b.call(path(id,'/presence'),undefined,{method:'DELETE'}));assert.equal(ok(await a.call(path(id,'/presence'),{})).presence.filter(p=>p.userId===b.user.id).length,1);
  sharing=ok(await a.call(path(id,'/sharing')));ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{[v.user.id]:'none'},editingMode:'live'},{method:'PUT',revision:sharing.revision}));
  assert.equal((await v.call(path(id,'/presence'),{})).status,403);
  // Entries expire by themselves, and deleting the file for good takes its list along.
  await f.db.query('UPDATE document_presence SET expires_at=? WHERE document_id=?',[Date.now()-1,id],'run');
  assert.deepEqual(ok(await a.call(path(id,'/presence'),{})).presence.map(p=>p.name),['Simulated Owner']);
  assert.equal((await f.db.query('SELECT COUNT(*) AS n FROM document_presence WHERE document_id=?',[id]))[0].n,1);
 }finally{await f.close();}
});
test('only the known fields of a heartbeat are kept',()=>{
 assert.deepEqual(presenceState({cursor:{...cursor,html:'<b>'},view:{...view,extra:1},following:null,name:'Mallory',mine:true}),{cursor,view,following:null});
 assert.deepEqual(presenceState({}),{cursor:null,view:null,following:null});assert.ok(PRESENCE_TTL>=5000);
});
test('colours, initials and the view that follows someone',()=>{
 const id=randomUUID();assert.equal(personColor(id),personColor(id));assert.ok(PRESENCE_COLORS.includes(personColor(id)));
 assert.deepEqual([initials('Ada Lovelace'),initials('  plato '),initials('Jean Luc Picard'),initials(''),initials('émile zola')],['AL','P','JL','?','ÉZ']);
 // An 800x600 view shown on a 400x600 canvas: scaled to fit the width and centred.
 assert.deepEqual(followView(view,400,600),{page:1,zoom:.5,pan:{x:200-410*.5,y:300-320*.5}});
 assert.equal(followView({...view,width:1e-9,height:1e-9},400,300).zoom,256);
 const from={page:1,zoom:1,pan:{x:0,y:0}},to={page:1,zoom:4,pan:{x:100,y:-50}};
 assert.deepEqual(blendView(from,to,0),from);assert.deepEqual(blendView(from,to,1),to);assert.deepEqual(blendView(from,to,.5),{page:1,zoom:2,pan:{x:50,y:-25}});
});
test('the heartbeat speeds up while following or being followed, and following ends when the person leaves',async()=>{
 const me='11111111-1111-4111-8111-111111111111',ada='22222222-2222-4222-8222-222222222222';let list=[{client:me,name:'Me',mine:true,following:null},{client:ada,name:'Ada',mine:false,following:null,view}],sent=[],left=[],changes=0;
 const p=new Presence({call:async(path,options)=>{sent.push([path,options.method,options.body&&JSON.parse(options.body)]);return {presence:list};},local:()=>({cursor,view}),changed:()=>changes++,left:id=>left.push(id)});
 await p.beat();assert.deepEqual(sent[0],['/presence','POST',{cursor,view,following:null}]);assert.equal(p.interval(),SLOW_BEAT);assert.deepEqual(p.others().map(o=>o.name),['Ada']);
 p.follow(me);assert.equal(p.following,null);p.follow('nobody');assert.equal(p.following,null);
 p.follow(ada);assert.equal(p.leader().name,'Ada');assert.equal(p.interval(),FAST_BEAT);await p.beat();assert.equal(sent[1][2].following,ada);
 p.stop();assert.equal(p.interval(),SLOW_BEAT);
 list=[{...list[0]},{...list[1],following:me}];await p.beat();assert.equal(p.interval(),FAST_BEAT);
 p.follow(ada);list=[list[0]];await p.beat();assert.equal(p.following,null);assert.deepEqual(left,[ada]);assert.equal(p.interval(),SLOW_BEAT);
 // Two beats asked for at once are one request.
 const before=sent.length;await Promise.all([p.beat(),p.beat()]);assert.equal(sent.length,before+1);assert.ok(changes>3);
});
