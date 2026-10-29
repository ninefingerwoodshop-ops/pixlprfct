import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {gridCss,gridTrackCss} from '../web/grid-model.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const t=(mode,value=1,extra={})=>({mode,value,...extra});
function setup(count=5){const e=new Editor(),f=e.add('frame',0,0),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),set=(id,v)=>e.update(JSON.stringify({...get(id),...v}));set(f,{width:400,height:300});const ids=[];for(let i=0;i<count;i++){const id=e.add('rectangle',0,0);set(id,{width:20,height:20});ids.push(id);}if(count)e.reparent_many(JSON.stringify(ids),f);const layout={direction:'grid',gap:0,cross_gap:0,padding_top:0,padding_right:0,padding_bottom:0,padding_left:0,align:'start',justify:'start',hug_width:false,hug_height:false};const grid=g=>set(f,{auto_layout:{...layout,grid:{columns:[t('fr'),t('fr')],rows:[],auto_rows:t('fixed',50),...g}}});return {e,f,get,set,ids,grid,plan:()=>JSON.parse(e.grid_layout(f))};}
test('relative units and minmax persist and export valid CSS',()=>{const {e,grid,plan,get,f}=setup(3);grid({columns:[t('percent',25),t('em',2),t('minmax',1,{min:80,min_unit:'px',max_unit:'fr'})]});assert.deepEqual(plan().columns,[100,32,268]);const g=get(f).auto_layout.grid;assert.match(gridCss(g)['grid-template-columns'],/25% 2em minmax\(80px,1fr\)/);const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();e.free();});
test('column flow creates implicit columns with repeating sizes',()=>{const {e,grid,plan}=setup();grid({columns:[t('fixed',60)],rows:[t('fixed',40),t('fixed',40)],auto_flow:'column',auto_column_pattern:[t('fixed',80),t('fixed',100)]});assert.deepEqual(plan().columns,[60,80,100]);assert.deepEqual(plan().placements.map(p=>[p.column,p.row]),[[1,1],[1,2],[2,1],[2,2],[3,1]]);e.free();});
test('dense placement fills earlier holes and content alignment offsets tracks',()=>{const {e,grid,plan,set,get,ids}=setup(3);for(const id of ids.slice(0,2))set(id,{layout_item:{...get(id).layout_item,grid_cell:{column_span:2}}});grid({columns:[t('fixed',50),t('fixed',50),t('fixed',50)],dense:true,justify_content:'center',align_content:'end'});assert.deepEqual(plan().placements.map(p=>[p.column,p.row]),[[1,1],[1,2],[3,1]]);assert.equal(plan().offset_x,125);assert.equal(plan().offset_y,200);e.free();});
test('named areas reserve spans, reject overlaps, and export template areas',()=>{const {e,f,grid,plan,set,get,ids}=setup(2);const areas=[{name:'header',column:1,row:1,column_span:2,row_span:1},{name:'sidebar',column:1,row:2,column_span:1,row_span:2}];grid({areas});set(ids[0],{layout_item:{...get(ids[0]).layout_item,grid_cell:{area:'sidebar'}}});assert.equal(plan().placements[0].row_span,2);assert.equal(plan().placements[0].row,2);const g=get(f).auto_layout.grid;assert.equal(gridCss(g)['grid-template-areas'],'"header header" "sidebar ." "sidebar ."');const saved=e.snapshot();assert.throws(()=>grid({areas:[...areas,{name:'overlap',column:1,row:1,column_span:1,row_span:1}]}));assert.equal(e.snapshot(),saved);e.free();});
test('inherited stretch applies unless the child sets its own alignment',()=>{const {e,grid,plan,set,get,ids}=setup(1);grid({columns:[t('fixed',100)],rows:[t('fixed',80)],justify_items:'stretch',align_items:'center'});assert.equal(plan().placements[0].width,100);assert.equal(plan().placements[0].y,30);set(ids[0],{width:20,layout_item:{...get(ids[0]).layout_item,grid_cell:{align_x:'end'}}});assert.equal(plan().placements[0].width,20);assert.equal(plan().placements[0].x,80);e.free();});
test('track serializer supports all reference sizing modes without CSS injection',()=>{for(const mode of ['auto','min-content','max-content'])assert.equal(gridTrackCss(t(mode)),mode);assert.equal(gridTrackCss(t('minmax',200,{min:2,min_unit:'em',max_unit:'px'})),'minmax(2em,200px)');assert.equal(gridTrackCss(t('fixed','red; color:red')),'0px');});
test('finite minmax tracks grow to their limits before fractional tracks',()=>{
 const {e,f,grid,plan,set}=setup(0);
 const bounded=t('minmax',180,{min:80,min_unit:'px',max_unit:'px'});
 grid({columns:[bounded,t('fr')],rows:[t('minmax',100,{min:40,min_unit:'px',max_unit:'px'})]});
 assert.deepEqual(plan().columns,[180,220]);assert.deepEqual(plan().rows,[100]);
 set(f,{width:120});assert.deepEqual(plan().columns,[120,0]);
 set(f,{width:60});assert.deepEqual(plan().columns,[80,0]);
 e.free();
});
test('finite minmax tracks share constrained space and stop at each growth limit',()=>{
 const {e,f,grid,plan,set}=setup(0);
 grid({columns:[t('minmax',120,{min:100,min_unit:'px',max_unit:'px'}),t('minmax',200,{min:50,min_unit:'px',max_unit:'px'})]});
 set(f,{width:250});assert.deepEqual(plan().columns,[120,130]);
 set(f,{width:400});assert.deepEqual(plan().columns,[120,200]);
 e.free();
});
test('browser-resolved drop cells are atomic and work for protected instances',()=>{const {e,f,grid,get,ids}=setup(2);grid({columns:[t('fr'),t('fr')],rows:[t('fixed',100),t('fixed',100)]});const main=e.add('frame',600,600);e.create_component(main);const instance=e.create_instance(main,500,500),before=e.snapshot();e.move_into_cells(JSON.stringify([{...get(instance),x:300,y:140}]),f,JSON.stringify([[instance,2,2]]));assert.equal(get(instance).layout_item.grid_cell.column,2);assert.equal(get(instance).layout_item.grid_cell.row,2);const placed=JSON.parse(e.grid_layout(f)).placements.find(p=>p.id===instance);assert.equal(placed.column,2);assert.equal(placed.row,2);e.undo();assert.equal(e.snapshot(),before);e.free();});
test('dropping into a named area binds it, follows area edits, and clears outside it',()=>{const {e,f,grid,get,set,ids}=setup(1);const area={name:'content',column:1,row:1,column_span:2,row_span:1};grid({areas:[area],rows:[t('fixed',80),t('fixed',80)]});const before=e.snapshot();e.move_into_cells(JSON.stringify([get(ids[0])]),f,JSON.stringify([[ids[0],2,1]]));assert.equal(get(ids[0]).layout_item.grid_cell.area,'content');assert.equal(JSON.parse(e.grid_layout(f)).placements[0].column_span,2);e.undo();assert.equal(e.snapshot(),before);e.redo();set(f,{auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,areas:[{...area,row_span:2}]}}});assert.equal(JSON.parse(e.grid_layout(f)).placements[0].row_span,2);e.move_into_cells(JSON.stringify([get(ids[0])]),f,JSON.stringify([[ids[0],1,3]]));assert.equal(get(ids[0]).layout_item.grid_cell.area,'');e.free();});
test('renaming an area updates all its children atomically and preserves other assignments',()=>{const {e,f,grid,get,set,ids,plan}=setup(3);grid({areas:[{name:'content',column:1,row:1,column_span:2,row_span:1},{name:'footer',column:1,row:2,column_span:2,row_span:1}]});for(const id of ids.slice(0,2))set(id,{layout_item:{...get(id).layout_item,grid_cell:{area:'content'}}});set(ids[2],{layout_item:{...get(ids[2]).layout_item,grid_cell:{area:'footer'}}});const before=e.snapshot(),positions=plan().placements;e.rename_grid_area(f,'content','main');assert.deepEqual(ids.map(id=>get(id).layout_item.grid_cell.area),['main','main','footer']);assert.deepEqual(plan().placements,positions);const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);assert.throws(()=>e.rename_grid_area(f,'main','footer'));assert.equal(e.snapshot(),after);assert.throws(()=>e.rename_grid_area(f,'main','bad name'));assert.equal(e.snapshot(),after);e.free();});

