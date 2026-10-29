import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {compileCssScene,cssExport} from '../web/css-renderer.js';
import {newControl,controlTypes} from '../web/controls.js';
import {editableLayerStyles,layerStyleOverrides,parseLayerStyles,renderLayerStyles} from '../web/layer-style.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shape={id:7,page_id:1,parent_id:0,kind:'rectangle',name:'Surface',layout_class:'surface',x:0,y:0,width:120,height:80,fill:'#ffffff'};

test('generated CSS is editable without introducing overrides for every native control',()=>{
 for(const kind of controlTypes){const s={...shape,control:{...newControl(kind,'Example'),...(kind==='radio'?{options:['A','B']}: {})}},base=compileCssScene([s]).layerCss[s.id],editable=editableLayerStyles(base,s);assert.ok(editable.includes('.surface'),kind);assert.equal(layerStyleOverrides(base,editable,s),'',kind);}
});
test('all artwork kinds expose their generated styles, including SVG paint',()=>{
 for(const kind of ['frame','group','text','rectangle','ellipse','polygon','star','line','arrow','pen','pencil','image']){const s={...shape,kind,text:'Hello',image:{width:1,height:1,zoom:1,offset_x:.5,offset_y:.5,mode:'fit',data_url:'data:image/png;base64,'},appearance:{fills:[{id:'p',type:'solid',color:'#ff0000',opacity:1,visible:true}]}};const base=compileCssScene([s]).layerCss[s.id];assert.ok(base,kind);assert.equal(layerStyleOverrides(base,editableLayerStyles(base,s),s),'',kind);}
});
test('SVG CSS targets survive changing the original paint color',()=>{
 const s={...shape,appearance:{fills:[{id:'p',color:'#ff0000',opacity:1,visible:true}]}},base=compileCssScene([s]).layerCss[s.id],edited=editableLayerStyles(base,s).replace('fill: #ff0000','fill: #00ff00'),custom_css=layerStyleOverrides(base,edited,s);
 const changed={...s,appearance:{fills:[{id:'p',color:'#0000ff',opacity:1,visible:true}]},custom_css},out=compileCssScene([changed]);assert.match(out.html,/data-px-fill="0"/);assert.match(out.css,/\[data-px-fill="0"\] \{\n  fill: #00ff00/);
});
test('only edited properties persist, leaving other inspector values live',()=>{
 const base=compileCssScene([shape]).layerCss[shape.id],edited=editableLayerStyles(base,shape).replace('width: 120px','width: 240px');
 const custom_css=layerStyleOverrides(base,edited,shape);assert.match(custom_css,/width: 240px/);assert.doesNotMatch(custom_css,/height|left|background/);
 const moved={...shape,x:35,height:95,custom_css},result=compileCssScene([moved]);assert.match(result.css,/left:35px/);assert.match(result.css,/height:95px/);assert.ok(result.css.indexOf('width: 240px')>result.css.indexOf('width:120px'));
 assert.equal(layerStyleOverrides(base,editableLayerStyles(base,{...shape,custom_css:''}),shape),'');
});
test('custom selectors, strings, variables, media and supports survive formatting and export',()=>{
 const base=compileCssScene([shape]).layerCss[shape.id],edited=editableLayerStyles(base,shape)+'\n.surface:hover, .surface:is(:focus, :active) { --note: "a;b{}"; filter: contrast(1.2); }\n@media (max-width: 700px) { @supports (display: grid) { .surface { width: calc(100% - 20px); } } }';
 const custom_css=layerStyleOverrides(base,edited,shape),css=renderLayerStyles({...shape,custom_css});assert.match(css,/\.px-node-7:hover/);assert.match(css,/"a;b\{\}"/);assert.match(css,/@media/);assert.match(css,/@supports/);assert.match(cssExport([{...shape,custom_css}]).css,/contrast\(1.2\)/);
 assert.equal(layerStyleOverrides(base,editableLayerStyles(base,{...shape,custom_css}),shape),custom_css);
});
test('malformed CSS and selectors outside the layer are rejected',()=>{
 const base=compileCssScene([shape]).layerCss[shape.id];
 for(const css of ['.surface { color red; }','.surface { color: red;','@import "evil.css";','.surface { color: "red; }','body { color: red; }','.surface, body { color: red; }','.surface + div { color:red; }'])assert.throws(()=>layerStyleOverrides(base,css,shape),css);
 assert.throws(()=>parseLayerStyles('x'.repeat(65537)),/64 KB/);
});
test('CSS persists through undo/load and main-component updates without leaking instance selectors',()=>{
 const e=new Editor(),id=e.add('frame',0,0),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);try{
  const original=e.snapshot(),s=get(id),base=compileCssScene([s]).layerCss[id],custom_css=layerStyleOverrides(base,editableLayerStyles(base,s)+`\n.${s.layout_class}:hover { opacity: .5; }`,s);
  const next={...s,custom_css};e.preview_update_many(JSON.stringify([next]));assert.equal(e.snapshot(),original);e.update(JSON.stringify(next));e.undo();assert.equal(e.snapshot(),original);e.redo();
  e.create_component(id);const instance=e.create_instance(id,500,0);assert.equal(get(instance).custom_css,custom_css);assert.match(renderLayerStyles(get(instance)),new RegExp('\\.px-node-'+instance+':hover'));assert.doesNotMatch(renderLayerStyles(get(instance)),new RegExp('\\.px-node-'+id+':hover'));
  assert.throws(()=>e.update(JSON.stringify({...get(instance),custom_css:''})),/protected/);
  const loaded=new Editor();try{loaded.load(e.snapshot());assert.equal(loaded.snapshot(),e.snapshot());}finally{loaded.free();}
  e.update(JSON.stringify({...get(id),custom_css:''}));assert.equal(get(instance).custom_css,undefined);
 }finally{e.free();}
});
