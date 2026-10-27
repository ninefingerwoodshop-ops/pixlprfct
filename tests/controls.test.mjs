import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {newControl,controlTypes,controlMarkup,controlCss,controlPreviewStates} from '../web/controls.js';
import {cssExport,compileCssScene} from '../web/css-renderer.js';
import {codeExportFiles} from '../web/code-export.js';
import {reactMarkup} from '../web/framework-export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
test('control types produce real native HTML with escaped labels and supported attributes',()=>{
 for(const kind of controlTypes){const c={...newControl(kind,'<Label>'),disabled:true,readonly:true,checked:true,value:'Hello'};const html=controlMarkup(c,1);assert.match(html,/<(input|button|select|textarea)\b/);assert.match(html,/disabled="disabled"/);assert.ok(!html.includes('<Label>'));if(['checkbox','radio'].includes(kind)){assert.match(html,/checked="checked"/);assert.ok(!html.includes('readonly'));}}
 assert.ok(!controlMarkup({...newControl('file','Upload'),value:'secret'},1).includes('value='));
 assert.match(controlMarkup({...newControl('text','Name'),readonly:true},1),/readonly/);
});
test('component controls persist, propagate to instances, override, reset and undo',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.create_component(id);
 const control={...newControl('checkbox','Agree'),states:{hover:{background:'#ffffff'}}};e.update(JSON.stringify({...get(e,id),control}));
 const instance=e.create_instance(id,300,0);assert.equal(get(e,instance).control.kind,'checkbox');
 e.update(JSON.stringify({...get(e,id),control:{...control,disabled:true}}));assert.equal(get(e,instance).control.disabled,true);
 e.update(JSON.stringify({...get(e,instance),control_state:'selected'}));assert.ok(get(e,instance).component.overrides.includes('control_state'));
 e.reset_instance(instance);assert.equal(get(e,instance).control_state,'');e.undo();assert.equal(get(e,instance).control_state,'selected');
 const copy=new Editor();copy.load(e.snapshot());assert.deepEqual(get(copy,id).control,get(e,id).control);copy.free();e.free();
});
test('state previews do not leak into native exports and React controls remain editable',()=>{
 const e=new Editor(),id=e.add('frame',0,0),shape={...get(e,id),control:{...newControl('checkbox','Agree'),checked:true,states:{hover:{background:'#abcdef'},disabled:{opacity:.2}}}};
 controlPreviewStates.set(id,'hover');assert.match(compileCssScene([shape]).css,/\.px-node-1>\.px-control\{background:#abcdef/);
 const exported=cssExport([shape]);assert.match(exported.html,/<input/);assert.ok(!exported.html.includes('tabindex="-1"'));assert.match(exported.css,/:hover:not\(:disabled\)/);
 const jsx=reactMarkup(controlMarkup(shape.control,id));assert.match(jsx,/defaultChecked=\{true\}/);assert.ok(!jsx.includes('checked='));
 assert.match(reactMarkup(controlMarkup({...newControl('text','Name'),value:'Ada'},2)),/defaultValue=\{"Ada"\}/);
 assert.ok(!controlCss({...shape.control,states:{hover:{background:'red;display:none'}}},id).includes('red;display:none'));
 controlPreviewStates.clear();e.free();
});

test('framework CSS preserves compound state selectors and multiple select defaults',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 e.update(JSON.stringify({...get(e,id),control:{...newControl('button','Toggle'),toggle:true,states:{selected:{background:'#abcdef'}}}}));
 for(const target of ['react','vue','angular']){
  const files=codeExportFiles(JSON.parse(e.snapshot()),{target});
  const css=new TextDecoder().decode(files.find(f=>f.name==='page-1.css').data);
  assert.match(css,/:is\(:checked,\[aria-pressed="true"\]\)/);
  assert.ok(!css.includes(':checked,.page-1'));
 }
 assert.match(reactMarkup(controlMarkup({...newControl('select','Choice'),multiple:true,value:'Option 1'},id)),/defaultValue=\{\["Option 1"\]\}/);
 e.free();
});

test('control state variables resolve modes, save, detach and inherit',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.create_component(id);
 e.update(JSON.stringify({...get(e,id),control:newControl('button','Button')}));
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Theme',default_mode:1,modes:[{id:1,name:'Light'},{id:2,name:'Dark'}]}],values:[{id:1,collection_id:1,name:'Accent',kind:'color',values:{1:'#112233',2:'#abcdef'}},{id:2,collection_id:1,name:'Radius',kind:'number',values:{1:4,2:12}}]}));
 e.bind_variable(id,'control.states.hover.background',1);e.bind_variable(id,'control.states.default.radius',2);
 assert.equal(get(e,id).control.states.hover.background,'#112233');
 e.set_page_variable_mode(JSON.parse(e.snapshot()).active_page,1,2);
 assert.equal(get(e,id).control.states.hover.background,'#abcdef');assert.equal(get(e,id).control.states.default.radius,12);
 const restored=new Editor();restored.load(e.snapshot());assert.equal(get(restored,id).control.states.default.radius,12);restored.free();
 const instance=e.create_instance(id,300,0);assert.equal(get(e,instance).control.states.hover.background,'#abcdef');
 const shape=get(e,id);shape.control.states.hover.background='';delete shape.variable_bindings['control.states.hover.background'];e.update(JSON.stringify(shape));
 assert.equal(get(e,id).control.states.hover.background,'');assert.ok(!get(e,id).variable_bindings['control.states.hover.background']);
 assert.throws(()=>e.bind_variable(id,'control.states.hover.background',2),/Variable/);
 e.update(JSON.stringify({...get(e,id),control:null}));assert.ok(!Object.keys(get(e,id).variable_bindings).some(p=>p.startsWith('control.states.')));e.free();
});