test('area rename updates assigned component instances',()=>{const {e,f,grid,get}=setup(0);grid({areas:[{name:'slot',column:1,row:1,column_span:2,row_span:1}]});const main=e.add('frame',600,600);e.create_component(main);const instance=e.create_instance(main,500,500);e.move_into_cells(JSON.stringify([get(instance)]),f,JSON.stringify([[instance,1,1]]));e.rename_grid_area(f,'slot','body');assert.equal(get(instance).layout_item.grid_cell.area,'body');e.free();});
test('deleting an area keeps assigned items in its current cells and spans with atomic undo',()=>{const {e,f,grid,get,set,ids,plan}=setup(3);const area={name:'content',column:2,row:2,column_span:2,row_span:2};grid({columns:[t('fixed',100),t('fixed',100),t('fixed',100)],rows:[t('fixed',60),t('fixed',60),t('fixed',60)],areas:[area,{name:'other',column:1,row:1,column_span:1,row_span:1}]});for(const id of ids.slice(0,2))set(id,{layout_item:{...get(id).layout_item,grid_cell:{area:'content',column:1,row:1,align_x:'center'}}});set(ids[2],{layout_item:{...get(ids[2]).layout_item,grid_cell:{area:'other'}}});const before=e.snapshot(),positions=plan().placements;e.delete_grid_area(f,'content');assert.deepEqual(plan().placements,positions);for(const id of ids.slice(0,2)){const c=get(id).layout_item.grid_cell;assert.deepEqual([c.area,c.column,c.row,c.column_span,c.row_span,c.align_x],['',2,2,2,2,'center']);}assert.equal(get(ids[2]).layout_item.grid_cell.area,'other');const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);assert.throws(()=>e.delete_grid_area(f,'missing'));assert.equal(e.snapshot(),after);e.free();});
test('deleting an area keeps instance placement and hidden assignments',()=>{const {e,f,grid,get,set,ids}=setup(1);grid({areas:[{name:'slot',column:2,row:2,column_span:1,row_span:2}]});set(ids[0],{hidden:true,layout_item:{...get(ids[0]).layout_item,grid_cell:{area:'slot'}}});const main=e.add('frame',600,600);e.create_component(main);const instance=e.create_instance(main,500,500);e.move_into_cells(JSON.stringify([get(instance)]),f,JSON.stringify([[instance,2,2]]));e.delete_grid_area(f,'slot');for(const id of [instance,ids[0]]){const c=get(id).layout_item.grid_cell;assert.deepEqual([c.area,c.column,c.row,c.column_span,c.row_span],['',2,2,1,2]);}e.free();});
test('moving a named area moves all assigned children together and undoes atomically',()=>{const {e,f,grid,get,set,ids,plan}=setup(2);const area={name:'content',column:1,row:1,column_span:2,row_span:1};grid({columns:[t('fixed',100),t('fixed',100),t('fixed',100)],rows:[t('fixed',60),t('fixed',60)],areas:[area]});for(const id of ids)set(id,{layout_item:{...get(id).layout_item,grid_cell:{area:'content'}}});const before=e.snapshot(),positions=plan().placements;set(f,{auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,areas:[{...area,column:2,row:2}]}}});for(const [i,p] of plan().placements.entries()){assert.equal(p.column,2);assert.equal(p.row,2);assert.equal(p.column_span,2);assert.equal(p.x,positions[i].x+100);assert.equal(p.y,positions[i].y+60);assert.equal(get(ids[i]).layout_item.grid_cell.area,'content');}e.undo();assert.equal(e.snapshot(),before);e.free();});
test('live area movement previews assigned items without saving or adding undo entries',()=>{const {e,f,grid,get,set,ids}=setup(2);const area={name:'content',column:1,row:1,column_span:1,row_span:1};grid({columns:[t('fixed',100),t('fixed',100)],rows:[t('fixed',60),t('fixed',60)],areas:[area]});for(const id of ids)set(id,{layout_item:{...get(id).layout_item,grid_cell:{area:'content'}}});const before=e.snapshot();const moved={...get(f),auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,areas:[{...area,column:2,row:2}]}}};const preview=JSON.parse(e.preview_layout_update(JSON.stringify([moved]),f));assert.equal(e.snapshot(),before);for(const id of ids){const old=get(id),next=preview.document.shapes.find(s=>s.id===id);assert.equal(next.x,old.x+100);assert.equal(next.y,old.y+60);assert.equal(next.layout_item.grid_cell.area,'content');}e.update(JSON.stringify(moved));e.undo();assert.equal(e.snapshot(),before);e.free();});
test('dropping into occupied ordinary cells uses the next free row in the column',()=>{const {e,f,grid,get,set,ids}=setup(2);grid({columns:[t('fixed',100),t('fixed',100)],rows:[t('fixed',60),t('fixed',60)]});set(ids[0],{layout_item:{...get(ids[0]).layout_item,grid_cell:{column:1,row:1,row_span:2}}});const before=e.snapshot();e.move_into_cells(JSON.stringify([get(ids[1])]),f,JSON.stringify([[ids[1],1,1]]));assert.equal(get(ids[1]).layout_item.grid_cell.column,1);assert.equal(get(ids[1]).layout_item.grid_cell.row,3);assert.equal(get(ids[0]).layout_item.grid_cell.row,1);e.undo();assert.equal(e.snapshot(),before);e.free();});

