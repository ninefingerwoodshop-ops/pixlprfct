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
