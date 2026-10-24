import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {scaleShapes} from '../web/scaling.js';
import {fromPoints} from '../web/vectors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('scale transforms selection spacing, vector strokes and text sizes in one undo step',()=>{
  const e=new Editor(); e.add('text',20,30);e.insert(JSON.stringify(fromPoints('pen',[{x:100,y:50,out:{x:150,y:0}},{x:200,y:50}])));
  const before=e.snapshot(),shapes=JSON.parse(before).shapes;
  e.update_many(JSON.stringify(scaleShapes(shapes,{x:20,y:0},2)));
  const scaled=JSON.parse(e.snapshot()).shapes;
  assert.equal(scaled[0].typography.font_size,64);assert.equal(scaled[0].height,112);
  assert.equal(scaled[1].x,180);assert.equal(scaled[1].stroke_width,4);assert.deepEqual(scaled[1].handles,shapes[1].handles);
  e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(JSON.parse(e.snapshot()).shapes[1].width,200);
  const saved=e.snapshot();assert.throws(()=>e.update_many(JSON.stringify(scaleShapes(scaled,{x:0,y:0},1000))));assert.equal(e.snapshot(),saved);
  assert.throws(()=>scaleShapes(shapes,{x:0,y:0},0));e.free();
});
