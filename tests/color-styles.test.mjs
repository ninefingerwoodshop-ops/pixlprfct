import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEngine,createHeadlessEditor} from '../mcp/projects.mjs';
import {librarySnapshot,mergeLibrary,importedContentError} from '../web/library-model.js';
import {updatePaint} from '../web/paints.js';
await initializeEngine();
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id);
const style={id:0,name:'Brand / Primary',paints:[{id:1,color:'#123456',opacity:.8,visible:true},{id:2,color:'#abcdef',opacity:.5,visible:false}]};
test('color styles propagate fill and stroke across pages, undo, detach on edits, and reopen losslessly',()=>{
 const e=createHeadlessEditor(),restored=createHeadlessEditor();try{
 const a=e.add('rectangle',0,0);e.add_page();const b=e.add('ellipse',0,0),id=e.save_color_style(JSON.stringify(style),a,false);e.apply_color_style(JSON.stringify([b]),id,true);
 assert.equal(get(e,a).fill,'#123456');assert.equal(get(e,b).appearance.stroke_color,'#123456');assert.equal(get(e,b).stroke_width,2);
 const before=e.snapshot();e.save_color_style(JSON.stringify({...style,id,paints:[{...style.paints[0],color:'#ff0000'}]}),0,false);assert.equal(get(e,a).fill,'#ff0000');assert.equal(get(e,b).appearance.stroke_color,'#ff0000');e.undo();assert.equal(e.snapshot(),before);
 e.update(JSON.stringify(updatePaint(get(e,b),'stroke',1,{color:'#ffffff'})));assert.equal(get(e,b).stroke_style,0);assert.equal(get(e,b).appearance.stroke_color,'#ffffff');
 e.remove_color_style(id);assert.equal(get(e,a).fill_style,0);assert.equal(get(e,a).fill,'#123456');restored.load(e.snapshot());assert.equal(restored.snapshot(),e.snapshot());
 }finally{e.free();restored.free();}
});
test('color styles inherit through components, resolve page variable modes, remap libraries and protect definitions',()=>{
 const e=createHeadlessEditor(),target=createHeadlessEditor();try{
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Theme',modes:[{id:1,name:'Light'},{id:2,name:'Dark'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Primary',kind:'color',values:{1:'#ff0000',2:'#0000ff'}}]}));
 const main=e.add('frame',0,0),box=e.add('rectangle',10,10);e.reparent_many(JSON.stringify([box]),main);const id=e.save_color_style(JSON.stringify({...style,color_variables:{1:1}}),box,false);e.create_component(main);const instance=e.create_instance(main,400,0);assert.equal(doc(e).shapes.find(s=>s.parent_id===instance).fill_style,id);
 e.set_page_variable_mode(1,1,2);assert.equal(get(e,box).fill,'#0000ff');assert.equal(doc(e).shapes.find(s=>s.parent_id===instance).fill,'#0000ff');
 target.save_color_style(JSON.stringify({...style,name:'Existing'}),0,false);const merged=mergeLibrary(doc(target),{id:'lib',workspace:'team',name:'System',revision:1,body:librarySnapshot(doc(e))});target.load(JSON.stringify(merged));const mapped=merged.libraries[0].maps.colors[id];assert.notEqual(mapped,id);assert.equal(doc(target).shapes.find(s=>s.name===get(e,box).name).fill_style,mapped);
 const after=doc(target),before=structuredClone(after);after.color_styles.find(s=>s.id===mapped).name='Changed';assert.match(importedContentError(before,after),/protected/);
 e.save_variables(JSON.stringify({collections:[],values:[]}));assert.deepEqual(doc(e).color_styles[0].color_variables,{});assert.equal(get(e,box).fill,'#0000ff');assert.equal(get(e,box).fill_style,0);assert.equal(doc(e).color_styles[0].paints[0].color,'#ff0000');
 const fresh=e.add('rectangle',800,0);e.apply_color_style(JSON.stringify([fresh]),id,false);assert.equal(get(e,fresh).fill,'#ff0000');
 }finally{e.free();target.free();}
});
test('malformed unbound styles are rejected without changing the document',()=>{
 const e=createHeadlessEditor();try{const before=e.snapshot();for(const patch of [{paints:[{...style.paints[0],opacity:2}]},{paints:[{...style.paints[0],gradient:{kind:'linear',start:[0,0],end:[0,0],stops:[]}}]},{color_variables:{1:999}},{name:''}]){assert.throws(()=>e.save_color_style(JSON.stringify({...style,...patch}),0,false));assert.equal(e.snapshot(),before);}}finally{e.free();}
});
