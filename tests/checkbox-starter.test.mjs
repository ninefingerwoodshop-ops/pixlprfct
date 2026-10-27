import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {newControl,controlWithStates,controlMarkup,controlCss} from '../web/controls.js';
import {ensureInputBase,inputBaseControl,availableInputTokens,inputTokenVariable} from '../web/input-base.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('checkbox collection persists, binds size and state styles, and synchronizes instances',()=>{
 const e=new Editor(),base=ensureInputBase(JSON.parse(e.snapshot()).variables,'checkbox');
 const id=e.insert_control_starter(JSON.stringify({id:0,x:0,y:0,fill:'#ffffff',text:'',hidden:false,kind:'frame',name:'Checkbox starter',width:180,height:24,control:{...newControl('checkbox','Accept terms'),starter:true,base_collection:base.collection.id},variable_bindings:base.bindings}),JSON.stringify(base.variables));
 const instance=e.create_instance(id,200,0),doc=JSON.parse(e.snapshot()),s=doc.shapes.find(s=>s.id===instance);
 assert.equal(s.component.master,id);
 assert.equal(s.control.label,'Accept terms');
 assert.ok(base.collection.modes.some(m=>m.name==='Indeterminate'));
 assert.equal(ensureInputBase(base.variables,'checkbox').variables.collections.length,1);
 const c=inputBaseControl(s,doc.variables);
 assert.equal(c.states.selected.parts.input.background,'#2563eb');
 assert.equal(c.states.indeterminate.parts.input.background,'#2563eb');
 assert.match(controlCss(c,instance),/--px-checkbox-size:20px/);
 assert.match(controlCss(c,instance),/height:var\(--px-checkbox-size,20px\);min-height:var\(--px-checkbox-size,20px\);max-height:var\(--px-checkbox-size,20px\)/);
 const master=doc.shapes.find(s=>s.id===id);master.control.label='Subscribe';e.update(JSON.stringify(master));
 assert.equal(JSON.parse(e.snapshot()).shapes.find(s=>s.id===instance).control.label,'Subscribe');
 e.free();
});
test('checkbox markup labels native input and supports mixed plus disabled states',()=>{
 const c=controlWithStates(newControl('checkbox','Accept <terms>'),'indeterminate,disabled');
 const html=controlMarkup(c,9);
 assert.match(html,/aria-checked="mixed"/);assert.match(html,/disabled="disabled"/);
 assert.match(html,/for="px-check-9"/);assert.match(html,/Accept &lt;terms&gt;/);
 assert.ok(!html.includes(' checked="checked"'));
 assert.equal(controlWithStates(newControl('checkbox','Check'),'selected').checked,true);
});
test('checkbox label side persists and follows its main component',()=>{
 const e=new Editor(),id=e.add('frame',0,0);
 const get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(id),control:newControl('checkbox','Label')}));e.create_component(id);
 const instance=e.create_instance(id,250,0);
 e.update(JSON.stringify({...get(id),control:{...get(id).control,label_position:'left'}}));
 assert.equal(get(instance).control.label_position,'left');
 assert.match(controlCss(get(instance).control,instance),/\.px-control-label\{order:-1\}/);
 assert.match(controlCss(get(instance).control,instance),/justify-content:flex-end/);
 const copy=new Editor();copy.load(e.snapshot());
 assert.equal(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===instance).control.label_position,'left');
 e.update(JSON.stringify({...get(id),control:{...get(id).control,label_position:'right'}}));
 assert.match(controlCss(get(instance).control,instance),/\.px-control-label\{order:0\}/);
 copy.free();e.free();
});
test('instance width and width limits remain editable while height and paint stay protected',()=>{
 const e=new Editor(),id=e.add('frame',0,0),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(id),control:newControl('checkbox','Checkbox')}));e.create_component(id);
 const instance=e.create_instance(id,300,0);
 e.update(JSON.stringify({...get(instance),width:400,layout_item:{...get(instance).layout_item,min_width:100,max_width:500,fill_width:true}}));
 assert.equal(get(instance).width,400);assert.equal(get(instance).layout_item.fill_width,true);
 assert.throws(()=>e.update(JSON.stringify({...get(instance),height:80})),/protected/);
 assert.throws(()=>e.update(JSON.stringify({...get(instance),fill:'#ff0000'})),/protected/);
 e.update(JSON.stringify({...get(id),control:{...get(id).control,label:'Updated'}}));
 assert.equal(get(instance).width,400);assert.equal(get(instance).layout_item.max_width,500);assert.equal(get(instance).control.label,'Updated');
 e.reset_instance(instance);assert.equal(get(instance).width,get(id).width);e.free();
});
test('unparented starters and instances support hug and full width',async()=>{
 const {sizingOptions,sizingPatch,sizingMode}=await import('../web/layout-sizing.js');
 const {compileCssScene}=await import('../web/css-renderer.js');
 const e=new Editor(),id=e.add('frame',0,0),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(id),control:newControl('checkbox','Agree')}));e.create_component(id);
 const instance=e.create_instance(id,200,0);
 assert.equal(sizingOptions([get(instance)],[]).hug,true);assert.equal(sizingOptions([get(instance)],[]).fill,true);
 for(const mode of ['hug','fill','fixed']){
  e.update(JSON.stringify(sizingPatch(get(instance),'width',mode)));
  assert.equal(sizingMode(get(instance),'width'),mode);
  const css=compileCssScene([get(instance)]).css;
  if(mode==='hug')assert.match(css,/width:max-content!important/);
  if(mode==='fill')assert.match(css,/width:100%!important/);
 }
 e.free();
});

