import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {layerDropPosition} from '../web/layer-drop.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot());
test('layer drops reorder the reversed tree and undo as one action',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('rectangle',100,0),c=e.add('rectangle',200,0),before=e.snapshot();
 e.drop_layer(a,c,'before');assert.deepEqual(doc(e).shapes.map(s=>s.id),[b,c,a]);e.undo();assert.equal(e.snapshot(),before);
 e.drop_layer(c,a,'after');assert.deepEqual(doc(e).shapes.map(s=>s.id),[c,a,b]);e.free();
});
test('frame drops preserve geometry, descendants and persist; cyclic drops are atomic',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0),c=e.add('rectangle',30,40);
 e.drop_layer(c,a,'inside');const original=doc(e).shapes.find(s=>s.id===c);e.drop_layer(a,b,'inside');
 assert.deepEqual(doc(e).shapes.find(s=>s.id===c),original);assert.equal(doc(e).shapes.find(s=>s.id===a).parent_id,b);
 const before=e.snapshot();assert.throws(()=>e.drop_layer(b,a,'inside'));assert.equal(e.snapshot(),before);
 const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);e.drop_layer(c,b,'before');assert.equal(doc(e).shapes.find(s=>s.id===c).parent_id,0);e.free();copy.free();
});
test('drop zones distinguish frame nesting from edge sorting',()=>{
 const rect={top:100,height:40};assert.equal(layerDropPosition(rect,102,true),'before');assert.equal(layerDropPosition(rect,120,true),'inside');assert.equal(layerDropPosition(rect,138,true),'after');assert.equal(layerDropPosition(rect,115,false),'before');assert.equal(layerDropPosition(rect,125,false),'after');
});
test('instance structure rejects drops while main component order propagates',()=>{
 const e=new Editor(),m=e.add('frame',0,0),a=e.add('rectangle',0,0),b=e.add('ellipse',0,0);e.reparent_many(JSON.stringify([a,b]),m);e.create_component(m);const instance=e.create_instance(m,500,0),children=doc(e).shapes.filter(s=>s.parent_id===instance),before=e.snapshot();
 assert.throws(()=>e.drop_layer(children[0].id,children[1].id,'before'),/Detach/);assert.equal(e.snapshot(),before);
 e.drop_layer(a,b,'before');assert.deepEqual(doc(e).shapes.filter(s=>s.parent_id===instance).map(s=>s.component.source),[b,a]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
