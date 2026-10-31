import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {LocalDrafts,DRAFTS_KEY,newDesign} from '../web/local-drafts.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
const library=(storage=memory(),tab=memory())=>{let count=0,time=0;return new LocalDrafts(storage,tab,{id:()=>String(++count),now:()=>++time});};
test('creating and reopening designs preserves independent bodies and edits',()=>{
 const storage=memory(),tab=memory(),drafts=library(storage,tab);
 assert.equal(drafts.restore(),null);const first=drafts.save(newDesign('Original','desktop'));
 const second=drafts.create(newDesign('Phone','mobile'));drafts.save(newDesign('Phone revised','mobile'));
 assert.equal(drafts.get(first.id).body,first.body);assert.equal(JSON.parse(drafts.get(second.id).body).name,'Phone revised');
 drafts.activate(first.id);drafts.save(newDesign('Original revised','desktop'));
 const restored=library(storage,tab);assert.equal(JSON.parse(restored.restore()).name,'Original revised');assert.equal(restored.list().length,2);
 assert.equal(JSON.parse(restored.get(second.id).body).shapes[0].width,390);
});
test('failed creation or switching preserves both the current file and saved library',()=>{
 const storage=memory(),drafts=library(storage);const original=drafts.save(newDesign('Keep me')),saved=storage.getItem(DRAFTS_KEY);
 storage.setItem=()=>{throw new Error('QuotaExceeded');};
 assert.throws(()=>drafts.create(newDesign('New')),/Could not save/);assert.equal(drafts.activeId,original.id);assert.equal(storage.getItem(DRAFTS_KEY),saved);
 assert.throws(()=>drafts.activate(original.id),/Could not save/);assert.equal(drafts.activeId,original.id);
});
test('unreadable storage is preserved instead of replaced with an empty library',()=>{
 for(const raw of ['broken','null','{"version":2,"files":[]}','{"version":1,"files":[null]}']){
  const storage=memory();storage.setItem(DRAFTS_KEY,raw);const drafts=library(storage);
  assert.throws(()=>drafts.restore(),/preserved/);assert.throws(()=>drafts.create(newDesign('New')),/preserved/);assert.equal(storage.getItem(DRAFTS_KEY),raw);
 }
 assert.throws(()=>new LocalDrafts().create(newDesign('New')),/storage is unavailable/);
});
test('tabs keep their active designs and merge updates to different files',()=>{
 const storage=memory(),tabA=memory(),tabB=memory(),a=library(storage,tabA),b=new LocalDrafts(storage,tabB,{id:()=> 'b',now:()=>9});
 const first=a.save(newDesign('A'));b.restore();const second=b.create(newDesign('B'));a.save(newDesign('A updated'));
 assert.equal(JSON.parse(new LocalDrafts(storage,tabA).restore()).name,'A updated');assert.equal(JSON.parse(new LocalDrafts(storage,tabB).restore()).name,'B');
 assert.equal(a.get(second.id).name,'B');assert.equal(b.get(first.id).name,'A updated');
});
test('cloud detachment saves a new local draft without replacing the previous one',()=>{
 const drafts=library(),original=drafts.save(newDesign('Local'));drafts.detach();const cloudCopy=drafts.save(newDesign('Cloud copy'));
 assert.notEqual(original.id,cloudCopy.id);assert.equal(drafts.get(original.id).name,'Local');assert.equal(drafts.list().length,2);
});
test('unchanged saves retain edit order and do not consume storage writes',()=>{
 const storage=memory(),drafts=library(storage),body=newDesign('Original'),first=drafts.save(body);storage.setItem=()=>{throw new Error('Unexpected write');};
 assert.deepEqual(drafts.save(body),first);assert.equal(drafts.get(first.id).updatedAt,first.updatedAt);
});
test('Trash preserves project bodies, refuses reopening and stale autosaves, and restores them',()=>{
 const storage=memory(),a=library(storage),file=a.create(newDesign('Keep my work','desktop'));
 const b=library(storage);b.activate(file.id);a.setTrashed(file.id,true,file.body);
 assert.equal(a.list().length,0);assert.equal(a.list({trash:true})[0].body,file.body);
 assert.equal(new LocalDrafts(storage).restore(),null);
 assert.throws(()=>b.get(file.id),/Trash/);assert.throws(()=>b.activate(file.id),/Trash/);
 assert.throws(()=>b.save(newDesign('Unsaved edit')),/Trash/);assert.equal(a.read().files.length,1);
 a.setTrashed(file.id,false,file.body);assert.equal(a.get(file.id).body,file.body);assert.equal(a.list({trash:true}).length,0);
 assert.equal(new LocalDrafts(storage).restore(),file.body);
});
test('Trash rejects stale project data and preserves records when storage fails',()=>{
 const storage=memory(),drafts=library(storage),file=drafts.create(newDesign('Original'));
 drafts.save(newDesign('Changed'));assert.throws(()=>drafts.setTrashed(file.id,true,file.body),/changed/);
 const saved=storage.getItem(DRAFTS_KEY);storage.setItem=()=>{throw new Error('QuotaExceeded');};
 assert.throws(()=>drafts.setTrashed(file.id,true),/Could not save/);assert.equal(storage.getItem(DRAFTS_KEY),saved);assert.equal(drafts.list().length,1);
});
test('starters produce independent blank, desktop, and mobile documents',()=>{
 assert.deepEqual(JSON.parse(newDesign('   ')).shapes,[]);assert.equal(JSON.parse(newDesign('   ')).name,'Untitled design');
 for(const [preset,width,height] of [['desktop',1440,900],['mobile',390,844]]){const doc=JSON.parse(newDesign('  Hello  ',preset));assert.equal(doc.name,'Hello');assert.equal(doc.shapes[0].width,width);assert.equal(doc.shapes[0].height,height);assert.equal(doc.shapes[0].clip_content,true);}
 assert.throws(()=>newDesign('Name','unknown'),/starting point/);
});
test('all starters load into the editor, persist edits, and reopen as editable documents',()=>{
 const drafts=library(),editor=new Editor();
 try{
  for(const preset of ['blank','desktop','mobile']){
   editor.load(newDesign(preset,preset));editor.clear_history();const file=drafts.create(editor.snapshot());
   const id=editor.add('rectangle',24,36);drafts.save(editor.snapshot());
   editor.load(newDesign('Another file'));editor.load(drafts.activate(file.id));
   const doc=JSON.parse(editor.snapshot());assert.equal(doc.name,preset);assert.equal(doc.pages.length,1);assert.ok(doc.shapes.some(s=>s.id===id));assert.equal(doc.shapes.length,preset==='blank'?1:2);
  }
 }finally{editor.free();}
});
test('same-file stale tabs preserve the newer body and reject conflicting edits',()=>{
 const storage=memory(),a=library(storage),first=a.create(newDesign('Original')),b=library(storage);b.activate(first.id);
 a.save(newDesign('Newer'));b.save(first.body);assert.equal(a.get(first.id).name,'Newer');
 assert.throws(()=>b.save(newDesign('Conflict')),/another tab/);assert.equal(a.get(first.id).name,'Newer');
 b.activate(first.id);b.save(newDesign('Resolved'));assert.equal(a.get(first.id).name,'Resolved');
});
