import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeScene,prototypeState} from '../web/prototype.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
function setup(){const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0),button=e.add('rectangle',20,20);edit(e,a,{width:300,height:200});e.reparent_many(JSON.stringify([button]),a);return{e,a,b,button};}
test('prototype actions persist, reject invalid targets atomically, and clear on target removal with undo',()=>{
 const {e,a,b,button}=setup();edit(e,button,{prototype:{action:'navigate',target:b}});const before=e.snapshot();
 for(const prototype of [{action:'navigate',target:9999},{action:'navigate',target:button},{action:'back',target:b},{action:'bad',target:0}]){assert.throws(()=>edit(e,button,{prototype}));assert.equal(e.snapshot(),before);}
 const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);e.remove(b);assert.equal(get(e,button).prototype,null);e.undo();assert.equal(e.snapshot(),before);copy.free();e.free();
});
test('prototype hit testing ignores locks, crops viewport, respects hidden layers and bubbles child clicks',()=>{
 const {e,a,b,button}=setup();edit(e,button,{prototype:{action:'navigate',target:b},locked:true,width:100,height:60});const text=e.add('text',30,30);edit(e,text,{width:60,height:20});
 // A frame interaction handles clicks on its ordinary child layers.
 edit(e,a,{prototype:{action:'back',target:0},locked:true});e.reparent_many(JSON.stringify([text]),a);
 assert.equal(e.hit_test(25,25),0);assert.equal(e.prototype_hit_test(a,25,25),button);assert.equal(e.prototype_hit_test(a,35,35),a);
 edit(e,button,{hidden:true});assert.equal(e.prototype_hit_test(a,25,25),a);assert.equal(e.prototype_hit_test(a,400,100),0);e.free();
});
test('duplicating connected frames remaps internal targets while clipboard drops external links',()=>{
 const {e,a,b,button}=setup();edit(e,button,{prototype:{action:'navigate',target:b}});
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([a,b]))),newButton=doc(e).shapes.find(s=>ids.includes(s.id)&&s.kind==='rectangle'),newB=doc(e).shapes.find(s=>ids.includes(s.id)&&s.name===get(e,b).name);assert.equal(newButton.prototype.target,newB.id);
 const single=JSON.parse(e.copy_layers(JSON.stringify([a])));assert.equal(single.shapes.find(s=>s.id===button).prototype,null);
 const payload=e.copy_layers(JSON.stringify([a,b])),copy=new Editor(),roots=JSON.parse(copy.paste_layers(payload,0,0,0));assert.equal(doc(copy).shapes.find(s=>s.kind==='rectangle').prototype.target,roots[1]);copy.free();e.free();
});
test('presentation scene isolates a frame and navigation history does not mutate the document',()=>{
 const {e,a,b}=setup(),d=doc(e),before=e.snapshot(),state=prototypeState(d,a);assert.equal(state.current,a);assert.equal(state.canBack,false);assert.equal(state.navigate(b),true);state.back();assert.equal(state.current,a);assert.equal(state.navigate(999),false);state.navigate(b);state.restart();assert.equal(state.current,a);assert.equal(e.snapshot(),before);
 const scene=prototypeScene(d,a);assert.equal(scene[0].clip_content,true);assert.ok(!scene.some(s=>s.id===b));e.free();
});
test('links to synchronized instance child frames clear when their source is removed',()=>{
 const {e,a,b,button}=setup(),nested=e.add('frame',0,0);e.reparent_many(JSON.stringify([nested]),a);e.create_component(a);const instance=e.create_instance(a,800,0),target=doc(e).shapes.find(s=>s.parent_id===instance&&s.kind==='frame');edit(e,b,{prototype:{action:'navigate',target:target.id}});const before=e.snapshot();e.remove(nested);assert.equal(get(e,b).prototype,null);e.undo();assert.equal(e.snapshot(),before);e.free();
});
