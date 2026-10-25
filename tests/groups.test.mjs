import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {expandGroups,selectedGroup} from '../web/selection.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('grouping, naming and ungrouping roundtrip and undo atomically',()=>{
  const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('text',10,10),ids=JSON.stringify([a,b]);
  const original=e.snapshot(),g=e.group_many(ids);e.rename_group(g,'Button');
  const saved=e.snapshot();assert.ok(JSON.parse(saved).shapes.every(s=>s.group_id===g&&s.group_name==='Button'));
  const restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);
  e.ungroup_many(JSON.stringify([a]));assert.ok(JSON.parse(e.snapshot()).shapes.every(s=>!s.group_id));
  e.undo();assert.equal(e.snapshot(),saved);e.undo();e.undo();assert.equal(e.snapshot(),original);
  restored.free();e.free();
});
test('duplicating groups creates separate identities and never reconnects originals',()=>{
  const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('ellipse',20,20),g=e.group_many(JSON.stringify([a,b]));
  const copies=JSON.parse(e.duplicate_many(JSON.stringify([a,b]))),shapes=JSON.parse(e.snapshot()).shapes;
  const copyGroup=shapes.find(s=>s.id===copies[0]).group_id;
  assert.notEqual(copyGroup,g);assert.ok(shapes.filter(s=>copies.includes(s.id)).every(s=>s.group_id===copyGroup));
  e.rename_group(copyGroup,'Copy');assert.equal(JSON.parse(e.snapshot()).shapes[0].group_name,`Group ${g}`);
  const child=e.duplicate(a);assert.equal(JSON.parse(e.snapshot()).shapes.find(s=>s.id===child).group_id,0);
  e.remove_many(JSON.stringify(copies));assert.equal(JSON.parse(e.snapshot()).shapes.filter(s=>s.group_id===g).length,2);e.free();
});
test('invalid group imports and cross-page operations leave state intact',()=>{
  const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('ellipse',20,20),g=e.group_many(JSON.stringify([a,b]));
  const saved=e.snapshot(),doc=JSON.parse(saved);
  assert.throws(()=>e.load(JSON.stringify({...doc,shapes:doc.shapes.map((s,i)=>({...s,group_name:i?'Different':s.group_name}))})));assert.equal(e.snapshot(),saved);
  assert.throws(()=>e.rename_group(g,''));assert.equal(e.snapshot(),saved);
  e.add_page();const c=e.add('rectangle',0,0),before=e.snapshot();assert.throws(()=>e.group_many(JSON.stringify([a,c])));assert.throws(()=>e.rename_group(g,'Other page'));assert.equal(e.snapshot(),before);e.free();
});
test('group expansion includes hidden siblings; direct child selection remains distinguishable',()=>{
  const shapes=[{id:1,group_id:8},{id:2,group_id:8,hidden:true},{id:3,group_id:0}];
  assert.deepEqual(expandGroups(shapes,[1]),[1,2]);assert.deepEqual(expandGroups(shapes,[1,3]),[1,2,3]);
  assert.equal(selectedGroup(shapes,[1]),0);assert.equal(selectedGroup(shapes,[1,2]),8);assert.equal(selectedGroup(shapes,[1,2,3]),0);
});
test('grouping interleaved layers creates a contiguous stack and undo restores original order',()=>{
  const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('ellipse',0,0),c=e.add('text',0,0),before=e.snapshot();
  e.group_many(JSON.stringify([a,c]));assert.deepEqual(JSON.parse(e.snapshot()).shapes.map(s=>s.id),[b,a,c]);
  e.undo();assert.equal(e.snapshot(),before);e.free();
});
