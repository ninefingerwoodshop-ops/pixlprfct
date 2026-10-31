import {librarySnapshot} from './library-model.js';

export const LIBRARY_FORMAT='pixlprfct-library';
export function libraryPackage(release){
 const {id,workspace,name,revision,body}=release;
 return JSON.stringify({format:LIBRARY_FORMAT,version:1,release:{id,workspace,name,revision,body}});
}
export function parseLibraryPackage(text){
 if(new TextEncoder().encode(text).length>5_000_000)throw new Error('This library exceeds the 5 MB import limit.');
 let data;try{data=JSON.parse(text);}catch{throw new Error('This is not a valid PixlPrfct library file.');}
 if(data?.format!==LIBRARY_FORMAT||data.version!==1)throw new Error('Choose an exported .pixllib library file.');
 const r=data.release;
 if(!r||typeof r.id!=='string'||!r.id||r.id.length>200||/[\x00-\x1f\x7f]/.test(r.id)||typeof r.workspace!=='string'||!r.workspace||r.workspace.length>200||/[\x00-\x1f\x7f]/.test(r.workspace)||typeof r.name!=='string'||!r.name.trim()||r.name.length>256||!Number.isSafeInteger(r.revision)||r.revision<1)throw new Error('The library identity or release number is invalid.');
 const body=typeof r.body==='string'?JSON.parse(r.body):r.body;
 if(!Array.isArray(body?.pages)||!Array.isArray(body?.shapes)||body.libraries?.length)throw new Error('The library document is invalid.');
 return {id:r.id,workspace:r.workspace,name:r.name,revision:r.revision,body};
}

// IndexedDB keeps published snapshots out of the small synchronous draft store.
// A read/write transaction serializes publishes and imports across windows.
export class LocalLibraries {
 constructor(factory=globalThis.indexedDB){this.factory=factory;this.pending=null;}
 database(){
  if(!this.factory)return Promise.reject(new Error('Library storage is unavailable on this device.'));
  return this.pending??=new Promise((resolve,reject)=>{
   const request=this.factory.open('pixlprfct.libraries.v1',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('releases',{keyPath:'key'});
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.pending=null;};resolve(db);};
   request.onerror=()=>{this.pending=null;reject(new Error('Published libraries could not be opened.'));};
  });
 }
 async transact(mode,action){
  const db=await this.database();return new Promise((resolve,reject)=>{
   const tx=db.transaction('releases',mode),store=tx.objectStore('releases');let result,error;
   tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(error??new Error('The library could not be saved. Free device storage and try again.'));
   try{action(store,value=>{result=value;},reason=>{error=reason;tx.abort();});}catch(reason){error=reason;tx.abort();}
  });
 }
 async list(){return this.transact('readonly',(store,done)=>{store.getAll().onsuccess=event=>done(event.target.result.filter(r=>!r.archived).sort((a,b)=>b.updated_at-a.updated_at));});}
 async get(item,revision=null){if(revision){try{return await this.transact('readonly',(store,done,fail)=>{store.get(item.workspace+'\n'+item.id+'\n@'+revision).onsuccess=e=>e.target.result?done(e.target.result):fail(new Error('Release not found.'));});}catch{const latest=await this.get(item);if(latest.revision===revision)return latest;throw new Error('This older release was not retained on this device.');}}return this.transact('readonly',(store,done,fail)=>{store.get(item.workspace+'\n'+item.id+(revision?'\n@'+revision:'')).onsuccess=event=>event.target.result?done(event.target.result):fail(new Error('This library is no longer available on this device.'));});}
 async history(item){const rows=await this.transact('readonly',(store,done)=>{store.getAll().onsuccess=e=>done(e.target.result);});const all=rows.filter(r=>r.id===item.id&&r.workspace===item.workspace);return [...new Map(all.map(r=>[r.revision,r])).values()].sort((a,b)=>b.revision-a.revision);}
 async retire(item,retired){return this.transact('readwrite',(store,done,fail)=>{store.get(item.workspace+'\n'+item.id).onsuccess=e=>{if(!e.target.result){fail(new Error('Library not found.'));return;}const value={...e.target.result,retired};store.put(value);done(value);};});}
 async publish(sourceId,document,{notes='',rollbackRevision=null}={}){
  if(!sourceId)throw new Error('Save this project before publishing its library.');
  const body=librarySnapshot(document),id='local:'+sourceId,key='local\n'+id;
  return this.transact('readwrite',(store,done,fail)=>{store.get(key).onsuccess=event=>{
   const old=event.target.result;
   const save=body=>{const release={key,id,workspace:'local',source_project:sourceId,name:document.name,revision:(old?.revision??0)+1,body,notes,retired:old?.retired??false,updated_at:Date.now()};if(old)store.put({...old,key:key+'\n@'+old.revision,archived:true});store.put({...release,key:key+'\n@'+release.revision,archived:true});store.put(release);done(release);};
   if(rollbackRevision){store.get(key+'\n@'+rollbackRevision).onsuccess=e=>{if(!e.target.result){fail(new Error('Release not found.'));return;}save(e.target.result.body);};}else save(body);
  };});
 }
 async import(release){
  const incoming=parseLibraryPackage(libraryPackage(release)),key=incoming.workspace+'\n'+incoming.id;
  return this.transact('readwrite',(store,done,fail)=>{store.get(key).onsuccess=event=>{
   const old=event.target.result;
   if(old&&old.revision>incoming.revision){fail(new Error('A newer release of this library is already available.'));return;}
   if(old&&old.revision===incoming.revision&&JSON.stringify(old.body)!==JSON.stringify(incoming.body)){fail(new Error('This release conflicts with the saved library. Export a new release from its source.'));return;}
   if(old)store.put({...old,key:key+'\n@'+old.revision,archived:true});
   const saved={...incoming,key,updated_at:Date.now(),...(old?.source_project?{source_project:old.source_project}:{})};store.put({...saved,key:key+'\n@'+saved.revision,archived:true});store.put(saved);done(saved);
  };});
 }
}
