import {test} from 'node:test';import assert from 'node:assert/strict';import {instanceContext} from '../web/instance-context.js';
test('nested copy selection identifies outer action target and innermost main',()=>{
 const link=(id,master,source,parent_id=0)=>({id,parent_id,component:{type:'instance',master,source}});
 const inner={id:1,component:{type:'master'}},outer={id:2,component:{type:'master'}};
 const source=link(3,1,1,2),copy=link(4,2,2),nested=link(5,2,3,4),doc={shapes:[inner,outer,source,copy,nested]};
 const context=instanceContext(doc,nested);assert.equal(context.root.id,4);assert.equal(context.main.id,2);assert.equal(context.nestedMain.id,1);assert.equal(context.isRoot,false);
 assert.equal(instanceContext(doc,copy).isRoot,true);assert.equal(instanceContext(doc,source).isRoot,true);assert.equal(instanceContext(doc,inner),null);
});
