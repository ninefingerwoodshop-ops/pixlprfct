import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeTimers,timedInteractions} from '../web/prototype-timers.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
function clock(){
 let time=0,id=0;const jobs=new Map();return{
  now:()=>time,schedule:(fn,delay)=>{jobs.set(++id,{fn,at:time+delay});return id;},cancel:id=>jobs.delete(id),
  tick(ms){const end=time+ms;let iterations=0;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next||next[1].at>end)break;assert.ok(++iterations<100,'runaway timer');time=next[1].at;jobs.delete(next[0]);next[1].fn();}time=end;},
  get jobs(){return [...jobs.values()];}
 };
}
test('after-delay settings validate, persist, undo and stay independent from animation duration',()=>{
 const e=new Editor(),f=e.add('frame',0,0),target=e.add('frame',500,0),r=e.add('rectangle',0,0);
 edit(e,f,{prototype:{trigger:'afterdelay',action:'navigate',target,delay:2300,duration:500,transition:'dissolve'}});const saved=e.snapshot();
 for(const delay of [0,-1,600001,1.5]){assert.throws(()=>edit(e,f,{prototype:{...get(e,f).prototype,delay}}));assert.equal(e.snapshot(),saved);}
 assert.throws(()=>edit(e,r,{prototype:get(e,f).prototype}));assert.equal(e.snapshot(),saved);
 assert.equal(e.prototype_hit_test(f,10,10),0);assert.deepEqual(JSON.parse(e.prototype_hits(f,10,10)),{click:0,mouseenter:[],mouseleave:[]});
 edit(e,f,{prototype:{...get(e,f).prototype,delay:600000}});e.undo();assert.equal(e.snapshot(),saved);e.redo();assert.equal(get(e,f).prototype.delay,600000);
 const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);assert.equal(get(copy,f).prototype.duration,500);edit(e,r,{prototype:{action:'back'}});assert.equal(get(e,r).prototype.delay,800);e.free();copy.free();
});
test('timer settings propagate through components while instance timer edits are rejected',()=>{
 const e=new Editor(),f=e.add('frame',0,0);edit(e,f,{prototype:{trigger:'afterdelay',action:'back',delay:1200}});e.create_component(f);const i=e.create_instance(f,400,0);
 assert.equal(get(e,i).prototype.delay,1200);const before=e.snapshot();assert.throws(()=>edit(e,i,{prototype:{...get(e,i).prototype,delay:4500}}),/protected/);assert.equal(e.snapshot(),before);edit(e,f,{prototype:{...get(e,f).prototype,delay:1500}});assert.equal(get(e,i).prototype.delay,1500);assert.deepEqual(get(e,i).prototype,get(e,f).prototype);e.free();
});
test('visible timed frames include nested instances but exclude hidden ancestors and click actions',()=>{
 const frame=(id,parent_id=0,hidden=false,trigger='afterdelay')=>({id,parent_id,hidden,kind:'frame',prototype:{trigger,delay:id*100}});
 const scene=[frame(1),frame(2,1),frame(3,1,true),frame(4,3),frame(5,1,false,'click')];assert.deepEqual(timedInteractions(scene),[{id:1,delay:100},{id:2,delay:200}]);
});
test('timers wait for readiness, fire once in deadline order and preserve elapsed time through repaints',()=>{
 const c=clock(),fired=[],t=prototypeTimers(id=>fired.push(id),c);t.scope(1,[{id:2,delay:1000},{id:1,delay:500}]);c.tick(3000);assert.deepEqual(fired,[]);
 t.resume();c.tick(300);t.pause();c.tick(10000);t.scope(1,[{id:1,delay:500}]);t.resume();c.tick(199);assert.deepEqual(fired,[]);c.tick(1);assert.deepEqual(fired,[1]);c.tick(500);assert.deepEqual(fired,[1,2]);t.pause();t.resume();c.tick(5000);assert.deepEqual(fired,[1,2]);
});
test('navigation and close invalidate stale callbacks, while revisiting the same screen rearms its actions',()=>{
 const c=clock(),fired=[],t=prototypeTimers(id=>fired.push(id),c);t.scope(1,[{id:1,delay:500}]);t.resume();const stale=c.jobs[0].fn;c.tick(200);t.scope(2,[{id:2,delay:1000}]);t.resume();stale();c.tick(999);assert.deepEqual(fired,[]);c.tick(1);assert.deepEqual(fired,[2]);
 t.scope(3,[{id:1,delay:500}]);t.resume();c.tick(500);assert.deepEqual(fired,[2,1]);t.scope(4,[{id:3,delay:500}]);t.resume();const closing=c.jobs[0].fn;t.reset();closing();c.tick(10000);assert.deepEqual(fired,[2,1]);assert.equal(c.jobs.length,0);
});
test('a timed navigation cancels other due actions and starts the destination only after transition readiness',()=>{
 const c=clock(),fired=[];const t=prototypeTimers(id=>{fired.push(id);if(id===1)t.scope(2,[{id:3,delay:100}]);},c);
 t.scope(1,[{id:2,delay:200},{id:1,delay:200}]);t.resume();c.tick(1000);assert.deepEqual(fired,[1]);assert.equal(c.jobs.length,0);t.resume();c.tick(100);assert.deepEqual(fired,[1,3]);
});
