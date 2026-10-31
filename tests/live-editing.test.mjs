import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {teamFixture} from './helpers/team-fixture.mjs';
import {mergeDocuments,PersonalHistory} from '../web/document-merge.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
test('three-way merge preserves independent properties, additions and deletion conflicts; undo affects only its author',()=>{
 const base={shapes:[{id:1,x:0,y:0},{id:2,x:0,y:0}]},a=structuredClone(base),b=structuredClone(base);a.shapes[0].x=10;b.shapes[1].y=20;
 const merged=mergeDocuments(base,a,b);assert.equal(merged.conflicts.length,0);assert.equal(merged.document.shapes[0].x,10);assert.equal(merged.document.shapes[1].y,20);
 const history=new PersonalHistory();history.record(base,a);assert.deepEqual(history.apply('undo',merged.document),b);assert.deepEqual(history.apply('redo',b),merged.document);
 b.shapes[0].x=30;assert.deepEqual(mergeDocuments(base,a,b).conflicts,['shapes[1].x']);assert.throws(()=>history.apply('undo',b),/teammate/);
 a.shapes=[];assert(mergeDocuments(base,a,b).conflicts.length);
});
test('simultaneous sessions merge, detect collisions, retry idempotently, survive restart and enforce revocation',async()=>{
 const f=await teamFixture(),e=new Editor();try{
  e.add('rectangle',0,0);e.add('rectangle',200,0);const original=JSON.parse(e.snapshot()),{owner:a,designer:b,path,query}=f;
  const file=ok(await a.call('/api/documents'+query,original),201),id=file.id,policy=ok(await a.call(path(id,'/sharing')));
  ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{},editingMode:'live'},{method:'PUT',revision:policy.revision}));
  const sa=ok(await a.call(path(id,'/live'),{})),sb=ok(await b.call(path(id,'/live'),{}));assert.notDeepEqual(sa.range,sb.range);assert.equal(sb.presence.length,2);
  const da=structuredClone(original),db=structuredClone(original);da.shapes[0].x=20;db.shapes[1].y=40;
  const change={mutationId:crypto.randomUUID(),baseRevision:1,document:da};
  const first=ok(await a.call(path(id,'/live'),change,{method:'PUT',token:sa.token}));assert.equal(first.revision,2);
  assert.equal(ok(await a.call(path(id,'/live'),change,{method:'PUT',token:sa.token})).revision,2);
  const second=ok(await b.call(path(id,'/live'),{mutationId:crypto.randomUUID(),baseRevision:1,document:db},{method:'PUT',token:sb.token}));assert.equal(second.revision,3);assert.equal(JSON.parse(second.body).shapes[0].x,20);assert.equal(JSON.parse(second.body).shapes[1].y,40);
  db.shapes[0].x=99;const conflict=ok(await b.call(path(id,'/live'),{mutationId:crypto.randomUUID(),baseRevision:1,document:db},{method:'PUT',token:sb.token}),409);assert(conflict.conflicts.includes('shapes[1].x'));
  assert.equal((await a.call(path(id),original,{method:'PUT',revision:3,token:sa.token})).status,409);
  await f.restart();assert.equal(ok(await a.call(path(id,'/live'))).revision,3);
  const p=ok(await a.call(path(id,'/sharing')));ok(await a.call(path(id,'/sharing'),{defaultRole:'editor',overrides:{[b.user.id]:'none'},editingMode:'live'},{method:'PUT',revision:p.revision}));
  assert.equal((await b.call(path(id,'/live'),change,{method:'PUT',token:sb.token})).status,403);assert.equal(ok(await a.call(path(id,'/live'))).presence.length,1);
 }finally{e.free();await f.close();}
});
test('failed final compare-and-swap rolls back all earlier transaction writes',async()=>{const f=await teamFixture();try{await assert.rejects(()=>f.db.batch([f.db.prepare('INSERT INTO notification_preferences(user_id) VALUES(?)').bind('rolled-back'),f.db.prepare('UPDATE documents SET revision=revision+1 WHERE id=?').bind('missing')],{requireLastChange:true}),e=>e.status===409);assert.equal((await f.db.query('SELECT * FROM notification_preferences WHERE user_id=?',['rolled-back'])).length,0);}finally{await f.close();}});
