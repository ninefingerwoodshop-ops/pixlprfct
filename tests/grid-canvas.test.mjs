import test from 'node:test';import assert from 'node:assert/strict';
import {gridSpanResize,gridTracks,gridDropTarget} from '../web/grid-canvas.js';
const frame={x:100,y:200,auto_layout:{padding_left:10,padding_top:10,gap:10,cross_gap:20}};
const plan={columns:[100,100,100],rows:[50,50,50],placements:[{id:2,column:1,row:1,column_span:1,row_span:1}]};
const shape={id:2,layout_item:{grid_cell:{align_x:'center'}}};
test('corner resizing spans tracks and gaps while preserving alignment',()=>{const s=gridSpanResize(shape,frame,plan,{x:430,y:400},1,1);assert.equal(s.layout_item.grid_cell.column_span,3);assert.equal(s.layout_item.grid_cell.row_span,3);assert.equal(s.layout_item.grid_cell.align_x,'center');assert.equal(s.layout_item.fill_width,true);assert.equal(s.layout_item.fill_height,true);assert.equal(shape.layout_item.fill_width,undefined);});
test('leading edges change origin, side handles preserve other axis, and spans never invert',()=>{const p={...plan,placements:[{id:2,column:1,row:1,column_span:3,row_span:3}]};const s=gridSpanResize(shape,frame,p,{x:220,y:0},0,.5);assert.equal(s.layout_item.grid_cell.column,2);assert.equal(s.layout_item.grid_cell.column_span,2);assert.equal(s.layout_item.grid_cell.row_span,3);assert.equal(s.layout_item.fill_height,undefined);assert.equal(gridSpanResize(shape,frame,plan,{x:-999,y:-999},1,1).layout_item.grid_cell.column_span,1);});
test('grid geometry includes padding and inside strokes',()=>{const t=gridTracks({...frame,stroke_width:2,appearance:{stroke_enabled:true,stroke_alignment:'inside'},auto_layout:{...frame.auto_layout,strokes_included:true}},plan);assert.deepEqual(t.columns[0],{start:112,end:212});assert.deepEqual(t.rows[1],{start:282,end:332});});
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('span gesture previews layout without saving, then commits and undoes as one change',()=>{
 const e=new Editor(),f=e.add('frame',0,0),id=e.add('rectangle',0,0),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),set=(id,v)=>e.update(JSON.stringify({...get(id),...v}));
 set(id,{width:40,height:30});e.reparent_many(JSON.stringify([id]),f);set(f,{width:340,height:220,auto_layout:{direction:'grid',gap:10,cross_gap:10,padding_top:10,padding_left:10,padding_bottom:10,padding_right:10,align:'start',justify:'start',hug_width:false,hug_height:false,grid:{columns:Array(3).fill({mode:'fixed',value:100}),rows:Array(3).fill({mode:'fixed',value:60}),auto_rows:{mode:'hug',value:1}}}});
 const before=e.snapshot(),p=JSON.parse(e.grid_layout(f)),next=gridSpanResize(get(id),get(f),p,{x:330,y:210},1,1),preview=JSON.parse(e.preview_layout_update(JSON.stringify([next]),f));
 assert.equal(e.snapshot(),before);assert.equal(preview.grid.placements[0].column_span,3);assert.equal(preview.grid.placements[0].row_span,3);
 e.update(JSON.stringify(next));assert.equal(get(id).width,320);assert.equal(get(id).height,200);e.undo();assert.equal(e.snapshot(),before);e.free();
});

