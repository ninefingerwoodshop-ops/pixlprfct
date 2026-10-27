import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryStore} from '../web/recovery-store.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}};
test('cloud recovery survives closing a tab while preserving other tabs independent files',()=>{
 const durable=memory(),first=memory(),second=memory(),a=recoveryStore(first,durable),b=recoveryStore(second,durable);
 a.setItem('session','file A');b.setItem('session','file B');assert.equal(a.getItem('session'),'file A');assert.equal(b.getItem('session'),'file B');assert.equal(recoveryStore(memory(),durable).getItem('session'),'file B');a.removeItem('session');assert.equal(durable.getItem('session'),'file B');b.removeItem('session');assert.equal(durable.getItem('session'),null);
});
test('durable write failure is reported while retaining a tab recovery copy',()=>{
 const tab=memory(),durable={...memory(),setItem(){throw new Error('Quota exceeded');}},store=recoveryStore(tab,durable);assert.throws(()=>store.setItem('session','latest edits'),/Quota/);assert.equal(store.getItem('session'),'latest edits');
});
