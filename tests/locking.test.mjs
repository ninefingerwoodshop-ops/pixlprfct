import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {lockedInTree,canvasSelection,marqueeSelection} from '../web/selection.js';
import {frameAt,paintBounds} from '../web/scene.js';
import {exportShapes} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
const get=(e,id)=>shapes(e).find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('locked frame descendants cannot be hit; inspector edits remain possible and undo restores lock state',()=>{
 const e=new Editor(),back=e.add('rectangle',0,0),f=e.add('frame',0,0),child=e.add('rectangle',10,10);e.reparent_many(JSON.stringify([child]),f);assert.equal(e.hit_test(20,20),child);
 const before=e.snapshot();edit(e,f,{locked:true});assert.equal(e.hit_test(20,20),back);assert.equal(lockedInTree(get(e,child),shapes(e)),true);assert.equal(get(e,child).locked,false);e.undo();assert.equal(e.snapshot(),before);e.redo();
 edit(e,child,{fill:'#123456'});assert.equal(get(e,child).fill,'#123456');edit(e,f,{locked:false});assert.equal(e.hit_test(20,20),child);e.free();
});
test('canvas selection and drawing containment exclude own/inherited locks while export still contains them',()=>{
 const e=new Editor(),f=e.add('frame',0,0),a=e.add('rectangle',10,10),b=e.add('rectangle',30,30);e.reparent_many(JSON.stringify([a,b]),f);const g=e.group_many(JSON.stringify([a,b]));edit(e,a,{locked:true});
 const page=shapes(e);assert.deepEqual(canvasSelection(page,[b]),[g]);assert.deepEqual(canvasSelection(page,[b],{deep:true}),[b]);assert.ok(paintBounds(get(e,a),page));assert.equal(exportShapes(page,[],'page').length,4);
 edit(e,f,{locked:true});const locked=shapes(e);assert.equal(frameAt(locked,{x:50,y:50}),0);assert.deepEqual(canvasSelection(locked,marqueeSelection(locked,{x:0,y:0},{x:1000,y:1000})),[]);e.free();
});
test('locks survive save, clipboard, duplication and parent transforms; legacy layers default unlocked',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('rectangle',10,10);e.reparent_many(JSON.stringify([c]),f);edit(e,c,{locked:true});edit(e,f,{x:20});assert.equal(get(e,c).x,30);
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([f])));assert.equal(get(e,ids[1]).locked,true);
 const copy=new Editor();copy.paste_layers(e.copy_layers(JSON.stringify([f])),0,0,0);assert.equal(shapes(copy)[1].locked,true);copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());
 const legacy=JSON.parse(e.snapshot());legacy.shapes.forEach(s=>delete s.locked);copy.load(JSON.stringify(legacy));assert.ok(shapes(copy).every(s=>s.locked===false));e.free();copy.free();
});
