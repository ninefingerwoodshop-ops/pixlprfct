import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEngine,createHeadlessEditor,headlessOptions} from '../mcp/projects.mjs';
import {compileCssScene} from '../web/css-renderer.js';
import {appearance} from '../web/appearance.js';
import {mergeLibrary,librarySnapshot} from '../web/library-model.js';
await initializeEngine();
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id);
const vars={collections:[{id:1,name:'Theme',default_mode:1,modes:[{id:1,name:'Light'},{id:2,name:'Dark'}]}],values:[{id:1,collection_id:1,name:'Focus',kind:'color',values:{1:'#102a47',2:'#fff5e8'}}]};
const shadow={kind:'drop',x:0,y:0,blur:0,spread:3,color:'#102a47',opacity:.6,color_variable:1};
test('shadow colors follow frame modes and aliases, export variables, survive reordering and detach safely',()=>{
 const e=createHeadlessEditor();try{
 e.save_variables(JSON.stringify(vars));const root=e.add('frame',0,0),box=e.add('rectangle',0,0);e.reparent_many(JSON.stringify([box]),root);
 e.update(JSON.stringify({...get(e,box),appearance:{...appearance(get(e,box)),shadows:[{...shadow,color_variable:0},{...shadow,color:'#000000',color_variable:0}]}}));e.bind_shadow_color(box,0,1);
 e.set_variable_mode(root,1,2);assert.equal(get(e,box).appearance.shadows[0].color,'#fff5e8');const before=e.snapshot();
 const css=compileCssScene(doc(e).shapes,{...headlessOptions(),variables:doc(e).variables}).css;assert.match(css,/box-shadow:.*rgb\(from var\(--px-focus-1/);
 const shadows=[...get(e,box).appearance.shadows].reverse();e.update(JSON.stringify({...get(e,box),appearance:{...get(e,box).appearance,shadows}}));assert.equal(get(e,box).appearance.shadows[1].color_variable,1);e.undo();assert.equal(e.snapshot(),before);
 e.bind_shadow_color(box,0,0);assert.equal(get(e,box).appearance.shadows[0].color,'#fff5e8');e.set_variable_mode(root,1,1);assert.equal(get(e,box).appearance.shadows[0].color,'#fff5e8');
 }finally{e.free();}
});
test('reusable shadow styles bind variables, remap through libraries and reject invalid token kinds atomically',()=>{
 const e=createHeadlessEditor(),dest=createHeadlessEditor();try{
 e.save_variables(JSON.stringify(vars));const main=e.add('frame',0,0);const id=e.save_effect_style(JSON.stringify({id:0,name:'Focus ring',effects:{shadows:[shadow]}}),main);e.create_component(main);const dark=e.add('frame',300,0);e.set_variable_mode(dark,1,2);const instance=e.create_instance(main,300,0);e.reparent_many(JSON.stringify([instance]),dark);assert.equal(get(e,instance).appearance.shadows[0].color,'#fff5e8');
 const before=e.snapshot();assert.throws(()=>e.bind_shadow_color(main,0,999),/color variable/);assert.equal(e.snapshot(),before);
 dest.save_variables(JSON.stringify(vars));const merged=mergeLibrary(doc(dest),{id:'lib',workspace:'team',name:'Library',revision:1,body:librarySnapshot(doc(e))});dest.load(JSON.stringify(merged));const map=merged.libraries[0].maps;assert.equal(doc(dest).effect_styles.find(s=>s.id===map.effects[id]).effects.shadows[0].color_variable,map.variables[1]);
 const copy=e.copy_layers(JSON.stringify([main]));dest.paste_layers(copy,0,200,0);assert.equal(doc(dest).shapes.at(-1).appearance.shadows[0].color_variable,0);
 }finally{e.free();dest.free();}
});
test('shadow aliases update with their primitive; literal edits and token deletion retain resolved paint',()=>{
 const e=createHeadlessEditor();try{
 const tokens=structuredClone(vars);tokens.values.push({id:2,collection_id:1,name:'Focus alias',kind:'color',values:{1:{alias:1},2:{alias:1}}},{id:3,collection_id:1,name:'Size',kind:'number',values:{1:4,2:8}});e.save_variables(JSON.stringify(tokens));
 const a=e.add('rectangle',0,0);const id=e.save_effect_style(JSON.stringify({id:0,name:'Focus',effects:{shadows:[{...shadow,color_variable:2}]}}),a);const before=e.snapshot();assert.throws(()=>e.bind_shadow_color(a,0,3),/color variable/);assert.equal(e.snapshot(),before);
 e.set_page_variable_mode(1,1,2);assert.equal(get(e,a).appearance.shadows[0].color,'#fff5e8');
 e.update(JSON.stringify({...get(e,a),appearance:{...get(e,a).appearance,opacity:.5}}));assert.equal(get(e,a).effect_style,id);assert.equal(get(e,a).appearance.shadows[0].color_variable,2);
 e.update(JSON.stringify({...get(e,a),appearance:{...get(e,a).appearance,shadows:[{...get(e,a).appearance.shadows[0],color:'#123456'}]}}));assert.equal(get(e,a).effect_style,0);assert.equal(get(e,a).appearance.shadows[0].color_variable,0);
 e.apply_effect_style(JSON.stringify([a]),id);tokens.values=tokens.values.filter(v=>v.id!==2);e.save_variables(JSON.stringify(tokens));assert.equal(get(e,a).appearance.shadows[0].color_variable,0);assert.equal(get(e,a).appearance.shadows[0].color,'#fff5e8');assert.equal(get(e,a).effect_style,0);
 }finally{e.free();}
});
