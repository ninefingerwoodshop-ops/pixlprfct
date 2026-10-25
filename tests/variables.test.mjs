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
