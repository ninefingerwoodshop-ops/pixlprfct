import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),set=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v})),plan=(e,f)=>JSON.parse(e.grid_layout(f));
function setup(n=8){const e=new Editor(),f=e.add('frame',100,100),ids=[];set(e,f,{width:800,height:400});for(let i=0;i<n;i++){const id=e.add('rectangle',0,0);set(e,id,{width:50,height:50,layout_item:{...get(e,id).layout_item,fill_width:true,fill_height:true}});ids.push(id);}e.reparent_many(JSON.stringify(ids),f);set(e,f,{auto_layout:{direction:'grid',gap:10,cross_gap:10,padding_top:10,padding_right:10,padding_bottom:10,padding_left:10,align:'start',justify:'start',hug_width:false,hug_height:false,grid:{columns:[100,120,140,160].map(value=>({mode:'fixed',value})),rows:[],auto_rows:{mode:'fr',value:1}}}});return{e,f,ids};}
test('column reordering carries sizing and cells while preserving layer order and history',()=>{
 const {e,f,ids}=setup(),before=e.snapshot(),order=all(e).map(s=>s.id);assert.equal(e.shift_grid_track(f,'columns',0,1),1);assert.deepEqual(plan(e,f).columns,[120,100,140,160]);assert.deepEqual(plan(e,f).placements.map(p=>p.column),[2,1,3,4,2,1,3,4]);assert.deepEqual(all(e).map(s=>s.id),order);assert.equal(get(e,ids[0]).width,100);assert.equal(get(e,ids[1]).width,120);e.undo();assert.equal(e.snapshot(),before);e.redo();const copy=new Editor();copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());copy.free();e.free();
});
test('overlapping spans form connected track groups and never split at source or destination',()=>{
 const {e,f,ids}=setup(3);set(e,ids[0],{layout_item:{...get(e,ids[0]).layout_item,grid_cell:{column:1,row:1,column_span:2}}});set(e,ids[1],{layout_item:{...get(e,ids[1]).layout_item,grid_cell:{column:2,row:2,column_span:2}}});set(e,ids[2],{layout_item:{...get(e,ids[2]).layout_item,grid_cell:{column:4,row:1}}});
 e.shift_grid_track(f,'columns',1,1);assert.deepEqual(plan(e,f).columns,[160,100,120,140]);assert.deepEqual(plan(e,f).placements.map(p=>[p.column,p.column_span]),[[2,2],[3,2],[1,1]]);e.shift_grid_track(f,'columns',0,1);assert.deepEqual(plan(e,f).columns,[100,120,140,160]);assert.deepEqual(plan(e,f).placements.map(p=>p.column),[1,2,4]);e.free();
});
test('automatic row order becomes explicit, hidden pinned cells follow, and invalid actions are atomic',()=>{
 const {e,f,ids}=setup(8);const hidden=e.add('rectangle',0,0);e.reparent_many(JSON.stringify([hidden]),f);set(e,hidden,{hidden:true,layout_item:{...get(e,hidden).layout_item,grid_cell:{row:1,column:1}}});e.shift_grid_track(f,'rows',0,1);assert.equal(get(e,f).auto_layout.grid.rows.length,2);assert.deepEqual(plan(e,f).placements.map(p=>p.row),[2,2,2,2,1,1,1,1]);assert.equal(get(e,hidden).layout_item.grid_cell.row,2);
 const before=e.snapshot();for(const [axis,index,delta] of [['bad',0,1],['rows',2,1],['columns',0,2]]){assert.throws(()=>e.shift_grid_track(f,axis,index,delta));assert.equal(e.snapshot(),before);}e.shift_grid_track(f,'rows',1,1);assert.equal(e.snapshot(),before);e.free();
});
test('component track edits propagate with child placement and instances remain protected',()=>{
 const {e,f}=setup();e.create_component(f);const instance=e.create_instance(f,1000,100);e.shift_grid_track(f,'columns',0,1);assert.deepEqual(plan(e,instance).columns,[120,100,140,160]);assert.deepEqual(plan(e,instance).placements.map(p=>p.column),plan(e,f).placements.map(p=>p.column));assert.throws(()=>e.shift_grid_track(instance,'columns',3,-1),/Instance appearance is protected/);assert.deepEqual(plan(e,instance).columns,[120,100,140,160]);assert.deepEqual(plan(e,f).columns,[120,100,140,160]);e.free();
});
test('dragging across multiple columns commits one move, including named areas and pinned cells',()=>{
 const {e,f,ids}=setup();
 const frame=get(e,f);set(e,f,{auto_layout:{...frame.auto_layout,grid:{...frame.auto_layout.grid,areas:[{name:'feature',column:1,row:1,column_span:1,row_span:1}]}}});
 const hidden=e.add('rectangle',0,0);e.reparent_many(JSON.stringify([hidden]),f);set(e,hidden,{hidden:true,layout_item:{...get(e,hidden).layout_item,grid_cell:{column:1,row:1}}});
 const before=e.snapshot();assert.equal(e.move_grid_track(f,'columns',0,4),3);
 assert.deepEqual(plan(e,f).columns,[120,140,160,100]);
 assert.deepEqual(plan(e,f).placements.map(p=>p.column),[4,1,2,3,4,1,2,3]);
 assert.equal(get(e,f).auto_layout.grid.areas[0].column,4);assert.equal(get(e,hidden).layout_item.grid_cell.column,4);assert.equal(get(e,ids[0]).width,100);
 const moved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),moved);
 e.move_grid_track(f,'columns',3,0);assert.deepEqual(plan(e,f).columns,[100,120,140,160]);e.free();
});
test('dragging cannot split a spanning source or destination, including named area spans',()=>{
 const {e,f}=setup(1);const frame=get(e,f);
 set(e,f,{auto_layout:{...frame.auto_layout,grid:{...frame.auto_layout.grid,areas:[{name:'wide',column:2,row:1,column_span:2,row_span:1}]}}});
 // Dropping inside a destination span snaps past the whole span.
 assert.equal(e.move_grid_track(f,'columns',0,2),2);
 assert.deepEqual(plan(e,f).columns,[120,140,100,160]);assert.equal(get(e,f).auto_layout.grid.areas[0].column,1);
 // Grabbing either track moves its entire connected span.
 assert.equal(e.move_grid_track(f,'columns',1,4),3);
 assert.deepEqual(plan(e,f).columns,[100,160,120,140]);assert.equal(get(e,f).auto_layout.grid.areas[0].column,3);
 e.free();
});
test('row dragging works in both directions and keeps history atomic',()=>{
 const {e,f}=setup(12);const before=e.snapshot();
 assert.equal(e.move_grid_track(f,'rows',0,3),2);
 assert.deepEqual(plan(e,f).placements.map(p=>p.row),[3,3,3,3,1,1,1,1,2,2,2,2]);
 e.undo();assert.equal(e.snapshot(),before);e.redo();
 assert.equal(e.move_grid_track(f,'rows',2,0),0);
 assert.deepEqual(plan(e,f).placements.map(p=>p.row),[1,1,1,1,2,2,2,2,3,3,3,3]);e.free();
});
test('invalid drops and same-position drops leave the document and undo history untouched',()=>{
 const {e,f}=setup();e.clear_history();const before=e.snapshot();
 for(const [axis,index,slot] of [['bad',0,1],['columns',4,0],['columns',0,5]])assert.throws(()=>e.move_grid_track(f,axis,index,slot));
 for(const slot of [1,2])assert.equal(e.move_grid_track(f,'columns',1,slot),1);
 assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);e.free();
});
test('dragging source tracks propagates to component instances and rejects protected instance edits',()=>{
 const {e,f}=setup();e.create_component(f);const instance=e.create_instance(f,1000,100);
 e.move_grid_track(f,'columns',0,4);assert.deepEqual(plan(e,instance).columns,[120,140,160,100]);
 assert.deepEqual(plan(e,instance).placements.map(p=>p.column),plan(e,f).placements.map(p=>p.column));
 const before=e.snapshot();assert.throws(()=>e.move_grid_track(instance,'columns',0,4),/Instance appearance is protected/);
 assert.equal(e.snapshot(),before);e.free();
});
const moveMany=(e,f,axis,indices,before)=>JSON.parse(e.move_grid_tracks(f,axis,JSON.stringify(indices),before));
const shiftMany=(e,f,axis,indices,delta)=>JSON.parse(e.shift_grid_tracks(f,axis,JSON.stringify(indices),delta));
test('several selected columns gather at the drop boundary in their current order as one undo step',()=>{
 const {e,f,ids}=setup();const before=e.snapshot(),order=all(e).map(s=>s.id);
 // Columns 1 and 3 (100, 140) dropped at the end, returned in the order given.
 assert.deepEqual(moveMany(e,f,'columns',[2,0],4),[3,2]);
 assert.deepEqual(plan(e,f).columns,[120,160,100,140]);
 assert.deepEqual(plan(e,f).placements.map(p=>p.column),[3,1,4,2,3,1,4,2]);
 assert.deepEqual(all(e).map(s=>s.id),order);assert.equal(get(e,ids[0]).width,100);
 const moved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),moved);
 // Dropping between the two halves of a split selection closes the gap around the boundary.
 e.undo();assert.deepEqual(moveMany(e,f,'columns',[0,3],2),[1,2]);assert.deepEqual(plan(e,f).columns,[120,100,160,140]);e.free();
});
test('a multi-track move agrees with the single-track move for every one-track selection',()=>{
 for(let index=0;index<4;index++)for(let slot=0;slot<=4;slot++){
  const a=setup(),b=setup();
  assert.deepEqual(moveMany(a.e,a.f,'columns',[index],slot),[b.e.move_grid_track(b.f,'columns',index,slot)]);
  assert.equal(a.e.snapshot(),b.e.snapshot());a.e.free();b.e.free();
 }
});
test('multi-track moves keep connected spans whole at the source and the destination',()=>{
 const {e,f}=setup(1);const frame=get(e,f);
 set(e,f,{auto_layout:{...frame.auto_layout,grid:{...frame.auto_layout.grid,areas:[{name:'wide',column:2,row:1,column_span:2,row_span:1}]}}});
 // Selecting one half of the span and the last column carries the whole span.
 assert.deepEqual(moveMany(e,f,'columns',[1,3],0),[0,2]);
 assert.deepEqual(plan(e,f).columns,[120,140,160,100]);assert.equal(get(e,f).auto_layout.grid.areas[0].column,1);
 // A drop inside the span from the right snaps before it, never through it.
 assert.deepEqual(moveMany(e,f,'columns',[2,3],1),[0,1]);
 assert.deepEqual(plan(e,f).columns,[160,100,120,140]);assert.equal(get(e,f).auto_layout.grid.areas[0].column,3);e.free();
});
test('shifting a selection moves it one position as a block and stops at the edges',()=>{
 const {e,f}=setup();
 assert.deepEqual(shiftMany(e,f,'columns',[1,2],1),[2,3]);assert.deepEqual(plan(e,f).columns,[100,160,120,140]);
 const edge=e.snapshot();assert.deepEqual(shiftMany(e,f,'columns',[2,3],1),[2,3]);assert.equal(e.snapshot(),edge);
 assert.deepEqual(shiftMany(e,f,'columns',[2,3],-1),[1,2]);assert.deepEqual(shiftMany(e,f,'columns',[1,2],-1),[0,1]);
 assert.deepEqual(plan(e,f).columns,[120,140,100,160]);
 assert.deepEqual(shiftMany(e,f,'rows',[0],1),[1]);assert.deepEqual(plan(e,f).placements.map(p=>p.row),[2,2,2,2,1,1,1,1]);e.free();
});
test('invalid and unchanged multi-track moves leave the document and history untouched',()=>{
 const {e,f}=setup();e.clear_history();const before=e.snapshot();
 for(const [axis,indices,slot] of [['bad',[0],1],['columns',[],1],['columns',[0,4],0],['columns',[0],5]])assert.throws(()=>moveMany(e,f,axis,indices,slot));
 assert.throws(()=>e.move_grid_tracks(f,'columns','not json',0));assert.throws(()=>shiftMany(e,f,'columns',[0],2));
 for(const slot of [1,2,3])assert.deepEqual(moveMany(e,f,'columns',[1,2],slot),[1,2]);
 assert.deepEqual(moveMany(e,f,'columns',[0,1,2,3],2),[0,1,2,3]);
 assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);e.free();
});
test('multi-track moves propagate to component instances and protect instance edits',()=>{
 const {e,f}=setup();e.create_component(f);const instance=e.create_instance(f,1000,100);
 moveMany(e,f,'columns',[0,1],4);assert.deepEqual(plan(e,instance).columns,[140,160,100,120]);
 assert.deepEqual(plan(e,instance).placements.map(p=>p.column),plan(e,f).placements.map(p=>p.column));
 const before=e.snapshot();assert.throws(()=>moveMany(e,instance,'columns',[0,1],4),/Instance appearance is protected/);assert.equal(e.snapshot(),before);e.free();
});
