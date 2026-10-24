import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {interactions,withInteractions,interactionFor} from '../web/prototype-interactions.js';
import {timedInteractions} from '../web/prototype-timers.js';
import {prototypeHover} from '../web/prototype-hover.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),set=(e,id,list)=>e.update(JSON.stringify(withInteractions(get(e,id),list)));
test('one layer supports independent click, enter, leave and timed interactions with atomic validation and history',()=>{
 const e=new Editor(),f=e.add('frame',0,0),target=e.add('frame',500,0);const list=[{trigger:'click',action:'navigate',target},{trigger:'mouseenter',action:'overlay',target},{trigger:'mouseleave',action:'back'},{trigger:'afterdelay',action:'navigate',target,delay:2300}];set(e,f,list);const saved=e.snapshot();
 assert.deepEqual(JSON.parse(e.prototype_hits(f,10,10)),{click:f,mouseenter:[f],mouseleave:[f]});assert.equal(interactionFor(get(e,f),'click').action,'navigate');assert.equal(interactionFor(get(e,f),'mouseenter').action,'overlay');assert.deepEqual(timedInteractions(doc(e).shapes),[{id:f,delay:2300}]);
 for(const bad of [[...list,list[0]],[list[0],list[0]],[list[0],{trigger:'bad',action:'back'}]]){assert.throws(()=>set(e,f,bad));assert.equal(e.snapshot(),saved);}
 set(e,f,list.slice(1));assert.equal(get(e,f).prototype.trigger,'mouseenter');assert.equal(e.prototype_hit_test(f,10,10),0);e.undo();assert.equal(e.snapshot(),saved);e.redo();assert.equal(interactions(get(e,f)).length,3);const restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);e.free();restored.free();
});
test('copy, paste and duplicate remap every destination; deleting a target retains unrelated interactions and undo',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0),c=e.add('frame',1000,0);set(e,a,[{trigger:'click',action:'navigate',target:b},{trigger:'mouseenter',action:'overlay',target:c},{trigger:'mouseleave',action:'back'}]);
 const payload=JSON.parse(e.copy_layers(JSON.stringify([a,b]))),copied=payload.shapes.find(s=>s.id===a);assert.deepEqual(interactions(copied).map(p=>p.trigger),['click','mouseleave']);
 const pasted=JSON.parse(e.paste_layers(JSON.stringify(payload),0,400,0));assert.equal(get(e,pasted[0]).prototype.target,pasted[1]);
 const duplicated=JSON.parse(e.duplicate_many(JSON.stringify([a,b,c])));assert.deepEqual(interactions(get(e,duplicated[0])).slice(0,2).map(p=>p.target),duplicated.slice(1));
 const before=e.snapshot();e.remove(b);assert.deepEqual(interactions(get(e,a)).map(p=>p.trigger),['mouseenter','mouseleave']);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('component interaction collections inherit together, preserve overrides and reset together',()=>{
 const e=new Editor(),a=e.add('frame',0,0);set(e,a,[{trigger:'click',action:'back'},{trigger:'mouseenter',action:'back'}]);e.create_component(a);const i=e.create_instance(a,500,0);assert.equal(interactions(get(e,i)).length,2);
 set(e,i,[{trigger:'click',action:'back'},{trigger:'mouseleave',action:'back'}]);set(e,a,[{trigger:'click',action:'back'},{trigger:'afterdelay',action:'back',delay:1500}]);assert.equal(interactionFor(get(e,i),'mouseleave').action,'back');assert.equal(interactionFor(get(e,i),'afterdelay'),undefined);
 e.reset_override(i,'additional_interactions');assert.equal(interactionFor(get(e,i),'afterdelay').delay,1500);assert.equal(interactionFor(get(e,i),'mouseleave'),undefined);e.free();
});
test('hover dispatch reports the correct trigger when the same layer owns both boundary actions',()=>{
 const h=prototypeHover();h.scope(1);assert.equal(h.move({mouseenter:[7],mouseleave:[7]}),7);assert.equal(h.trigger,'mouseenter');assert.equal(h.move({mouseenter:[7],mouseleave:[7]}),0);assert.equal(h.move({}),7);assert.equal(h.trigger,'mouseleave');h.move({mouseenter:[7],mouseleave:[7]});assert.equal(h.exit(),7);assert.equal(h.trigger,'mouseleave');
});
test('pasting multiple interaction links into several frames remaps each copy without cross-copy references',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0),outside=e.add('frame',800,0);set(e,a,[{trigger:'click',action:'navigate',target:outside},{trigger:'mouseenter',action:'overlay',target:b},{trigger:'mouseleave',action:'navigate',target:a}]);
 const payload=e.copy_layers(JSON.stringify([a,b]));assert.deepEqual(interactions(JSON.parse(payload).shapes[0]).map(p=>p.trigger),['mouseenter','mouseleave']);
 const f=e.add('frame',0,500),g=e.add('frame',600,500),roots=JSON.parse(e.paste_into_frames(payload,JSON.stringify([f,g])));
 for(const index of [0,2])assert.deepEqual(interactions(get(e,roots[index])).map(p=>p.target),[roots[index+1],roots[index]]);
 const replacement=e.add('rectangle',900,500),replaced=JSON.parse(e.paste_replace(payload,JSON.stringify([replacement])));assert.deepEqual(interactions(get(e,replaced[0])).map(p=>p.target),[replaced[1],replaced[0]]);e.free();
});
