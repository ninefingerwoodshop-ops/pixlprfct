import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {passwordConfig,passwordAssessment,mountPasswords} from '../web/password-control.js';
import {ensureInputBase} from '../web/input-base.js';
import {newControl,controlMarkup} from '../web/controls.js';
import {behaviorSource} from '../web/behaviors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('password requirements distinguish optional empty values from unmet rules',()=>{
 const cfg=passwordConfig({min_length:8,password:{uppercase:true,lowercase:true,digit:true,symbol:true}});
 assert.equal(passwordAssessment('',cfg).error,'');assert.equal(passwordAssessment('',cfg).score,0);
 assert.match(passwordAssessment('abc',cfg).error,/At least 8/);assert.match(passwordAssessment('abcdefgh',cfg).error,/uppercase/);
 const valid=passwordAssessment('DemoPass7!',cfg);assert.equal(valid.error,'');assert.ok(valid.rules.every(r=>r.met));
});
test('password starter persists settings into instances and exports native constraints',()=>{
 const e=new Editor(),base=ensureInputBase(JSON.parse(e.snapshot()).variables,'password');
 const control={...newControl('password','Password'),starter:true,base_collection:base.collection.id,password:{toggle:true,strength:true,requirements:true,digit:true}};
 const id=e.insert_control_starter(JSON.stringify({id:0,name:'Password field',kind:'frame',x:0,y:0,width:280,height:112,fill:'#ffffff',text:'',hidden:false,control,variable_bindings:base.bindings}),JSON.stringify(base.variables));
 const instance=e.create_instance(id,300,0),s=JSON.parse(e.snapshot()).shapes.find(s=>s.id===instance);assert.deepEqual(s.control.password,control.password);
 const html=controlMarkup(s.control,instance);assert.match(html,/type="password"/);assert.match(html,/minlength="8"/);assert.match(html,/autocomplete="new-password"/);assert.match(html,/Show password/);assert.match(html,/A number/);
 assert.doesNotMatch(controlMarkup({...s.control,password:{toggle:false,strength:false,requirements:false}},instance),/class="px-password-toggle"|<meter|<ul/);
 const source=behaviorSource([s]);assert.match(source,/function mountPasswords/);new Function(source.replaceAll('export ',''));e.free();
});
test('visibility toggle preserves text, disabled state blocks reveal, and cleanup remasks',()=>{
 class Node extends EventTarget{constructor(){super();this.attrs={};this.dataset={};}setAttribute(k,v){this.attrs[k]=v;}querySelector(s){return this.nodes?.[s];}}
 const field=new Node();Object.assign(field,{type:'password',value:'DemoPass7!',disabled:false,readOnly:false,dataset:{validate:'blur'},setCustomValidity(message){this.error=message;}});
 const eye={},off={},toggle=new Node();toggle.nodes={'[data-eye]':eye,'[data-eye-off]':off};const feedback=new Node();feedback.dataset.password=JSON.stringify({min_length:8,digit:true});feedback.parentElement={querySelector:s=>s==='input.px-control'?field:toggle};
 const cleanup=mountPasswords({querySelectorAll:()=>[feedback]});toggle.dispatchEvent(new Event('click'));assert.equal(field.type,'text');assert.equal(field.value,'DemoPass7!');assert.equal(toggle.attrs['aria-label'],'Hide password');
 toggle.dispatchEvent(new Event('click'));assert.equal(field.type,'password');field.disabled=true;toggle.dispatchEvent(new Event('click'));assert.equal(field.type,'password');field.disabled=false;field.value='abc';field.dispatchEvent(new Event('input'));assert.match(field.error,/At least 8/);cleanup();assert.equal(field.type,'password');assert.equal(field.error,'');
});