test('editable cell frames stack drops, preserve sizing and undo atomically',()=>{
 const {e,f,grid,get,set,ids}=setup(2);grid({cell_containers:true,auto_rows:t('hug')});
 const container=get(ids[0]).parent_id;
 assert.notEqual(container,f);assert.equal(get(container).parent_id,f);
 assert.equal(get(container).auto_layout.direction,'vertical');assert.equal(get(container).auto_layout.gap,8);
 const before=e.snapshot();
 e.move_into_cells(JSON.stringify([get(ids[1])]),f,JSON.stringify([[ids[1],1,1]]));
 assert.equal(get(ids[1]).parent_id,container);
 assert.equal(get(ids[1]).y,get(ids[0]).y+get(ids[0]).height+8);
 set(container,{auto_layout:{...get(container).auto_layout,gap:24}});
 assert.equal(get(ids[1]).y,get(ids[0]).y+get(ids[0]).height+24);
 e.undo();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(ids[1]).parent_id,container);
 set(container,{auto_layout:{...get(container).auto_layout,direction:'grid',grid:{cell_containers:true,columns:[t('fr'),t('fr')],rows:[],auto_rows:t('hug')}}});
 assert.equal(get(container).auto_layout.direction,'grid');assert.notEqual(get(ids[0]).parent_id,container);
 const saved=e.snapshot();const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();e.free();
});
test('existing named-area items migrate into one flex frame and follow area edits',()=>{
 const {e,f,grid,get,set,ids}=setup(2);const area={name:'content',column:1,row:1,column_span:2,row_span:1};
 grid({areas:[area],rows:[t('fixed',120),t('fixed',120)]});
 for(const id of ids)set(id,{layout_item:{...get(id).layout_item,grid_cell:{area:'content'}}});
 e.enable_grid_containers();const container=get(ids[0]).parent_id;
 assert.equal(get(ids[1]).parent_id,container);assert.equal(get(container).layout_item.grid_cell.area,'content');
 assert.equal(get(ids[1]).y-get(ids[0]).y,28);
 assert.equal(get(container).name,'content');
 e.rename_grid_area(f,'content','main');assert.equal(get(container).layout_item.grid_cell.area,'main');
 assert.equal(get(container).name,'main');
 assert.notEqual(get(ids[0]).name,'main');
 e.undo();assert.equal(get(container).name,'content');
 e.redo();assert.equal(get(container).name,'main');
 const before=get(ids[0]).y;set(f,{auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,areas:[{...area,name:'main',row:2}]}}});assert.equal(get(ids[0]).y,before+120);
 e.delete_grid_area(f,'main');assert.equal(get(ids[1]).parent_id,container);assert.equal(get(ids[1]).y-get(ids[0]).y,28);
 e.free();
});
test('cell frames sync from components and remain real nested CSS layouts on export',async()=>{
 const {compileCssScene}=await import('../web/css-renderer.js');
 const {layoutClass}=await import('../web/layout-class.js');
 const {e,f,grid,get,set,ids}=setup(2);grid({cell_containers:true});e.create_component(f);
 const instance=e.create_instance(f,500,0),container=get(ids[0]).parent_id;
 set(container,{auto_layout:{...get(container).auto_layout,gap:17}});
 const shapes=JSON.parse(e.snapshot()).shapes;
 const linked=shapes.find(s=>s.component?.source===container&&s.id!==container);
 assert.ok(linked);assert.equal(linked.auto_layout.gap,17);assert.equal(linked.parent_id,instance);
 const css=compileCssScene(shapes);assert.match(css.css,new RegExp(layoutClass(get(container))+'\\{[^}]*display:flex'));
 assert.match(css.html,new RegExp('data-px-id="'+container+'"[^>]*><div[^>]*data-px-id="'+ids[0]+'"'));
 e.free();
});
test('canvas insertion reorders and transfers a multi-selection as one undo step',()=>{
 const {e,f,grid,get,ids}=setup(4);grid({cell_containers:true});
 const left=get(ids[0]).parent_id,right=get(ids[1]).parent_id;
 const children=id=>JSON.parse(e.snapshot()).shapes.filter(s=>s.parent_id===id).map(s=>s.id);
 e.move_into_before(JSON.stringify([ids[2],ids[3]]),left,0);
 assert.deepEqual(children(left),[ids[0],ids[2],ids[3]]);
 const before=e.snapshot();e.move_into_before(JSON.stringify([ids[3]]),left,ids[0]);
 assert.deepEqual(children(left),[ids[3],ids[0],ids[2]]);e.undo();assert.equal(e.snapshot(),before);
 e.move_into_before(JSON.stringify([ids[0],ids[2]]),right,ids[1]);
 assert.deepEqual(children(right),[ids[0],ids[2],ids[1]]);e.undo();assert.equal(e.snapshot(),before);e.redo();
 assert.deepEqual(children(right),[ids[0],ids[2],ids[1]]);
 assert.throws(()=>e.move_into_before(JSON.stringify([left]),left,0));e.free();
});
test('live stack previews shift neighbors, match the drop, and leave document/history untouched',()=>{
 const {e,grid,f,get,ids}=setup(3);grid({cell_containers:true});
 const left=get(ids[0]).parent_id,right=get(ids[1]).parent_id;
 e.move_into_before(JSON.stringify([ids[2]]),left,0);e.clear_history();
 const original=e.snapshot(),originalTarget=get(ids[1]);
 const preview=JSON.parse(e.preview_grid_drop(JSON.stringify([ids[0]]),f,right,ids[1],2,1));
 const find=id=>preview.shapes.find(s=>s.id===id);
 assert.equal(find(ids[0]).parent_id,right);assert.equal(find(ids[1]).y,originalTarget.y+find(ids[0]).height+8);
 assert.equal(find(ids[2]).y,get(ids[0]).y);assert.equal(e.snapshot(),original);
 e.undo();assert.equal(e.snapshot(),original);
 e.move_into_before(JSON.stringify([ids[0]]),right,ids[1]);assert.deepEqual(JSON.parse(e.snapshot()),preview);
 e.undo();assert.equal(e.snapshot(),original);
 // A cancelled preview must not clear the redo stack.
 e.preview_grid_drop(JSON.stringify([ids[2]]),f,left,ids[0],1,1);e.redo();assert.deepEqual(JSON.parse(e.snapshot()),preview);e.free();
});
test('previewing an empty cell creates its stack only in the preview',()=>{
 const {e,grid,f,get,ids}=setup(1);grid({cell_containers:true,columns:[t('fr'),t('fr')]});const before=e.snapshot();
 const preview=JSON.parse(e.preview_grid_drop(JSON.stringify(ids),f,0,0,2,1));
 const moved=preview.shapes.find(s=>s.id===ids[0]),cell=preview.shapes.find(s=>s.id===moved.parent_id);
 assert.equal(cell.layout_item.grid_cell.column,2);assert.equal(cell.auto_layout.direction,'vertical');assert.equal(e.snapshot(),before);
 e.move_into_cells(JSON.stringify([get(ids[0])]),f,JSON.stringify([[ids[0],2,1]]));assert.deepEqual(JSON.parse(e.snapshot()),preview);e.free();
});
test('automatic masonry uses shortest columns and rebalances after height changes',()=>{
 const {e,f,grid,get,set,ids,plan}=setup(4);for(const [i,id] of ids.entries())set(id,{height:[100,30,40,20][i]});
 grid({cell_containers:true,masonry:true,columns:[t('fixed',100),t('fixed',100)]});
 assert.deepEqual(plan().placements.map(p=>p.column),[1,2,2,2]);
 set(ids[0],{height:10});assert.deepEqual(plan().placements.map(p=>p.column),[1,2,1,2]);
 const before=e.snapshot();set(f,{auto_layout:{...get(f).auto_layout,cross_gap:12}});
 assert.equal(plan().placements[2].y,22);e.undo();assert.equal(e.snapshot(),before);
 const copy=new Editor();copy.load(e.snapshot());assert.deepEqual(JSON.parse(copy.grid_layout(f)).placements,plan().placements);copy.free();e.free();
});
test('masonry preserves cell wrapper identity, contents, styling and manual placements',()=>{
 const {e,f,grid,get,set,ids}=setup(3);grid({cell_containers:true});
 const wrappers=ids.map(id=>get(id).parent_id);
 set(wrappers[0],{name:'Custom cell',auto_layout:{...get(wrappers[0]).auto_layout,gap:19,padding_top:7}});
 const before=e.snapshot(),original=wrappers.map(id=>get(id));
 set(f,{auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,masonry:true}}});
 assert.deepEqual(ids.map(id=>get(id).parent_id),wrappers);
 for(const [i,id] of wrappers.entries()){
  assert.deepEqual(get(id).auto_layout,original[i].auto_layout);
  assert.deepEqual(get(id).layout_item,original[i].layout_item);
  assert.equal(get(id).name,original[i].name);
 }
 e.undo();assert.equal(e.snapshot(),before);e.redo();
 set(f,{auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,masonry:false}}});
 assert.deepEqual(ids.map(id=>get(id).parent_id),wrappers);e.free();
});
test('masonry column pins survive reflow, resize, undo and export',async()=>{
 const {e,f,grid,get,set,ids,plan}=setup(4);
 grid({cell_containers:true,masonry:true,columns:[t('fixed',100),t('fixed',100)]});
 set(get(ids[0]).parent_id,{layout_item:{...get(get(ids[0]).parent_id).layout_item,grid_cell:{column:2,row:null,column_span:1,row_span:1,area:''}}});
 assert.equal(plan().placements.find(p=>p.id===get(ids[0]).parent_id).column,2);
 set(ids[0],{height:140});assert.equal(get(get(ids[0]).parent_id).layout_item.grid_cell.column,2);
 assert.equal(plan().placements.find(p=>p.id===get(ids[1]).parent_id).column,1);
 const {compileCssScene}=await import('../web/css-renderer.js');
 assert.match(compileCssScene(JSON.parse(e.snapshot()).shapes).html,/data-masonry-column="2"/);
 const before=e.snapshot();set(get(ids[0]).parent_id,{layout_item:{...get(get(ids[0]).parent_id).layout_item,grid_cell:null}});
 assert.equal(plan().placements.find(p=>p.id===get(ids[0]).parent_id).column,1);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('a cell wrapper can place direct children using a nested CSS grid',async()=>{
 const {e,f,grid,get,set,ids}=setup(3);grid({cell_containers:true});
 const cell=get(ids[0]).parent_id;
 e.move_into_before(JSON.stringify(ids.slice(1)),cell,0);
 const outer=get(f).auto_layout;
 set(cell,{auto_layout:{...get(cell).auto_layout,direction:'grid',grid:{cell_containers:false,columns:[t('fr'),t('fr')],rows:[],auto_rows:t('auto')}}});
 e.enable_grid_containers();
 for(const id of ids)assert.equal(get(id).parent_id,cell);
 set(ids[0],{layout_item:{...get(ids[0]).layout_item,grid_cell:{column:2,row:3,column_span:1,row_span:2}}});
 const placement=JSON.parse(e.grid_layout(cell)).placements.find(p=>p.id===ids[0]);
 assert.deepEqual([placement.column,placement.row,placement.row_span],[2,3,2]);
 assert.deepEqual(get(f).auto_layout,outer);
 const {compileCssScene}=await import('../web/css-renderer.js');
 const scene=compileCssScene(JSON.parse(e.snapshot()).shapes);
 assert.match(scene.css,/grid-column:2 \/ span 1/);
 assert.match(scene.css,/grid-row:3 \/ span 2/);
 const before=e.snapshot();set(ids[0],{layout_item:{...get(ids[0]).layout_item,grid_cell:{column:1,row:1}}});e.undo();assert.equal(e.snapshot(),before);
 e.free();
});
test('dragging within a nested grid pins the exact cell, preserves spans, and undoes',()=>{
 const {e,f,grid,get,set,ids}=setup(2);grid({cell_containers:true});
 const cell=get(ids[0]).parent_id;e.move_into_before(JSON.stringify([ids[1]]),cell,0);
 set(cell,{auto_layout:{...get(cell).auto_layout,direction:'grid',grid:{cell_containers:false,columns:[t('fr'),t('fr')],rows:[t('fixed',60),t('fixed',60)],auto_rows:t('auto')}}});
 set(ids[0],{layout_item:{...get(ids[0]).layout_item,grid_cell:{column:1,row:1,column_span:2,row_span:1}}});
 const before=e.snapshot();
 e.move_into_cells(JSON.stringify([get(ids[0])]),cell,JSON.stringify([[ids[0],1,2]]));
 assert.equal(get(ids[0]).parent_id,cell);
 assert.deepEqual([get(ids[0]).layout_item.grid_cell.column,get(ids[0]).layout_item.grid_cell.row,get(ids[0]).layout_item.grid_cell.column_span],[1,2,2]);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(ids[0]).layout_item.grid_cell.row,2);e.free();
});

test('named-area wrappers fill pixel tracks and follow changed sizes and spans',async()=>{
 const {e,f,grid,get,set}=setup(0);
 const area={name:'hero',column:1,row:1,column_span:1,row_span:1};
 grid({cell_containers:true,columns:[t('fixed',180),t('fixed',220)],rows:[t('fixed',120),t('fixed',80)],areas:[area]});
 const wrapper=JSON.parse(e.snapshot()).shapes.find(s=>s.parent_id===f&&s.layout_item.grid_cell?.area==='hero').id;
 assert.equal(get(wrapper).height,120);assert.equal(get(wrapper).width,180);
 set(f,{auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,rows:[t('fixed',200),t('fixed',80)],areas:[{...area,column_span:2,row_span:2}]}}});
 assert.equal(get(wrapper).height,280);assert.equal(get(wrapper).width,400);
 assert.equal(get(wrapper).layout_item.grid_cell.row_span,2);
 const {compileCssScene}=await import('../web/css-renderer.js');
 const css=compileCssScene(JSON.parse(e.snapshot()).shapes).css;
 assert.match(css,/grid-area:hero/);
 e.undo();assert.equal(get(wrapper).height,120);
 e.redo();assert.equal(get(wrapper).height,280);
 e.free();
});