test('button text color binds through inspector updates and survives reload and mode changes',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.create_component(id);
 e.update(JSON.stringify({...get(e,id),control:{...newControl('button','Example button'),states:{default:{color:'#ffffff'}}}}));
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Inputs',default_mode:1,modes:[{id:1,name:'Light'},{id:2,name:'Dark'}]}],values:[{id:7,collection_id:1,name:'Text',kind:'color',values:{1:'#ffffff',2:'#112233'}}]}));
 // The inspector changes the binding while retaining the current literal color.
 const fresh=get(e,id);e.update(JSON.stringify({...fresh,variable_bindings:{...fresh.variable_bindings,'control.states.default.color':7}}));
 assert.equal(get(e,id).variable_bindings['control.states.default.color'],7);
 const restored=new Editor();restored.load(e.snapshot());
 assert.equal(get(restored,id).variable_bindings['control.states.default.color'],7);
 restored.set_page_variable_mode(JSON.parse(restored.snapshot()).active_page,1,2);
 assert.equal(get(restored,id).control.states.default.color,'#112233');
 assert.match(cssExport([get(restored,id)]).css,/\.px-node-1>\.px-control\{color:#112233\}/);
 restored.free();e.free();
});

test('instance state persists independently while label overrides keep inheriting main styles',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.create_component(id);e.update(JSON.stringify({...get(e,id),control:newControl('button','Main')}));
 const instance=e.create_instance(id,150,0);e.update(JSON.stringify({...get(e,instance),control_state:'disabled',control:{...get(e,instance).control,label:'Instance label'}}));
 e.update(JSON.stringify({...get(e,id),control:{...get(e,id).control,states:{disabled:{opacity:.3}}}}));
 const s=get(e,instance);assert.equal(s.control_state,'disabled');assert.equal(s.control.label,'Instance label');assert.equal(s.control.states.disabled.opacity,.3);
 const exported=cssExport([s]);assert.match(exported.html,/disabled="disabled"/);assert.match(exported.css,/opacity:0.3/);
 const restored=new Editor();restored.load(e.snapshot());assert.equal(get(restored,instance).control_state,'disabled');restored.free();e.free();
});

test('native button instances hug their own label and inherit padding changes immediately',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.create_component(id);
 e.update(JSON.stringify({...get(e,id),control:newControl('button','Long button label')}));
 e.auto_layout_selection(JSON.stringify([id]));
 e.set_text_measurer(json=>{const s=JSON.parse(json);return JSON.stringify([Math.max(1,s.control.label.length*8),20]);});
 const main=get(e,id);e.update(JSON.stringify({...main,auto_layout:{...main.auto_layout,hug_width:true,hug_height:true,padding_left:12,padding_right:12,padding_top:6,padding_bottom:6}}));
 const instance=e.create_instance(id,300,0);
 e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,label:'Save'}}));
 assert.equal(get(e,instance).width,56);assert.equal(get(e,instance).height,32);assert.notEqual(get(e,instance).width,get(e,id).width);
 const next=get(e,id);e.update(JSON.stringify({...next,auto_layout:{...next.auto_layout,padding_left:20}}));
 assert.equal(get(e,instance).width,64);assert.equal(get(e,instance).control.label,'Save');
 e.free();
});

