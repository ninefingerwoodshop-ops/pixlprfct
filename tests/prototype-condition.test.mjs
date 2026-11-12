import test from 'node:test';
import assert from 'node:assert/strict';
import {parseConditionText,conditionEntryText,conditionChoices,variableValueText} from '../web/prototype-condition.js';
const variables=[{id:1,kind:'number',name:'Count',collection:'State'},{id:2,kind:'boolean',name:'Open',collection:'State'},{id:3,kind:'string',name:'Label',collection:'Copy'},{id:4,kind:'color',name:'Brand',collection:'Copy'}];
test('a written test is read by the variable\'s kind',()=>{
 assert.deepEqual(parseConditionText('> 3','number'),{operator:'>',value:3});assert.deepEqual(parseConditionText('  >=-2.5 ','number'),{operator:'>=',value:-2.5});
 for(const bad of ['>','> x','3','=> 3','> 1e12','> 3 4'])assert.equal(parseConditionText(bad,'number'),null,bad);
 assert.deepEqual(parseConditionText('== TRUE','boolean'),{operator:'==',value:true});assert.deepEqual(parseConditionText('!=false','boolean'),{operator:'!=',value:false});
 assert.equal(parseConditionText('> true','boolean'),null);assert.equal(parseConditionText('== yes','boolean'),null);
 assert.deepEqual(parseConditionText('== "a b"','string'),{operator:'==',value:'a b'});assert.deepEqual(parseConditionText('!= draft','string'),{operator:'!=',value:'draft'});
 assert.deepEqual(parseConditionText('== ""','string'),{operator:'==',value:''});assert.equal(parseConditionText('== ','string'),null);assert.equal(parseConditionText('< a','string'),null);
 assert.deepEqual(parseConditionText('== #FF00aa','color'),{operator:'==',value:'#ff00aa'});assert.equal(parseConditionText('== red','color'),null);
 // What the field shows is what it reads back.
 for(const [condition,kind] of [[{operator:'>',value:3},'number'],[{operator:'==',value:false},'boolean'],[{operator:'!=',value:'a "b"'},'string'],[{operator:'==',value:'#00ff00'},'color']])assert.deepEqual(parseConditionText(conditionEntryText(condition),kind),condition);
});
test('the popover lists variables, then comparisons, then boolean values',()=>{
 const names=list=>list.map(c=>c.type==='variable'?c.variable.name:c.type==='operator'?c.operator:c.value);
 assert.deepEqual(names(conditionChoices(variables,null,'')),['Count','Open','Label','Brand']);assert.deepEqual(names(conditionChoices(variables,null,' cou')),['Count']);
 // Figma's order; only equality for kinds that cannot be ordered.
 assert.deepEqual(names(conditionChoices(variables,variables[0],'')),['==','!=','>','>=','<','<=']);assert.deepEqual(names(conditionChoices(variables,variables[1],'')),['==','!=']);
 assert.deepEqual(names(conditionChoices(variables,variables[0],'>')),['>','>=']);assert.deepEqual(names(conditionChoices(variables,variables[0],'less')),['<','<=']);
 // Once the comparison is followed by a space or a value, the list moves on.
 assert.deepEqual(names(conditionChoices(variables,variables[0],'> ')),[]);assert.deepEqual(names(conditionChoices(variables,variables[0],'> 3')),[]);
 assert.deepEqual(names(conditionChoices(variables,variables[1],'== ')),[true,false]);assert.deepEqual(names(conditionChoices(variables,variables[1],'== f')),[false]);
});
test('list values come from each collection\'s default mode',()=>{
 const doc={variables:{collections:[{id:1,default_mode:2}],values:[{id:1,collection_id:1,values:{1:5,2:7}},{id:2,collection_id:1,values:{1:true,2:false}},{id:3,collection_id:1,values:{2:{alias:1}}}]}};
 assert.deepEqual([1,2,3,9].map(id=>variableValueText(doc,id)),['7','False','','']);
});
