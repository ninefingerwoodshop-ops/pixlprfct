import test from 'node:test';import assert from 'node:assert/strict';
import {gridStackDrop} from '../web/grid-stack-drop.js';
const grid={id:1,parent_id:0,kind:'frame',x:0,y:0,width:420,height:300,auto_layout:{direction:'grid',gap:20,padding_left:0,padding_top:0,grid:{areas:[]}}};
const left={id:2,parent_id:1,kind:'frame',x:0,y:0,width:200,height:100,layout_item:{grid_container:true,grid_cell:{column:1,row:1}},auto_layout:{direction:'vertical',gap:10}};
const right={...left,id:3,x:220,layout_item:{grid_container:true,grid_cell:{column:2,row:1}}};
const child=(id,parent_id,x,y)=>({id,parent_id,kind:'rectangle',x,y,width:100,height:30});
const shapes=[grid,left,child(4,2,0,0),child(5,2,0,40),right,child(6,3,220,0)];
const plan=()=>({columns:[200,200],rows:[300],column_gap:20,row_gap:0});
test('line resolves before, between, and after items without counting moving layers',()=>{
 let drop=gridStackDrop(shapes,{x:60,y:10},[6],plan);assert.equal(drop.parent,2);assert.equal(drop.before,4);
 drop=gridStackDrop(shapes,{x:60,y:35},[6],plan);assert.equal(drop.before,5);assert.equal(drop.start.y,35);
 drop=gridStackDrop(shapes,{x:60,y:250},[6],plan);assert.equal(drop.before,0);assert.equal(drop.start.y,75);
 drop=gridStackDrop(shapes,{x:60,y:35},[4],plan);assert.equal(drop.before,5);
});
test('cross-cell targets include empty cell space, and reject locked or recursive destinations',()=>{
 const drop=gridStackDrop(shapes,{x:300,y:200},[4],plan);assert.equal(drop.parent,3);assert.equal(drop.before,0);
 assert.equal(gridStackDrop(shapes.map(s=>s.id===3?{...s,locked:true}:s),{x:300,y:200},[4],plan),null);
 assert.equal(gridStackDrop(shapes,{x:300,y:200},[1,2,3,4,5,6],plan),null);
 const empty=gridStackDrop(shapes.filter(s=>![3,6].includes(s.id)),{x:300,y:200},[4],plan);assert.equal(empty.parent,0);assert.equal(empty.cell.column,2);
});
test('nested CSS grid resolves pointer cell before the enclosing grid',()=>{
 const nested={...left,auto_layout:{direction:'grid',gap:0,grid:{cell_containers:false}}};
 const scene=[nested,child(4,2,0,0),grid];
 const target=gridStackDrop(scene,{x:160,y:75},[4],f=>f.id===2?{columns:[100,100],rows:[50,50],column_gap:0,row_gap:0}:plan());
 assert.equal(target.grid,2);assert.equal(target.direct,true);assert.equal(target.parent,0);
 assert.deepEqual([target.cell.column,target.cell.row],[2,2]);
});
