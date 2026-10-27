import test from 'node:test';
import assert from 'node:assert/strict';
import {sizingOptions,sizingMode,sizingPatch,limitPatch,mixedValue} from '../web/layout-sizing.js';
const parent={id:1,auto_layout:{direction:'horizontal'}};
test('multi selection offers only resizing modes valid for every layer',()=>{
 const child={id:2,parent_id:1},frame={id:3,parent_id:1,auto_layout:{hug_width:true}};
 assert.deepEqual(sizingOptions([child,frame],[parent]),{hug:false,fill:true,limits:true});
 assert.equal(sizingOptions([frame,{...child,layout_item:{absolute:true}}],[parent]).fill,false);
 assert.equal(sizingOptions([frame,{id:4}],[parent]).limits,false);
 assert.equal(mixedValue([sizingMode(child,'width'),sizingMode(frame,'width')]),null);
});
test('mode changes preserve dimensions and independent axis limits',()=>{
 const shape={width:120,height:60,auto_layout:{hug_width:true,hug_height:true},layout_item:{min_width:80,max_width:180,fill_height:true}};
 const filled=sizingPatch(shape,'width','fill');assert.equal(filled.auto_layout.hug_width,false);assert.equal(filled.auto_layout.hug_height,true);assert.equal(filled.layout_item.fill_width,true);assert.equal(filled.layout_item.min_width,80);assert.equal(filled.width,120);
 const fixed=sizingPatch(filled,'width','fixed');assert.equal(sizingMode(fixed,'width'),'fixed');assert.equal(fixed.layout_item.fill_height,true);
});
test('limit edits reject invalid ranges and preserve unrelated properties',()=>{
 const shape={width:120,layout_item:{min_width:80,max_width:180,fill_width:true}};
 assert.throws(()=>limitPatch(shape,'width','min',200),/Minimum/);
 for(const invalid of [-1,0,NaN,Infinity,1000001])assert.throws(()=>limitPatch(shape,'height','max',invalid));
 const changed=limitPatch(shape,'width','max',240);assert.equal(changed.layout_item.fill_width,true);assert.equal(shape.layout_item.max_width,180);
 assert.equal(limitPatch(changed,'width','max',null).layout_item.max_width,null);
});
test('input and dropdown heights stay Hug through mode, limit and resize edits',async()=>{
 const {resizeBox,resizeHandleAt}=await import('../web/resizing.js');
 const {controlCss}=await import('../web/controls.js');
 const {compileCssScene}=await import('../web/css-renderer.js');
 for(const kind of ['text','password','email','number','tel','url','search','date','datetime-local','month','week','time','textarea','select','range','color','file']){
  const s={id:2,parent_id:1,kind:'frame',x:0,y:0,width:200,height:90,fill:'#ffffff',control:{kind,label:'Label',states:{default:{parts:{input:{height:48}}}}},layout_item:{fill_height:true,min_height:300,max_height:500}};
  for(const mode of ['fixed','fill','hug']){
   const next=sizingPatch(s,'height',mode);
   assert.equal(sizingMode(next,'height'),'hug',kind);
   assert.equal(next.layout_item.fill_height,false);
   assert.equal(next.layout_item.min_height,null);
  }
  assert.equal(limitPatch(s,'height','max',500).layout_item.max_height,null);
  assert.equal(resizeBox(s,{x:260,y:200},1,1).height,90);
  assert.equal(resizeHandleAt(s,{x:100,y:0},1),undefined);
  assert.equal(sizingMode(sizingPatch(s,'width','fill'),'width'),'fill');
  if(!['textarea','file'].includes(kind))assert.match(controlCss(s.control,s.id),/height:48px/);
  else assert.match(controlCss(s.control,s.id),/height:auto/);
  assert.match(controlCss(s.control,s.id),/height:max-content;min-height:0;max-height:none/);
  const scene=compileCssScene([{id:1,kind:'frame',x:0,y:0,width:300,height:600,auto_layout:{direction:'vertical'}},s]);
  assert.ok(!scene.css.includes('min-height:300px'),kind);
  assert.ok(!scene.css.includes('max-height:500px'),kind);
 }
});