test('editing named-area wrapper height updates parent pixel rows atomically',()=>{
 const {e,f,grid,get,set}=setup(0);
 grid({cell_containers:true,rows:[t('fixed',100),t('fixed',200)],areas:[{name:'body',column:1,row:1,column_span:1,row_span:2}]});
 set(f,{auto_layout:{...get(f).auto_layout,cross_gap:10}});
 const wrapper=JSON.parse(e.snapshot()).shapes.find(s=>s.parent_id===f&&s.layout_item.grid_cell?.area==='body').id;
 set(wrapper,{height:460});
 assert.deepEqual(get(f).auto_layout.grid.rows.map(t=>t.value),[150,300]);
 assert.equal(get(wrapper).height,460);
 e.undo();assert.equal(get(wrapper).height,310);
 e.redo();assert.equal(get(wrapper).height,460);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===wrapper).height,460);copy.free();e.free();
});

test('named-area width edits synchronize columns and both axes without changing unrelated tracks',()=>{
 const {e,f,grid,get,set}=setup(0);
 grid({cell_containers:true,columns:[t('fixed',100),t('fixed',200),t('fixed',90)],rows:[t('fixed',80)],areas:[{name:'content',column:1,row:1,column_span:2,row_span:1}]});
 set(f,{auto_layout:{...get(f).auto_layout,gap:10}});
 const wrapper=JSON.parse(e.snapshot()).shapes.find(s=>s.parent_id===f&&s.layout_item.grid_cell?.area==='content').id;
 set(wrapper,{width:460,height:120});
 assert.deepEqual(get(f).auto_layout.grid.columns.map(t=>t.value),[150,300,90]);
 assert.equal(get(f).auto_layout.grid.rows[0].value,120);
 assert.equal(get(wrapper).width,460);assert.equal(get(wrapper).height,120);
 e.undo();assert.equal(get(wrapper).width,310);assert.equal(get(wrapper).height,80);
 e.redo();assert.equal(get(wrapper).width,460);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===wrapper).width,460);copy.free();
 set(f,{auto_layout:{...get(f).auto_layout,grid:{...get(f).auto_layout.grid,columns:[t('fixed',75),t('fixed',125),t('fixed',90)]}}});
 assert.equal(get(wrapper).width,210);
 e.free();
});

