import test from 'node:test';import assert from 'node:assert/strict';
import {gridPickerCell,gridPickerWindow,sizeGridTracks} from '../web/grid-ux.js';
test('visual cell placement preserves spans and alignment and releases named area assignment',()=>{
 const c={column:1,row:2,column_span:2,row_span:3,area:'body',align_x:'center'};
 assert.deepEqual(gridPickerCell(c,null,4,5),{...c,column:4,row:5,area:''});assert.equal(c.area,'body');
});
test('shift cell selection creates a rectangle in either direction from the current start',()=>{
 const c={column:3,row:4,column_span:1,row_span:1};
 assert.deepEqual([gridPickerCell(c,null,5,6,true).column_span,gridPickerCell(c,null,5,6,true).row_span],[3,3]);
 const back=gridPickerCell(c,null,1,2,true);assert.deepEqual([back.column,back.row,back.column_span,back.row_span],[1,2,3,3]);
 const auto=gridPickerCell({}, {column:2,row:3},4,5,true);assert.deepEqual([auto.column,auto.row,auto.column_span,auto.row_span],[2,3,3,3]);
});
test('visual picker bounds its window and follows placement in large grids',()=>{
 const plan={columns:Array(128),rows:Array(100)};
 assert.deepEqual(gridPickerWindow(plan,{column:128,row:100}),{left:121,top:93,columns:8,rows:8,totalColumns:128,totalRows:100});
 assert.deepEqual(gridPickerWindow({columns:[1,1],rows:[]},{}),{left:1,top:1,columns:2,rows:1,totalColumns:2,totalRows:1});
});
test('quick sizing keeps the grid structure, areas, wrappers and placements intact',()=>{
 const g={columns:[{mode:'fixed',value:100},{mode:'fr',value:2}],rows:[{mode:'fixed',value:60}],areas:[{name:'body',column:1,row:1,column_span:2,row_span:1}],cell_containers:true,dense:true,auto_row_pattern:[{mode:'fixed',value:70}]};
 const balanced=sizeGridTracks(g,'columns','fr');assert.deepEqual(balanced.columns.map(t=>t.value),[1,1]);assert.equal(balanced.areas,g.areas);assert.equal(balanced.rows,g.rows);assert.equal(balanced.cell_containers,true);
 const content=sizeGridTracks(g,'rows','auto');assert.equal(content.rows[0].mode,'auto');assert.equal(content.auto_rows.mode,'auto');assert.deepEqual(content.auto_row_pattern,[]);assert.equal(g.rows[0].mode,'fixed');
});
