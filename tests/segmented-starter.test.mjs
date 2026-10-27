import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {ensureInputBase,inputBaseControl} from '../web/input-base.js';
import {newControl,controlMarkup,controlCss} from '../web/controls.js';
import {icon} from '../web/icons.js';
import {sizingMode} from '../web/layout-sizing.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('segmented starter uses native exclusive options, library icons and protected shared styling',()=>{
 const e=new Editor(),base=ensureInputBase(JSON.parse(e.snapshot()).variables,'segmented');assert.equal(base.collection.preset,'segmented_base');assert.equal(ensureInputBase(base.variables,'segmented').variables.collections.length,1);
 const control={...newControl('segmented','View'),starter:true,base_collection:base.collection.id,options:['List','Grid','Details'],value:'List',segmented:{icons:['list-bulleted','layout-grid'],disabled:[false,false,true],vertical:false,equal:true}};
 const id=e.insert_control_starter(JSON.stringify({id:0,name:'Segmented control',kind:'frame',x:0,y:0,width:300,height:44,fill:'#ffffff',text:'',hidden:false,control,variable_bindings:base.bindings}),JSON.stringify(base.variables));const instance=e.create_instance(id,300,0),s=JSON.parse(e.snapshot()).shapes.find(s=>s.id===instance);
 s.control=inputBaseControl(s,base.variables);assert.equal(s.control.states.selected.parts.input.background,'#2563eb');assert.equal(s.control.states.selected.parts.input.color,'#ffffff');assert.deepEqual(s.control.segmented,control.segmented);
 const html=controlMarkup(s.control,instance);assert.match(html,/role="radiogroup"/);assert.equal((html.match(/type="radio"/g)||[]).length,3);assert.equal((html.match(/ checked/g)||[]).length,1);assert.match(html,/value="Details" disabled/);assert.ok(html.includes(icon('list-bulleted')));assert.match(html,new RegExp('name="px-segments-'+instance+'"'));
 const css=controlCss(s.control,instance,{interactive:true});assert.match(css,/input:checked\+label/);assert.match(css,/focus-visible/);assert.match(controlCss({...s.control,segmented:{vertical:true}},instance),/flex-direction:column/);assert.equal(sizingMode(s,'height'),'hug');e.free();
});
