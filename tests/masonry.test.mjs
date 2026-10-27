import test from 'node:test';import assert from 'node:assert/strict';
import {mountMasonry} from '../web/masonry.js';
import {behaviorSource} from '../web/behaviors.js';
test('rendered heights choose shortest columns and resize notifications rebalance without reordering DOM',()=>{
 const saved=Object.fromEntries(['ResizeObserver','MutationObserver','requestAnimationFrame','cancelAnimationFrame','getComputedStyle'].map(k=>[k,globalThis[k]]));
 let resize,scheduled;let disconnected=false,display='grid';
 const item=h=>({style:{},height:h,matches:()=>true,get offsetHeight(){return this.height;}});
 const items=[item(100),item(30),item(40),item(20)];
 const grid={style:{},children:items,dataset:{masonryHug:'true'},clientHeight:200};
 const root={querySelectorAll:()=>[grid],contains:()=>true,addEventListener(){},removeEventListener(){}};
 globalThis.ResizeObserver=class{constructor(cb){resize=cb;}observe(){}unobserve(){}disconnect(){disconnected=true;}};
 globalThis.MutationObserver=undefined;
 globalThis.requestAnimationFrame=cb=>{scheduled=cb;return 1;};globalThis.cancelAnimationFrame=()=>{};
 globalThis.getComputedStyle=node=>node===grid?{display,gridTemplateColumns:'100px 100px',getPropertyValue:()=> '8px',paddingTop:'4px',paddingBottom:'4px'}:{display:'block',marginTop:'0',marginBottom:'0'};
 try{
  const cleanup=mountMasonry(root);assert.deepEqual(items.map(i=>i.style.gridColumn),['1','2','2','2']);assert.deepEqual(items.map(i=>i.style.top),['0px','0px','38px','86px']);assert.equal(grid.style.height,'114px');
  items[0].height=10;resize();scheduled();assert.deepEqual(items.map(i=>i.style.gridColumn),['1','2','1','2']);assert.deepEqual(items.map(i=>i.style.top),['0px','0px','18px','38px']);assert.deepEqual(grid.children,items);
  items[0].dataset={masonryColumn:'2'};resize();scheduled();
  assert.equal(items[0].style.gridColumn,'2');assert.equal(items[1].style.gridColumn,'1');
  items[0].height=150;resize();scheduled();assert.equal(items[0].style.gridColumn,'2');
  items[0].dataset.masonryColumn='';resize();scheduled();assert.equal(items[0].style.gridColumn,'1');
  display='flex';cleanup.layout();assert.deepEqual(items.map(i=>i.style.top),['0px','0px','0px','0px']);assert.equal(grid.style.height,'');
  display='grid';cleanup.layout();assert.equal(items[0].style.gridColumn,'1');assert.notEqual(grid.style.height,'');
  cleanup();assert.equal(disconnected,true);
 }finally{for(const [k,v] of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
test('exported behavior runtime includes measurement and resize cleanup',()=>{
 const source=behaviorSource([]);assert.match(source,/function mountMasonry/);assert.match(source,/new ResizeObserver/);assert.match(source,/masonryCleanup\(\)/);assert.doesNotThrow(()=>new Function(source.replaceAll('export ','')));
});
