import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const snapshot=e=>JSON.parse(e.snapshot());
test('duplicate page preserves all layer properties and hierarchy with fresh IDs, and undoes atomically',()=>{
 const e=new Editor(),frame=e.add('frame',10,20),child=e.add('rectangle',30,40);
 e.drop_layer(child,frame,'inside');
 const input=snapshot(e);input.shapes.find(s=>s.id===child).locked=true;input.shapes.find(s=>s.id===child).hidden=true;e.load(JSON.stringify(input));
 const before=e.snapshot(),source=snapshot(e),page=e.duplicate_page(source.active_page),after=snapshot(e);
 assert.equal(after.active_page,page);assert.equal(after.pages[1].name,'Page 1 copy');
 const originals=after.shapes.filter(s=>s.page_id===source.active_page),copies=after.shapes.filter(s=>s.page_id===page);
 assert.deepEqual(originals,source.shapes);assert.equal(copies.length,2);
 const mapping=new Map(originals.map((s,i)=>[s.id,copies[i].id]));
 originals.forEach((s,i)=>assert.deepEqual(copies[i],{...s,id:mapping.get(s.id),page_id:page,parent_id:mapping.get(s.parent_id)??s.parent_id}));
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.deepEqual(snapshot(e),after);
 e.select_page(source.active_page);e.duplicate_page(source.active_page);assert.equal(snapshot(e).pages[1].name,'Page 1 copy 2');e.free();
});
test('empty page duplicates; invalid page leaves document untouched',()=>{
 const e=new Editor(),before=e.snapshot();assert.throws(()=>e.duplicate_page(999));assert.equal(e.snapshot(),before);
 const id=e.duplicate_page(1);assert.equal(snapshot(e).active_page,id);assert.equal(snapshot(e).shapes.length,0);e.free();
});
test('page reordering preserves active page and layers, persists, and undoes in one step',()=>{
 const e=new Editor();e.add('rectangle',20,30);const b=e.add_page(),c=e.add_page();e.select_page(b);e.clear_history();
 const before=e.snapshot();e.reorder_page(c,1,false);let d=snapshot(e);
 assert.deepEqual(d.pages.map(p=>p.id),[c,1,b]);assert.equal(d.active_page,b);assert.deepEqual(d.shapes,JSON.parse(before).shapes);
 const loaded=new Editor();loaded.load(e.snapshot());assert.deepEqual(snapshot(loaded).pages,d.pages);loaded.free();
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.deepEqual(snapshot(e),d);
 e.reorder_page(c,b,true);assert.deepEqual(snapshot(e).pages.map(p=>p.id),[1,b,c]);
 e.clear_history();e.reorder_page(c,b,true);e.reorder_page(c,c,false);assert.equal(e.can_undo(),false);
 const stable=e.snapshot();assert.throws(()=>e.reorder_page(c,999,true));assert.equal(e.snapshot(),stable);e.free();
});
test('drag duplication inserts the full copy at the target in one undoable edit',()=>{
 const e=new Editor();const shape=e.add('rectangle',20,30),b=e.add_page(),c=e.add_page();e.select_page(1);e.clear_history();
 const before=e.snapshot(),id=e.duplicate_page_at(1,c,true),after=e.snapshot();
 assert.deepEqual(snapshot(e).pages.map(p=>p.id),[1,b,c,id]);assert.equal(snapshot(e).active_page,id);
 assert.equal(snapshot(e).shapes.filter(s=>s.page_id===id).length,1);assert.equal(snapshot(e).shapes.find(s=>s.id===shape).page_id,1);
 e.undo();assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);e.redo();assert.equal(e.snapshot(),after);
 const stable=e.snapshot();assert.throws(()=>e.duplicate_page_at(1,999,false));assert.equal(e.snapshot(),stable);
 const self=e.duplicate_page_at(1,1,false);assert.deepEqual(snapshot(e).pages.map(p=>p.id),[self,1,b,c,id]);e.free();
});
