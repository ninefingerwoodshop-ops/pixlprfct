import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {componentEntries,moveComponent} from '../web/component-sort.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot());
const main=e=>{const id=e.add('frame',0,0);e.create_component(id);return id;};
test('component sorting persists and undoes independently of artwork stacking and instances',()=>{
 const e=new Editor(),a=main(e),b=main(e),c=main(e);e.create_instance(a,400,0);const before=doc(e),keys=componentEntries(before).map(s=>s.key),next=moveComponent(keys,keys[2],keys[0]);e.sort_components(JSON.stringify(next));assert.deepEqual(doc(e).shapes,before.shapes);assert.deepEqual(componentEntries(doc(e)).map(s=>s.id),[c,a,b]);const copy=new Editor();copy.load(e.snapshot());assert.deepEqual(componentEntries(doc(copy)).map(s=>s.id),[c,a,b]);e.undo();assert.deepEqual(doc(e),before);e.redo();assert.deepEqual(doc(e).component_order,next);e.free();copy.free();
});
test('variant sets use stable set IDs when their first variant is deleted; new components append',()=>{
 const e=new Editor(),a=main(e),b=main(e),c=main(e);const set=e.save_component_set(JSON.stringify({id:0,name:'Button',properties:['State'],variants:[{component_id:a,values:['Default']},{component_id:b,values:['Pressed']}]}));e.sort_components(JSON.stringify(['component:'+c,'set:'+set]));e.remove(a);assert.deepEqual(componentEntries(doc(e)).map(s=>s.key),['component:'+c,'set:'+set]);assert.equal(componentEntries(doc(e))[1].id,b);const d=main(e);assert.deepEqual(componentEntries(doc(e)).map(s=>s.key),['component:'+c,'set:'+set,'component:'+d]);e.free();
});
test('invalid, incomplete and duplicate reorder requests are atomic; old files keep natural order',()=>{
 const e=new Editor(),a=main(e),b=main(e),before=e.snapshot();for(const list of [[],['component:'+a],['component:'+a,'component:'+a],['component:'+a,'component:99999']]){assert.throws(()=>e.sort_components(JSON.stringify(list)));assert.equal(e.snapshot(),before);}const legacy=doc(e);delete legacy.component_order;e.load(JSON.stringify(legacy));assert.deepEqual(componentEntries(doc(e)).map(s=>s.id),[a,b]);e.free();
});
test('before/after insertion accounts for the removed source and ignores self or foreign drops',()=>{
 const keys=['a','b','c','d'];assert.deepEqual(moveComponent(keys,'a','c',true),['b','c','a','d']);assert.deepEqual(moveComponent(keys,'d','b'),['a','d','b','c']);assert.deepEqual(moveComponent(keys,'b','b',true),keys);assert.deepEqual(moveComponent(keys,'foreign','a'),keys);assert.deepEqual(keys,['a','b','c','d']);
});
