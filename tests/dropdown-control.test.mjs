import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {newControl,controlMarkup,controlCss} from '../web/controls.js';
import {dropdownConfig} from '../web/dropdown-control.js';
import {codeExportFiles} from '../web/code-export.js';
import {reactMarkup} from '../web/framework-export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
const sample=()=>({...newControl('select','Tools'),multiple:true,selected_values:['a','b','c'],dropdown:{...newControl('select','').dropdown,pill_limit:1,menu_width:360,menu_height:200,items:[{label:'Design',value:'a',category:'Creative',disabled:false},{label:'Write',value:'b',category:'Creative',disabled:false},{label:'Build',value:'c',category:'Engineering',disabled:false},{label:'Unavailable',value:'d',category:'Engineering',disabled:true}]}});
test('dropdown markup exposes categories, checks, pills, counts and real form values',()=>{
 const c=sample(),html=controlMarkup(c,1);
 assert.match(html,/role="listbox"/);assert.match(html,/aria-multiselectable="true"/);assert.match(html,/Select all/);assert.match(html,/Deselect all/);
 assert.match(html,/px-dropdown-pill">Design/);assert.match(html,/\+ 2 more/);assert.match(html,/px-dropdown-category">Engineering/);assert.match(html,/aria-disabled="true"/);
 assert.match(html,/<select[^>]+multiple/);assert.match(reactMarkup(html),/defaultValue=\{\["a","b","c"\]\}/);
 const single=controlMarkup({...c,multiple:false,value:'b'},2);assert.ok(!single.includes('data-select-all'));assert.ok(!single.includes('px-dropdown-checkbox'));assert.match(single,/Write/);
 const untrusted=controlMarkup({...c,dropdown:{...c.dropdown,items:[{label:'<img onerror=alert(1)>',value:'"<',category:'<script>',disabled:false}]}},3);assert.ok(!untrusted.includes('<img onerror'));assert.match(untrusted,/&lt;script&gt;/);
});
test('dropdown model persists, inherits main edits, permits instance selection and protects menu styles',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:sample()}));e.create_component(id);const instance=e.create_instance(id,300,0);
 e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,selected_values:['b']}}));
 const next=get(e,id);next.control.dropdown.menu_width=500;next.control.dropdown.items[0].label='Design updated';e.update(JSON.stringify(next));
 assert.deepEqual(get(e,instance).control.selected_values,['b']);assert.equal(get(e,instance).control.dropdown.menu_width,500);assert.equal(get(e,instance).control.dropdown.items[0].label,'Design updated');
 assert.throws(()=>e.update(JSON.stringify({...get(e,instance),control:{...get(e,instance).control,dropdown:{...get(e,instance).control.dropdown,menu_width:600}}})),/protected/);
 const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.deepEqual(get(copy,id).control.dropdown,get(e,id).control.dropdown);
 for(const patch of [{bulk_style:"invalid"},{menu_height:0},{menu_width:-1},{pill_limit:31},{items:[{label:'A',value:'same'},{label:'B',value:'same'}]}]){assert.throws(()=>e.update(JSON.stringify({...get(e,id),control:{...get(e,id).control,dropdown:{...get(e,id).control.dropdown,...patch}}})));assert.equal(e.snapshot(),saved);}
 copy.free();e.free();
});
test('dropdown appearance supports variables and design-only open preview',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:sample()}));
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Theme',default_mode:1,modes:[{id:1,name:'Light'},{id:2,name:'Dark'}]}],values:[{id:1,collection_id:1,name:'Pill',kind:'color',values:{1:'#112233',2:'#abcdef'}}]}));e.bind_variable(id,'control.states.default.parts.pill.background',1);
 assert.match(controlCss(get(e,id).control,id),/\.px-dropdown-pill\{background:#112233\}/);e.set_page_variable_mode(1,1,2);assert.match(controlCss(get(e,id).control,id),/#abcdef/);
 const c={...sample(),dropdown:{...sample().dropdown,preview_open:true}};
 assert.match(controlCss(c,1),/grid-row:2\/3;top:calc\(100% \+ 4px\)/);assert.ok(!controlCss(c,1,{interactive:true}).includes('top:calc(100% + 4px)'));
 e.free();
});
test('dropdown exports include shared interaction runtime for all web frameworks',()=>{
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:sample()}));
 for(const target of ['html','react','vue','angular']){const text=codeExportFiles(JSON.parse(e.snapshot()),{target}).map(f=>new TextDecoder().decode(f.data)).join('\n');assert.match(text,/function mountDropdowns/);assert.match(text,/showPopover/);assert.match(text,/aria-multiselectable/);assert.match(text,/Creative/);}
 assert.deepEqual(dropdownConfig({...sample(),selected_values:['missing','a']}).selected,['a']);e.free();
});
test('bulk selection styles persist with accessible all and partial selection states',()=>{
 for(const style of ['none','links','buttons','checkbox','switch','toggle_button']){
  const c=sample();c.dropdown.bulk_style=style;c.dropdown.select_all_label='Everything';c.dropdown.deselect_all_label='Nothing';
  const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:c}));assert.equal(get(e,id).control.dropdown.bulk_style,style);
  const html=controlMarkup(c,id);
  if(style==='none')assert.ok(!html.includes('class="px-dropdown-actions"'));
  if(style==='toggle_button')assert.match(html,/data-bulk-label>Nothing/);
  if(['checkbox','switch'].includes(style))assert.match(html,/aria-checked="true"/);
  c.selected_values=['a'];if(style==='checkbox')assert.match(controlMarkup(c,id),/aria-checked="mixed"/);
  e.free();
 }
});
test('Dropdown Base creates once, binds existing starters, preserves overrides and resets',async()=>{
 const {ensureInputBase,ensureDropdownBase}=await import('../web/input-base.js');
 const base=ensureInputBase({collections:[],values:[]},'select');
 const collection=base.variables.collections.find(c=>c.preset==='dropdown_base');assert.ok(collection);
 assert.deepEqual(ensureDropdownBase(base.variables).variables,base.variables);
 const path='control.states.default.parts.actions.background',variable=base.variables.values.find(v=>v.collection_id===collection.id&&v.control_path===path);
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:{...sample(),starter_linked:true,base_collection:base.collection.id}}));e.create_component(id);e.save_variables(JSON.stringify(base.variables));
 assert.equal(get(e,id).variable_bindings[path],variable.id);
 let vars=structuredClone(base.variables);vars.values.find(v=>v.id===variable.id).values[1]='#123456';e.save_variables(JSON.stringify(vars));assert.match(controlCss(get(e,id).control,id),/background:#123456/);
 let s=get(e,id);delete s.variable_bindings[path];s.control.states.default.parts.actions.background='#abcdef';e.update(JSON.stringify(s));
 vars.values.find(v=>v.id===variable.id).values[1]='#654321';e.save_variables(JSON.stringify(vars));assert.equal(get(e,id).control.states.default.parts.actions.background,'#abcdef');
 e.reset_starter_overrides(id);assert.equal(get(e,id).control.states.default.parts.actions.background,'#654321');
 vars.values=vars.values.filter(v=>v.id!==variable.id);e.save_variables(JSON.stringify(vars));assert.equal(get(e,id).variable_bindings[path],undefined);assert.equal(get(e,id).control.states.default.parts.actions.background??null,null);e.free();
});
test('checkbox size replaces legacy dimensions and renders square checkboxes',async()=>{
 const {ensureDropdownBase}=await import('../web/input-base.js');
 const prefix='control.states.default.parts.checkbox.';
 const source={collections:[{id:1,name:'Dropdown Base',preset:'dropdown_base',default_mode:1,modes:[{id:1,name:'Default'}]}],values:[{id:1,collection_id:1,name:'Checkbox / Width',kind:'number',control_path:prefix+'width',values:{1:20}},{id:2,collection_id:1,name:'Checkbox / Height',kind:'number',control_path:prefix+'height',values:{1:14}}]};
 const migrated=ensureDropdownBase(source);assert.equal(migrated.variables.values.length,1);assert.equal(migrated.variables.values[0].control_path,prefix+'size');assert.equal(migrated.variables.values[0].values[1],20);
 const c=sample();c.states={default:{parts:{checkbox:{size:20,width:12,height:15}}}};assert.match(controlCss(c,1),/width:20px;height:20px/);
 const e=new Editor(),id=e.add('frame',0,0);e.update(JSON.stringify({...get(e,id),control:c}));e.save_variables(JSON.stringify(migrated.variables));e.bind_variable(id,prefix+'size',1);assert.match(controlCss(get(e,id).control,id),/width:20px;height:20px/);e.free();
});
