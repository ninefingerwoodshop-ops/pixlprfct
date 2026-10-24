import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {descendants,visibleInTree} from '../web/selection.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
test('nested frame moves translate descendants once and survive roundtrip',()=>{
  const e=new Editor(),frame=e.add('frame',0,0),nested=e.add('frame',20,20),child=e.add('rectangle',30,30);
  e.reparent_many(JSON.stringify([nested]),frame);e.reparent_many(JSON.stringify([child]),nested);
  const before=e.snapshot();e.update(JSON.stringify({...shapes(e)[0],x:100,y:50}));
  assert.deepEqual(shapes(e).map(s=>[s.x,s.y]),[[100,50],[120,70],[130,80]]);
  e.undo();assert.equal(e.snapshot(),before);e.redo();
  e.update_many(JSON.stringify(shapes(e).map(s=>({...s,x:s.x+10}))));assert.equal(shapes(e)[2].x,140);
  const r=new Editor();r.load(e.snapshot());assert.equal(r.snapshot(),e.snapshot());e.free();r.free();
});
test('frame copy remaps subtree parents and deletion restores whole subtree with undo',()=>{
  const e=new Editor(),frame=e.add('frame',0,0),child=e.add('text',20,20);e.reparent_many(JSON.stringify([child]),frame);
  const copied=JSON.parse(e.duplicate_many(JSON.stringify([frame])));assert.equal(copied.length,2);
  assert.equal(shapes(e).find(s=>s.id===copied[1]).parent_id,copied[0]);
  const before=e.snapshot();e.remove(frame);assert.deepEqual(shapes(e).map(s=>s.id),copied);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('invalid nesting is atomic and hidden ancestors exclude descendants from hit-testing',()=>{
  const e=new Editor(),frame=e.add('frame',0,0),nested=e.add('frame',10,10),child=e.add('rectangle',20,20);
  e.reparent_many(JSON.stringify([nested]),frame);e.reparent_many(JSON.stringify([child]),nested);const before=e.snapshot();
  for(const [ids,parent] of [[[frame],nested],[[frame],frame],[[child],999],[[nested],child]]) {assert.throws(()=>e.reparent_many(JSON.stringify(ids),parent));assert.equal(e.snapshot(),before);}
  e.update(JSON.stringify({...shapes(e)[0],hidden:true}));assert.equal(e.hit_test(30,30),0);assert.equal(visibleInTree(shapes(e)[2],shapes(e)),false);
  assert.equal(descendants(shapes(e),[frame]).length,3);e.free();
});
test('moving a grouped layer into a frame keeps all group members together',()=>{
  const e=new Editor(),frame=e.add('frame',0,0),a=e.add('rectangle',10,10),b=e.add('text',20,20);e.group_many(JSON.stringify([a,b]));e.reparent_many(JSON.stringify([a]),frame);
  assert.ok(shapes(e).filter(s=>s.id!==frame).every(s=>s.parent_id===frame));e.free();
});
test('aligning frames translates children and reordering stays within parent siblings',()=>{
  const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',100,100),child=e.add('rectangle',120,120);e.reparent_many(JSON.stringify([child]),b);
  e.align_many(JSON.stringify([a,b]),'left');assert.equal(shapes(e).find(s=>s.id===child).x,20);
  const before=e.snapshot();e.reorder(child,-1);assert.equal(e.snapshot(),before);e.free();
});
