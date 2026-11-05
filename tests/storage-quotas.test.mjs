import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudDatabase} from './cloud-db.mjs';
import {documentApi} from '../lib/documents.mjs';
import {versionApi} from '../lib/document-versions.mjs';
import {storageUsage,trackedObjectStore,sweepObjects,maybeSweepObjects,quotaFromMegabytes,SWEEP_GRACE_MS,REFERENCE_TABLES} from '../lib/document-storage.mjs';
import {HISTORY_INTERVAL} from '../lib/automatic-history.mjs';

const design=(name,size=0)=>JSON.stringify({version:1,name,shapes:[],...(size?{padding:'x'.repeat(size)}:{})});
const req=(method='GET',data=null,revision=1,user='alice')=>new Request('https://studio.example/api/documents',{method,headers:{'oai-authenticated-user-id':user,'if-match':String(revision),'x-version-label':'Checkpoint',...(data?{'content-type':'application/json'}:{})},...(data?{body:data}:{})});
// In-memory R2 with the listing, metadata and delete calls the sweep uses.
function r2(clock){
 const objects=new Map(),encoder=new TextEncoder();
 return {objects,deletes:[],onDelete:null,onGet:null,
  async put(key,bytes){objects.set(key,{bytes:typeof bytes==='string'?encoder.encode(bytes):bytes,uploaded:new Date(clock.now)});},
  async get(key){await this.onGet?.(key);const o=objects.get(key);return o?{text:async()=>new TextDecoder().decode(o.bytes),arrayBuffer:async()=>o.bytes.slice().buffer}:null;},
  async delete(key){this.deletes.push(key);objects.delete(key);await this.onDelete?.(key);},
  async list({prefix,limit=1000,cursor}){const keys=[...objects.keys()].filter(k=>k.startsWith(prefix)).sort(),start=cursor?Number(cursor):0,page=keys.slice(start,start+limit);
   return {objects:page.map(key=>({key,size:objects.get(key).bytes.length,uploaded:objects.get(key).uploaded})),truncated:start+limit<keys.length,cursor:String(start+limit)};},
 };
}
function setup(quota=null){
 const clock={now:Date.UTC(2026,10,1)},db=cloudDatabase(),raw=r2(clock),bucket=trackedObjectStore(db,raw,()=>clock.now),storage={quota,tables:REFERENCE_TABLES.cloud,objects:'document_objects'};
 const realNow=Date.now;Date.now=()=>clock.now;
 return {clock,db,raw,bucket,storage,
  api:(request,id=null)=>documentApi(request,db,id,bucket,null,null,storage),
  versions:(request,id,version=null,restore=false)=>versionApi(request,db,id,version,restore,bucket,null,null,storage),
  close(){Date.now=realNow;db.close();}};
}

test('quota setting accepts megabytes and refuses nonsense',()=>{
 assert.equal(quotaFromMegabytes(undefined),null);assert.equal(quotaFromMegabytes(''),null);assert.equal(quotaFromMegabytes('250'),250_000_000);
 for(const bad of ['0','-5','abc','2000000'])assert.throws(()=>quotaFromMegabytes(bad),/PIXL_STORAGE_QUOTA_MB/);
});

test('usage counts inline bodies and each referenced large object once per owner',async()=>{
 const s=setup();try{
  const small=design('Small'),large=design('Large',2_000_000);
  await s.api(req('POST',small));const {id}=await (await s.api(req('POST',large))).json();
  // A named version of a large file references the same object.
  assert.equal((await s.versions(req('POST'),id)).status,201);
  const usage=await storageUsage(s.db,'alice',s.storage),object=new TextEncoder().encode(large).length;
  assert.equal(usage.inlineBytes,new TextEncoder().encode(small).length);assert.equal(usage.objectBytes,object);
  assert.deepEqual(await storageUsage(s.db,'bob',s.storage),{bytes:0,inlineBytes:0,objectBytes:0});
 }finally{s.close();}
});

test('a quota blocks growth with 507 and leaves the stored design unchanged',async()=>{
 const s=setup(1_000_000);try{
  const first=design('Within',400_000),{id}=await (await s.api(req('POST',first))).json();
  const tooBig=await s.api(req('POST',design('Second',700_000)));assert.equal(tooBig.status,507);assert.match((await tooBig.json()).error,/storage is full: 0\.4 MB of 1\.0 MB used/);
  // Replacing the current body counts only the difference.
  assert.equal((await s.api(req('PUT',design('Within',900_000),1),id)).status,200);
  const growth=await s.api(req('PUT',design('Within',1_200_000),2),id);assert.equal(growth.status,507);
  assert.equal(JSON.parse((await (await s.api(req(),id)).json()).body).padding.length,900_000);
  // An inline named version would duplicate 0.9 MB, so it is refused too.
  assert.equal((await s.versions(req('POST',null,2),id)).status,507);
  assert.equal((await s.api(req('PUT',design('Within',100),2),id)).status,200,'shrinking is always allowed');
 }finally{s.close();}
});

test('without a quota nothing is checked',async()=>{
 const s=setup(null);try{for(let i=0;i<3;i++)assert.equal((await s.api(req('POST',design('Big '+i,1_400_000)))).status,201);}finally{s.close();}
});

