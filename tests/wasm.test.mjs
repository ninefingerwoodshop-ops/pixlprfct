import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import init, { Editor } from '../web/pkg/pixlprfct_core.js';
await init({ module_or_path: await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm', import.meta.url)) });
test('browser WebAssembly bindings support a complete editing session', () => {
  const editor = new Editor();
  const id = editor.add('rectangle', 20, 30);
  const shape = JSON.parse(editor.snapshot()).shapes[0];
  editor.update(JSON.stringify({ ...shape, x: 100, width: 200 }));
  assert.equal(editor.hit_test(150, 50), id);
  const copy = editor.duplicate(id);
  assert.notEqual(copy, id);
  editor.remove(id);
  editor.undo();
  assert.equal(JSON.parse(editor.snapshot()).shapes.length, 2);
  editor.redo();
  assert.equal(JSON.parse(editor.snapshot()).shapes.length, 1);
  const file = editor.snapshot();
  const restored = new Editor(); restored.load(file);
  assert.equal(restored.snapshot(), file);
  const before = editor.snapshot();
  assert.throws(() => editor.load('{bad json'));
  assert.equal(editor.snapshot(), before);
  editor.free(); restored.free();
});

test('pages isolate shapes, survive save/load, and restore on undo', () => {
  const editor = new Editor();
  const first = editor.add('rectangle', 0, 0);
  const second = editor.add_page();
  assert.equal(editor.hit_test(40, 40), 0);
  const shape = editor.add('ellipse', 0, 0);
  editor.rename_page(second, 'Mobile checkout');
  editor.select_page(1);
  assert.equal(editor.hit_test(40, 40), first);
  assert.throws(() => editor.duplicate(shape));
  editor.select_page(second);
  assert.equal(editor.hit_test(80, 60), shape);
  const saved = editor.snapshot();
  const restored = new Editor(); restored.load(saved);
  assert.equal(restored.snapshot(), saved);
  editor.delete_page(second);
  assert.equal(JSON.parse(editor.snapshot()).active_page, 1);
  assert.equal(JSON.parse(editor.snapshot()).shapes.length, 1);
  editor.undo();
  assert.equal(editor.snapshot(), saved);
  editor.redo();
  assert.throws(() => editor.delete_page(1));
  editor.free(); restored.free();
});

test('legacy designs migrate without losing shapes; invalid page imports are atomic', () => {
  const editor = new Editor();
  editor.add('text', 12, 34);
  const legacy = JSON.parse(editor.snapshot());
  legacy.version = 1; delete legacy.pages; delete legacy.active_page;
  legacy.shapes.forEach(s => delete s.page_id);
  const restored = new Editor(); restored.load(JSON.stringify(legacy));
  const migrated = JSON.parse(restored.snapshot());
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.pages, [{ id: 1, name: 'Page 1' }]);
  assert.deepEqual(migrated.shapes.map(({ page_id, ...s }) => s), legacy.shapes);
  const before = restored.snapshot();
  for (const invalid of [
    { ...migrated, pages: [] },
    { ...migrated, active_page: 99 },
    { ...migrated, pages: [...migrated.pages, migrated.pages[0]] },
    { ...migrated, shapes: migrated.shapes.map(s => ({ ...s, page_id: 99 })) },
  ]) {
    assert.throws(() => restored.load(JSON.stringify(invalid)));
    assert.equal(restored.snapshot(), before);
  }
  editor.free(); restored.free();
});

test('page navigation preserves redo, and layer reordering stays within a page', () => {
  const editor = new Editor();
  const first = editor.add('rectangle', 0, 0);
  const page = editor.add_page();
  const other = editor.add('rectangle', 0, 0);
  editor.select_page(1);
  const last = editor.add('rectangle', 0, 0);
  editor.reorder(last, -1);
  assert.equal(editor.hit_test(50, 50), first);
  editor.undo();
  editor.select_page(page);
  assert.equal(editor.hit_test(50, 50), other);
  assert.equal(editor.can_redo(), true);
  editor.redo();
  assert.equal(editor.hit_test(50, 50), first);
  editor.select_page(page);
  assert.equal(editor.hit_test(50, 50), other);
  const state = editor.snapshot();
  assert.throws(() => editor.rename_page(page, '   '));
  assert.equal(editor.snapshot(), state);
  editor.free();
});

test('typography survives history and roundtrip; invalid updates are atomic', () => {
  const editor = new Editor(); editor.add('text', 0, 0);
  const shape = JSON.parse(editor.snapshot()).shapes[0];
  const styled = {...shape, typography:{font_size:48,font_family:'Georgia',font_weight:700,align:'center',line_height:1.5,wrap:true}};
  editor.update(JSON.stringify(styled));
  const saved = editor.snapshot();
  editor.undo(); assert.deepEqual(JSON.parse(editor.snapshot()).shapes[0],shape);
  editor.redo(); assert.equal(editor.snapshot(),saved);
  const restored = new Editor(); restored.load(saved); assert.equal(restored.snapshot(),saved);
  for (const invalid of [{font_size:0},{font_size:513},{font_weight:999},{font_family:''},{font_family:'<script>'},{align:'justify'},{line_height:0}]) {
    assert.throws(() => editor.update(JSON.stringify({...styled,typography:{...styled.typography,...invalid}})));
    assert.equal(editor.snapshot(),saved);
  }
  editor.update(JSON.stringify({...styled,height:300}));
  assert.equal(JSON.parse(editor.snapshot()).shapes[0].typography.font_size,48);
  editor.free(); restored.free();
});

test('older text retains its original size and unwrapped layout on migration', () => {
  const editor = new Editor(); editor.add('text', 0, 0);
  const old = JSON.parse(editor.snapshot());
  delete old.shapes[0].typography; old.shapes[0].height=40;
  editor.load(JSON.stringify(old));
  const migrated=JSON.parse(editor.snapshot()).shapes[0];
  assert.ok(Math.abs(migrated.typography.font_size - 26.4) < 1e-9);
  assert.equal(migrated.typography.wrap,false);
  editor.update(JSON.stringify({...migrated,height:200}));
  assert.ok(Math.abs(JSON.parse(editor.snapshot()).shapes[0].typography.font_size - migrated.typography.font_size) < 1e-9);
  editor.free();
});

test('multi-layer edits commit atomically and undo in one step', () => {
  const editor = new Editor();
  const a=editor.add('rectangle',0,0), b=editor.add('ellipse',200,50);
  const original=editor.snapshot(), shapes=JSON.parse(original).shapes;
  editor.update_many(JSON.stringify(shapes.map(s=>({...s,x:s.x+30,y:s.y+10}))));
  editor.undo(); assert.equal(editor.snapshot(),original);
  editor.redo(); assert.equal(JSON.parse(editor.snapshot()).shapes[1].x,230);
  const before=editor.snapshot();
  assert.throws(()=>editor.update_many(JSON.stringify([{...shapes[0],x:90},{...shapes[1],width:-3}])));
  assert.equal(editor.snapshot(),before);
  assert.throws(()=>editor.update_many(JSON.stringify([shapes[0],shapes[0]])));
  assert.equal(editor.snapshot(),before);
  const ids=JSON.parse(editor.duplicate_many(JSON.stringify([b,a])));
  const copies=JSON.parse(editor.snapshot()).shapes.slice(-2);
  assert.deepEqual(copies.map(s=>s.kind),['rectangle','ellipse']);
  assert.equal(copies[0].x,54);
  editor.remove_many(JSON.stringify(ids));
  assert.equal(JSON.parse(editor.snapshot()).shapes.length,2);
  editor.undo(); assert.equal(JSON.parse(editor.snapshot()).shapes.length,4);
  editor.free();
});

test('alignment and unequal-size spacing preserve anchors and page isolation', () => {
  const editor=new Editor(); const a=editor.add('rectangle',0,0), b=editor.add('rectangle',55,30), c=editor.add('rectangle',100,60);
  const original=JSON.parse(editor.snapshot());
  editor.update_many(JSON.stringify(original.shapes.map((s,i)=>({...s,width:[10,20,30][i],height:10}))));
  const ids=JSON.stringify([a,b,c]);
  editor.distribute_many(ids,'horizontal');
  assert.deepEqual(JSON.parse(editor.snapshot()).shapes.map(s=>s.x),[0,45,100]);
  const spaced=editor.snapshot();
  editor.align_many(ids,'bottom');
  assert.deepEqual(JSON.parse(editor.snapshot()).shapes.map(s=>s.y),[60,60,60]);
  editor.undo(); assert.equal(editor.snapshot(),spaced);
  const page=editor.add_page(); const other=editor.add('rectangle',10,10);
  const before=editor.snapshot();
  assert.throws(()=>editor.align_many(JSON.stringify([a,other]),'left'));
  assert.throws(()=>editor.remove_many(ids));
  assert.throws(()=>editor.duplicate_many(ids));
  assert.equal(editor.snapshot(),before);
  assert.equal(JSON.parse(before).active_page,page);
  editor.free();
});