test('area edge resize previews tracks and neighboring areas without changing document or history',()=>{
 const {e,f,grid,get,set}=setup(0);
 grid({cell_containers:true,columns:[t('fixed',100),t('fixed',200)],rows:[t('fixed',80),t('fixed',120)],areas:[{name:'first',column:1,row:1,column_span:1,row_span:1},{name:'next',column:2,row:2,column_span:1,row_span:1}]});
 const shapes=JSON.parse(e.snapshot()).shapes,first=shapes.find(s=>s.layout_item.grid_cell?.area==='first'),next=shapes.find(s=>s.layout_item.grid_cell?.area==='next');
 const before=e.snapshot(),undo=e.can_undo(),redo=e.can_redo();
 const patch={...first,width:150,height:110};
 const preview=JSON.parse(e.preview_layout_update(JSON.stringify([patch]),f));
 assert.deepEqual(preview.grid.columns,[150,200]);assert.deepEqual(preview.grid.rows,[110,120]);
 const neighbor=preview.document.shapes.find(s=>s.id===next.id);
 assert.equal(neighbor.x,next.x+50);assert.equal(neighbor.y,next.y+30);
 assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),undo);assert.equal(e.can_redo(),redo);
 set(first.id,patch);assert.deepEqual(JSON.parse(e.snapshot()),preview.document);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});

