import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {transitionSpec} from '../web/prototype-transition.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('transition frames honor direction, timing and reduced motion',()=>{
 assert.equal(transitionSpec({transition:'dissolve',duration:500},true),null);assert.equal(transitionSpec({transition:'slide-left',duration:0}),null);assert.equal(transitionSpec({}),null);
 const slide=transitionSpec({transition:'slide-left',duration:450,easing:'ease-out'});assert.deepEqual(slide.incoming,[{transform:'translate(100%, 0%)'},{transform:'translate(0%, 0%)'}]);assert.deepEqual(slide.outgoing,[{transform:'translate(0%, 0%)'},{transform:'translate(-100%, 0%)'}]);assert.equal(slide.options.duration,450);assert.equal(slide.options.easing,'ease-out');
 for(const direction of ['right','up','down'])assert.ok(transitionSpec({transition:'slide-'+direction}));assert.deepEqual(transitionSpec({transition:'dissolve'}).outgoing,[{opacity:1},{opacity:0}]);
});
test('transition settings persist, undo, propagate and reject invalid edits atomically',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0);edit(e,a,{prototype:{action:'navigate',target:b,transition:'slide-up',duration:700,easing:'ease-in'}});e.create_component(a);const i=e.create_instance(a,900,0);assert.equal(get(e,i).prototype.duration,700);const before=e.snapshot();
 for(const patch of [{transition:'bad'},{duration:10001},{duration:-1},{easing:'bad'},{action:'overlay'}]){assert.throws(()=>edit(e,a,{prototype:{...get(e,a).prototype,...patch}}));assert.equal(e.snapshot(),before);}
 edit(e,a,{prototype:{...get(e,a).prototype,transition:'dissolve'}});assert.equal(get(e,i).prototype.transition,'dissolve');e.undo();assert.equal(e.snapshot(),before);const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);copy.free();e.free();
});
test('legacy prototype actions default to instant with bounded animation defaults',()=>{
 const e=new Editor(),a=e.add('frame',0,0);edit(e,a,{prototype:{action:'back',target:0}});assert.equal(get(e,a).prototype.transition,'instant');assert.equal(get(e,a).prototype.duration,300);assert.equal(get(e,a).prototype.easing,'ease-in-out');e.free();
});
