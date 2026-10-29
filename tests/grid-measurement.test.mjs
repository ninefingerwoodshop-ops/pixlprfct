import test from 'node:test';
import assert from 'node:assert/strict';
import {measuredGridPlacement} from '../web/grid-measurement.js';
const plan={columns:[100,200,150],rows:[60,80],column_gap:10,row_gap:8};
test('active named-area lines replace the saved base placement',()=>{
 const shape={id:4,layout_item:{grid_cell:{area:'hero',column:1,row:1,column_span:2,row_span:1}}};
 const area={name:'hero',column:2,row:2,column_span:2,row_span:1};
 assert.deepEqual(measuredGridPlacement(shape,{areas:[area]},plan,{}),{id:4,column:2,row:2,column_span:2,row_span:1});
});
test('auto placement follows measured tracks for start, center and end alignment',()=>{
 const shape={id:4,layout_item:{grid_cell:{column_span:2,row_span:1}}};
 for(const [align,x,y] of [['start',110,68],['center',265,98],['end',420,128]]){
  const placement=measuredGridPlacement(shape,{justify_items:align,align_items:align},plan,{x,y,width:50,height:20},{justifySelf:'auto',alignSelf:'auto'});
  assert.deepEqual(placement,{id:4,column:2,row:2,column_span:2,row_span:1});
 }
});
test('explicit lines and per-item alignment take precedence over automatic inference',()=>{
 const shape={id:4,layout_item:{grid_cell:{column:1,row:null,column_span:1,row_span:1}}};
 const placement=measuredGridPlacement(shape,{align_items:'start'},plan,{x:0,y:128,width:50,height:20},{gridColumnStart:'3',gridColumnEnd:'span 1',alignSelf:'end'});
 assert.deepEqual(placement,{id:4,column:3,row:2,column_span:1,row_span:1});
});
