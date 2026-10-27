import test from 'node:test';
import assert from 'node:assert/strict';
import { bounds, marqueeSelection, layerRange, canvasSelection } from '../web/selection.js';
const shapes = [{id:1,x:0,y:0,width:20,height:30},{id:2,x:40,y:20,width:10,height:10},{id:3,x:5,y:5,width:5,height:5,hidden:true}];
test('marquee works in either drag direction, includes intersections, and excludes hidden layers', () => {
  assert.deepEqual(marqueeSelection(shapes,{x:60,y:40},{x:10,y:10}),[1,2]);
  assert.deepEqual(marqueeSelection(shapes,{x:10,y:10},{x:60,y:40}),[1,2]);
  assert.deepEqual(marqueeSelection(shapes,{x:80,y:80},{x:100,y:100}),[]);
});
test('selection bounds and layer ranges handle reversed and missing anchors', () => {
  assert.deepEqual(bounds(shapes.slice(0,2)),{x:0,y:0,width:50,height:30});
  assert.equal(bounds([]),null);
  assert.deepEqual(layerRange(shapes,3,1),[1,2,3]);
  assert.deepEqual(layerRange(shapes,99,2),[2]);
});

test('normal clicks on instance children select the movable instance root',()=>{
 const scene=[{id:1,kind:'frame',parent_id:0,component:{type:'instance',master:10,source:10}},{id:2,kind:'text',parent_id:1,component:{type:'instance',master:10,source:11}}];
 assert.deepEqual(canvasSelection(scene,[2]),[1]);
 assert.deepEqual(canvasSelection(scene,[2],{selected:[1]}),[1]);
 assert.deepEqual(canvasSelection(scene,[2],{deep:true}),[2]);
});
