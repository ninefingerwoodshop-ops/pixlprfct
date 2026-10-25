import test from 'node:test';
import assert from 'node:assert/strict';
import {fitWindow,resizeWindow} from '../web/floating-window.js';
import {variableGroups,filterVariables,resolveVariableValue} from '../web/variable-manager.js';
test('floating windows remain reachable and resize from every edge without crossing minimum sizes',()=>{
 const bounds={width:1200,height:800},r={x:100,y:100,width:640,height:400};
 assert.deepEqual(resizeWindow(r,'nw',30,20,bounds),{x:130,y:120,width:610,height:380});
 assert.deepEqual(resizeWindow(r,'se',100,90,bounds),{x:100,y:100,width:740,height:490});
 for(const edge of ['n','s','e','w','nw','ne','sw','se'])for(const delta of [-10000,10000]){const out=resizeWindow(r,edge,delta,delta,bounds);assert.ok(out.x>=0&&out.y>=0&&out.width>=560&&out.height>=320);assert.ok(out.x+out.width<=1200&&out.y+out.height<=800);}
 assert.deepEqual(fitWindow({x:1000,y:1000,width:900,height:700},{width:400,height:300}),{x:0,y:0,width:400,height:300});
});
test('variable navigation searches groups and values and combines collection and type filters',()=>{
 const values=[{id:1,collection_id:1,name:'Color/Surface/Primary',kind:'color',values:{1:'#abcdef'}},{id:2,collection_id:1,name:'Spacing/small',kind:'number',values:{1:8}},{id:3,collection_id:2,name:'Color/Surface/Other',kind:'color',values:{1:'#abcdef'}}];
 assert.deepEqual(variableGroups(values),['Color','Color/Surface','Spacing']);
 assert.deepEqual(filterVariables(values,{collection:1,group:'Color',query:'ABC',type:'color'}).map(v=>v.id),[1]);
 assert.equal(filterVariables(values,{collection:1,type:'number',query:'8'})[0].id,2);
 assert.deepEqual(filterVariables(values,{collection:1,group:'Color',type:'number'}),[]);
});
test('detaching an alias retains the resolved value in each mode, including cross-collection defaults',()=>{
 const vars={collections:[{id:1,default_mode:1},{id:2,default_mode:4}],values:[{id:1,collection_id:1,values:{1:'#000000',2:'#ffffff'}},{id:2,collection_id:1,values:{1:{alias:1},2:{alias:1}}},{id:3,collection_id:2,values:{4:{alias:2}}}]};
 assert.equal(resolveVariableValue(vars,2,{collection:1,id:2}),'#ffffff');assert.equal(resolveVariableValue(vars,3,{collection:2,id:4}),'#000000');
 vars.values[0].values[1]={alias:3};assert.throws(()=>resolveVariableValue(vars,2,{collection:1,id:1}),/Circular/);
});
