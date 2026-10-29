import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEngine,createHeadlessEditor,headlessOptions,localGuard} from '../mcp/projects.mjs';
import {createAgentRuntime,mergeProperties} from '../web/agent-runtime.js';
import {controlTypes} from '../web/controls.js';
import {engineCommands,modelReference} from '../web/editor-api.js';
import {reference} from '../mcp/reference.mjs';
import {mergeLibrary,librarySnapshot} from '../web/library-model.js';
import {defaultGuide} from '../web/layout-guides.js';
await initializeEngine();
function fixture(t,extra={}){const editor=createHeadlessEditor();t.after(()=>editor.free());const runtime=createAgentRuntime({editor,createEditor:createHeadlessEditor,options:headlessOptions,guard:localGuard,...extra});return {editor,runtime,read:()=>runtime.request('read',{full:true}),build:operations=>runtime.request('build',{revision:runtime.state().revision,operations})};}
test('catalog exposes the compiled engine without lifecycle or permission bypass methods',async t=>{
 const {editor}=fixture(t),excluded=new Set(['constructor','__destroy_into_raw','free','clear_history','load','set_write_guard','set_text_measurer','refresh_text_layout','undo','redo','snapshot']);
 const methods=Object.getOwnPropertyNames(Object.getPrototypeOf(editor)).filter(k=>!excluded.has(k)).sort();assert.deepEqual(engineCommands.map(c=>c.name).sort(),methods);
 assert.match(modelReference.Component.declaration,/serde\(tag = "type"/);assert.match(modelReference.Shape.declaration,/custom_css/);
 assert.equal((await reference('overview')).controlTypes.length,controlTypes.length);
});
test('documented build creates a component composition atomically, with stale revision and rollback protection',async t=>{
 const {runtime,read,build}=fixture(t),before=await read(),example=(await reference('examples')).frameAndControl;
 const made=await build(example.operations);let doc=(await read()).document;assert.ok(doc.shapes.length>=3);assert.equal(doc.shapes.find(s=>s.control)?.control.kind,'button');assert.ok(made.result.refs.card);
 await assert.rejects(runtime.request('build',{revision:before.revision,operations:[{op:'create'}]}),/Revision conflict/);
 const unchanged=JSON.stringify(doc);await assert.rejects(build([{op:'create',kind:'ellipse'},{op:'update',id:made.result.refs.card,properties:{width:-1}}]));assert.equal(JSON.stringify((await read()).document),unchanged);
 await runtime.request('history',{revision:runtime.state().revision,action:'undo'});assert.equal((await read()).document.shapes.length,0);
 await runtime.request('history',{revision:runtime.state().revision,action:'redo'});assert.equal(JSON.stringify((await read()).document),unchanged);
});
test('all native control types can be created and exported, including their per-state properties',async t=>{
 const {build,read,runtime}=fixture(t);await build(controlTypes.map((control,i)=>({op:'create',kind:'rectangle',control,x:i*240,properties:{name:control,width:220,height:44,control:{states:{hover:{background:'#123456'}}}}})));
 const doc=(await read()).document;assert.deepEqual(doc.shapes.filter(s=>s.control).map(s=>s.control.kind),controlTypes);
 for(const target of ['html','react','vue','angular','rust']){const result=await runtime.request('export',{target});assert.ok(result.files.length>2);assert.ok(result.files.some(f=>f.name.endsWith('.css')));}
});
test('paint stacks, effects, vector geometry, motion, prototypes, CSS, and page commands use the same validation',async t=>{
 const {build,read,runtime}=fixture(t),examples=await reference('examples');
 const made=await build([{op:'create',kind:'frame',as:'screen',properties:{name:'Screen'}},{op:'create',kind:'rectangle',as:'box',properties:{name:'Paint sample',...examples.paints.properties,editor_meta:examples.motion.properties.editor_meta}},{op:'update',id:{$ref:'box'},properties:{appearance:{shadows:[{kind:'drop',x:0,y:4,blur:8,color:'#000000',opacity:.2}],corner_radius:8},prototype:{action:'navigate',target:{$ref:'screen'},transition:'dissolve'}}},{op:'create',kind:'pen',properties:{points:[[0,0],[1,0],[.5,1]],closed:true}}]);
 const box=made.result.refs.box;assert.equal((await read()).document.shapes.find(s=>s.id===box).appearance.fills[0].color,'#0d99ff');
 const css=await runtime.request('css',{id:box});await build([{op:'css',id:box,source:css.source+'\n.paint-sample-'+box+':hover { opacity: .5; }'}]);assert.match((await runtime.request('css',{id:box})).custom_css,/opacity: .5/);
 await assert.rejects(runtime.request('export',{target:'svg'}),/Custom CSS/);assert.ok((await runtime.request('export',{target:'html'})).files.some(f=>f.text.includes(':hover')));
 await build([{op:'css',id:box,reset:true}]);assert.match((await runtime.request('export',{target:'svg'})).files[0].text,/<svg/);
 const page=await runtime.request('command',{revision:runtime.state().revision,name:'add_page',args:[]});assert.ok(page.result>1);
});
test('Grid tracks and areas, responsive rules, guides, variable bindings, all vector tools, and image creation round-trip',async t=>{
 const {build,read,runtime}=fixture(t),examples=await reference('examples');
 const made=await build([{op:'create',kind:'frame',as:'grid',properties:{name:'Grid',width:800,height:500,...examples.grid.properties,layout_grids:[defaultGuide()],layout_media:[{query:'(max-width: 700px)',max:700,declarations:{'grid-template-columns':'1fr'}}]}},...['line','arrow','polygon','star','pen','pencil'].map(kind=>({op:'create',kind,properties:{name:kind}})),{op:'create',kind:'image',properties:{name:'Pixel',image:{data_url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',width:1,height:1,mode:'fit',zoom:1,offset_x:0,offset_y:0}}}]);
 const grid=made.result.refs.grid;assert.equal((await read()).document.shapes.find(s=>s.id===grid).auto_layout.grid.columns.length,3);
 await build([{op:'command',name:'save_variables',args:[{collections:[{id:1,name:'Theme',default_mode:1,modes:[{id:1,name:'Light'}]}],values:[{id:1,collection_id:1,name:'Brand',kind:'color',values:{1:'#7654ab'}}]}]},{op:'command',name:'bind_variable',args:[grid,'fill',1]},{op:'update',id:grid,properties:{auto_layout:{grid:{areas:[{name:'main',row:1,column:1,row_span:1,column_span:2}]}}}}]);
 const doc=(await read()).document;assert.equal(doc.shapes.find(s=>s.id===grid).fill,'#7654ab');assert.equal(doc.shapes.find(s=>s.id===grid).layout_grids.length,1);
 const exported=await runtime.request('export',{target:'html'});assert.ok(exported.files.some(f=>f.text.includes('grid-template-areas')));
 const serialized=(await runtime.request('export',{target:'pixl'})).files[0].text;assert.equal(JSON.parse(serialized).shapes.find(s=>s.kind==='image').image.mode,'fit');
 await assert.rejects(build([{op:'create',kind:'group'}]),/group_many/);
});
test('components propagate, protected imported sources and instances remain protected, batches cannot bypass guards',async t=>{
 const {editor,build,read}=fixture(t);
 const result=await build([{op:'create',kind:'frame',as:'main'},{op:'command',name:'create_component',args:[{$ref:'main'}]},{op:'command',name:'create_instance',args:[{$ref:'main'},500,0],as:'instance'}]);
 await build([{op:'update',id:result.result.refs.main,properties:{fill:'#abcdef'}}]);assert.equal((await read()).document.shapes.find(s=>s.id===result.result.refs.instance).fill,'#abcdef');
 await assert.rejects(build([{op:'update',id:result.result.refs.instance,properties:{fill:'#123456'}}]),/protected/);
 const source=librarySnapshot((await read()).document);const destination=createHeadlessEditor();t.after(()=>destination.free());const linked=mergeLibrary(JSON.parse(destination.snapshot()),{id:'library',workspace:'org:test',name:'System',revision:1,body:source});editor.load(JSON.stringify(linked));
 const main=linked.libraries[0].maps.shapes[result.result.refs.main];const before=editor.snapshot();
 await assert.rejects(build([{op:'update',id:main,properties:{fill:'#123456'}}]),/protected/);assert.equal(editor.snapshot(),before);
});
test('runtime rejects unknown commands, identity edits, unknown fields, prototype pollution, and active gestures',async t=>{
 const {runtime,build}=fixture(t);await assert.rejects(runtime.request('command',{name:'load',args:['{}']}),/Unknown/);
 const made=await build([{op:'create',as:'box'}]);for(const properties of [{id:900},{component:null},{typo_width:200}])await assert.rejects(build([{op:'update',id:made.result.refs.box,properties}]));
 assert.throws(()=>mergeProperties({},JSON.parse('{"__proto__":{"admin":true}}')),/Invalid property/);
 const blocked=fixture(t,{busy:()=>true});await assert.rejects(blocked.build([{op:'create'}]),/active gesture/);
});

test('MCP creates, applies, updates and exports reusable effect styles in atomic batches',async t=>{
 const {runtime,read,build}=fixture(t);
 const style={id:0,name:'Elevation / Card',effects:{shadows:[{kind:'drop',x:0,y:4,blur:12,color:'#000000',opacity:.2}]}};
 const result=await build([{op:'create',kind:'rectangle',as:'card'},{op:'command',name:'save_effect_style',args:[style,{$ref:'card'}],as:'elevation'},{op:'create',kind:'ellipse',as:'badge'},{op:'command',name:'apply_effect_style',args:[[{$ref:'badge'}],{$ref:'elevation'}]}]);
 const {card,badge,elevation}=result.result.refs;let state=await read();assert.equal(state.document.effect_styles[0].id,elevation);for(const id of [card,badge])assert.equal(state.document.shapes.find(s=>s.id===id).effect_style,elevation);
 await runtime.request('command',{revision:runtime.state().revision,name:'save_effect_style',args:[{...style,id:elevation,effects:{shadows:[{...style.effects.shadows[0],blur:28}]}},0]});
 state=await read();for(const id of [card,badge])assert.equal(state.document.shapes.find(s=>s.id===id).appearance.shadows[0].blur,28);
 const before=JSON.stringify(state.document);await assert.rejects(build([{op:'command',name:'remove_effect_style',args:[elevation]},{op:'command',name:'apply_effect_style',args:[[card],elevation]}]));assert.equal(JSON.stringify((await read()).document),before);
 const exported=await runtime.request('export',{target:'pixl'});assert.equal(JSON.parse(exported.files[0].text).effect_styles[0].id,elevation);
 await runtime.request('command',{revision:runtime.state().revision,name:'apply_effect_style',args:[[badge],0]});assert.equal((await read()).document.shapes.find(s=>s.id===badge).appearance.shadows[0].blur,28);
});
