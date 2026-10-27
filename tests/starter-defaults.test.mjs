import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {newControl} from '../web/controls.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shape=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
const add=(e,kind)=>{const id=e.add('frame',0,0);e.update(JSON.stringify({...shape(e,id),control:{...newControl(kind,kind),starter_linked:true,base_collection:1}}));e.create_component(id);return id;};
test('starters share first appearance, preserve explicit overrides, reset, reload and sync instances',()=>{
 const e=new Editor();e.save_variables(JSON.stringify({collections:[{id:1,name:'Input Base',preset:'input_base',default_mode:1,modes:[{id:1,name:'Default'}]}],values:[]}));
 const first=add(e,'text');let s=shape(e,first);s.control.required_icon='icon-star';s.control.states={disabled:{parts:{input:{background:'#123456'}}}};e.update(JSON.stringify(s));
 const second=add(e,'select');assert.equal(shape(e,second).control.required_icon,'icon-star');assert.equal(shape(e,second).control.states.disabled.parts.input.background,'#123456');
 const instance=e.create_instance(second,200,0);
 s=shape(e,second);s.control.required_icon='icon-plus';s.control.label='My dropdown';e.update(JSON.stringify(s));assert.ok(shape(e,second).control.shared_overrides.includes('/required_icon'));
 s=shape(e,first);s.control.required_icon='icon-asterisk';s.control.states.disabled.parts.input.background='#abcdef';e.update(JSON.stringify(s));
 assert.equal(shape(e,second).control.required_icon,'icon-plus');assert.equal(shape(e,second).control.states.disabled.parts.input.background,'#abcdef');
 e.reset_starter_overrides(second);assert.equal(shape(e,second).control.required_icon,'icon-asterisk');assert.equal(shape(e,second).control.label,'My dropdown');assert.equal(shape(e,instance).control.required_icon,'icon-asterisk');
 e.undo();assert.equal(shape(e,second).control.required_icon,'icon-plus');e.redo();assert.equal(shape(e,second).control.required_icon,'icon-asterisk');
 const copy=new Editor();copy.load(e.snapshot());assert.deepEqual(shape(copy,second).control.shared_overrides,[]);copy.free();e.free();
});
test('explicit variable overrides reset to the shared binding and deleted source styles clear',()=>{
 const e=new Editor();e.save_variables(JSON.stringify({collections:[{id:1,name:'Input Base',preset:'input_base',default_mode:1,modes:[{id:1,name:'Default'}]}],values:[{id:1,collection_id:1,name:'Shared',kind:'color',values:{1:'#112233'}},{id:2,collection_id:1,name:'Local',kind:'color',values:{1:'#abcdef'}}]}));
 const first=add(e,'text'),second=add(e,'select'),path='control.states.disabled.parts.input.border_color';
 let s=shape(e,first);s.variable_bindings[path]=1;e.update(JSON.stringify(s));assert.equal(shape(e,second).variable_bindings[path],1);
 e.bind_variable(second,path,2);assert.equal(shape(e,second).variable_bindings[path],2);
 e.reset_starter_overrides(second);assert.equal(shape(e,second).variable_bindings[path],1);
 s=shape(e,first);delete s.variable_bindings[path];delete s.control.states.disabled.parts.input.border_color;e.update(JSON.stringify(s));assert.equal(shape(e,second).variable_bindings[path],undefined);assert.equal(shape(e,second).control.states.disabled.parts.input.border_color,null);e.free();
});
