import test from 'node:test';import assert from 'node:assert/strict';import {cloudDatabase} from './cloud-db.mjs';import {documentApi} from '../lib/documents.mjs';import {versionApi} from '../lib/document-versions.mjs';import {HISTORY_INTERVAL} from '../lib/automatic-history.mjs';
const body=name=>JSON.stringify({version:1,name,shapes:[]});
const req=(method='GET',revision=1,data=null,url='https://studio.example/api/documents',owner='alice')=>new Request(url,{method,headers:{'oai-authenticated-user-id':owner,'if-match':String(revision),...(data?{'content-type':'application/json'}:{})},...(data?{body:data}:{})});
test('automatic history backs up the prior saved document at bounded intervals, not every edit',async()=>{
 const db=cloudDatabase(),realNow=Date.now;let now=1_000_000;Date.now=()=>now;
 try{const {id}=await (await documentApi(req('POST',1,body('Original')),db)).json();await documentApi(req('PUT',1,body('First edit')),db,id);now+=100;await documentApi(req('PUT',2,body('Second edit')),db,id);let versions=(await (await versionApi(req(),db,id)).json()).versions;assert.equal(versions.length,1);assert.equal(versions[0].kind,'automatic');assert.equal(JSON.parse((await (await versionApi(req(),db,id,versions[0].id)).json()).body).name,'Original');
 now+=HISTORY_INTERVAL;await documentApi(req('PUT',3,body('Third edit')),db,id);versions=(await (await versionApi(req(),db,id)).json()).versions;assert.equal(versions.length,2);assert.equal(JSON.parse((await (await versionApi(req(),db,id,versions[0].id)).json()).body).name,'Second edit');await documentApi(req('PUT',3,body('Stale')),db,id);assert.equal((await (await versionApi(req(),db,id)).json()).versions.length,2);
 }finally{Date.now=realNow;db.close();}
});
test('a failed update rolls back its automatic backup in the same transaction',async()=>{
 const db=cloudDatabase();try{const {id}=await (await documentApi(req('POST',1,body('Original')),db)).json();db.exec("CREATE TRIGGER fail_update BEFORE UPDATE ON documents BEGIN SELECT RAISE(ABORT,'test failure'); END");const response=await documentApi(req('PUT',1,body('Changed')),db,id);assert.equal(response.status,503);assert.equal((await (await versionApi(req(),db,id)).json()).versions.length,0);assert.equal(JSON.parse((await (await documentApi(req(),db,id)).json()).body).name,'Original');}finally{db.close();}
});
test('file pagination, literal search, ownership and Trash are applied together without missing tied records',async()=>{
 const db=cloudDatabase();try{
  for(let i=0;i<85;i++)await db.prepare('INSERT INTO documents(id,owner,name,body,revision,created_at,updated_at,deleted_at) VALUES(?,?,?,?,1,1,100,?)').bind(crypto.randomUUID(),i===84?'bob':'alice','File '+i+(i===0?' %_':''),body('File'),i>=82?1:null).run();
  let cursor=null,ids=[];do{const result=await (await documentApi(req('GET',1,null,'https://studio.example/api/documents'+(cursor?'?before='+encodeURIComponent(cursor):'')),db)).json();ids.push(...result.documents.map(d=>d.id));cursor=result.next;}while(cursor);assert.equal(ids.length,82);assert.equal(new Set(ids).size,82);
  assert.equal((await (await documentApi(req('GET',1,null,'https://studio.example/api/documents?trash=1'),db)).json()).documents.length,2);const search=await (await documentApi(req('GET',1,null,'https://studio.example/api/documents?search=%25_'),db)).json();assert.equal(search.documents.length,1);assert.match(search.documents[0].name,/%_/);assert.equal((await documentApi(req('GET',1,null,'https://studio.example/api/documents?before=oops'),db)).status,400);
 }finally{db.close();}
});