test('editing main button text children updates the native label and typography in instances',()=>{
 const e=new Editor(),main=e.add('frame',0,0),label=e.add('text',10,10);
 e.reparent_many(JSON.stringify([label]),main);e.create_component(main);
 e.update(JSON.stringify({...get(e,main),control:newControl('button','Original')}));
 const instance=e.create_instance(main,300,0);
 const typography={font_family:'Manrope',font_size:22,font_weight:600,line_height:1.2,align:'center',vertical_align:'center',wrap:false,sizing:'width'};
 e.update(JSON.stringify({...get(e,label),text:'Edited child',typography}));
 assert.equal(get(e,main).control.label,'Edited child');assert.equal(get(e,instance).control.label,'Edited child');assert.equal(get(e,instance).typography.font_size,22);
 e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,label:'Save'}}));
 e.update(JSON.stringify({...get(e,label),text:'New label',typography:{...typography,font_size:28}}));
 assert.equal(get(e,instance).control.label,'Save');assert.equal(get(e,instance).typography.font_size,28);e.free();
});

test('detaching a native button restores an editable label with instance text and supports undo',()=>{
 const e=new Editor(),main=e.add('frame',0,0);e.create_component(main);
 e.update(JSON.stringify({...get(e,main),control:{...newControl('button','Main'),states:{default:{color:'#ffffff'}}}}));
 const instance=e.create_instance(main,300,0);e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,label:'Save'}}));
 const before=e.snapshot();e.detach_instance(instance);
 const button=get(e,instance),label=JSON.parse(e.snapshot()).shapes.find(s=>s.parent_id===instance&&s.kind==='text');
 assert.equal(button.component,null);assert.equal(button.control,null);assert.equal(label.text,'Save');assert.equal(label.fill,'#ffffff');
 e.update(JSON.stringify({...label,text:'Editable',typography:{...label.typography,font_size:24}}));assert.equal(get(e,label.id).text,'Editable');
 e.undo();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(e,instance).control,null);e.free();
});

test('loading a previously detached native button restores its label once',()=>{
 const e=new Editor(),main=e.add('frame',0,0);e.create_component(main);e.update(JSON.stringify({...get(e,main),control:newControl('button','Recovered')}));
 const data=JSON.parse(e.snapshot());data.shapes.find(s=>s.id===main).component=null;
 e.load(JSON.stringify(data));assert.equal(get(e,main).control,null);
 const labels=()=>JSON.parse(e.snapshot()).shapes.filter(s=>s.parent_id===main&&s.kind==='text');
 assert.equal(labels().length,1);assert.equal(labels()[0].text,'Recovered');e.load(e.snapshot());assert.equal(labels().length,1);e.free();
});

test('text input content persists, inherits, and exports accessible labels and messages',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.create_component(id);
 const control={...newControl('text','Email'),value:'person@example.com',placeholder:'Enter email',helper_message:'Work email only',validation_message:'Enter a valid email',invalid:true};
 e.update(JSON.stringify({...get(e,id),control}));
 const instance=e.create_instance(id,200,0);
 assert.equal(get(e,instance).control.helper_message,'Work email only');
 e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,value:'another@example.com',invalid:false}}));
 assert.equal(get(e,id).control.invalid,true);
 assert.equal(get(e,instance).control.invalid,false);
 const html=controlMarkup(get(e,id).control,id);
 assert.match(html,/for="px-field-/);assert.match(html,/aria-describedby=/);assert.match(html,/role="alert"/);assert.match(html,/Work email only/);assert.match(html,/value="person@example.com"/);assert.match(html,/placeholder="Enter email"/);
 assert.match(controlMarkup(get(e,instance).control,instance),/role="alert" hidden="hidden"/);
 const saved=e.snapshot(),reloaded=new Editor();reloaded.load(saved);
 assert.equal(get(reloaded,id).control.validation_message,'Enter a valid email');
 assert.match(reactMarkup(html),/htmlFor=/);
});

