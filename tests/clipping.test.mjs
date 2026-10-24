import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {clippingFrames,paintBounds,frameAt,clipSvg,clipDefinitions,dropParent} from '../web/scene.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const state=e=>JSON.parse(e.snapshot()).shapes;
test('clipped overflow cannot be hit, bounds match the frame, and SVG references all ancestor clips',()=>{
  const e=new Editor(),f=e.add('frame',0,0),c=e.add('rectangle',80,80);e.update(JSON.stringify({...state(e)[0],width:100,height:100,clip_content:true}));e.reparent_many(JSON.stringify([c]),f);
  const shapes=state(e),child=shapes[1];assert.equal(e.hit_test(90,90),c);assert.equal(e.hit_test(120,120),0);
  assert.deepEqual([paintBounds(child,shapes).width,paintBounds(child,shapes).height],[20,20]);
  assert.match(clipDefinitions(shapes),/clipPathUnits="userSpaceOnUse"/);assert.match(clipSvg(child,shapes,'<rect/>'),new RegExp(`url\\(#frame-clip-${f}\\)`));
  const saved=e.snapshot();e.update(JSON.stringify({...shapes[0],clip_content:false}));assert.equal(e.hit_test(120,120),c);e.undo();assert.equal(e.snapshot(),saved);e.free();
});
test('automatic containment chooses the frontmost visible nested frame and respects ancestor clipping',()=>{
  const shapes=[{id:1,kind:'frame',x:0,y:0,width:100,height:100,clip_content:true,parent_id:0},{id:2,kind:'frame',x:50,y:50,width:100,height:100,parent_id:1}];
  assert.equal(frameAt(shapes,{x:75,y:75}),2);assert.equal(frameAt(shapes,{x:120,y:120}),0);assert.equal(frameAt(shapes,{x:10,y:10}),1);
  assert.equal(clippingFrames(shapes[1],shapes).length,1);assert.equal(frameAt(shapes.map(s=>({...s,hidden:s.id===1})),{x:75,y:75}),0);
});
test('moving into another frame is one undoable transaction; invalid drops never partially move',()=>{
  const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',800,0),c=e.add('rectangle',20,20);e.reparent_many(JSON.stringify([c]),a);const before=e.snapshot(),child=state(e).find(s=>s.id===c);
  e.move_into(JSON.stringify([{...child,x:820}]),b);assert.equal(state(e).find(s=>s.id===c).parent_id,b);e.undo();assert.equal(e.snapshot(),before);
  assert.throws(()=>e.move_into(JSON.stringify([{...child,x:900}]),c));assert.equal(e.snapshot(),before);e.free();
});
test('drop target excludes moved descendants and leaves partial group selections parented',()=>{
  const shapes=[{id:1,kind:'frame',x:0,y:0,width:100,height:100,parent_id:0},{id:2,kind:'rectangle',x:10,y:10,width:10,height:10,parent_id:1,group_id:8},{id:3,kind:'text',x:20,y:20,width:10,height:10,parent_id:1,group_id:8}];
  assert.equal(dropParent(shapes,shapes,[1]),0);assert.equal(dropParent(shapes,[{...shapes[1],x:200}],[2]),null);
});
