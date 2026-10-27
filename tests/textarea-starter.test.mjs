import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {textareaConfig,mountTextareas} from '../web/textarea-control.js';
import {ensureInputBase} from '../web/input-base.js';
import {newControl,controlMarkup,controlCss} from '../web/controls.js';
import {behaviorSource} from '../web/behaviors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('text area settings persist and produce multiline native controls with shared appearance',()=>{
 const e=new Editor(),base=ensureInputBase(JSON.parse(e.snapshot()).variables,'textarea');
 const control={...newControl('textarea','Notes'),starter:true,base_collection:base.collection.id,value:'Line one\nLine two',max_length:100,textarea:{rows:5,resize:'both',count:true}};
 const id=e.insert_control_starter(JSON.stringify({id:0,name:'Text area',kind:'frame',x:0,y:0,width:280,height:112,fill:'#ffffff',text:'',hidden:false,control,variable_bindings:base.bindings}),JSON.stringify(base.variables));
 const instance=e.create_instance(id,300,0),s=JSON.parse(e.snapshot()).shapes.find(s=>s.id===instance);
 assert.deepEqual(s.control.textarea,control.textarea);
 const html=controlMarkup(s.control,instance);assert.match(html,/rows="5"/);assert.match(html,/maxlength="100"/);assert.match(html,/Line one\nLine two/);assert.match(html,/17 \/ 100 characters/);assert.match(html,/aria-describedby="px-field-\d+-count/);
 assert.match(controlCss(s.control,instance,{interactive:true}),/height:auto;resize:both/);
 assert.match(controlCss({...s.control,disabled:true},instance,{interactive:true}),/height:auto;resize:none/);
 assert.doesNotMatch(controlMarkup({...s.control,textarea:{count:false}},instance),/class="px-character-count"/);
 const source=behaviorSource([s]);assert.match(source,/function mountTextareas/);new Function(source.replaceAll('export ',''));
 assert.equal(textareaConfig({textarea:{rows:100,resize:'bad'}}).rows,30);e.free();
});
test('character count follows editing and cleans up its listeners',()=>{
 const listeners=new Map(),counter={textContent:''};const field={value:'Hi',parentElement:{querySelector:()=>counter},getAttribute:()=> '20',addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const cleanup=mountTextareas({querySelectorAll:()=>[field]});assert.equal(counter.textContent,'2 / 20 characters');field.value='Hi\nthere';listeners.get('input')();assert.equal(counter.textContent,'8 / 20 characters');cleanup();assert.equal(listeners.size,0);
});