test('older native starters migrate to editable main components without losing properties',()=>{
 for(const kind of controlTypes){
  const e=new Editor(),id=e.add('frame',10,10);
  e.update(JSON.stringify({...get(e,id),control:{...newControl(kind,'Starter'),starter:true}}));
  e.update(JSON.stringify({...get(e,id),x:100,fill:'#123456',control:{...get(e,id).control,label:'Edited'}}));
  const copy=new Editor();copy.load(e.snapshot());
  assert.equal(get(copy,id).component.type,'master');assert.equal(get(copy,id).control.kind,kind);assert.equal(get(copy,id).control.label,'Edited');assert.equal(get(copy,id).fill,'#123456');
  e.free();copy.free();
 }
});

test('control part styles persist, inherit to instances, and export on native parts',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 const control={...newControl('text','Email'),starter:true,helper_message:'Use work email',states:{default:{parts:{input:{padding:'8 16',border_width:'2',border_color:'#123456',background:'#ffffff',height:48},label:{font_family:'Poppins',font_size:18,color:'#223344'},placeholder:{color:'#667788'},helper:{margin:'4 0',font_size:12}}},hover:{parts:{input:{background:'#eeeeee'}}}}};
 e.update(JSON.stringify({...get(e,id),control}));e.create_component(id);const instance=e.create_instance(id,400,0);
 assert.equal(get(e,instance).control.states.default.parts.label.font_size,18);
 assert.throws(()=>e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,states:{}}})),/protected/);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(get(copy,id).control.states.default.parts.input.padding,'8 16');
 const scene=compileCssScene(JSON.parse(e.snapshot()).shapes,{interactive:true});
 assert.match(scene.css,/\.px-control-label\{[^}]*font-size:18px/);
 assert.match(scene.css,/padding:8px 16px 8px 16px/);assert.match(scene.css,/\.px-control::placeholder\{color:#667788\}/);
 assert.match(scene.css,/:has\(>\.px-control:hover:not\(:disabled\)\)>\.px-control\{background:#eeeeee\}/);
 assert.match(scene.css,/fonts.googleapis.com.*Poppins/);
 e.free();copy.free();
});

test('part variables resolve modes and CSS shorthand on actual control parts',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 e.update(JSON.stringify({...get(e,id),control:{...newControl('text','Name'),starter:true}}));
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Tokens',default_mode:1,modes:[{id:1,name:'Light'},{id:2,name:'Dark'}]}],values:[{id:1,collection_id:1,name:'Label',kind:'color',values:{1:'#112233',2:'#ffffff'}},{id:2,collection_id:1,name:'Inset',kind:'padding',values:{1:'8 16',2:'12 24'}}]}));
 e.bind_variable(id,'control.states.default.parts.label.color',1);
 e.bind_variable(id,'control.states.default.parts.input.padding',2);
 assert.equal(get(e,id).control.states.default.parts.label.color,'#112233');
 e.set_page_variable_mode(JSON.parse(e.snapshot()).active_page,1,2);
 assert.equal(get(e,id).control.states.default.parts.label.color,'#ffffff');
 assert.match(compileCssScene(JSON.parse(e.snapshot()).shapes).css,/padding:12px 24px 12px 24px/);
 e.free();
});

test('helper message toggle preserves text, updates accessibility and supports instance overrides',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 e.update(JSON.stringify({...get(e,id),control:{...newControl('text','Name'),starter:true,helper_message:'Keep this text'}}));e.create_component(id);
 const instance=e.create_instance(id,400,0);
 e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,hide_helper:true}}));
 assert.equal(get(e,instance).control.helper_message,'Keep this text');
 assert.ok(!controlMarkup(get(e,instance).control,instance).includes('Keep this text'));
 assert.ok(!controlMarkup(get(e,instance).control,instance).includes('-help'));
 assert.ok(controlMarkup(get(e,id).control,id).includes('Keep this text'));
 e.undo();assert.ok(controlMarkup(get(e,instance).control,instance).includes('Keep this text'));e.redo();
 const copy=new Editor();copy.load(e.snapshot());assert.equal(get(copy,instance).control.hide_helper,true);
 e.reset_instance(instance);assert.ok(controlMarkup(get(e,instance).control,instance).includes('Keep this text'));
 e.free();copy.free();
});

