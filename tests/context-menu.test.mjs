import test from 'node:test';
import assert from 'node:assert/strict';
import {contextMenuBounds} from '../web/context-menu.js';
test('context menu fits at every corner, including offset and narrow visible viewports',()=>{
 for(const viewport of [{width:1280,height:900},{left:120,top:80,width:180,height:140}]){
  const left=viewport.left??0,top=viewport.top??0;
  for(const size of [{width:270,height:180},{width:270,height:1200}]){
   for(const point of [{x:left,y:top},{x:left+viewport.width,y:top},{x:left,y:top+viewport.height},{x:left+viewport.width,y:top+viewport.height}]){
    const b=contextMenuBounds(point,size,viewport);
    assert.ok(b.x>=left+4);assert.ok(b.y>=top+4);
    assert.ok(b.x+Math.min(size.width,b.maxWidth)<=left+viewport.width-4);
    assert.ok(b.y+Math.min(size.height,b.maxHeight)<=top+viewport.height-4);
   }
  }
 }
});
test('context menu keeps the requested position when it fits',()=>{
 assert.deepEqual(contextMenuBounds({x:100,y:120},{width:270,height:180},{width:1000,height:700}),{x:100,y:120,maxWidth:992,maxHeight:692});
});
