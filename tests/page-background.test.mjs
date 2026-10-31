import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEngine,createHeadlessEditor} from '../mcp/projects.mjs';
await initializeEngine();
test('page paint is independent, undoable, duplicated and portable; invalid edits are atomic',()=>{
 const e=createHeadlessEditor(),copy=createHeadlessEditor();try{const original=e.snapshot(),background={color:'#123456',opacity:.5,visible:true};e.set_page_background(1,JSON.stringify(background));const painted=e.snapshot();e.undo();assert.equal(e.snapshot(),original);e.redo();assert.equal(e.snapshot(),painted);const page=e.duplicate_page(1);assert.deepEqual(JSON.parse(e.snapshot()).pages.find(p=>p.id===page).background,background);copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());const before=e.snapshot();for(const bad of [{...background,color:'#xyzxyz'},{...background,opacity:2},{...background,opacity:-1}]){assert.throws(()=>e.set_page_background(page,JSON.stringify(bad)));assert.equal(e.snapshot(),before);}assert.throws(()=>e.set_page_background(999,JSON.stringify(background)));assert.equal(e.snapshot(),before);
 }finally{e.free();copy.free();}
});
