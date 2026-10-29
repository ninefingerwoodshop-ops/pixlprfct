import test from 'node:test';
import assert from 'node:assert/strict';
import {disclosureState} from '../web/inspector-disclosure.js';

test('optional controls start hidden and remain open during edits to the same layer',()=>{
 const state=disclosureState();assert.equal(state.sync('page:1',false),false);
 state.set(true);assert.equal(state.sync('page:1',false),true);
 assert.equal(state.sync('page:1',true),true);
 state.set(false);assert.equal(state.sync('page:1',true),false);
 assert.equal(state.sync('page:1',true),false);
});
test('selection changes reveal configured values without inheriting another layer’s disclosure',()=>{
 const state=disclosureState();assert.equal(state.sync('page:1',true),true);
 state.set(false);assert.equal(state.sync('page:2',false),false);
 state.set(true);assert.equal(state.sync('page:3',false),false);
 assert.equal(state.sync('page:1',true),true);
});
test('undo or another edit that introduces an optional value reveals its controls',()=>{
 const state=disclosureState();state.sync('page:1',true);state.set(false);
 assert.equal(state.sync('page:1',false),false);
 assert.equal(state.sync('page:1',true),true);
});

test('optional properties disable their effect and restore only their own values',async()=>{
 const {optionalProperty}=await import('../web/inspector-disclosure.js');
 const property=optionalProperty({'layout_item.margin':[0,0,0,0]});
 const original={page_id:1,id:10,name:'Original',layout_item:{margin:[8,12,8,12],fill_width:true},variable_bindings:{'layout_item.margin':4,width:2}};
 assert.equal(property.sync(original),true);
 const disabled=property.set(original,false);
 assert.deepEqual(disabled.layout_item,{margin:[0,0,0,0],fill_width:true});assert.deepEqual(disabled.variable_bindings,{width:2});assert.equal(property.sync(disabled),false);
 const restored=property.set({...disabled,name:'Renamed',width:200},true);
 assert.deepEqual(restored.layout_item.margin,[8,12,8,12]);assert.equal(restored.name,'Renamed');assert.equal(restored.width,200);assert.equal(restored.variable_bindings['layout_item.margin'],4);
 assert.deepEqual(original.layout_item.margin,[8,12,8,12]);
});
test('optional switches follow undo, selection changes, and neutral-value editing',async()=>{
 const {optionalProperty}=await import('../web/inspector-disclosure.js');
 const property=optionalProperty({'appearance.opacity':1});
 const plain={id:1,page_id:1,appearance:{opacity:1}},edited={...plain,appearance:{opacity:.4}};
 assert.equal(property.sync(plain),false);
 property.set(plain,true);assert.equal(property.sync(plain),true);
 assert.equal(property.sync(edited),true);
 const disabled=property.set(edited,false);assert.equal(property.sync(disabled),false);
 assert.equal(property.sync(edited),true); // Undo disabling.
 assert.equal(property.sync(disabled),false); // Redo disabling.
 assert.equal(property.sync({...edited,id:2}),true);
 assert.equal(property.sync({...plain,id:3}),false);
});
test('turning off corner radius clears all corner bindings but preserves other appearance',async()=>{
 const {optionalProperty}=await import('../web/inspector-disclosure.js');
 const property=optionalProperty({'appearance.corner_radius':0,'appearance.corner_radii':null});
 const shape={id:1,appearance:{opacity:.7,corner_radius:4,corner_radii:[1,2,3,4]},variable_bindings:{'appearance.corner_radii.0':3,'appearance.opacity':9}};
 const disabled=property.set(shape,false);
 assert.deepEqual(disabled.appearance,{opacity:.7,corner_radius:0,corner_radii:null});assert.deepEqual(disabled.variable_bindings,{'appearance.opacity':9});
});
test('margin switches update layout, variable bindings, and undo through the editor',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {default:init,Editor}=await import('../web/pkg/pixlprfct_core.js');
 const {optionalProperty}=await import('../web/inspector-disclosure.js');
 await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
 const editor=new Editor();
 try{
  const a=editor.add('rectangle',0,0),b=editor.add('rectangle',100,0);
  const parent=editor.auto_layout_selection(JSON.stringify([a,b]));
  const get=id=>JSON.parse(editor.snapshot()).shapes.find(s=>s.id===id);
  editor.save_variables(JSON.stringify({collections:[{id:1,name:'Spacing',default_mode:1,modes:[{id:1,name:'Default'}]}],values:[{id:1,collection_id:1,name:'Margin',kind:'margin',values:{1:'12 24'}}]}));
  editor.bind_variable(a,'layout_item.margin',1);
  const before=editor.snapshot(),property=optionalProperty({'layout_item.margin':[0,0,0,0]});
  editor.update(JSON.stringify(property.set(get(a),false)));
  assert.deepEqual(get(a).layout_item.margin,[0,0,0,0]);assert.equal(get(a).variable_bindings['layout_item.margin'],undefined);
  assert.equal(get(a).x,get(parent).x+get(parent).auto_layout.padding_left);
  editor.undo();assert.equal(editor.snapshot(),before);
  editor.redo();editor.update(JSON.stringify(property.set(get(a),true)));
  assert.deepEqual(get(a).layout_item.margin,[12,24,12,24]);assert.equal(get(a).variable_bindings['layout_item.margin'],1);
 }finally{editor.free();}
});
