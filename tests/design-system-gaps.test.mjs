import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEngine,createHeadlessEditor,headlessOptions,localGuard} from '../mcp/projects.mjs';
import {createAgentRuntime} from '../web/agent-runtime.js';
import {reference} from '../mcp/reference.mjs';
import {compileCssScene} from '../web/css-renderer.js';
await initializeEngine();
function fixture(t){
 const editor=createHeadlessEditor();t.after(()=>editor.free());
 const runtime=createAgentRuntime({editor,createEditor:createHeadlessEditor,options:headlessOptions,guard:localGuard});
 return {editor,runtime,doc:()=>JSON.parse(editor.snapshot()),build:operations=>runtime.request('build',{revision:runtime.state().revision,operations})};
}
const variables={collections:[{id:1,name:'Primitives',modes:[{id:1,name:'Light'},{id:2,name:'Dark'}],default_mode:1},{id:2,name:'Semantic',modes:[{id:1,name:'Default'}],default_mode:1}],values:[
 {id:1,collection_id:1,name:'Navy',kind:'color',values:{1:'#102a47',2:'#abcdef'}},
 {id:2,collection_id:2,name:'Button border',kind:'color',values:{1:{alias:1}}},
 {id:3,collection_id:2,name:'Space',kind:'number',values:{1:16}}
]};
test('MCP aliases cascade across collections, modes, persistence and CSS length bindings',async t=>{
 const {editor,doc,build,runtime}=fixture(t);
 const made=await build([{op:'command',name:'save_variables',args:[variables]},{op:'create',as:'box',properties:{stroke_width:2,appearance:{stroke_enabled:true,stroke_opacity:.4}}},{op:'command',name:'bind_variable',args:[{$ref:'box'},'appearance.stroke_color',2]},{op:'command',name:'bind_variable',args:[{$ref:'box'},'width',3]}]);
 const id=made.result.refs.box,get=()=>doc().shapes.find(s=>s.id===id);
 assert.equal(get().appearance.stroke_color,'#102a47');assert.equal(get().width,16);
 const changed=structuredClone(variables);changed.values[0].values[1]='#345678';
 await build([{op:'command',name:'save_variables',args:[changed]}]);assert.equal(get().appearance.stroke_color,'#345678');
 await build([{op:'command',name:'set_variable_mode',args:[id,1,2]}]);assert.equal(get().appearance.stroke_color,'#abcdef');
 const css=(await runtime.request('export',{target:'html'})).files.find(f=>f.name.endsWith('.css')).text;
 assert.match(css,/solid rgb\(from var\(--px-button-border-2,#abcdef\) r g b \/ 0.4\)/);
 assert.match(css,/width:calc\(var\(--px-space-3,16\) \* 1px\)/);
 assert.match(css,/--px-space-3:16(?:;|})/);
 const restored=createHeadlessEditor();t.after(()=>restored.free());restored.load(editor.snapshot());assert.deepEqual(JSON.parse(restored.snapshot()),doc());
});
test('auto-width labels retain intrinsic sizing through auto layout and component conversion',async t=>{
 const {editor,doc,build}=fixture(t);
 const made=await build([{op:'create',kind:'text',as:'label',x:300,y:200,properties:{text:'Label',typography:{sizing:'auto_width'}}},{op:'command',name:'auto_layout_selection',args:[[{$ref:'label'}]],as:'button'},{op:'command',name:'create_component',args:[{$ref:'button'}]},{op:'command',name:'create_instance',args:[{$ref:'button'},600,200],as:'instance'}]);
 const {label,button,instance}=made.result.refs,get=id=>doc().shapes.find(s=>s.id===id);
 assert.equal(get(label).typography.sizing,'width');assert.equal(get(label).layout_item.fill_width,false);assert.equal(get(button).auto_layout.hug_width,true);
 const before=editor.snapshot(),width=get(button).width;
 await build([{op:'update',id:label,properties:{text:'A much longer button label'}}]);
 assert.ok(get(button).width>width);assert.equal(get(instance).width,get(button).width);assert.equal(get(label).height,JSON.parse(before).shapes.find(s=>s.id===label).height);
 editor.undo();assert.equal(editor.snapshot(),before);editor.redo();assert.ok(get(button).width>width);
 await build([{op:'update',id:label,properties:{typography:{sizing:'auto_height'},width:80}}]);assert.equal(get(label).typography.sizing,'height');assert.ok(get(label).height>20);
});
test('parent-relative MCP creation converts once; world defaults and rollback remain stable',async t=>{
 const {editor,doc,build}=fixture(t);
 const made=await build([{op:'create',kind:'frame',as:'frame',x:500,y:300},{op:'create',as:'local',parent:{$ref:'frame'},coordinate_space:'parent',x:10,y:20},{op:'create',as:'properties',parent:{$ref:'frame'},coordinate_space:'parent',properties:{x:40,y:50}},{op:'create',as:'world',parent:{$ref:'frame'},x:550,y:360}]);
 const get=name=>doc().shapes.find(s=>s.id===made.result.refs[name]);
 assert.deepEqual([get('local').x,get('local').y],[510,320]);assert.deepEqual([get('properties').x,get('properties').y],[540,350]);assert.deepEqual([get('world').x,get('world').y],[550,360]);
 const before=editor.snapshot();for(const operation of [{op:'create',coordinate_space:'parent'},{op:'create',coordinate_space:'wrong'},{op:'create',x:'12'},{op:'create',parent:999,coordinate_space:'parent'}]){await assert.rejects(build([operation]));assert.equal(editor.snapshot(),before);}
});
test('explicit duplicate offsets preserve descendants, bindings and undo, with legacy offset unchanged',async t=>{
 const {editor,doc,build}=fixture(t);
 const made=await build([{op:'command',name:'save_variables',args:[variables]},{op:'create',kind:'frame',as:'frame',x:500,y:300},{op:'create',kind:'text',as:'label',parent:{$ref:'frame'},coordinate_space:'parent',x:10,y:20,properties:{text:'Label'}},{op:'command',name:'bind_variable',args:[{$ref:'label'},'fill',2]}]);
 const {frame,label}=made.result.refs,before=editor.snapshot();
 const duplicate=await build([{op:'command',name:'duplicate_many_offset',args:[[frame],0,0],as:'copies'}]);
 const [copy,child]=duplicate.result.refs.copies.map(id=>doc().shapes.find(s=>s.id===id));
 assert.deepEqual([copy.x,copy.y,child.x,child.y],[500,300,510,320]);assert.equal(child.parent_id,copy.id);assert.equal(child.variable_bindings.fill,2);assert.notEqual(child.id,label);
 editor.undo();assert.equal(editor.snapshot(),before);
 const translated=JSON.parse(editor.duplicate_many_offset(JSON.stringify([frame]),-100,50));assert.deepEqual(translated.map(id=>{const s=doc().shapes.find(s=>s.id===id);return [s.x,s.y];}),[[400,350],[410,370]]);
 const legacy=editor.duplicate(label),s=doc().shapes.find(s=>s.id===legacy);assert.deepEqual([s.x,s.y],[534,344]);
});
test('MCP eight-digit stroke colors normalize alpha and preserve explicit opacity',async t=>{
 const {editor,doc,build}=fixture(t);
 const made=await build([{op:'create',as:'box',properties:{appearance:{stroke_enabled:true,stroke_color:'#102a4780'}}}]);const id=made.result.refs.box,get=()=>doc().shapes.find(s=>s.id===id).appearance;
 assert.equal(get().stroke_color,'#102a47');assert.equal(get().stroke_opacity,128/255);
 await build([{op:'update',id,properties:{appearance:{stroke_color:'#abcdef00',stroke_opacity:.7}}}]);assert.equal(get().stroke_color,'#abcdef');assert.equal(get().stroke_opacity,.7);
 const before=editor.snapshot();await assert.rejects(build([{op:'update',id,properties:{appearance:{stroke_color:'#zzzzzz80'}}}]));assert.equal(editor.snapshot(),before);
});
test('reference accepts multiple names and describes variable values and text sizing',async()=>{
 for(const query of [['Typography','Value'],'Typography, Value','Typography Value']){const result=await reference('models',query);assert.ok(result.models.Typography);assert.equal(result.constraints.Value.examples.alias.alias,1);assert.match(result.constraints.Typography.sizing.width,/Auto width/);}
 assert.ok((await reference('models','')).models.Shape);
});
test('stroke variables survive stack paints, aligned masks, borders and framework export',async t=>{
 const {doc,build,runtime}=fixture(t);
 const made=await build([{op:'command',name:'save_variables',args:[variables]},...['center','inside','outside'].map((alignment,i)=>({op:'create',as:'box'+i,properties:{x:i*200,appearance:{stroke_enabled:true,stroke_alignment:alignment,strokes:[{id:7,color:'#102a47',opacity:.5,visible:true},{id:8,color:'#102a47',opacity:1,visible:true}]},stroke_width:4}})),...[0,1,2].map(i=>({op:'command',name:'bind_variable',args:[{$ref:'box'+i},'appearance.strokes.7.color',2]}))]);
 const rendered=compileCssScene(doc().shapes,{variables:doc().variables});
 assert.match(rendered.html,/stroke="var\(--px-button-border-2,#102a47\)"/);assert.match(rendered.html,/fill="var\(--px-button-border-2,#102a47\)"/);
 assert.match(rendered.html,/stroke="#ffffff"/);assert.match(rendered.html,/stroke="#102a47"/);
 for(const target of ['html','react','vue','angular']){const exported=await runtime.request('export',{target});assert.ok(exported.files.some(f=>f.text.includes('var(--px-button-border-2,#102a47)')));}
 await build([{op:'create',as:'border',properties:{border_widths:[1,2,3,4],appearance:{stroke_enabled:true}}},{op:'command',name:'bind_variable',args:[{$ref:'border'},'appearance.stroke_color',2]}]);
 assert.match(compileCssScene(doc().shapes,{variables:doc().variables}).css,/border-color:rgb\(from var\(--px-button-border-2,#102a47\)/);
 const native=await build([{op:'create',control:'button',as:'native',properties:{name:'Native button',appearance:{stroke_enabled:true,stroke_opacity:.6}}},{op:'command',name:'bind_variable',args:[{$ref:'native'},'appearance.stroke_color',2]}]);
 const css=compileCssScene(doc().shapes,{variables:doc().variables}).layerCss[native.result.refs.native];assert.match(css,/border:[^;]*var\(--px-button-border-2,#102a47\)[^;]*0.6/);
 assert.ok(made.result.refs.box0);
});
