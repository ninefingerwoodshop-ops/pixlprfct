import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),set=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v})),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`),track=(mode,value=1,extra={})=>({mode,value,...extra});
const l={direction:'grid',gap:10,cross_gap:20,padding_top:10,padding_right:10,padding_bottom:10,padding_left:10,align:'start',justify:'start',hug_width:false,hug_height:true,grid:{columns:[track('fixed',100),track('fr',1),track('fr',2)],rows:[],auto_rows:track('hug')}};
function setup(n=3){const e=new Editor(),f=e.add('frame',100,100),ids=[];set(e,f,{width:640,height:300});for(let i=0;i<n;i++){const id=e.add('rectangle',0,0);set(e,id,{width:80,height:40,layout_item:{...get(e,id).layout_item,fill_width:true}});ids.push(id);}if(n)e.reparent_many(JSON.stringify(ids),f);set(e,f,{auto_layout:l});return{e,f,ids};}
test('grid mixes fixed and weighted fractional columns with automatic content-sized rows',()=>{
 const {e,f,ids}=setup(4),p=JSON.parse(e.grid_layout(f));near(p.columns[0],100);near(p.columns[1],500/3);near(p.columns[2],1000/3);assert.deepEqual(p.rows,[40,40]);assert.equal(get(e,f).height,120);near(get(e,ids[1]).x,220);near(get(e,ids[2]).x,230+500/3);assert.equal(get(e,ids[3]).y,170);const old=e.snapshot();set(e,f,{width:940});near(get(e,ids[1]).width,800/3);e.undo();assert.equal(e.snapshot(),old);const copy=new Editor();copy.load(old);assert.equal(copy.snapshot(),old);copy.free();e.free();
});
test('explicit cells and spans reserve space before automatic row-major placement',()=>{
 const {e,f,ids}=setup(4);set(e,ids[2],{layout_item:{...get(e,ids[2]).layout_item,grid_cell:{column:2,row:1,column_span:2,row_span:2}}});const p=JSON.parse(e.grid_layout(f));assert.deepEqual(p.placements.map(c=>[c.column,c.row]),[[1,1],[1,2],[2,1],[1,3]]);near(get(e,ids[2]).width,p.columns[1]+p.columns[2]+10);set(e,ids[2],{hidden:true});assert.deepEqual(JSON.parse(e.grid_layout(f)).placements.map(c=>[c.column,c.row]),[[1,1],[2,1],[3,1]]);set(e,ids[1],{layout_item:{...get(e,ids[1]).layout_item,absolute:true}});assert.equal(JSON.parse(e.grid_layout(f)).placements.length,2);e.free();
});
test('track bounds clamp fractional growth; cell alignment positions fixed-size children',()=>{
 const {e,f,ids}=setup(1);set(e,f,{height:220,auto_layout:{...l,hug_height:false,grid:{columns:[track('fr',1,{max:120}),track('fr',1)],rows:[track('fixed',100)],auto_rows:track('hug')}}});set(e,ids[0],{width:40,height:20,layout_item:{...get(e,ids[0]).layout_item,fill_width:false,grid_cell:{column:1,row:1,align_x:'center',align_y:'end'}}});const p=JSON.parse(e.grid_layout(f));near(p.columns[0],120);near(p.columns[1],490);assert.equal(get(e,ids[0]).x,150);assert.equal(get(e,ids[0]).y,190);e.free();
});
test('grid dimensions scale but fractions and spans stay dimensionless; component instances inherit protected tracks',()=>{
 const {e,f,ids}=setup();e.create_component(f);const i=e.create_instance(f,1000,100);assert.throws(()=>set(e,i,{auto_layout:{...get(e,i).auto_layout,grid:{...l.grid,columns:[track('fixed',200),track('fr',1)]}}}),/Instance appearance is protected/);set(e,f,{auto_layout:{...l,gap:30}});assert.equal(get(e,i).auto_layout.grid.columns.length,3);assert.equal(get(e,i).auto_layout.gap,30);e.reset_override(i,'auto_layout.grid');assert.equal(get(e,i).auto_layout.grid.columns.length,3);const scaled=scaleShapes([get(e,f)],{x:0,y:0},2)[0];assert.equal(scaled.auto_layout.grid.columns[0].value,200);assert.equal(scaled.auto_layout.grid.columns[2].value,2);const before=e.snapshot();for(const grid of [{...l.grid,columns:[]},{...l.grid,columns:[track('fr',0)]}]){assert.throws(()=>set(e,f,{auto_layout:{...l,grid}}));assert.equal(e.snapshot(),before);}assert.throws(()=>set(e,ids[0],{layout_item:{...get(e,ids[0]).layout_item,grid_cell:{column_span:0}}}));assert.equal(e.snapshot(),before);e.free();
});
test('canvas drops reserve the pointed grid cell and undo restores the complete layout',()=>{
 const {e,f,ids}=setup(6),before=e.snapshot(),p=JSON.parse(e.grid_layout(f));
 const moving={...get(e,ids[0]),x:230+p.columns[1],y:170};
 e.move_into(JSON.stringify([moving]),f);
 let cell=JSON.parse(e.grid_layout(f)).placements.find(p=>p.id===ids[0]);assert.equal(cell.column,3);assert.equal(cell.row,2);
 e.undo();assert.equal(e.snapshot(),before);e.redo();
 const pinned=get(e,ids[0]);e.move_into(JSON.stringify([{...pinned,x:160-pinned.width/2,y:110}]),f);
 cell=JSON.parse(e.grid_layout(f)).placements.find(p=>p.id===ids[0]);assert.equal(cell.column,1);assert.equal(cell.row,1);
 e.free();
});
test('nested grid frames resize their fill children and hug intrinsic content',()=>{
 const {e,f}=setup(0),nested=e.add('frame',0,0),child=e.add('rectangle',0,0);
 set(e,child,{width:120,height:60});e.reparent_many(JSON.stringify([child]),nested);
 set(e,nested,{auto_layout:{...l,hug_width:true,hug_height:true,grid:{columns:[track('hug')],rows:[],auto_rows:track('hug')}}});
 assert.equal(get(e,nested).width,140);assert.equal(get(e,nested).height,80);
 e.reparent_many(JSON.stringify([nested]),f);set(e,nested,{layout_item:{...get(e,nested).layout_item,fill_width:true}});
 set(e,f,{auto_layout:{...l,grid:{columns:[track('fr')],rows:[],auto_rows:track('hug')}}});
 near(get(e,nested).width,620);assert.equal(get(e,f).height,100);
 set(e,child,{layout_item:{...get(e,child).layout_item,fill_width:true}});
 set(e,nested,{auto_layout:{...get(e,nested).auto_layout,grid:{columns:[track('fr')],rows:[],auto_rows:track('hug')}}});
 near(get(e,child).width,600);set(e,f,{width:940});near(get(e,child).width,900);e.free();
});
