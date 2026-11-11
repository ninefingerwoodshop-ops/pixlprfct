import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeVariables,operatorsFor,operationsFor,defaultLiteral,conditionHolds,nextValue,conditionLabel,setVariableLabel,sessionVariables} from '../web/prototype-variables.js';
import {actionLabel,sequenceLabel} from '../web/prototype-interactions.js';
import {prototypeOrientationDocument} from '../web/prototype.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
// Count (number), Open (boolean), Title (string), Brand (color) and an alias of Count.
const variables=()=>({collections:[{id:1,name:'State',modes:[{id:1,name:'Default'},{id:2,name:'Alt'}],default_mode:1}],values:[
 {id:1,collection_id:1,name:'Count',kind:'number',values:{1:2,2:20}},{id:2,collection_id:1,name:'Open',kind:'boolean',values:{1:false,2:true}},
 {id:3,collection_id:1,name:'Title',kind:'string',values:{1:'Hello',2:'Hi'}},{id:4,collection_id:1,name:'Brand',kind:'color',values:{1:'#ff0000',2:'#00ff00'}}]});
function setup(){
 const e=new Editor();e.save_variables(JSON.stringify(variables()));const a=e.add('frame',0,0),b=e.add('frame',500,0),button=e.add('rectangle',10,10),label=e.add('text',10,80);
 e.reparent_many(JSON.stringify([button,label]),a);e.bind_variable(label,'text',3);e.bind_variable(button,'hidden',2);e.bind_variable(button,'fill',4);
 return {e,a,b,button,label};
}
test('Set variable and conditions persist, and plain actions gain no new fields',()=>{
 const {e,a,b,button}=setup();
 edit(e,button,{prototype:{action:'set-variable',variable:1,operation:'add',value:1,then:[{action:'navigate',target:b,condition:{variable:1,operator:'>=',value:3}},{action:'set-variable',variable:2,operation:'toggle'},{action:'set-variable',variable:3,value:'Done'},{action:'set-variable',variable:4,value:'#00aaff',condition:{variable:2,operator:'==',value:true}}]}});
 const p=get(e,button).prototype;assert.deepEqual([p.action,p.variable,p.operation,p.value,p.target],['set-variable',1,'add',1,0]);
 assert.deepEqual(p.then.map(s=>[s.action,s.variable??0,s.operation??'set',s.value??null,s.condition??null]),[['navigate',0,'set',null,{variable:1,operator:'>=',value:3}],['set-variable',2,'toggle',null,null],['set-variable',3,'set','Done',null],['set-variable',4,'set','#00aaff',{variable:2,operator:'==',value:true}]]);
 const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();
 edit(e,a,{prototype:{action:'navigate',target:b}});assert.deepEqual(Object.keys(get(e,a).prototype).filter(k=>['variable','operation','value','condition','then'].includes(k)),[]);
 e.undo();e.undo();assert.equal(get(e,button).prototype,null);e.free();
});
test('variable references are checked against the variable\'s type',()=>{
 const {e,b,button}=setup(),set=p=>edit(e,button,{prototype:p}),before=e.snapshot();
 const bad=[{action:'set-variable'},{action:'set-variable',variable:99,value:1},{action:'set-variable',variable:1,value:'x'},{action:'set-variable',variable:1,value:1e10},{action:'set-variable',variable:1,operation:'toggle'},{action:'set-variable',variable:2,operation:'add',value:1},{action:'set-variable',variable:2,operation:'toggle',value:true},{action:'set-variable',variable:3,value:'x'.repeat(1001)},{action:'set-variable',variable:4,value:'red'},{action:'set-variable',variable:1,value:1,operation:'multiply'},{action:'set-variable',variable:1,value:1,target:b},
  {action:'navigate',target:b,variable:1},{action:'navigate',target:b,value:1},{action:'back',operation:'add'},
  {action:'back',condition:{variable:99,operator:'==',value:1}},{action:'back',condition:{variable:2,operator:'<',value:true}},{action:'back',condition:{variable:3,operator:'>=',value:'a'}},{action:'back',condition:{variable:1,operator:'~',value:1}},{action:'back',condition:{variable:1,operator:'==',value:'1'}},
  {action:'back',then:[{action:'set-variable',variable:1,value:'x'}]},{action:'back',then:[{action:'back',condition:{variable:1,operator:'==',value:null}}]}];
 for(const p of bad){assert.throws(()=>set(p),/Invalid (prototype condition|Set variable action)|Invalid prototype action/,JSON.stringify(p));assert.equal(e.snapshot(),before);}
 for(const p of [{action:'set-variable',variable:1,value:-2.5},{action:'set-variable',variable:2,value:true},{action:'set-variable',variable:3,value:''},{action:'back',condition:{variable:4,operator:'!=',value:'#ABCDEF'}},{action:'back',condition:{variable:1,operator:'<=',value:0}}])set(p);
 e.free();
});
test('changing or deleting a variable removes the actions and conditions that no longer fit',()=>{
 const {e,b,button}=setup();
 edit(e,button,{prototype:{trigger:'mousedown',action:'set-variable',variable:1,operation:'add',value:1,then:[{action:'navigate',target:b,condition:{variable:1,operator:'>',value:3}},{action:'set-variable',variable:2,operation:'toggle'}]},additional_interactions:[{trigger:'click',action:'back',condition:{variable:2,operator:'==',value:true}}]});
 const before=e.snapshot(),next=variables();next.values=next.values.filter(v=>v.id!==1);next.values.find(v=>v.id===2).kind='string';next.values.find(v=>v.id===2).values={1:'no',2:'yes'};
 // Open becomes text, so the button can no longer bind it to visibility either.
 e.bind_variable(button,'hidden',0);const unbound=e.snapshot();e.save_variables(JSON.stringify(next));
 // Count is gone and Open changed type: the navigate step takes over the press trigger, unconditionally.
 const p=get(e,button).prototype;assert.deepEqual([p.trigger,p.action,p.target,'condition' in p,'then' in p],['mousedown','navigate',b,false,false]);
 assert.deepEqual(get(e,button).additional_interactions.map(q=>[q.action,'condition' in q]),[['back',false]]);
 e.undo();assert.equal(e.snapshot(),unbound);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('copied layers leave variable actions and conditions behind with their bindings',()=>{
 const {e,a,b,button}=setup();
 edit(e,button,{prototype:{action:'set-variable',variable:1,value:5,then:[{action:'navigate',target:b,condition:{variable:1,operator:'==',value:5}}]}});
 const target=new Editor();target.paste_layers(e.copy_layers(JSON.stringify([a,b])),0,0,0);
 const pasted=JSON.parse(target.snapshot()).shapes,p=pasted.find(s=>s.kind==='rectangle').prototype;
 assert.deepEqual([p.action,p.target,'condition' in p,'then' in p],['navigate',pasted.filter(s=>s.kind==='frame')[1].id,false,false]);target.free();e.free();
});
test('the player reads each variable in its default mode',()=>{
 const {e}=setup();assert.deepEqual([1,2,3,4].map(id=>JSON.parse(e.prototype_variable_value(id))),[2,false,'Hello','#ff0000']);
 assert.throws(()=>e.prototype_variable_value(99),/Variable not found/);e.free();
});
test('conditions compare by type and an unreadable variable satisfies nothing',()=>{
 const holds=(operator,value,current)=>conditionHolds({variable:1,operator,value},current);
 assert.equal(conditionHolds(null,undefined),true);assert.equal(conditionHolds(undefined,5),true);
 assert.deepEqual(['==','!=','<','<=','>','>='].map(op=>holds(op,3,3)),[true,false,false,true,false,true]);
 assert.deepEqual(['<','<=','>','>='].map(op=>holds(op,3,2)),[true,true,false,false]);
 assert.equal(holds('==',true,true),true);assert.equal(holds('!=',true,false),true);assert.equal(holds('==','Hi','Hi'),true);assert.equal(holds('==','Hi','hi'),false);
 // Colors compare without regard to letter case.
 assert.equal(holds('==','#ABCDEF','#abcdef'),true);assert.equal(holds('!=','#ABCDEF','#abcdef'),false);
 for(const op of ['==','!=','<','>','?'])assert.equal(holds(op,1,undefined),false,op);assert.equal(holds('<','b','a'),false);assert.equal(holds('?',1,1),false);
});
test('Set, Add and Toggle produce the next value within the accepted range',()=>{
 assert.equal(nextValue({operation:'set',value:'Done'},'Old'),'Done');assert.equal(nextValue({value:7},1),7);
 assert.equal(nextValue({operation:'add',value:2},3),5);assert.equal(nextValue({operation:'add',value:-1},undefined),-1);assert.equal(nextValue({operation:'add',value:10},1e9),1e9);
 assert.equal(nextValue({operation:'toggle'},false),true);assert.equal(nextValue({operation:'toggle'},true),false);assert.equal(nextValue({operation:'toggle'},undefined),true);
});
test('pickers offer only usable variable types, with the comparisons and operations each allows',()=>{
 const d={variables:{...variables(),values:[...variables().values,{id:9,collection_id:1,name:'Pad',kind:'spacing',values:{1:'4'}}]}};
 assert.deepEqual(prototypeVariables(d).map(v=>[v.id,v.kind,v.label]),[[1,'number','State / Count'],[2,'boolean','State / Open'],[3,'string','State / Title'],[4,'color','State / Brand']]);
 assert.deepEqual(prototypeVariables({}),[]);
 assert.deepEqual(operatorsFor('number').length,6);assert.deepEqual(operatorsFor('boolean'),['==','!=']);assert.deepEqual(operatorsFor(undefined),['==','!=']);
 assert.deepEqual([operationsFor('number'),operationsFor('boolean'),operationsFor('string'),operationsFor('color')],[['set','add'],['set','toggle'],['set'],['set']]);
 assert.deepEqual(['number','boolean','string','color'].map(defaultLiteral),[0,true,'','#000000']);
});
test('actions and conditions read as plain sentences in lists and summaries',()=>{
 const name=id=>({1:'Count',2:'Open',3:'Title'})[id],frame=()=>'Detail';
 assert.equal(setVariableLabel({variable:1,operation:'add',value:2},name),'Add 2 to Count');assert.equal(setVariableLabel({variable:2,operation:'toggle'},name),'Toggle Open');
 assert.equal(setVariableLabel({variable:3,value:'Done'},name),'Set Title to “Done”');assert.equal(setVariableLabel({variable:8,value:1},name),'Set a missing variable to 1');
 assert.equal(conditionLabel({variable:1,operator:'>=',value:3},name),'when Count is at least 3');assert.equal(conditionLabel(null,name),'');
 assert.equal(actionLabel({action:'back',condition:{variable:2,operator:'==',value:true}},frame,name),'Go back (when Open is true)');
 assert.equal(sequenceLabel({action:'set-variable',variable:1,operation:'add',value:1,then:[{action:'navigate',target:2,condition:{variable:1,operator:'>',value:2}}]},frame,name),'Add 1 to Count, then Detail (when Count is greater than 2)');
 assert.equal(actionLabel({action:'navigate',target:2},frame),'Detail');
});
test('a presentation value replaces every mode and re-resolves bound layers without touching the document',()=>{
 const {e,a,button,label}=setup(),d=doc(e),overrides=new Map([[3,'Changed'],[2,true],[4,'#0000ff']]);
 const session=sessionVariables(d.variables,overrides);assert.deepEqual(session.values.find(v=>v.id===3).values,{1:'Changed',2:'Changed'});assert.deepEqual(session.values.find(v=>v.id===1),d.variables.values.find(v=>v.id===1));
 assert.equal(sessionVariables(d.variables,new Map()),d.variables);assert.equal(sessionVariables(d.variables,null),d.variables);
 const preview=new Editor(),shown=prototypeOrientationDocument(preview,d,a,undefined,session),at=id=>shown.shapes.find(s=>s.id===id);
 assert.deepEqual([at(label).text,at(button).hidden,at(button).fill],['Changed',true,'#0000ff']);
 assert.deepEqual([get(e,label).text,get(e,button).hidden,get(e,button).fill],['Hello',false,'#ff0000']);
 const plain=prototypeOrientationDocument(preview,d,a,undefined);assert.equal(plain.shapes.find(s=>s.id===label).text,'Hello');preview.free();e.free();
});
test('library import points variable actions at the imported variables',async()=>{
 const {librarySnapshot,mergeLibrary}=await import('../web/library-model.js');
 const {e,a,button}=setup();e.create_component(a);
 edit(e,button,{prototype:{action:'set-variable',variable:1,operation:'add',value:1,then:[{action:'back',condition:{variable:2,operator:'==',value:true}}]}});
 const target=new Editor();target.save_variables(JSON.stringify({collections:[{id:1,name:'Local',modes:[{id:1,name:'Only'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Mine',kind:'number',values:{1:0}}]}));
 const merged=mergeLibrary(JSON.parse(target.snapshot()),{id:'lib',workspace:'team',name:'System',revision:1,body:librarySnapshot(doc(e))});target.load(JSON.stringify(merged));
 const p=merged.shapes.find(s=>s.kind==='rectangle').prototype,named=id=>merged.variables.values.find(v=>v.id===id).name;
 assert.equal(named(p.variable),'Count');assert.notEqual(p.variable,1);assert.equal(named(p.then[0].condition.variable),'Open');
 assert.equal(JSON.parse(target.prototype_variable_value(p.variable)),2);target.free();e.free();
});
