import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes,order=(e,parent=0)=>shapes(e).filter(s=>s.parent_id===parent).map(s=>s.id);
test('multi-layer stacking keeps relative order and each operation is one undo step',()=>{
 const e=new Editor(),ids=Array.from({length:5},()=>e.add('rectangle',0,0)),[a,b,c,d,f]=ids;
 const before=e.snapshot();e.arrange_many(JSON.stringify([a,c]),'forward');assert.deepEqual(order(e),[b,a,d,c,f]);e.undo();assert.equal(e.snapshot(),before);
 e.arrange_many(JSON.stringify([a,c]),'front');assert.deepEqual(order(e),[b,d,f,a,c]);e.undo();
 e.arrange_many(JSON.stringify([b,d]),'backward');assert.deepEqual(order(e),[b,a,d,c,f]);e.undo();
 e.arrange_many(JSON.stringify([b,d]),'back');assert.deepEqual(order(e),[b,d,a,c,f]);e.undo();assert.equal(e.snapshot(),before);
 e.clear_history();e.arrange_many(JSON.stringify([f]),'front');assert.equal(e.can_undo(),false);e.free();
});
test('groups move as units, selected ancestors preserve child order, and other pages stay unchanged',()=>{
 const e=new Editor(),f=e.add('frame',0,0),a=e.add('rectangle',0,0),b=e.add('ellipse',0,0),c=e.add('rectangle',0,0);
 e.reparent_many(JSON.stringify([a,b]),f);const before=order(e,f);e.arrange_many(JSON.stringify([f,a]),'front');assert.deepEqual(order(e,f),before);assert.deepEqual(order(e),[c,f]);
 const d=e.add('rectangle',0,0);e.group_many(JSON.stringify([c,d]));const grouped=order(e);e.arrange_many(JSON.stringify([c]),'back');assert.deepEqual(order(e),[c,d,f]);e.undo();assert.deepEqual(order(e),grouped);
 const page=JSON.parse(e.snapshot()).active_page;e.add_page();const other=e.add('rectangle',0,0);e.select_page(page);const idx=shapes(e).findIndex(s=>s.id===other);e.arrange_many(JSON.stringify([f]),'front');assert.equal(shapes(e).findIndex(s=>s.id===other),idx);e.free();
});
test('instance children reject arrangement atomically while main edits propagate',()=>{
 const e=new Editor(),m=e.add('frame',0,0),a=e.add('rectangle',0,0),b=e.add('ellipse',0,0);e.reparent_many(JSON.stringify([a,b]),m);e.create_component(m);const instance=e.create_instance(m,500,0);const children=order(e,instance),before=e.snapshot();
 assert.throws(()=>e.arrange_many(JSON.stringify([children[0]]),'front'),/Detach/);assert.equal(e.snapshot(),before);
 e.arrange_many(JSON.stringify([a]),'front');assert.deepEqual(order(e,m),[b,a]);assert.deepEqual(shapes(e).filter(s=>s.parent_id===instance).map(s=>s.component.source),[b,a]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
