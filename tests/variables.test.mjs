import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),shape=(e,id)=>doc(e).shapes.find(s=>s.id===id),save=(e,v)=>e.save_variables(JSON.stringify(v));
const fixture=()=>({collections:[{id:1,name:'Theme',modes:[{id:1,name:'Light'},{id:2,name:'Dark'}],default_mode:1}],values:[
 {id:1,collection_id:1,name:'Color/brand',kind:'color',values:{1:'#ff0000',2:'#0000ff'}},
 {id:2,collection_id:1,name:'Spacing',kind:'number',values:{1:16,2:32}},
 {id:3,collection_id:1,name:'Label',kind:'string',values:{1:'Light theme',2:'Dark theme'}},
 {id:4,collection_id:1,name:'Hidden',kind:'boolean',values:{1:false,2:true}},
 {id:5,collection_id:1,name:'Color/semantic',kind:'color',values:{1:{alias:1},2:{alias:1}}},
]});
test('typed variables and aliases resolve inherited modes, persist and undo atomically',()=>{
 const e=new Editor();save(e,fixture());const frame=e.add('frame',0,0),r=e.add('rectangle',20,20),t=e.add('text',40,40);
 e.move_into(JSON.stringify([shape(e,r),shape(e,t)]),frame);e.bind_variable(r,'fill',5);e.bind_variable(t,'text',3);e.bind_variable(r,'hidden',4);e.bind_variable(t,'typography.font_size',2);
 assert.equal(shape(e,r).fill,'#ff0000');assert.equal(shape(e,t).text,'Light theme');const before=e.snapshot();
 e.set_variable_mode(frame,1,2);assert.equal(shape(e,r).fill,'#0000ff');assert.equal(shape(e,r).hidden,true);assert.equal(shape(e,t).text,'Dark theme');assert.equal(shape(e,t).typography.font_size,32);
 const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);
 const restored=new Editor();restored.load(after);assert.equal(restored.snapshot(),after);restored.free();
 e.set_variable_mode(r,1,1);assert.equal(shape(e,r).fill,'#ff0000');e.set_variable_mode(r,1,0);assert.equal(shape(e,r).fill,'#0000ff');e.free();
});
test('definition edits propagate; detach, deletion and direct edits retain literals',()=>{
 const e=new Editor();const f=fixture();save(e,f);const a=e.add('rectangle',0,0),b=e.add('rectangle',200,0);e.bind_variable(a,'fill',1);e.bind_variable(b,'fill',1);
 e.update(JSON.stringify({...shape(e,a),fill:'#00ff00'}));assert.deepEqual(shape(e,a).variable_bindings,{});
 f.values[0].values[1]='#abcdef';save(e,f);assert.equal(shape(e,a).fill,'#00ff00');assert.equal(shape(e,b).fill,'#abcdef');
 e.bind_variable(b,'fill',0);f.values[0].values[1]='#123456';save(e,f);assert.equal(shape(e,b).fill,'#abcdef');
 e.bind_variable(b,'fill',1);const before=e.snapshot();f.values=f.values.filter(v=>![1,5].includes(v.id));save(e,f);assert.deepEqual(shape(e,b).variable_bindings,{});assert.equal(shape(e,b).fill,'#123456');e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('invalid values, property types, aliases and modes fail without changing document or history',()=>{
 const e=new Editor();save(e,fixture());const r=e.add('rectangle',0,0);e.bind_variable(r,'width',2);const before=e.snapshot();
 const attempt=action=>{assert.throws(action);assert.equal(e.snapshot(),before);};
 attempt(()=>e.bind_variable(r,'fill',2));attempt(()=>e.bind_variable(r,'text',3));attempt(()=>e.bind_variable(r,'auto_layout.gap',2));attempt(()=>e.set_variable_mode(r,1,999));
 let v=fixture();v.values[0].values[1]='oops';attempt(()=>save(e,v));v=fixture();v.values[0].values[1]={alias:5};attempt(()=>save(e,v));v=fixture();v.values[0].values[1]={alias:2};attempt(()=>save(e,v));v=fixture();v.values[1].values[1]=-10;attempt(()=>save(e,v));
 v=fixture();delete v.values[0].values[2];attempt(()=>save(e,v));v=doc(e);v.shapes[0].variable_bindings.fill=999;attempt(()=>e.load(JSON.stringify(v)));e.free();
});
test('component instances inherit bindings, permit explicit overrides and duplicate in-document',()=>{
 const e=new Editor();const v=fixture();save(e,v);const master=e.add('frame',0,0);e.bind_variable(master,'fill',1);e.create_component(master);const instance=e.create_instance(master,700,0);
 assert.equal(shape(e,instance).variable_bindings.fill,1);e.set_variable_mode(instance,1,2);assert.equal(shape(e,instance).fill,'#0000ff');assert.equal(shape(e,master).fill,'#ff0000');
 e.bind_variable(instance,'fill',5);v.values[4].values[2]='#00ff00';save(e,v);assert.equal(shape(e,instance).fill,'#00ff00');
 const copy=JSON.parse(e.duplicate_many(JSON.stringify([instance])))[0];assert.equal(shape(e,copy).fill,'#00ff00');assert.equal(shape(e,copy).variable_bindings.fill,5);
 const other=new Editor(),pasted=JSON.parse(other.paste_layers(e.copy_layers(JSON.stringify([instance])),0,0,0))[0];assert.equal(shape(other,pasted).fill,'#00ff00');assert.deepEqual(shape(other,pasted).variable_bindings,{});other.free();e.free();
});
test('spacing variables reflow auto layout and preserve child placement through undo',()=>{
 const e=new Editor();save(e,fixture());const f=e.add('frame',0,0),a=e.add('rectangle',0,0),b=e.add('rectangle',200,0);e.move_into(JSON.stringify([shape(e,a),shape(e,b)]),f);
 e.update(JSON.stringify({...shape(e,f),auto_layout:{direction:'horizontal',gap:10,padding_top:10,padding_right:10,padding_bottom:10,padding_left:10,align:'start',justify:'start',hug_width:false,hug_height:false}}));
 e.bind_variable(f,'auto_layout.gap',2);e.bind_variable(f,'auto_layout.padding_left',2);assert.equal(shape(e,b).x-shape(e,a).x-shape(e,a).width,16);
 const before=e.snapshot();e.set_variable_mode(f,1,2);assert.equal(shape(e,b).x-shape(e,a).x-shape(e,a).width,32);assert.equal(shape(e,a).x,shape(e,f).x+32);e.undo();assert.equal(e.snapshot(),before);e.free();
});

test('padding variables bind four sides, support modes/aliases, and detach on manual edits',async()=>{
 const e=new Editor(),v=fixture();v.values.push({id:6,collection_id:1,name:'Control padding',kind:'padding',values:{1:'12, 24, 16, 32',2:'20, 30, 40, 50'}},{id:7,collection_id:1,name:'Alias padding',kind:'padding',values:{1:{alias:6},2:{alias:6}}});save(e,v);
 const f=e.auto_layout_selection(JSON.stringify([e.add('rectangle',100,100)]));e.bind_variable(f,'auto_layout.padding',7);
 const pads=()=>{const l=shape(e,f).auto_layout;return [l.padding_top,l.padding_right,l.padding_bottom,l.padding_left];};assert.deepEqual(pads(),[12,24,16,32]);
 const {compileCssScene}=await import('../web/css-renderer.js');assert.match(compileCssScene(doc(e).shapes,{variables:doc(e).variables}).css,/padding:var\(--px-alias-padding-7/);
 const saved=e.snapshot();e.set_variable_mode(f,1,2);assert.deepEqual(pads(),[20,30,40,50]);e.undo();assert.equal(e.snapshot(),saved);
 const old=shape(e,f);e.update(JSON.stringify({...old,auto_layout:{...old.auto_layout,padding_left:9}}));assert.equal(shape(e,f).variable_bindings['auto_layout.padding'],undefined);assert.deepEqual(pads(),[12,24,16,9]);
 e.bind_variable(f,'auto_layout.padding',6);e.bind_variable(f,'auto_layout.padding_left',2);assert.equal(shape(e,f).variable_bindings['auto_layout.padding'],undefined);assert.equal(pads()[3],16);
 e.bind_variable(f,'auto_layout.padding',6);assert.equal(shape(e,f).variable_bindings['auto_layout.padding_left'],undefined);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());copy.free();e.free();
});
test('malformed padding values fail atomically',()=>{
 const e=new Editor(),v=fixture();v.values.push({id:6,collection_id:1,name:'Padding',kind:'padding',values:{1:'1, 2, 3, 4',2:'0,0,0,0'}});save(e,v);const before=e.snapshot();
 for(const bad of ['','1,2,3,4,5','1,,3,4','-1,2,3,4','a,2,3,4','Infinity,2,3,4']){v.values.at(-1).values[1]=bad;assert.throws(()=>save(e,v));assert.equal(e.snapshot(),before);}e.free();
});

for(const kind of ['margin','border_radius','border_width'])test(`${kind} variables save four values, alias, duplicate modes and reject malformed inputs`,()=>{
 const e=new Editor(),v=fixture();v.values.push({id:6,collection_id:1,name:kind,kind,values:{1:'1, 2, 3, 4',2:'8,8,8,8'}},{id:7,collection_id:1,name:kind+' alias',kind,values:{1:{alias:6},2:{alias:6}}});save(e,v);const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);
 v.values.at(-2).values[1]='1,2,3,4,5';assert.throws(()=>save(e,v));assert.equal(e.snapshot(),saved);v.values.at(-2).values[1]='-1,2,3,4';if(kind==='margin'){save(e,v);assert.equal(doc(e).variables.values.at(-2).values[1],'-1,2,3,4');}else assert.throws(()=>save(e,v));e.free();copy.free();
});

for(const kind of ['padding','margin','border_radius','border_width'])test(`${kind} accepts CSS shorthand with 1, 2, 3 or 4 values`,()=>{
 const e=new Editor(),v=fixture();v.values.push({id:6,collection_id:1,name:kind,kind,values:{1:'0',2:'0'}});
 const f=e.auto_layout_selection(JSON.stringify([e.add('rectangle',100,100)]));
 for(const [text,expected] of [['8',[8,8,8,8]],['8 16',[8,16,8,16]],['8, 16, 24',[8,16,24,16]],['8px 16px 24px 32px',[8,16,24,32]]]){
  v.values.at(-1).values[1]=text;save(e,v);
  if(kind==='padding'){e.bind_variable(f,'auto_layout.padding',6);const l=shape(e,f).auto_layout;assert.deepEqual([l.padding_top,l.padding_right,l.padding_bottom,l.padding_left],expected);}
 }
 e.free();
});

test('border radius bindings expand CSS corners, update modes and detach on corner edits',async()=>{
 const e=new Editor(),v=fixture();v.values.push({id:6,collection_id:1,name:'Corners',kind:'border_radius',values:{1:'8 16 24',2:'4,12'}},{id:7,collection_id:1,name:'Corners alias',kind:'border_radius',values:{1:{alias:6},2:{alias:6}}});save(e,v);const r=e.add('rectangle',20,20);
 e.bind_variable(r,'appearance.corner_radii',7);assert.deepEqual(shape(e,r).appearance.corner_radii,[8,16,24,16]);
 const {compileCssScene}=await import('../web/css-renderer.js');assert.match(compileCssScene(doc(e).shapes,{variables:doc(e).variables}).css,/border-radius:var\(--px-corners-alias-7/);
 const before=e.snapshot();e.set_variable_mode(r,1,2);assert.deepEqual(shape(e,r).appearance.corner_radii,[4,12,4,12]);e.undo();assert.equal(e.snapshot(),before);
 const s=shape(e,r);e.update(JSON.stringify({...s,appearance:{...s.appearance,corner_radii:[9,16,24,16]}}));assert.equal(shape(e,r).variable_bindings['appearance.corner_radii'],undefined);
 e.bind_variable(r,'appearance.corner_radii',6);e.bind_variable(r,'appearance.corner_radii.0',2);assert.equal(shape(e,r).variable_bindings['appearance.corner_radii'],undefined);assert.deepEqual(shape(e,r).appearance.corner_radii,[16,16,24,16]);
 e.bind_variable(r,'appearance.corner_radius',2);assert.equal(shape(e,r).appearance.corner_radii,null);assert.equal(shape(e,r).appearance.corner_radius,16);assert.equal(shape(e,r).variable_bindings['appearance.corner_radii.0'],undefined);
 e.bind_variable(r,'appearance.corner_radii',6);assert.equal(shape(e,r).variable_bindings['appearance.corner_radius'],undefined);const restored=new Editor();restored.load(e.snapshot());assert.equal(restored.snapshot(),e.snapshot());restored.free();e.free();
});
test('inspector numeric variables bind position and opacity while preserving validation',()=>{
 const e=new Editor(),v=fixture();v.values.push({id:6,collection_id:1,name:'Alpha',kind:'number',values:{1:.5,2:.8}});save(e,v);const r=e.add('rectangle',20,20);e.bind_variable(r,'x',2);e.bind_variable(r,'appearance.fill_opacity',6);assert.equal(shape(e,r).x,16);assert.equal(shape(e,r).appearance.fill_opacity,.5);const before=e.snapshot();assert.throws(()=>e.bind_variable(r,'appearance.fill_opacity',2));assert.equal(e.snapshot(),before);e.free();
});

test('page modes inherit through layers, preserve overrides, persist and export',async()=>{
 const e=new Editor();save(e,fixture());const page=doc(e).active_page,frame=e.add('frame',0,0),r=e.add('rectangle',20,20);
 e.move_into(JSON.stringify([shape(e,r)]),frame);e.bind_variable(r,'fill',5);
 const before=e.snapshot();e.set_page_variable_mode(page,1,2);assert.equal(shape(e,r).fill,'#0000ff');
 const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);
 const restored=new Editor();restored.load(after);assert.equal(restored.snapshot(),after);restored.free();
 const {compileCssScene,cssExport}=await import('../web/css-renderer.js');const d=doc(e),options={variables:d.variables,pageModes:d.pages[0].variable_modes,sourceShapes:d.shapes};
 assert.match(compileCssScene(d.shapes,options).css,/--px-color-brand-1:#0000ff/);assert.match(cssExport([shape(e,r)],options).css,/--px-color-brand-1:#0000ff/);
 e.set_variable_mode(frame,1,1);assert.equal(shape(e,r).fill,'#ff0000');e.set_variable_mode(r,1,2);assert.equal(shape(e,r).fill,'#0000ff');e.set_variable_mode(r,1,0);assert.equal(shape(e,r).fill,'#ff0000');e.set_variable_mode(frame,1,0);assert.equal(shape(e,r).fill,'#0000ff');
 const second=e.add_page(),other=e.add('rectangle',0,0);e.bind_variable(other,'fill',1);assert.equal(shape(e,other).fill,'#ff0000');
 e.set_page_variable_mode(page,1,0);assert.equal(shape(e,r).fill,'#ff0000');assert.equal(doc(e).active_page,second);
 const stable=e.snapshot();assert.throws(()=>e.set_page_variable_mode(page,1,999));assert.equal(e.snapshot(),stable);
 e.set_page_variable_mode(page,1,2);const vars=fixture();vars.collections[0].modes.pop();for(const v of vars.values)delete v.values[2];save(e,vars);assert.deepEqual(doc(e).pages.find(p=>p.id===page).variable_modes??{},{});assert.equal(shape(e,r).fill,'#ff0000');e.free();
});
