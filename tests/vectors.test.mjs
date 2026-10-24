import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {drawnShape,fromPoints,vectorSvg} from '../web/vectors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('reverse drag, center drawing and constrained shapes retain intended geometry',()=>{
  const rect=drawnShape('rectangle',{x:100,y:100},{x:60,y:80},{shiftKey:true,altKey:true});
  assert.deepEqual([rect.x,rect.y,rect.width,rect.height],[60,60,80,80]);
  const line=drawnShape('arrow',{x:100,y:100},{x:0,y:0});
  assert.deepEqual(line.points,[[1,1],[0,0]]);
  assert.ok(!vectorSvg(line).includes('NaN'));
  assert.match(vectorSvg(line),/fill="none"/);
});
test('all drawing tools persist, duplicate, resize, and undo insertion atomically',()=>{
  for(const kind of ['line','arrow','polygon','star','pen','pencil']) {
    const editor=new Editor();
    const shape=['pen','pencil'].includes(kind)?fromPoints(kind,[{x:0,y:0},{x:50,y:100},{x:100,y:0}]):drawnShape(kind,{x:0,y:0},{x:100,y:100});
    const id=editor.insert(JSON.stringify(shape));
    const saved=editor.snapshot(); editor.undo(); assert.equal(JSON.parse(editor.snapshot()).shapes.length,0); editor.redo(); assert.equal(editor.snapshot(),saved);
    const restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);
    const stored=JSON.parse(saved).shapes[0];editor.update(JSON.stringify({...stored,width:200}));
    assert.deepEqual(JSON.parse(editor.snapshot()).shapes[0].points,stored.points);
    editor.duplicate(id);assert.deepEqual(JSON.parse(editor.snapshot()).shapes[1].points,stored.points);
    editor.free();restored.free();
  }
});
test('vector hit testing ignores empty bounding-box space and validates imports atomically',()=>{
  const editor=new Editor(),line=drawnShape('line',{x:0,y:0},{x:100,y:100});
  const id=editor.insert(JSON.stringify(line));
  assert.equal(editor.hit_test(50,50),id); assert.equal(editor.hit_test(0,90),0);
  const before=editor.snapshot();
  for(const invalid of [{points:[]},{points:[[0,0],[2,1]]},{stroke_width:-1},{points:Array(4097).fill([0,0])}]) {
    assert.throws(()=>editor.insert(JSON.stringify({...line,...invalid})));assert.equal(editor.snapshot(),before);
  }
  editor.add_page();assert.equal(editor.hit_test(50,50),0);editor.free();
});
