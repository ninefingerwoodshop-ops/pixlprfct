import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {actionSteps,actionLabel,sequenceLabel,interactions} from '../web/prototype-interactions.js';
import {connectedShape} from '../web/prototype-connections.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
// Three screens and a button on the first.
function setup(){
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0),c=e.add('frame',1000,0),button=e.add('rectangle',10,10);
 for(const [id,name] of [[a,'Home'],[b,'Detail'],[c,'Menu']])edit(e,id,{name});e.reparent_many(JSON.stringify([button]),a);
 return {e,a,b,c,button};
}
test('follow-up actions persist in order with their own settings and are absent when unused',()=>{
 const {e,a,b,c,button}=setup();
 edit(e,button,{prototype:{trigger:'click',action:'navigate',target:b,transition:'smart-animate',then:[{action:'overlay',target:c,overlay_position:'top-right',close_on_outside:true},{action:'close'},{action:'back',transition:'dissolve',duration:150}]}});
 const p=get(e,button).prototype;assert.deepEqual(p.then.map(s=>[s.action,s.target,s.transition,s.duration]),[['overlay',c,'instant',300],['close',0,'instant',300],['back',0,'dissolve',150]]);
 assert.equal(p.then[0].overlay_position,'top-right');assert.equal(p.then[0].close_on_outside,true);assert.ok(p.then.every(s=>!('then' in s)));
 const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();
 e.undo();assert.equal(get(e,button).prototype,null);e.redo();assert.equal(e.snapshot(),saved);
 edit(e,a,{prototype:{action:'navigate',target:b}});assert.equal('then' in get(e,a).prototype,false);e.free();
});
test('follow-ups are validated like any action, cannot nest and stop at seven',()=>{
 const {e,b,c,button}=setup(),set=then=>edit(e,button,{prototype:{action:'navigate',target:b,then}});set([{action:'back'}]);const before=e.snapshot();
 for(const bad of [[{action:'jump'}],[{action:'navigate',target:button}],[{action:'navigate',target:9999}],[{action:'back',target:b}],[{action:'overlay',target:c,transition:'slide-left'}],[{action:'close',transition:'smart-animate'}],[{action:'back',duration:10_001}],[{action:'back',trigger:'hover'}],[{action:'back',then:[{action:'back'}]}],Array.from({length:8},()=>({action:'back'}))]){assert.throws(()=>set(bad),JSON.stringify(bad));assert.equal(e.snapshot(),before);}
 set(Array.from({length:7},()=>({action:'back'})));assert.equal(get(e,button).prototype.then.length,7);
 // Each trigger still appears once per layer; sequences live inside it.
 assert.throws(()=>edit(e,button,{additional_interactions:[{trigger:'click',action:'back'}]}),/only once per layer/);e.free();
});
test('removing a destination drops only the actions that needed it and promotes the next one',()=>{
 const {e,a,b,c,button}=setup();
 edit(e,button,{prototype:{trigger:'mousedown',action:'navigate',target:b,then:[{action:'overlay',target:c,backdrop_opacity:.8},{action:'close'}]},additional_interactions:[{trigger:'click',action:'back',then:[{action:'navigate',target:b}]}]});
 edit(e,a,{prototype:{trigger:'afterdelay',delay:1500,action:'navigate',target:b,then:[{action:'navigate',target:b}]}});
 const before=e.snapshot();e.remove_many(JSON.stringify([b]));
 // The overlay step takes over the press trigger; the click keeps only Go back; the timed frame action is gone.
 const p=get(e,button).prototype;assert.deepEqual([p.trigger,p.action,p.target,p.backdrop_opacity],['mousedown','overlay',c,.8]);assert.deepEqual(p.then.map(s=>s.action),['close']);
 const [click]=get(e,button).additional_interactions;assert.deepEqual([click.trigger,click.action,'then' in click],['click','back',false]);assert.equal(get(e,a).prototype,null);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('a promoted timed action keeps the delay, and duplicating screens together retargets every step',()=>{
 const {e,a,b,c}=setup();
 edit(e,a,{prototype:{trigger:'afterdelay',delay:1500,action:'navigate',target:b,then:[{action:'overlay',target:c}]}});
 e.duplicate_many(JSON.stringify([a,b,c]));const twin=(name,original)=>doc(e).shapes.find(s=>s.name===name&&s.id!==original).id,[a2,b2,c2]=[twin('Home',a),twin('Detail',b),twin('Menu',c)],copied=get(e,a2).prototype;
 assert.deepEqual([copied.target,copied.then[0].target],[b2,c2]);assert.deepEqual([get(e,a).prototype.target,get(e,a).prototype.then[0].target],[b,c]);
 e.remove_many(JSON.stringify([b]));const p=get(e,a).prototype;assert.deepEqual([p.trigger,p.delay,p.action,p.target,'then' in p],['afterdelay',1500,'overlay',c,false]);e.free();
});
test('portable copies keep steps inside the copied set and drop the ones that leave it',()=>{
 const {e,a,b,c,button}=setup();
 edit(e,button,{prototype:{action:'navigate',target:b,then:[{action:'overlay',target:c},{action:'close'}]}});
 const target=new Editor();target.paste_layers(e.copy_layers(JSON.stringify([a,c])),0,0,0);
 const pasted=JSON.parse(target.snapshot()).shapes,p=pasted.find(s=>s.kind==='rectangle').prototype,menu=pasted.find(s=>s.name==='Menu');
 assert.deepEqual([p.action,p.target,p.then.map(s=>s.action)],['overlay',menu.id,['close']]);target.free();e.free();
});
test('steps are listed in order and named for summaries; dragging a wire keeps the follow-ups',()=>{
 const name=id=>({2:'Detail',3:'Menu'})[id],p={action:'navigate',target:2,then:[{action:'overlay',target:3},{action:'swap',target:9},{action:'close'},{action:'back'}]};
 assert.deepEqual(actionSteps(p).map(s=>s.action),['navigate','overlay','swap','close','back']);assert.deepEqual(actionSteps(null),[]);assert.deepEqual(actionSteps({action:'back'}),[{action:'back'}]);
 assert.equal(actionLabel({action:'navigate',target:2},name),'Detail');
 assert.equal(sequenceLabel(p,name),'Detail, then Open overlay: Menu, then Swap overlay: Unavailable, then Close overlay, then Go back');
 const moved=connectedShape({prototype:p,additional_interactions:[]},3);assert.equal(moved.prototype.target,3);assert.deepEqual(moved.prototype.then,p.then);assert.equal(interactions(moved).length,1);
});
test('published libraries keep in-library steps, promote past dropped ones and remap targets on import',async()=>{
 const {librarySnapshot,mergeLibrary}=await import('../web/library-model.js');
 const {e,a,b,c,button}=setup();e.create_component(a);e.create_component(c);
 edit(e,button,{prototype:{trigger:'mousedown',action:'navigate',target:b,then:[{action:'overlay',target:c},{action:'close'}]},additional_interactions:[{trigger:'click',action:'navigate',target:b}]});
 const body=librarySnapshot(doc(e)),published=body.shapes.find(s=>s.kind==='rectangle');
 // Detail is not a main component, so its actions leave the library.
 assert.deepEqual([published.prototype.trigger,published.prototype.action,published.prototype.target,published.prototype.then.map(s=>s.action)],['mousedown','overlay',c,['close']]);assert.deepEqual(published.additional_interactions,[]);
 const target=new Editor(),merged=mergeLibrary(JSON.parse(target.snapshot()),{id:'lib',workspace:'team',name:'System',revision:1,body});target.load(JSON.stringify(merged));
 const imported=merged.shapes.find(s=>s.kind==='rectangle'),menu=merged.shapes.find(s=>s.name==='Menu');
 assert.deepEqual([imported.prototype.action,imported.prototype.target,imported.prototype.then.map(s=>[s.action,s.target])],['overlay',menu.id,[['close',0]]]);target.free();e.free();
});
