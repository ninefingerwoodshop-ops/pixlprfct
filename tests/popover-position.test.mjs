import test from 'node:test';
import assert from 'node:assert/strict';
import {popoverBounds} from '../web/popover-position.js';
const anchor={left:995,right:1234,top:712,bottom:740},viewport={width:1234,height:898};
test('a low color picker moves up instead of shrinking to the space below the trigger',()=>{
 const bounds=popoverBounds(anchor,{width:288,height:490},viewport);assert.equal(bounds.top,400);assert.equal(bounds.left,699);assert.equal(bounds.maxHeight,882);
});
test('growing, shrinking, and reopening popovers always fit the viewport',()=>{
 for(const width of [180,320,700,1280])for(const height of [120,400,900])for(const size of [{width:288,height:130},{width:288,height:490},{width:288,height:1600}])for(const placement of ['left','below']){
  const v={width,height,left:12,top:16},b=popoverBounds(anchor,size,v,{placement});assert.ok(b.left>=20&&b.top>=24);assert.ok(b.left+Math.min(size.width,b.maxWidth)<=v.left+width-8);assert.ok(b.top+Math.min(size.height,b.maxHeight)<=v.top+height-8);
 }
});
test('dropdowns flip above low anchors and horizontal panels flip when there is room',()=>{
 const menu=popoverBounds(anchor,{width:200,height:240},viewport,{placement:'below'});assert.equal(menu.top,464);
 const left=popoverBounds({left:10,right:30,top:40,bottom:60},{width:288,height:300},viewport);assert.equal(left.left,38);assert.equal(left.top,40);
});