test('label gap variables apply to existing starters and instances on either label side',()=>{
 const e=new Editor(),base=ensureInputBase(JSON.parse(e.snapshot()).variables,'checkbox');
 const path='control.states.default.parts.container.gap';
 const original=base.variables.values.find(v=>v.control_path===path);
 assert.equal(original.values[base.collection.default_mode],8);
 // Simulate an existing collection created before Label / Gap was available.
 base.variables.values=base.variables.values.filter(v=>v!==original);delete base.bindings[path];
 const id=e.insert_control_starter(JSON.stringify({id:0,x:0,y:0,fill:'#ffffff',text:'',hidden:false,kind:'frame',name:'Checkbox',width:180,height:20,control:{...newControl('checkbox','Agree'),starter:true,base_collection:base.collection.id},variable_bindings:base.bindings}),JSON.stringify(base.variables));
 const instance=e.create_instance(id,200,0),vars=JSON.parse(e.snapshot()).variables;
 const spec=availableInputTokens(vars,base.collection.id).find(t=>t.control_path===path);
 const gap=inputTokenVariable(spec,base.collection,100,vars);gap.values[base.collection.default_mode]=16;vars.values.push(gap);e.save_variables(JSON.stringify(vars));
 const get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 for(const side of ['left','right']){
  e.update(JSON.stringify({...get(id),control:{...get(id).control,label_position:side}}));
  const shape=get(instance);assert.equal(shape.control.states.default.parts.container.gap,16);
  const css=controlCss(inputBaseControl(shape,vars),instance);
  assert.ok(css.lastIndexOf('gap:16px')>css.indexOf('gap:8px'));
 }
 vars.values=vars.values.filter(v=>v.id!==100);e.save_variables(JSON.stringify(vars));
 assert.equal(get(id).control.states.default.parts.container?.gap,undefined);
 e.free();
});
test('checkbox height stays Hug and canvas resizing changes only width',async()=>{
 const {sizingMode,sizingPatch,limitPatch}=await import('../web/layout-sizing.js');
 const {resizeBox,resizeHandleAt}=await import('../web/resizing.js');
 const s={id:1,x:0,y:0,width:180,height:20,control:newControl('checkbox','Label'),layout_item:{fill_height:true,min_height:80}};
 for(const mode of ['fixed','fill','hug']){
  const next=sizingPatch(s,'height',mode);
  assert.equal(sizingMode(next,'height'),'hug');assert.equal(next.layout_item.fill_height,false);
  assert.equal(next.layout_item.min_height,null);
 }
 assert.equal(limitPatch(s,'height','min',100).layout_item.min_height,null);
 const resized=resizeBox(s,{x:250,y:80},1,1);
 assert.equal(resized.height,20);assert.equal(resized.y,0);assert.equal(resized.width,250);
 assert.equal(resizeHandleAt(s,{x:90,y:0},1),undefined);
});