test('drop preview covers the named region rather than only its hit cell',()=>{const f={...frame,auto_layout:{...frame.auto_layout,grid:{areas:[{name:'content',column:1,row:1,column_span:2,row_span:2}]}}};const target=gridDropTarget(f,plan,{x:250,y:290});assert.equal(target.area,'content');assert.deepEqual([target.x,target.y,target.width,target.height],[110,210,210,120]);assert.equal(gridDropTarget(f,plan,{x:400,y:400}).area,undefined);});
test('grid span resizing updates instance placement and preserves its component link',()=>{
 const e=new Editor(),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),set=(id,v)=>e.update(JSON.stringify({...get(id),...v}));
 const main=e.add('frame',600,0);e.create_component(main);
 const instance=e.create_instance(main,0,0),f=e.add('frame',0,0);
 set(f,{width:300,height:200,auto_layout:{direction:'grid',gap:0,padding_top:0,padding_right:0,padding_bottom:0,padding_left:0,align:'start',justify:'start',hug_width:false,hug_height:false,grid:{columns:[{mode:'fixed',value:100},{mode:'fixed',value:100},{mode:'fixed',value:100}],rows:[{mode:'fixed',value:100},{mode:'fixed',value:100}]}}});
 e.reparent_many(JSON.stringify([instance]),f);
 const before=e.snapshot(),p=JSON.parse(e.grid_layout(f));
 const next=gridSpanResize(get(instance),get(f),p,{x:300,y:200},1,1);
 e.update(JSON.stringify(next));
 assert.equal(get(instance).layout_item.grid_cell.column_span,3);
 assert.equal(get(instance).layout_item.grid_cell.row_span,2);
 assert.equal(get(instance).component.type,'instance');
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
import {historyGridItemSelection} from '../web/grid-canvas.js';
test('undo and redo retain surviving grid selections for cell moves and spans',()=>{
 const grid={id:1,page_id:1,auto_layout:{direction:'grid'}};
 const item={id:2,page_id:1,parent_id:1,layout_item:{grid_cell:{column:1,row:1,column_span:1,row_span:1}}};
 const before={active_page:1,shapes:[grid,item]};
 for(const cell of [{column:2,row:3,column_span:1,row_span:1},{column:1,row:1,column_span:2,row_span:3}]){
  const after={active_page:1,shapes:[grid,{...item,layout_item:{grid_cell:cell}}]};
  assert.deepEqual(historyGridItemSelection(before,after,[2]),[2]);
  assert.deepEqual(historyGridItemSelection(after,before,[2]),[2]);
 }
 assert.equal(historyGridItemSelection(before,before,[2]),null);
 assert.equal(historyGridItemSelection(before,{active_page:1,shapes:[grid]},[2]),null);
 assert.equal(historyGridItemSelection(before,{...before,active_page:2},[2]),null);
});
import {gridArrowMove} from '../web/grid-canvas.js';
test('arrow keys move wrapper grid items by a cell, preserve spans, and stop at edges',()=>{
 const parent={id:1,layout_item:{grid_container:true},auto_layout:{direction:'grid',grid:{}}};
 const item={id:2,parent_id:1,layout_item:{grid_cell:{area:'main',align_x:'center'}}};
 const p={columns:[100,100,100],rows:[50,50,50],placements:[{id:2,column:1,row:1,column_span:2,row_span:2}]};
 const right=gridArrowMove([item],parent,p,'ArrowRight')[0];
 assert.deepEqual(right.layout_item.grid_cell,{area:'',align_x:'center',column:2,row:1,column_span:2,row_span:2});
 assert.equal(gridArrowMove([item],parent,p,'ArrowDown')[0].layout_item.grid_cell.row,2);
 assert.deepEqual(gridArrowMove([item],parent,p,'ArrowLeft'),[]);
 assert.deepEqual(gridArrowMove([item],parent,p,'ArrowUp'),[]);
 const edge={...p,placements:[{...p.placements[0],column:2,row:2}]};
 assert.deepEqual(gridArrowMove([item],parent,edge,'ArrowRight'),[]);
 assert.deepEqual(gridArrowMove([item],parent,edge,'ArrowDown'),[]);
 assert.equal(gridArrowMove([item],{...parent,layout_item:{}},p,'ArrowRight'),null);
 assert.equal(gridArrowMove([{...item,layout_item:{absolute:true}}],parent,p,'ArrowRight'),null);
});

test('named area wrappers resize tracks while ordinary grid children retain span resizing',async()=>{
 const {isNamedAreaLayer}=await import('../web/grid-canvas.js');
 assert.equal(isNamedAreaLayer({layout_item:{grid_container:true,grid_cell:{area:'header'}}}),true);
 assert.equal(isNamedAreaLayer({layout_item:{grid_container:false,grid_cell:{area:'header'}}}),false);
 assert.equal(isNamedAreaLayer({layout_item:{grid_container:true,grid_cell:{area:''}}}),false);
});

test('new shapes use the drawn cell rather than advancing automatic placement',async()=>{
 const {gridCreationPlacement}=await import('../web/grid-canvas.js');
 const frame={x:10,y:20,width:220,height:210,auto_layout:{direction:'grid',gap:10,grid:{areas:[{name:'header',column:1,row:1,column_span:2,row_span:1}]}}};
 const plan={columns:[100,110],rows:[100,100],placements:[]};
 const shape={parent_id:1,width:30,height:20,layout_item:{fill_width:false}};
 const placed=gridCreationPlacement(shape,frame,plan,{x:180,y:190});
 assert.deepEqual(placed.layout_item.grid_cell,{column:2,row:2,column_span:1,row_span:1,area:''});
 assert.equal(placed.layout_item.fill_width,false);
 assert.equal(gridCreationPlacement(shape,frame,plan,{x:180,y:40}).layout_item.grid_cell.area,'header');
 assert.equal(gridCreationPlacement(shape,{...frame,auto_layout:{...frame.auto_layout,grid:{masonry:true}}},plan,{x:180,y:190}),shape);
 assert.equal(gridCreationPlacement(shape,{...frame,auto_layout:{direction:'vertical'}},null,{x:180,y:190}),shape);
});
