import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEngine,createHeadlessEditor,headlessOptions} from '../mcp/projects.mjs';
import {createAgentRuntime} from '../web/agent-runtime.js';
import {librarySnapshot,mergeLibrary,importedContentError} from '../web/library-model.js';
await initializeEngine();
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const style={id:0,name:'Body / Regular',typography:{font_family:'Arial',font_size:16,font_weight:400,line_height:1.5}};
test('text styles propagate across pages, preserve layout choices, detach on font edits, and undo atomically',()=>{
 const e=createHeadlessEditor();try{
 const a=e.add('text',0,0);edit(e,a,{typography:{...get(e,a).typography,align:'center',vertical_align:'center',sizing:'width'},text:'Body'});e.add_page();const b=e.add('text',0,0);
 const id=e.save_text_style(JSON.stringify(style),a);e.apply_text_style(JSON.stringify([b]),id);assert.equal(get(e,a).height,24);assert.equal(get(e,a).typography.align,'center');assert.equal(get(e,a).typography.sizing,'width');
 const before=e.snapshot();e.save_text_style(JSON.stringify({...style,id,typography:{...style.typography,font_size:20}}),0);assert.equal(get(e,a).typography.font_size,20);assert.equal(get(e,b).typography.font_size,20);e.undo();assert.equal(e.snapshot(),before);
 edit(e,b,{typography:{...get(e,b).typography,align:'right'}});assert.equal(get(e,b).text_style,id);edit(e,b,{typography:{...get(e,b).typography,font_size:21}});assert.equal(get(e,b).text_style,0);
 e.remove_text_style(id);assert.equal(get(e,a).text_style,0);assert.equal(get(e,a).typography.font_size,16);
 }finally{e.free();}
});
test('text styles survive component inheritance and library ID remapping; imported definitions stay protected',()=>{
 const e=createHeadlessEditor(),target=createHeadlessEditor();try{
 const main=e.add('frame',0,0),label=e.add('text',0,0);e.reparent_many(JSON.stringify([label]),main);const id=e.save_text_style(JSON.stringify(style),label);e.create_component(main);const instance=e.create_instance(main,400,0);
 assert.equal(doc(e).shapes.find(s=>s.parent_id===instance).text_style,id);
 target.save_text_style(JSON.stringify({...style,name:'Existing'}),0);
 const merged=mergeLibrary(doc(target),{id:'lib',workspace:'team',name:'System',revision:1,body:librarySnapshot(doc(e))});target.load(JSON.stringify(merged));const mapped=merged.libraries[0].maps.texts[id];assert.notEqual(mapped,id);assert.equal(doc(target).shapes.find(s=>s.kind==='text').text_style,mapped);
 const before=doc(target),after=structuredClone(before);after.text_styles.find(s=>s.id===mapped).name='Changed';assert.match(importedContentError(before,after),/protected/);
 const restored=createHeadlessEditor();try{restored.load(target.snapshot());assert.equal(restored.snapshot(),target.snapshot());}finally{restored.free();}
 }finally{e.free();target.free();}
});
test('MCP exposes text styles with rollback and portable exports',async()=>{
 const e=createHeadlessEditor();try{
 const runtime=createAgentRuntime({editor:e,createEditor:createHeadlessEditor,options:headlessOptions});
 const made=await runtime.request('build',{revision:runtime.state().revision,operations:[{op:'create',kind:'text',as:'label'},{op:'command',name:'save_text_style',args:[style,{$ref:'label'}],as:'style'}]});
 assert.equal(get(e,made.result.refs.label).text_style,made.result.refs.style);const before=e.snapshot();
 await assert.rejects(runtime.request('build',{revision:runtime.state().revision,operations:[{op:'command',name:'remove_text_style',args:[made.result.refs.style]},{op:'command',name:'apply_text_style',args:[[made.result.refs.label],999]}]}));assert.equal(e.snapshot(),before);
 assert.match((await runtime.request('export',{target:'html'})).files.find(f=>f.name.endsWith('.css')).text,/font-size:16px/);
 }finally{e.free();}
});
