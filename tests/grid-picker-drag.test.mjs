import test from 'node:test';
import assert from 'node:assert/strict';
import {bindGridPickerDrag} from '../web/grid-picker-drag.js';
function picker(){
 const handlers={},commits=[],previews=[];
 const map={addEventListener:(type,fn)=>handlers[type]=fn};
 const cells=Array.from({length:9},(_,i)=>{const column=i%3+1,row=Math.floor(i/3)+1;return {column,row,button:{focus(){},setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){},getBoundingClientRect(){return {left:(column-1)*20,right:column*20,top:(row-1)*20,bottom:row*20};}}};});
 bindGridPickerDrag(map,cells,{column:2,row:2,column_span:2,row_span:1,area:'body',align_x:'center'},v=>previews.push(v),v=>commits.push(v));
 const fire=(type,x=10,y=10,extra={})=>{let prevented=false,stopped=false;handlers[type]({pointerId:1,button:0,clientX:x,clientY:y,detail:1,preventDefault(){prevented=true;},stopPropagation(){stopped=true;},stopImmediatePropagation(){stopped=true;},...extra});return {prevented,stopped};};
 return {fire,commits,previews};
}
test('drag previews both dimensions from pressed cell and commits exactly once on release',()=>{
 const p=picker();p.fire('pointerdown');p.fire('pointermove',50,50);assert.equal(p.commits.length,0);
 assert.deepEqual(p.previews.at(-1),{column:1,row:1,column_span:3,row_span:3,area:'',align_x:'center'});
 p.fire('pointerup',50,50);assert.equal(p.commits.length,1);assert.equal(p.previews.at(-1),null);
 assert.equal(p.fire('click').stopped,true);
});
test('reverse dragging and shrinking use the original pressed cell',()=>{
 const p=picker();p.fire('pointerdown',50,50);p.fire('pointermove',10,10);p.fire('pointerup',30,30);
 assert.deepEqual([p.commits[0].column,p.commits[0].row,p.commits[0].column_span,p.commits[0].row_span],[2,2,2,2]);
});
test('Escape, cancellation and lost capture discard preview and never commit',()=>{
 for(const type of ['keydown','pointercancel','lostpointercapture']){
 const p=picker();p.fire('pointerdown');p.fire('pointermove',50,50);p.fire(type,50,50,{key:'Escape'});p.fire('pointerup',50,50);
 assert.equal(p.commits.length,0);assert.equal(p.previews.at(-1),null);
 }
});
test('ordinary clicks and keyboard activation retain their existing handlers',()=>{
 const p=picker();p.fire('pointerdown');p.fire('pointerup');assert.equal(p.commits.length,0);assert.equal(p.fire('click').stopped,false);
 p.fire('pointerdown');p.fire('pointermove',50,50);p.fire('pointerup',50,50);assert.equal(p.fire('click',10,10,{detail:0}).stopped,false);
});

import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('live picker layout resizes the item and reflows siblings without saving or adding undo steps',()=>{
 const e=new Editor(),f=e.add('frame',0,0),a=e.add('rectangle',0,0),b=e.add('rectangle',0,0);
 const get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.reparent_many(JSON.stringify([a,b]),f);
 e.update(JSON.stringify({...get(f),width:300,height:200,auto_layout:{direction:'grid',gap:0,padding_top:0,padding_right:0,padding_bottom:0,padding_left:0,align:'start',justify:'start',hug_width:false,hug_height:false,grid:{columns:Array(3).fill({mode:'fixed',value:100}),rows:Array(2).fill({mode:'fixed',value:100})}}}));
 const before=e.snapshot(),original=get(a);
 const next={...original,layout_item:{...original.layout_item,fill_width:true,fill_height:true,grid_cell:{column:1,row:1,column_span:2,row_span:2,area:''}}};
 const result=JSON.parse(e.preview_layout_update(JSON.stringify([next]),f)),item=result.document.shapes.find(s=>s.id===a),sibling=result.grid.placements.find(s=>s.id===b);
 assert.equal(item.width,200);assert.equal(item.height,200);assert.equal(sibling.column,3);assert.equal(e.snapshot(),before);
 e.update(JSON.stringify(next));assert.equal(get(a).width,item.width);e.undo();assert.equal(e.snapshot(),before);e.free();
});