test('input corner radii accept number and four-corner tokens, including modes and reload',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 e.update(JSON.stringify({...get(e,id),control:{...newControl('text','Name'),starter:true}}));
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Tokens',default_mode:1,modes:[{id:1,name:'Small'},{id:2,name:'Large'}]}],values:[{id:1,collection_id:1,name:'Radius',kind:'number',values:{1:8,2:16}},{id:2,collection_id:1,name:'Corners',kind:'border_radius',values:{1:'4 8',2:'8 16'}}]}));
 const path='control.states.default.parts.input.radius';
 e.bind_variable(id,path,1);
 assert.match(compileCssScene(JSON.parse(e.snapshot()).shapes).css,/border-radius:8px 8px 8px 8px/);
 e.set_page_variable_mode(JSON.parse(e.snapshot()).active_page,1,2);
 const restored=new Editor();restored.load(e.snapshot());
 assert.equal(get(restored,id).control.states.default.parts.input.radius,16);
 e.bind_variable(id,path,2);
 assert.match(compileCssScene(JSON.parse(e.snapshot()).shapes).css,/border-radius:8px 16px 8px 16px/);
 e.free();restored.free();
});
test('required indicators and required/validation part styling persist and export',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 const c={...newControl('text','Email'),required:true,required_icon:'star',invalid:true,states:{required:{parts:{label:{color:'#123456'},input:{border_color:'#234567'}}},invalid:{parts:{label:{color:'#dd0000'},input:{border_color:'#ee0000'}}}}};
 e.update(JSON.stringify({...get(e,id),control:c}));
 assert.match(controlMarkup(get(e,id).control,id),/px-control-required[^>]*>★/);
 assert.match(controlMarkup({...c,required_icon:'none'},id),/required="required"/);
 assert.ok(!controlMarkup({...c,required_icon:'none'},id).includes('px-control-required'));
 assert.ok(!controlMarkup({...c,required:false},id).includes('px-control-required'));
 const css=compileCssScene([get(e,id)],{interactive:true}).css;
 assert.ok(!css.includes('border-color:#234567')); // Unbound Required borders inherit Default.
 assert.match(css,/aria-invalid="true"[^}]*color:#dd0000/);
 assert.match(css,/aria-invalid="true"[^}]*border-color:#ee0000/);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(get(copy,id).control.required_icon,'star');
 const vars={collections:[{id:1,name:'Colors',modes:[{id:1,name:'Default'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Error',kind:'color',values:{1:'#ff0011'}}]};
 e.save_variables(JSON.stringify(vars));e.update(JSON.stringify({...get(e,id),variable_bindings:{'control.states.invalid.parts.label.color':1}}));
 assert.equal(get(e,id).control.states.invalid.parts.label.color,'#ff0011');
 e.free();copy.free();
});
test('halo is independent of the border and binds state color, thickness and offset variables',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:{...newControl('text','Name'),states:{default:{parts:{input:{border_color:'#123456',border_width:'2',border_style:'solid'}}}}}}));
 const values=[['Halo color','color','#abcdef'],['Halo thickness','number',3],['Halo offset','number',2]].map(([name,kind,value],i)=>({id:i+1,collection_id:1,name,kind,values:{1:value}}));
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Halo',modes:[{id:1,name:'Default'}],default_mode:1}],values}));
 e.update(JSON.stringify({...get(e,id),variable_bindings:{'control.states.focus.parts.input.halo_color':1,'control.states.focus.parts.input.halo_width':2,'control.states.focus.parts.input.halo_offset':3}}));
 const css=compileCssScene([get(e,id)],{interactive:true}).css;
 assert.match(css,/border-color:#123456/);assert.match(css,/border-width:2px/);
 assert.match(css,/--px-halo-color:#abcdef/);assert.match(css,/--px-halo-width:3px/);assert.match(css,/--px-halo-offset:2px/);
 assert.match(css,/outline:var\(--px-halo-width,0px\) solid var\(--px-halo-color,currentColor\)/);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(get(copy,id).control.states.focus.parts.input.halo_width,3);e.free();copy.free();
});
test('required icons support built-in vectors and isolated custom SVG images',()=>{
 const e=new Editor(),id=e.add('frame',0,0),svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2v20" stroke="red"/></svg>';
 const c={...newControl('text','Name'),required:true,required_icon:'svg',required_svg:svg,required_icon_size:18};
 e.update(JSON.stringify({...get(e,id),control:c}));const html=controlMarkup(get(e,id).control,id);
 assert.match(html,/<img alt="" width="18" height="18" src="data:image\/svg\+xml/);
 assert.ok(!html.includes('<path'));assert.ok(html.includes(encodeURIComponent(svg)));
 assert.match(controlMarkup({...c,required_icon:'icon-asterisk'},id),/<svg width="100%"/);
 assert.ok(!controlMarkup({...c,required:false},id).includes('<img'));
 const hostile='<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
 assert.ok(!controlMarkup({...c,required_svg:hostile},id).includes('<script>'));
 const copy=new Editor();copy.load(e.snapshot());assert.equal(get(copy,id).control.required_svg,svg);assert.equal(get(copy,id).control.required_icon_size,18);e.free();copy.free();
});
test('required indicator offsets align icons and text, bind variables, and persist',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:{...newControl('text','Name'),required:true,required_icon:'icon-asterisk',required_icon_offset:-2}}));
 assert.match(controlMarkup(get(e,id).control,id),/position:relative;top:-2px/);
 const vars={collections:[{id:1,name:'Offsets',modes:[{id:1,name:'Default'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Icon offset',kind:'number',values:{1:1.5}}]};
 e.save_variables(JSON.stringify(vars));e.update(JSON.stringify({...get(e,id),variable_bindings:{'control.required_icon_offset':1}}));
 for(const required_icon of ['asterisk','icon-asterisk','svg'])assert.match(controlMarkup({...get(e,id).control,required_icon,required_svg:'<svg/>'},id),/position:relative;top:1.5px/);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(get(copy,id).control.required_icon_offset,1.5);e.free();copy.free();
});
test('required icon and label colors bind independently, including custom SVG tint',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:{...newControl('text','Name'),required:true,required_icon:'icon-asterisk'}}));
 const variables={collections:[{id:1,name:'Colors',modes:[{id:1,name:'Default'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Required',kind:'color',values:{1:'#ff0011'}},{id:2,collection_id:1,name:'Label',kind:'color',values:{1:'#112233'}}]};
 e.save_variables(JSON.stringify(variables));e.update(JSON.stringify({...get(e,id),variable_bindings:{'control.required_icon_color':1,'control.states.default.parts.label.color':2}}));
 const s=get(e,id);assert.equal(s.control.required_icon_color,'#ff0011');assert.equal(s.control.states.default.parts.label.color,'#112233');
 assert.match(controlMarkup(s.control,id),/color:#ff0011/);
 assert.match(compileCssScene([s]).css,/px-control-label\{color:#112233/);
 const svg=controlMarkup({...s.control,required_icon:'svg',required_svg:'<svg/>'},id);assert.match(svg,/mask:url/);assert.match(svg,/background-color:currentColor/);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(get(copy,id).control.required_icon_color,'#ff0011');e.free();copy.free();
});

test('input adornments persist, sync to instances, and export independently inside or outside',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.create_component(id);
 const control={...newControl('text','Amount'),value:'25',left_adornment:{enabled:true,outside:false,icon:'',text:'$'},right_adornment:{enabled:true,outside:true,icon:'',text:'%'}};
 e.update(JSON.stringify({...get(e,id),control}));const instance=e.create_instance(id,300,0);
 assert.deepEqual(get(e,instance).control.left_adornment,{size:null,weight:null,gap:null,offset:null,color:'',...control.left_adornment});
 const html=controlMarkup(get(e,id).control,id),css=controlCss(get(e,id).control,id,{interactive:true});
 assert.match(html,/value="25"/);assert.match(html,/px-control-adornment-left">\$/);assert.match(html,/px-control-adornment-right">%/);
 assert.match(html,/aria-describedby="px-field-1-left px-field-1-right"/);
 assert.match(css,/padding-left:36px!important/);assert.ok(!css.includes('padding-right:36px'));
 assert.match(css,/px-control-adornment-right\{[^}]*grid-column:3/);
 const updated={...get(e,id).control,right_adornment:{enabled:true,outside:false,icon:'search',text:''}};
 e.update(JSON.stringify({...get(e,id),control:updated}));assert.equal(get(e,instance).control.right_adornment.icon,'search');
 assert.match(controlMarkup(updated,id),/aria-label="search"/);assert.match(controlCss(updated,id),/padding-right:36px!important/);
 const restored=new Editor();restored.load(e.snapshot());assert.deepEqual(get(restored,id).control.right_adornment,{size:null,weight:null,gap:null,offset:null,color:'',...updated.right_adornment});
 updated.left_adornment.enabled=false;assert.ok(!controlMarkup(updated,id).includes('class="px-control-adornment px-control-adornment-left"'));
 e.free();restored.free();
});

test('side icon colors are independent, persistent, and safely scoped',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 const control={...newControl('text','Amount'),left_adornment:{enabled:true,icon:'search',text:'',outside:false,color:'#ff0000'},right_adornment:{enabled:true,icon:'',text:'%',outside:true,color:'#008800'}};
 e.update(JSON.stringify({...get(e,id),control}));
 const saved=new Editor();saved.load(e.snapshot());const c=get(saved,id).control;
 assert.equal(c.left_adornment.color,'#ff0000');assert.equal(c.right_adornment.color,'#008800');
 let css=controlCss(c,id);assert.match(css,/adornment-left\{[^}]*color:#ff0000/);assert.match(css,/adornment-right\{[^}]*color:#008800/);
 c.left_adornment.color='';css=controlCss(c,id);assert.match(css,/adornment-left\{[^}]*color:inherit/);assert.match(css,/adornment-right\{[^}]*color:#008800/);
 c.left_adornment.color='red;display:none';assert.ok(!controlCss(c,id).includes('red;display:none'));
 e.free();saved.free();
});

test('state dropdown previews native required, disabled, and validation flags without changing exports',()=>{
 const e=new Editor(),id=e.add('frame',0,0),s={...get(e,id),control:{...newControl('text','Name'),validation_message:'Invalid'}};
 for(const [state,pattern] of [['required',/required="required"/],['disabled',/disabled="disabled"/],['invalid',/aria-invalid="true"/]]){
  controlPreviewStates.set(id,state);assert.match(compileCssScene([s]).html,pattern);assert.ok(!cssExport([s]).html.match(pattern));
 }
 controlPreviewStates.set(id,'default');assert.ok(compileCssScene([{...s,control:{...s.control,required:true}}]).html.includes('required="required"')); // Required validation remains additive to visual state.
 controlPreviewStates.delete(id);e.free();
});

test('combined state preview preserves required semantics and suppresses interaction paint when disabled',async()=>{
 const {controlWithStates}=await import('../web/controls.js');
 const c={...newControl('text','Name'),states:{required:{parts:{label:{color:'#112233'}}},focus:{border_color:'#00ff00'},invalid:{border_color:'#ff0000'},disabled:{opacity:.4}}};
 const focused=controlWithStates(c,'required,focus');assert.equal(focused.required,true);
 assert.match(controlMarkup(focused,51),/required="required"/);
 const css=controlCss(focused,51,{initialState:'required,focus,invalid'});
 assert.ok(css.indexOf('border:1px solid #ff0000')>css.indexOf('border:1px solid #00ff00'));
 const disabled=controlWithStates(c,'required,focus,disabled');
 assert.ok(!controlCss(disabled,51,{initialState:'required,focus,disabled'}).includes('#00ff00'));
 assert.ok(!controlCss(disabled,51,{interactive:true,initialState:'required,focus,disabled'}).includes('.px-node-51>.px-control{border:1px solid #00ff00}'));
});
test('validation rules and accessible errors survive all web exports',async()=>{
 const ts=await import('typescript');
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:{...newControl('email','Email'),required:true,pattern:'.+@example\\.com',min_length:5,max_length:80,validation_message:'Use your work email',helper_message:'Work address'}}));
 for(const target of ['html','react','vue','angular']){
  const files=codeExportFiles(JSON.parse(e.snapshot()),{target}).map(f=>({...f,text:new TextDecoder().decode(f.data)}));
  const text=files.map(f=>f.text).join('\n');assert.match(text,/data-validate/);assert.match(text,/Use your work email/);assert.match(text,/validity.valid/);
  assert.match(text,target==='react'?/minLength=\{"5"\}/:/minlength="5"/);
  for(const file of files.filter(f=>/\.(jsx|ts)$/.test(f.name)&&!f.name.endsWith('.d.ts'))){
   const result=ts.transpileModule(file.text,{fileName:file.name,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,target:ts.ScriptTarget.ES2022}});
   assert.deepEqual(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[],file.name);
  }
 }
 assert.match(controlMarkup({...newControl('text','Name'),invalid:true},99),/aria-describedby="px-field-99-error"/);
 e.free();
});
