import test from 'node:test';
import assert from 'node:assert/strict';
import {tooltipPosition,tooltipPageStep,tooltipScrollStep} from '../web/tooltips.js';
test('tooltips fit at all edges of normal and offset visual viewports',()=>{
 for(const viewport of [{width:800,height:600},{left:100,top:60,width:220,height:120}]){
  const left=viewport.left??0,top=viewport.top??0,size={width:Math.min(280,viewport.width-16),height:60};
  for(const x of [left,left+viewport.width-24])for(const y of [top,top+viewport.height-24]){
   const p=tooltipPosition({left:x,top:y,bottom:y+24,width:24},size,viewport);
   assert.ok(p.x>=left+8);assert.ok(p.y>=top+8);
   assert.ok(p.x+size.width<=left+viewport.width-8);assert.ok(p.y+size.height<=top+viewport.height-8);
  }
 }
});
test('tooltip prefers above and flips below when space permits',()=>{
 const size={width:100,height:40},viewport={width:800,height:600};
 assert.equal(tooltipPosition({left:100,top:100,bottom:124,width:24},size,viewport).y,52);
 assert.equal(tooltipPosition({left:100,top:8,bottom:32,width:24},size,viewport).y,40);
});

test('tooltip page steps stay within the visible name height with overlap',()=>{assert.equal(tooltipPageStep(200,16),184);assert.equal(tooltipPageStep(20,16),10);assert.equal(tooltipPageStep(1,16),1);for(const height of [10,20,80,200])assert.ok(tooltipPageStep(height)<height);});

test('tooltip scrolling clamps at both ends including non-scrollable names',()=>{assert.equal(tooltipScrollStep(0,-16,500,200),0);assert.equal(tooltipScrollStep(300,16,500,200),300);assert.equal(tooltipScrollStep(295,16,500,200),300);assert.equal(tooltipScrollStep(5,-16,500,200),0);assert.equal(tooltipScrollStep(0,16,100,200),0);assert.equal(tooltipScrollStep(32,16,500,200),48);});

test('tooltip page scrolling stops at boundaries even on repeated presses',()=>{const height=180,total=500,step=tooltipPageStep(height,16);let top=0;for(let i=0;i<8;i++)top=tooltipScrollStep(top,step,total,height);assert.equal(top,320);assert.equal(tooltipScrollStep(top,step,total,height),320);for(let i=0;i<8;i++)top=tooltipScrollStep(top,-step,total,height);assert.equal(top,0);assert.equal(tooltipScrollStep(top,-step,total,height),0);});
