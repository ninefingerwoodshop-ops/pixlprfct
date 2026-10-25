import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeHover} from '../web/prototype-hover.js';
import {connectedShape} from '../web/prototype-connections.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const hits=(e,root,x,y)=>JSON.parse(e.prototype_hits(root,x,y));
test('prototype triggers persist, default to click, validate atomically and survive connections',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0);edit(e,a,{prototype:{action:'navigate',target:b}});assert.equal(get(e,a).prototype.trigger,'click');
 const before=e.snapshot();edit(e,a,{prototype:{...get(e,a).prototype,trigger:'mouseenter'}});const saved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),saved);
 const restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);assert.equal(connectedShape(get(e,a),b).prototype.trigger,'mouseenter');
 assert.throws(()=>edit(e,a,{prototype:{...get(e,a).prototype,trigger:'bad'}}));assert.equal(e.snapshot(),saved);e.free();restored.free();
});
test('presentation resolves each trigger independently through nested layers and clipping',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('frame',20,20),r=e.add('rectangle',30,30);edit(e,f,{width:300,height:200,prototype:{action:'back',trigger:'click'}});edit(e,c,{width:100,height:100,prototype:{action:'back',trigger:'mouseenter'}});edit(e,r,{width:40,height:40,prototype:{action:'back',trigger:'mouseleave'},locked:true});e.reparent_many(JSON.stringify([c]),f);e.reparent_many(JSON.stringify([r]),c);
 assert.deepEqual(hits(e,f,40,40),{click:f,mouseenter:[c],mouseleave:[r]});assert.equal(e.prototype_hit_test(f,40,40),f);assert.deepEqual(hits(e,f,400,400),{click:0,mouseenter:[],mouseleave:[]});
 edit(e,f,{prototype:{action:'back',trigger:'mouseenter'}});assert.deepEqual(hits(e,f,40,40).mouseenter,[c,f]);edit(e,c,{hidden:true});assert.deepEqual(hits(e,f,40,40),{click:0,mouseenter:[f],mouseleave:[]});e.free();
});
test('hover entry latches do not repeat within a region or when moving through child regions',()=>{
 const h=prototypeHover();h.scope(1);assert.equal(h.move({mouseenter:[10]}),10);assert.equal(h.move({mouseenter:[10]}),0);
 assert.equal(h.move({mouseenter:[20,10]}),20);assert.equal(h.move({mouseenter:[10]}),0);assert.equal(h.move({}),0);assert.equal(h.move({mouseenter:[10]}),10);
 h.scope(2);assert.equal(h.move({mouseenter:[10]}),0);h.exit();assert.equal(h.move({mouseenter:[10]}),10);
});
test('hover leave fires only after exit, ignores child entry, and clears when screens change',()=>{
 const h=prototypeHover();h.scope(1);assert.equal(h.move({mouseleave:[10]}),0);assert.equal(h.move({mouseleave:[20,10]}),0);assert.equal(h.move({mouseleave:[10]}),20);assert.equal(h.move({mouseleave:[10]}),0);assert.equal(h.exit(),10);assert.equal(h.exit(),0);
 h.move({mouseleave:[10]});h.scope(2);assert.equal(h.exit(),0);
 h.move({mouseleave:[10]});assert.equal(h.move({mouseenter:[30]}),10);assert.equal(h.move({mouseenter:[30]}),30);h.reset();assert.equal(h.exit(),0);
});
test('component trigger overrides remain intact until reset',()=>{
 const e=new Editor(),f=e.add('frame',0,0);edit(e,f,{prototype:{action:'back',trigger:'mouseenter'}});e.create_component(f);const i=e.create_instance(f,400,0);assert.equal(get(e,i).prototype.trigger,'mouseenter');edit(e,i,{prototype:{action:'back',trigger:'mouseleave'}});edit(e,f,{prototype:{action:'back',trigger:'click'}});assert.equal(get(e,i).prototype.trigger,'mouseleave');e.reset_override(i,'prototype');assert.equal(get(e,i).prototype.trigger,'click');e.free();
});
