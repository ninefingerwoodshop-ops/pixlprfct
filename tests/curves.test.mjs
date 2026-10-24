import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {fromPoints,anchors,reshape,vectorSvg} from '../web/vectors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const arch=()=>fromPoints('pen',[{x:0,y:0,out:{x:0,y:100}},{x:100,y:0,in:{x:100,y:100}}]);
test('cubic geometry roundtrips through Rust and exports control handles',()=>{
  const e=new Editor();const id=e.insert(JSON.stringify(arch()));const before=e.snapshot();
  const shape=JSON.parse(before).shapes[0];assert.match(vectorSvg(shape),/C0 100 100 100 100 0/);
  const nodes=anchors(shape);nodes[0].out.y=160;e.update(JSON.stringify(reshape(shape,nodes)));
  assert.equal(anchors(JSON.parse(e.snapshot()).shapes[0])[0].out.y,160);
  e.undo();assert.equal(e.snapshot(),before);e.redo();
  const restored=new Editor();restored.load(e.snapshot());assert.equal(restored.snapshot(),e.snapshot());
  assert.equal(e.duplicate(id)>id,true);e.free();restored.free();
});
test('curve selection follows cubic instead of the straight anchor chord',()=>{
  const e=new Editor(),id=e.insert(JSON.stringify(arch()));
  assert.equal(e.hit_test(50,75),id);assert.equal(e.hit_test(50,0),0);assert.equal(e.hit_test(50,100),0);
  const before=e.snapshot(),shape=JSON.parse(before).shapes[0];
  for(const handles of [[[[0,0],[0,1]]],[[[0,0],[2,0]],[[1,1],[1,0]]]]) {
    assert.throws(()=>e.update(JSON.stringify({...shape,handles})));assert.equal(e.snapshot(),before);
  }
  e.free();
});
test('moving an anchor and both handles preserves other anchors; closed curves include closing segment',()=>{
  const shape=arch(),nodes=anchors(shape);nodes[0].x=-40;nodes[0].in.x=-40;nodes[0].out.x=-40;
  const changed=reshape(shape,nodes);assert.equal(anchors(changed)[1].x,100);assert.equal(anchors(changed)[0].x,-40);
  const closed={...changed,closed:true};assert.equal((vectorSvg(closed).match(/ C/g)||[]).length,2);assert.match(vectorSvg(closed),/ Z/);
});
