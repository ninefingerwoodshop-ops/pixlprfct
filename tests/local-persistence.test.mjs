import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalDrafts,DRAFTS_KEY,newDesign} from '../web/local-drafts.js';
import {LocalPersistence} from '../web/local-persistence.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
function setup(storage=memory(),tab=memory()){
 const drafts=new LocalDrafts(storage,tab);let body=newDesign('Original');
 const session=new LocalPersistence({drafts,snapshot:()=>body,storage:tab,lock:action=>Promise.resolve().then(action)});
 return {storage,tab,drafts,session,set:value=>body=newDesign(value)};
}
test('an unchanged old tab never writes over a newer document, including normalized snapshots',async()=>{
 const a=setup();await a.session.flush();const b=setup(a.storage);b.drafts.restore();b.session.adopt(newDesign('Original'));
 a.set('Newer');await a.session.flush();await b.session.flush();
 assert.equal(JSON.parse(a.drafts.get(a.drafts.activeId).body).name,'Newer');
 b.set('Other edits');await assert.rejects(b.session.flush(),/another tab/);
 assert.equal(b.session.dirty(),true);assert.equal(JSON.parse(b.session.recovery().body).name,'Other edits');
 await b.session.copy();assert.equal(b.drafts.list().length,2);assert.equal(b.session.dirty(),false);
 assert.equal(a.drafts.get(a.drafts.activeId).name,'Newer');
});
test('quota failure preserves dirty state and a recoverable body through reload',async()=>{
 const a=setup();await a.session.flush();const durable=a.storage.getItem(DRAFTS_KEY),save=a.storage.setItem;
 a.storage.setItem=()=>{throw new Error('QuotaExceeded');};a.set('Unsaved');await assert.rejects(a.session.flush(),/Could not save/);
 assert.equal(a.session.dirty(),true);assert.equal(a.storage.getItem(DRAFTS_KEY),durable);
 const b=setup(a.storage,a.tab);b.drafts.restore();const record=b.session.recovery();b.set(JSON.parse(record.body).name);b.session.restore(record);
 assert.equal(b.session.dirty(),true);assert.equal(b.drafts.base,record.base);
 a.storage.setItem=save;await b.session.flush();assert.equal(b.session.dirty(),false);assert.equal(b.session.recovery(),null);assert.equal(b.drafts.get(b.drafts.activeId).name,'Unsaved');
});
test('first-save failures also recover, and downloading only acknowledges the downloaded snapshot',async()=>{
 const a=setup(),save=a.storage.setItem;a.storage.setItem=()=>{throw new Error('QuotaExceeded');};
 await assert.rejects(a.session.flush());assert.equal(a.session.recovery().id,null);
 a.session.downloaded(newDesign('Original'));assert.equal(a.session.dirty(),false);a.set('More edits');assert.equal(a.session.dirty(),true);
 a.storage.setItem=save;await a.session.flush();assert.equal(a.tab.getItem('pixlprfct.local-recovery:new'),null);
});
test('edits arriving during an asynchronous lock are saved before flush resolves',async()=>{
 const a=setup();let release;const wait=new Promise(resolve=>release=resolve);let count=0;
 a.session.lock=async action=>{if(!count++)await wait;return action();};
 const saving=a.session.flush();a.set('During save');release();await saving;
 assert.equal(a.drafts.get(a.drafts.activeId).name,'During save');assert.equal(a.session.dirty(),false);
});
test('opening latest requires preserving edits and does not silently replace them',async()=>{
 const a=setup();await a.session.flush();const b=setup(a.storage);b.drafts.restore();b.session.adopt(newDesign('Original'));
 a.set('Newer');await a.session.flush();b.set('Other edits');await assert.rejects(b.session.flush());
 await assert.rejects(b.session.latest(),/Download|download/);b.session.downloaded(newDesign('Other edits'));
 assert.equal(JSON.parse(await b.session.latest()).name,'Newer');assert.equal(b.session.recovery(),null);
});
