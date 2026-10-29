import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {parseLayoutCss,responsiveLayoutShapes,gridAreaEditingOverridden} from '../web/layout-css.js';
import {compileCssScene} from '../web/css-renderer.js';
import {createBreakpointPreview} from '../web/breakpoint-preview.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const css=`.layout {display:grid;grid-template-columns:210px 1fr;grid-template-rows:100px 100px;grid-template-areas:"hero hero" ". secondary";gap:12px;padding:16px;}
@media (max-width:500px){.layout {grid-template-columns:1fr;grid-template-rows:60px 80px 100px;grid-template-areas:"secondary" "hero" ".";gap:8px;}}
@media (min-width:701px){.layout {grid-template-columns:100px 1fr 140px;grid-template-areas:"secondary hero hero" ". . .";}}
@media (max-width:320px){.layout {grid-template-areas:none;}}`;
function fixture(){
 const editor=new Editor(),id=editor.add('frame',0,0);
 const shapes=()=>JSON.parse(editor.snapshot()).shapes,get=id=>shapes().find(s=>s.id===id),update=s=>editor.update(JSON.stringify(s));
 update(parseLayoutCss(css,{...get(id),width:600,height:360,auto_layout:{direction:'grid',gap:12,padding_top:16,padding_right:16,padding_bottom:16,padding_left:16,align:'start',justify:'start',hug_width:false,hug_height:false}}));
 const hero=shapes().find(s=>s.layout_item?.grid_cell?.area==='hero').id;
 const child=editor.add('rectangle',0,0);editor.reparent_many(JSON.stringify([child]),hero);
 return {editor,id,hero,child,shapes,get,update,preview:createBreakpointPreview(update)};
}
test('column counts and named-area topology switch without changing layers or base definitions',()=>{
 const {editor,id,hero,child,shapes,get,update,preview}=fixture();
 const baseAreas=get(id).auto_layout.grid.areas,baseCell=get(hero).layout_item.grid_cell,ids=shapes().map(s=>s.id);
 preview.preview(get(id),500);
 const root=get(id);update({...root,auto_layout:{...root.auto_layout,grid:{...root.auto_layout.grid,columns:[...root.auto_layout.grid.columns,{mode:'fr',value:1}]}}});
 for(const [width,count,placement] of [[500,1,[1,2,1,1]],[501,3,[1,1,2,1]],[701,3,[2,1,2,1]],[320,1,null],[321,1,[1,2,1,1]],[701,3,[2,1,2,1]]]){
  preview.preview(get(id),width);
  const active=responsiveLayoutShapes(shapes()),parent=active.find(s=>s.id===id),area=parent.auto_layout.grid.areas.find(a=>a.name==='hero');
  assert.equal(parent.auto_layout.grid.columns.length,count);
  assert.deepEqual(area?[area.column,area.row,area.column_span,area.row_span]:null,placement);
  assert.deepEqual(shapes().map(s=>s.id),ids);assert.equal(get(child).parent_id,hero);
  assert.deepEqual(get(id).auto_layout.grid.areas,baseAreas);assert.deepEqual(get(hero).layout_item.grid_cell,baseCell);
  assert.equal(preview.original(get(id)).width,600);
 }
 const saved=editor.snapshot();editor.load(saved);editor.clear_history();preview.restore(get(id));
 assert.equal(get(id).width,600);assert.equal(get(id).auto_layout.grid.columns.length,3);assert.equal(preview.original(get(id)),undefined);
 assert.deepEqual(get(id).auto_layout.grid.areas,baseAreas);assert.equal(get(child).parent_id,hero);
 editor.undo();assert.equal(editor.snapshot(),saved);editor.redo();assert.equal(get(id).width,600);editor.free();
});
test('omitted responsive areas auto-place one cell while their saved bindings and contents survive',()=>{
 const {editor,id,hero,child,shapes,get,preview}=fixture();preview.preview(get(id),320);
 const original=editor.snapshot(),result=compileCssScene(shapes()),cell=result.shapes.find(s=>s.id===hero).layout_item.grid_cell;
 assert.deepEqual([cell.area,cell.column,cell.row,cell.column_span,cell.row_span],['',null,null,1,1]);
 assert.match(result.css,/grid-column:auto \/ span 1;grid-row:auto \/ span 1/);
 assert.equal(result.shapes.find(s=>s.id===child).parent_id,hero);assert.equal(editor.snapshot(),original);
 preview.preview(get(id),321);
 assert.equal(compileCssScene(shapes()).shapes.find(s=>s.id===hero).layout_item.grid_cell.area,'hero');editor.free();
});
test('area rename follows every breakpoint, keeps whole tokens, and undoes atomically',()=>{
 const {editor,id,hero,child,shapes,get,update,preview}=fixture();
 // A similar identifier must not be renamed by substring matching.
 const root=get(id);root.layout_media[1].declarations['grid-template-areas']='"hero-extra hero hero" ". . ."';update(root);
 preview.preview(get(id),500);const before=editor.snapshot();
 editor.rename_grid_area(id,'hero','main');
 assert.equal(get(hero).layout_item.grid_cell.area,'main');assert.equal(get(child).parent_id,hero);
 assert.equal(get(id).layout_media[0].declarations['grid-template-areas'],'"secondary" "main" "."');
 assert.equal(get(id).layout_media[1].declarations['grid-template-areas'],'"hero-extra main main" ". . ."');
 assert.equal(get(id).layout_media[2].declarations['grid-template-areas'],'none');
 const after=editor.snapshot();editor.undo();assert.equal(editor.snapshot(),before);editor.redo();assert.equal(editor.snapshot(),after);
 for(const [width,column,row] of [[500,1,2],[701,2,1],[600,1,1]]){
  preview.preview(get(id),width);const active=responsiveLayoutShapes(shapes()),area=active.find(s=>s.id===id).auto_layout.grid.areas.find(a=>a.name==='main');
  assert.deepEqual([area.column,area.row],[column,row]);assert.equal(active.find(s=>s.id===hero).layout_item.grid_cell.area,'main');
 }
 editor.free();
});
test('area rename rejects a name used only by a breakpoint without partial updates',()=>{
 const {editor,id,get,update}=fixture(),root=get(id);
 root.layout_media[1].declarations['grid-template-areas']='"mobile hero hero" ". . ."';update(root);
 const before=editor.snapshot();assert.throws(()=>editor.rename_grid_area(id,'hero','mobile'),/already exists in a breakpoint/);
 assert.equal(editor.snapshot(),before);editor.free();
});
test('canvas area editing redirects overridden structure to Layout CSS',()=>{
 const {editor,id,get,shapes,preview}=fixture();
 for(const [width,overridden] of [[500,true],[501,false],[701,true],[320,true],[600,false]]){
  preview.preview(get(id),width);assert.equal(gridAreaEditingOverridden(get(id),shapes()),overridden);
 }
 const root=get(id),sizing=parseLayoutCss('.layout {display:grid;} @media (max-width:700px){.layout {grid-template-columns:80px 1fr;}}',root);
 assert.equal(gridAreaEditingOverridden(sizing,[sizing]),false);
 const count=parseLayoutCss('.layout {display:grid;} @media (max-width:700px){.layout {grid-template-columns:1fr;}}',root);
 assert.equal(gridAreaEditingOverridden(count,[count]),true);editor.free();
});
