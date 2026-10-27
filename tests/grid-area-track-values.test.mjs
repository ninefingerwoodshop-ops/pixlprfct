import test from 'node:test';import assert from 'node:assert/strict';
import {areaTrackValues,updateAreaTrackValues} from '../web/grid-area-track-values.js';
const shape={id:4,layout_item:{grid_container:true,grid_cell:{area:'header'}}};
const plan={columns:[80,120,240],rows:[50,90],placements:[{id:4,column:2,row:1,column_span:2,row_span:1}]};
test('area inspector displays only occupied tracks using measured preview sizes',()=>{
 assert.deepEqual(areaTrackValues(shape,plan),[{key:'columns-2',label:'Column 2 (px)',value:120},{key:'columns-3',label:'Column 3 (px)',value:240},{key:'rows-1',label:'Row 1 (px)',value:50}]);
 assert.deepEqual(areaTrackValues({...shape,layout_item:{}},plan),[]);
 const inputs=new Map();const panel={querySelector:key=>{if(key.includes('measured'))return null;if(!inputs.has(key))inputs.set(key,{value:''});return inputs.get(key);}};
 updateAreaTrackValues(panel,shape,{...plan,columns:[80,150,300],rows:[75,90]});
 assert.deepEqual([...inputs.values()].map(x=>x.value),[150,300,75]);
 updateAreaTrackValues(panel,shape,plan);
 assert.deepEqual([...inputs.values()].map(x=>x.value),[120,240,50]);
});

test('editing one area track preserves neighboring tracks and implicit patterns',async()=>{
 const {editAreaTrack}=await import('../web/grid-area-track-values.js');
 const parent={id:1,auto_layout:{direction:'grid',gap:12,grid:{columns:[{mode:'fr',value:1},{mode:'minmax',value:1,min:50,max:null}],rows:[],auto_row_pattern:[{mode:'fixed',value:30},{mode:'fixed',value:60}]}}};
 const before=JSON.stringify(parent),next=editAreaTrack(parent,'columns-2',175.5);
 assert.deepEqual(next.auto_layout.grid.columns[0],parent.auto_layout.grid.columns[0]);
 assert.equal(next.auto_layout.grid.columns[1].mode,'fixed');assert.equal(next.auto_layout.grid.columns[1].value,175.5);
 assert.deepEqual(editAreaTrack(parent,'rows-3',90).auto_layout.grid.rows.map(t=>t.value),[30,60,90]);
 assert.equal(JSON.stringify(parent),before);
 for(const value of [null,NaN,-1,Infinity])assert.throws(()=>editAreaTrack(parent,'rows-1',value));
 assert.throws(()=>editAreaTrack(parent,'rows-0',10));
});
test('live track updates do not overwrite an input being edited',()=>{
 const input={value:'175'},panel={ownerDocument:{activeElement:input},querySelector:()=>input};
 updateAreaTrackValues(panel,shape,plan);assert.equal(input.value,'175');
});

test('area tracks retain units and live measurements never replace fractional values',async()=>{
 const {editAreaTrack,areaTrackDefinition}=await import('../web/grid-area-track-values.js');
 const parent={auto_layout:{grid:{columns:[{mode:'fr',value:2}],rows:[],auto_rows:{mode:'auto',value:1}}}};
 for(const [mode,value] of [['fixed',120],['fr',2],['percent',35],['auto',1]]){
  const next=editAreaTrack(parent,'columns-1',value,mode);
  assert.equal(next.auto_layout.grid.columns[0].mode,mode);assert.equal(next.auto_layout.grid.columns[0].value,value);
 }
 assert.equal(areaTrackDefinition(parent,'rows-2').mode,'auto');
 const input={value:'2',dataset:{trackMode:'fr'}},measured={};
 updateAreaTrackValues({querySelector:key=>key.includes('measured')?measured:input},shape,plan);
 assert.equal(input.value,'2');assert.equal(measured.textContent,'50 px on canvas');
});

test('area minmax retains both units and limits without altering adjacent tracks',async()=>{
 const {editAreaTrack}=await import('../web/grid-area-track-values.js');
 const {gridTrackCss}=await import('../web/grid-model.js');
 const parent={auto_layout:{grid:{columns:[{mode:'fr',value:2},{mode:'fixed',value:60}]}}};
 const next=editAreaTrack(parent,'columns-1',1,'minmax',{min:120,min_unit:'px',max_unit:'fr'});
 assert.equal(gridTrackCss(next.auto_layout.grid.columns[0]),'minmax(120px,1fr)');
 assert.deepEqual(next.auto_layout.grid.columns[1],parent.auto_layout.grid.columns[1]);
 const percent=editAreaTrack(next,'columns-1',60,'minmax',{min:20,min_unit:'%',max_unit:'%'});
 assert.equal(gridTrackCss(percent.auto_layout.grid.columns[0]),'minmax(20%,60%)');
 assert.throws(()=>editAreaTrack(parent,'columns-1',1,'minmax',{min:-1}));
 assert.throws(()=>editAreaTrack(parent,'columns-1',1,'minmax',{min_unit:'fr'}));
});
