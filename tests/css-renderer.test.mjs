import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {compileCssScene,cssExport} from '../web/css-renderer.js';
import {appearance} from '../web/appearance.js';
import {exportSize} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shape={id:1,parent_id:0,kind:'frame',name:'Card',x:0,y:0,width:300,height:180,fill:'#ffffff'};
test('browser and export share native flex layout, escaped content and real backdrop blur',()=>{
 const frame={...shape,auto_layout:{direction:'horizontal',gap:16,padding_top:20,padding_right:20,padding_bottom:20,padding_left:20},appearance:{...appearance(shape),fill_opacity:.18,backdrop_blur:20}},text={...shape,id:2,parent_id:1,kind:'text',name:'<script>',text:'<img src=x onerror=alert(1)>',layout_item:{fill_width:true},typography:{font_size:16,font_family:'Arial',font_weight:400,line_height:1.4,wrap:true,sizing:'height'}};
 const live=compileCssScene([frame,text]),out=cssExport([frame,text]);assert.ok(out.css.includes(live.css));assert.ok(out.html.includes(live.html));assert.match(live.css,/display:flex/);assert.match(live.css,/flex:1 1 0px/);assert.match(live.css,/backdrop-filter:blur\(20px\)/);assert.match(live.css,/rgb\(from #ffffff r g b \/ 0.18\)/);assert.ok(!out.html.includes('<img'));assert.match(out.html,/&lt;img/);
});
test('grid tracks and spans remain browser layout instead of baked coordinates',()=>{
 const frame={...shape,auto_layout:{direction:'grid',gap:12,grid:{columns:[{mode:'fr',value:1},{mode:'fixed',value:80}],rows:[],auto_rows:{mode:'hug'}}}},child={...shape,id:2,parent_id:1,x:99,y:44,layout_item:{fill_width:true,grid_cell:{column:1,column_span:2,row_span:1}}};
 const {css}=compileCssScene([frame,child]);assert.match(css,/grid-template-columns:minmax\(0,1fr\) 80px/);assert.match(css,/grid-column:1 \/ span 2/);assert.doesNotMatch(css,/left:99px/);
});
test('variable bindings inherit modes and resolve aliases into CSS properties',()=>{
 const variables={collections:[{id:1,default_mode:1}],values:[{id:1,collection_id:1,name:'Brand/base',kind:'color',values:{1:'#ffffff',2:'#123456'}},{id:2,collection_id:1,name:'Surface',kind:'color',values:{1:{alias:1},2:{alias:1}}}]};
 const {css}=compileCssScene([{...shape,variable_modes:{1:2}},{...shape,id:2,parent_id:1,variable_bindings:{fill:2}}],{variables});assert.match(css,/--px-surface-2:#123456/);assert.match(css,/var\(--px-surface-2,#ffffff\)/);
 const child={...shape,id:2,parent_id:1,x:400,y:200,variable_bindings:{fill:2}},out=cssExport([{...child,parent_id:0}],{variables,sourceShapes:[{...shape,variable_modes:{1:2}},child]});assert.match(out.css,/--px-surface-2:#123456/);assert.match(out.css,/left:0px;top:0px/);
});
test('glass persists through save, undo and instances that reject glass overrides; rejects invalid blur',()=>{
 const e=new Editor(),id=e.add('frame',0,0),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),set=(id,blur)=>{const s=get(id);e.update(JSON.stringify({...s,appearance:{...appearance(s),backdrop_blur:blur}}));};set(id,20);e.create_component(id);const instance=e.create_instance(id,400,0);assert.equal(get(instance).appearance.backdrop_blur,20);const before=e.snapshot();assert.throws(()=>set(instance,35),/protected/);assert.equal(e.snapshot(),before);set(id,10);assert.equal(get(instance).appearance.backdrop_blur,10);const saved=e.snapshot();assert.throws(()=>set(id,201));assert.equal(e.snapshot(),saved);set(id,0);assert.equal(get(instance).appearance.backdrop_blur,0);e.undo();assert.equal(e.snapshot(),saved);const loaded=new Editor();loaded.load(saved);assert.equal(loaded.snapshot(),saved);e.free();loaded.free();
 assert.throws(()=>exportSize(shape,1,'png',[{...shape,appearance:{backdrop_blur:20}}]),/HTML\/CSS export/);
});