test('the sweep removes only old unreferenced objects and keeps history references',async()=>{
 const s=setup();try{
  const original=design('Large',2_000_000),{id}=await (await s.api(req('POST',original))).json();
  // Second save inside the automatic-history window: the first object is checkpointed.
  s.clock.now+=60_000;assert.equal((await s.api(req('PUT',design('Large edit',2_000_001),1),id)).status,200);
  // Third save, still inside the window: the second body is now unreferenced.
  s.clock.now+=60_000;assert.equal((await s.api(req('PUT',design('Large final',2_000_002),2),id)).status,200);
  assert.equal(s.raw.objects.size,3);
  assert.deepEqual(await sweepObjects(s.db,s.raw,{now:s.clock.now}),{deleted:0,freed:0,restored:0,cursor:null},'nothing is old enough yet');
  s.clock.now+=SWEEP_GRACE_MS+1;
  const result=await sweepObjects(s.db,s.raw,{now:s.clock.now});
  assert.equal(result.deleted,1);assert.equal(result.freed,new TextEncoder().encode(design('Large edit',2_000_001)).length);
  assert.equal(s.raw.objects.size,2);
  assert.equal(JSON.parse((await (await s.api(req(),id)).json()).body).name,'Large final');
  const history=(await (await s.versions(req(),id)).json()).versions;assert.equal(history.length,1);
  assert.equal(JSON.parse((await (await s.versions(req(),id,history[0].id)).json()).body).name,'Large');
  assert.equal((await s.db.prepare('SELECT COUNT(*) AS n FROM document_objects').bind().first()).n,2);
 }finally{s.close();}
 void HISTORY_INTERVAL;
});

for(const moment of ['before','after'])test(`objects stored before tracking are adopted, and a save racing the deletion (${moment} it) is restored`,async()=>{
 const s=setup();try{
  const body=design('Legacy',2_000_000),bytes=new TextEncoder().encode(body),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''),key='documents/'+hash;
  await s.raw.put(key,bytes);// written by an older release: no tracker row
  s.clock.now+=SWEEP_GRACE_MS+1;
  // A save of identical content touches the tracker, uploads, and commits a
  // reference after the sweep has claimed the object: either just before the
  // sweep deletes it (the upload is then deleted) or just after.
  const save=async()=>{s.raw.onGet=s.raw.onDelete=null;await s.bucket.put(key,bytes);await s.db.prepare("INSERT INTO documents(id,owner,name,body,body_bytes,revision,created_at,updated_at) VALUES('00000000-0000-0000-0000-000000000001','alice','Legacy',?,80,1,0,0)").bind('@pixlprfct-r2:'+hash).run();};
  if(moment==='before')s.raw.onGet=save;else s.raw.onDelete=save;
  const result=await sweepObjects(s.db,s.raw,{now:s.clock.now});
  assert.equal(result.restored,1);assert.equal(result.deleted,0);
  assert.equal(new TextDecoder().decode(s.raw.objects.get(key).bytes),body,'the object is present for the new reference');
  assert.equal((await (await s.api(req(),'00000000-0000-0000-0000-000000000001')).json()).body,body);
 }finally{s.close();}
});

test('a write that touches an object before the sweep claims it keeps the object',async()=>{
 const s=setup();try{
  const body=design('Again',2_000_000),{id}=await (await s.api(req('POST',body))).json();
  await s.api(req('PUT',design('Changed',2_000_000),1),id);// first object now only in the checkpoint
  s.clock.now+=60_000;await s.api(req('PUT',design('Changed twice',2_000_000),2),id);
  s.clock.now+=SWEEP_GRACE_MS+1;
  // "Changed" is unreferenced and old. Saving that exact content again refreshes
  // its tracker before the reference is committed, so the sweep keeps it.
  await s.api(req('PUT',design('Changed',2_000_000),3),id);
  const result=await sweepObjects(s.db,s.raw,{now:s.clock.now});
  assert.equal(result.deleted,0);assert.equal(s.raw.objects.size,3);
  assert.equal(JSON.parse((await (await s.api(req(),id)).json()).body).name,'Changed');
 }finally{s.close();}
});

test('opportunistic maintenance runs one claimed page at a time and resumes the listing',async()=>{
 const s=setup();try{
  for(let i=0;i<3;i++){const {id}=await (await s.api(req('POST',design('Doc '+i,1_600_000)))).json();s.clock.now+=1000;await s.api(req('PUT',design('Doc '+i+' v2',1_600_000),1),id);s.clock.now+=1000;await s.api(req('PUT',design('Doc '+i+' v3',1_600_000),2),id);}
  assert.equal(s.raw.objects.size,9);s.clock.now+=SWEEP_GRACE_MS+1;
  const [a,b]=await Promise.all([maybeSweepObjects(s.db,s.raw,{now:s.clock.now,limit:4}),maybeSweepObjects(s.db,s.raw,{now:s.clock.now,limit:4})]);
  assert.equal([a,b].filter(Boolean).length,1,'only one request claims the run');
  const first=a??b;assert.ok(first.cursor);
  assert.equal(await maybeSweepObjects(s.db,s.raw,{now:s.clock.now+1000,limit:4}),null,'next page waits a minute');
  let removed=first.deleted;for(let t=s.clock.now+61_000,i=0;i<5;i++,t+=61_000){const r=await maybeSweepObjects(s.db,s.raw,{now:t,limit:4});if(!r)break;removed+=r.deleted;if(!r.cursor)break;}
  assert.equal(removed,3,'each file had one unreferenced middle body');assert.equal(s.raw.objects.size,6);
 }finally{s.close();}
});
