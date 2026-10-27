import {worldPoint,rotateFromDrag} from '../web/rotation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeBox,resizeHandleAt,fixedResize,rotationHandleAt,resizeWorldBox} from '../web/resizing.js';
const original={x:20,y:30,width:100,height:60};
test('side handles change only their axis and keep the opposite edge anchored',()=>{
 assert.deepEqual(resizeBox(original,{x:5,y:999},0,.5),{x:5,y:30,width:115,height:60});
 assert.deepEqual(resizeBox(original,{x:150,y:999},1,.5),{x:20,y:30,width:130,height:60});
 assert.deepEqual(resizeBox(original,{x:999,y:10},.5,0),{x:20,y:10,width:100,height:80});
 assert.deepEqual(resizeBox(original,{x:999,y:120},.5,1),{x:20,y:30,width:100,height:90});
 assert.equal(resizeBox(original,{x:200,y:0},0,.5).width,1);
});
test('side hit targets respect zoom and a width resize preserves height Hug/Fill',()=>{
 assert.deepEqual(resizeHandleAt(original,{x:120,y:60},2),[1,.5]);assert.equal(resizeHandleAt(original,{x:126,y:60},2),undefined);
 const result=fixedResize({...original,kind:'frame',auto_layout:{hug_width:true,hug_height:true},layout_item:{fill_width:true,fill_height:true}},true,false);
 assert.equal(result.auto_layout.hug_width,false);assert.equal(result.auto_layout.hug_height,true);assert.equal(result.layout_item.fill_height,true);
});

test('rotation targets sit outside corners and never steal resize handles',()=>{
 assert.equal(rotationHandleAt(original,{x:10,y:20},1),true);
 assert.equal(rotationHandleAt(original,{x:20,y:30},1),false);
 assert.equal(rotationHandleAt(original,{x:10,y:60},1),false);
 assert.equal(rotationHandleAt({...original,kind:'frame'},{x:10,y:20},1),true);
});
test('rotation preserves center, snaps to 15 degrees, and rotated resizing preserves the opposite corner',()=>{
 const center={x:70,y:60},start={x:120,y:60},end={x:70,y:110};
 const result=rotateFromDrag(original,start,end);
 assert.equal(result.rotation,-90);
 assert.deepEqual(worldPoint(result,{x:result.x+50,y:result.y+30}),center);
 assert.equal(rotateFromDrag(original,start,{x:120,y:70},true).rotation,-15);
 const rotated={...original,rotation:30};
 const handle=worldPoint(rotated,{x:120,y:60});
 assert.deepEqual(resizeHandleAt(rotated,handle,1),[1,.5]);
 const oldAnchor=worldPoint(rotated,{x:120,y:90});
 const resized=resizeWorldBox(rotated,resizeBox(rotated,{x:10,y:20},0,0));
 const newAnchor=worldPoint(resized,{x:resized.x+resized.width,y:resized.y+resized.height});
 assert.ok(Math.hypot(oldAnchor.x-newAnchor.x,oldAnchor.y-newAnchor.y)<1e-8);
 assert.equal(resized.rotation,30);
});
