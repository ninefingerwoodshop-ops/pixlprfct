import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypePress} from '../web/prototype-press.js';
import {withInteractions,interactions} from '../web/prototype-interactions.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),set=(e,id,list)=>e.update(JSON.stringify(withInteractions(get(e,id),list)));
const event=(pointerId=1,button=0,isPrimary=true)=>({pointerId,button,isPrimary});
test('press and release coexist with every existing trigger, persist and validate atomically',()=>{
 const e=new Editor(),f=e.add('frame',0,0);const list=['click','mouseenter','mouseleave','afterdelay','mousedown','mouseup'].map(trigger=>({trigger,action:'back'}));set(e,f,list);const saved=e.snapshot();assert.equal(interactions(get(e,f)).length,6);
 assert.throws(()=>set(e,f,[...list,{trigger:'mousedown',action:'back'}]));assert.equal(e.snapshot(),saved);set(e,f,list.slice(0,-1));e.undo();assert.equal(e.snapshot(),saved);const other=new Editor();other.load(saved);assert.equal(other.snapshot(),saved);e.free();other.free();
});
test('pointer hit testing respects ancestor priority, locks, clipping and hidden layers independently',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('rectangle',20,20);set(e,f,[{trigger:'mousedown',action:'back'},{trigger:'mouseup',action:'back'}]);set(e,c,[{trigger:'mousedown',action:'close'}]);e.reparent_many(JSON.stringify([c]),f);e.update(JSON.stringify({...get(e,c),locked:true}));
 let hit=JSON.parse(e.prototype_pointer_hits(f,30,30));assert.equal(hit.mousedown,c);assert.equal(hit.mouseup,f);assert.equal(hit.click,0);
 assert.equal(JSON.parse(e.prototype_pointer_hits(f,-1,-1)).mousedown,0);e.update(JSON.stringify({...get(e,c),hidden:true}));assert.equal(JSON.parse(e.prototype_pointer_hits(f,30,30)).mousedown,f);e.free();
});
test('press opens one target and release may activate another, consuming only their compatibility click',()=>{
 const p=prototypePress();assert.equal(p.down(event(),{mousedown:10}),10);assert.equal(p.up(event(),{mouseup:20}),20);assert.equal(p.click(),false);assert.equal(p.click(),true);
 assert.equal(p.down(event(),{}),0);assert.equal(p.up(event(),{}),0);assert.equal(p.click(),true);
 assert.equal(p.down(event(),{}),0);assert.equal(p.up(event(),{mouseup:30}),30);assert.equal(p.click(),false);
});
test('secondary buttons, unrelated pointers and cancellation cannot activate a release action',()=>{
 const p=prototypePress();assert.equal(p.down(event(2,2),{mousedown:10}),0);assert.equal(p.up(event(2,2),{mouseup:20}),0);assert.equal(p.down(event(2,0,false),{mousedown:10}),0);
 p.down(event(1),{});assert.equal(p.up(event(2),{mouseup:20}),0);p.cancel(event(1));assert.equal(p.up(event(1),{mouseup:20}),0);assert.equal(p.click(),false);
 p.down(event(1),{mousedown:10});p.reset();assert.equal(p.up(event(1),{mouseup:20}),0);assert.equal(p.click(),true);
});
test('touch and pen use the same primary press/release semantics without requiring hover',()=>{
 for(const pointerType of ['touch','pen']){const p=prototypePress(),e={...event(),pointerType};assert.equal(p.down(e,{mousedown:5}),5);assert.equal(p.up(e,{mouseup:6}),6);assert.equal(p.click(),false);}
});