test('area track inspector edits parent sizing and reflows wrappers with undo',async()=>{
 const {editAreaTrack}=await import('../web/grid-area-track-values.js');
 const {e,f,grid,get}=setup(0);
 grid({cell_containers:true,columns:[t('fixed',100),t('fixed',200)],rows:[t('fixed',80)],areas:[{name:'header',column:1,row:1,column_span:2,row_span:1}]});
 const wrapper=JSON.parse(e.snapshot()).shapes.find(s=>s.layout_item.grid_cell?.area==='header').id;
 const before=e.snapshot();
 e.update(JSON.stringify(editAreaTrack(get(f),'columns-2',250)));
 assert.equal(get(wrapper).width,350);assert.equal(get(f).auto_layout.grid.columns[0].value,100);
 e.update(JSON.stringify(editAreaTrack(get(f),'rows-1',120)));
 assert.equal(get(wrapper).height,120);
 e.undo();assert.equal(get(wrapper).height,80);assert.equal(get(wrapper).width,350);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});

test('area resize previews and commits preserve minmax rules and ordinary track limits',()=>{
 const {e,f,grid,get,set}=setup(0);
 const bounded=t('minmax',180,{min:80,min_unit:'px',max_unit:'px'});
 grid({cell_containers:true,columns:[bounded,t('fixed',100,{min:60,max:140})],rows:[t('minmax',100,{min:40,min_unit:'px',max_unit:'px'})],areas:[{name:'body',column:1,row:1,column_span:2,row_span:1}]});
 const wrapper=JSON.parse(e.snapshot()).shapes.find(s=>s.layout_item.grid_cell?.area==='body');
 const before=e.snapshot();
 assert.equal(wrapper.width,280);assert.equal(wrapper.height,100);
 for(const width of [5,1000]){
  const patch={...get(wrapper.id),width,height:1000};
  const preview=JSON.parse(e.preview_layout_update(JSON.stringify([patch]),f));
  const parent=preview.document.shapes.find(s=>s.id===f);
  assert.deepEqual(parent.auto_layout.grid.columns[0],get(f).auto_layout.grid.columns[0]);
  assert.deepEqual(parent.auto_layout.grid.rows,get(f).auto_layout.grid.rows);
  assert.deepEqual(preview.grid.columns,[180,width===5?60:140]);
  assert.deepEqual(preview.grid.rows,[100]);
  assert.equal(e.snapshot(),before);
 }
 set(wrapper.id,{width:1000,height:1000});
 assert.deepEqual(get(f).auto_layout.grid.columns[0],JSON.parse(before).shapes.find(s=>s.id===f).auto_layout.grid.columns[0]);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});

test('drawing into an occupied grid cell joins its wrapper and undoes as one edit',async()=>{
 const {gridCreationPlacement}=await import('../web/grid-canvas.js');
 const {e,f,grid,get,ids,plan}=setup(1);
 grid({cell_containers:true,rows:[t('fixed',100),t('fixed',100)]});
 e.move_into_cells(JSON.stringify([get(ids[0])]),f,JSON.stringify([[ids[0],2,2]]));
 const wrapper=get(ids[0]).parent_id,before=e.snapshot();
 const drawn=gridCreationPlacement({...get(ids[0]),id:0,parent_id:f},get(f),plan(),{x:350,y:180});
 const id=e.insert(JSON.stringify(drawn));
 assert.equal(get(id).parent_id,wrapper);
 assert.ok(get(id).y>=get(ids[0]).y+get(ids[0]).height);
 assert.equal(JSON.parse(e.snapshot()).shapes.filter(s=>s.layout_item?.grid_container).length,JSON.parse(before).shapes.filter(s=>s.layout_item?.grid_container).length);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(id).parent_id,wrapper);e.free();
});
