import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {actionLabel,sequenceLabel,branchActions,withBranch} from '../web/prototype-interactions.js';
import {conditionText,comparisonNames} from '../web/prototype-variables.js';
import {connectedShape} from '../web/prototype-connections.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const variables=()=>({collections:[{id:1,name:'State',modes:[{id:1,name:'Default'}],default_mode:1}],values:[
 {id:1,collection_id:1,name:'Count',kind:'number',values:{1:2}},{id:2,collection_id:1,name:'Open',kind:'boolean',values:{1:false}}]});
function setup(){
 const e=new Editor();e.save_variables(JSON.stringify(variables()));const a=e.add('frame',0,0),b=e.add('frame',500,0),c=e.add('frame',1000,0),button=e.add('rectangle',10,10);
 e.reparent_many(JSON.stringify([button]),a);return {e,a,b,c,button};
}
const test3={variable:1,operator:'>',value:3};
test('a conditional stores its test and the actions on each side',()=>{
 const {e,b,c,button}=setup();
 edit(e,button,{prototype:{action:'conditional',condition:test3,if_actions:[{action:'navigate',target:b,transition:'dissolve'},{action:'set-variable',variable:2,operation:'toggle'}],else_actions:[{action:'overlay',target:c}]}});
 const p=get(e,button).prototype;assert.deepEqual([p.action,p.target,p.condition],['conditional',0,test3]);
 assert.deepEqual(p.if_actions.map(s=>[s.action,s.target,s.transition]),[['navigate',b,'dissolve'],['set-variable',0,'instant']]);assert.deepEqual(p.else_actions.map(s=>[s.action,s.target]),[['overlay',c]]);
 // Empty sides are legal and leave no key behind; a conditional may also follow other actions.
 edit(e,button,{prototype:{action:'back',then:[{action:'conditional',condition:test3}]}});const follow=get(e,button).prototype.then[0];
 assert.deepEqual([follow.action,'if_actions' in follow,'else_actions' in follow],['conditional',false,false]);
 e.undo();assert.equal(get(e,button).prototype.if_actions.length,2);e.free();
});
test('conditionals need a valid test and cannot nest or carry inner conditions',()=>{
 const {e,b,button}=setup(),set=prototype=>edit(e,button,{prototype});set({action:'conditional',condition:test3});const before=e.snapshot();
 for(const bad of [
  {action:'conditional'},{action:'conditional',condition:{variable:9,operator:'==',value:1}},{action:'conditional',condition:{variable:2,operator:'>',value:true}},
  {action:'conditional',condition:test3,target:b},{action:'conditional',condition:test3,if_actions:[{action:'conditional',condition:test3}]},
  {action:'conditional',condition:test3,else_actions:[{action:'back',condition:test3}]},{action:'conditional',condition:test3,if_actions:[{action:'back',then:[{action:'back'}]}]},
  {action:'conditional',condition:test3,if_actions:Array.from({length:9},()=>({action:'back'}))},{action:'conditional',condition:test3,if_actions:[{action:'navigate',target:9999}]},
  {action:'back',if_actions:[{action:'back'}]},{action:'navigate',target:b,else_actions:[{action:'back'}]},
 ])assert.throws(()=>set(bad),undefined,JSON.stringify(bad));
 assert.equal(e.snapshot(),before);set({action:'conditional',condition:test3,if_actions:Array.from({length:8},()=>({action:'back'}))});e.free();
});
test('destinations inside a conditional follow copies and leave with deleted frames',()=>{
 const {e,a,b,c,button}=setup();
 edit(e,button,{prototype:{action:'conditional',condition:test3,if_actions:[{action:'navigate',target:b}],else_actions:[{action:'overlay',target:c},{action:'close'}]}});
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([a,b,c]))),copy=doc(e).shapes.find(s=>s.kind==='rectangle'&&s.id!==button).prototype;
 const frames=ids.filter(id=>get(e,id).kind==='frame');assert.ok(frames.includes(copy.if_actions[0].target)&&frames.includes(copy.else_actions[0].target));assert.notEqual(copy.if_actions[0].target,b);
 e.remove_many(JSON.stringify([b]));const p=get(e,button).prototype;
 // The conditional stays, with nothing left to run when the test holds.
 assert.deepEqual([p.action,'if_actions' in p,p.else_actions.map(s=>s.action)],['conditional',false,['overlay','close']]);e.free();
});
test('a conditional goes when its variable stops fitting, and never travels without it',()=>{
 const {e,a,b,button}=setup();
 edit(e,button,{prototype:{trigger:'mousedown',action:'conditional',condition:test3,if_actions:[{action:'set-variable',variable:2,operation:'toggle'},{action:'back'}],then:[{action:'navigate',target:b}]}});
 const target=new Editor();target.paste_layers(e.copy_layers(JSON.stringify([a,b])),0,0,0);const pasted=JSON.parse(target.snapshot()).shapes.find(s=>s.kind==='rectangle').prototype;
 assert.deepEqual([pasted.trigger,pasted.action,'then' in pasted],['mousedown','navigate',false]);target.free();
 // Open is deleted: the toggle inside the conditional goes, the conditional itself stays.
 const next=variables();next.values=next.values.filter(v=>v.id!==2);e.save_variables(JSON.stringify(next));
 assert.deepEqual(get(e,button).prototype.if_actions.map(s=>s.action),['back']);
 next.values=[];e.save_variables(JSON.stringify(next));const p=get(e,button).prototype;assert.deepEqual([p.trigger,p.action,p.target,'then' in p],['mousedown','navigate',b,false]);e.free();
});
test('labels read a conditional as Figma writes it',()=>{
 const frame=id=>({2:'Detail'})[id],name=id=>({1:'Count',2:'Open'})[id],p={action:'conditional',condition:test3,if_actions:[{action:'navigate',target:2},{action:'back'}]};
 assert.equal(conditionText(test3,name),'Count > 3');assert.equal(conditionText({variable:7,operator:'==',value:'a'},name),'a missing variable == "a"');
 assert.equal(actionLabel(p,frame,name),'If Count > 3: Detail, then Go back; else: nothing');
 assert.equal(sequenceLabel({action:'back',then:[withBranch(p,'else',[{action:'close'}])]},frame,name),'Go back, then If Count > 3: Detail, then Go back; else: Close overlay');
 assert.deepEqual(Object.values(comparisonNames),['Equal to','Not equal to','Greater than','Greater than or equal to','Less than','Less than or equal to']);
 assert.equal('if_actions' in withBranch(p,'if',[]),false);assert.deepEqual(branchActions(p,'else'),[]);
});
test('drawing a connection from a conditional adds a destination to its if side',()=>{
 const p={trigger:'click',action:'conditional',condition:test3,else_actions:[{action:'back'}]},moved=connectedShape({prototype:p,additional_interactions:[]},5).prototype;
 assert.deepEqual([moved.action,moved.if_actions,moved.else_actions],['conditional',[{action:'navigate',target:5}],[{action:'back'}]]);
 const fullSide={...p,if_actions:Array.from({length:8},()=>({action:'back'}))};assert.deepEqual(connectedShape({prototype:fullSide,additional_interactions:[]},5).prototype,fullSide);
});
test('published libraries keep a conditional, drop what leaves and remap the rest on import',async()=>{
 const {librarySnapshot,mergeLibrary}=await import('../web/library-model.js');
 const {e,a,b,c,button}=setup();edit(e,c,{name:'Menu'});e.create_component(a);e.create_component(c);
 edit(e,button,{prototype:{action:'conditional',condition:test3,if_actions:[{action:'navigate',target:b},{action:'overlay',target:c}],else_actions:[{action:'close'}]}});
 const body=librarySnapshot(doc(e)),published=body.shapes.find(s=>s.kind==='rectangle').prototype;
 // Frame b is not a main component, so the action that leads there leaves the library.
 assert.deepEqual([published.action,published.if_actions.map(s=>[s.action,s.target]),published.else_actions.map(s=>s.action)],['conditional',[['overlay',c]],['close']]);
 const target=new Editor();target.save_variables(JSON.stringify({collections:[{id:1,name:'Local',modes:[{id:1,name:'Default'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Mine',kind:'string',values:{1:'x'}}]}));
 const merged=mergeLibrary(JSON.parse(target.snapshot()),{id:'lib',workspace:'team',name:'System',revision:1,body});target.load(JSON.stringify(merged));
 const imported=merged.shapes.find(s=>s.kind==='rectangle').prototype,menu=merged.shapes.find(s=>s.name==='Menu'),count=merged.variables.values.find(v=>v.name==='Count');
 assert.notEqual(count.id,1);assert.deepEqual([imported.condition,imported.if_actions.map(s=>[s.action,s.target]),imported.else_actions.map(s=>[s.action,s.target])],[{...test3,variable:count.id},[['overlay',menu.id]],[['close',0]]]);target.free();e.free();
});
