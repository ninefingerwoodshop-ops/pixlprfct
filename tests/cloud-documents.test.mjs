import {cloudDatabase} from './cloud-db.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {documentApi} from '../lib/documents.mjs';
const database=cloudDatabase;
const body=JSON.stringify({version:2,name:'Cloud design',shapes:[],pages:[{id:1,name:'Page 1'}],active_page:1});
function request(method='GET',data=null,owner='alice',revision=null,headers={}){return new Request('https://studio.example/api/documents',{method,headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),...(data?{'content-type':'application/json'}:{}),...(revision?{'if-match':String(revision)}:{}),...headers},...(data?{body:data}:{})});}
test('creator metadata is immutable and shared lifecycle permissions reject editors and unknown legacy creators',async()=>{
 const db=database(),creator={userId:'creator',manage:false},editor={userId:'editor',manage:false},admin={userId:'admin',manage:true};
 const call=(actor,method='GET',id=null,data=null,revision=null)=>documentApi(request(method,data,'org:design',revision,{'x-created-by':'creator','x-admin':'true'}),db,id,null,null,actor);
 try{
  const made=await(await call(creator,'POST',null,body)).json();assert.equal(made.created_by,'creator');assert.equal(made.can_delete,true);
  assert.equal((await(await call(editor)).json()).documents[0].can_delete,false);
  assert.equal((await(await call(admin)).json()).documents[0].can_delete,true);
  assert.equal((await call(editor,'DELETE',made.id,null,1)).status,403);
  assert.equal((await call(editor,'PUT',made.id,JSON.stringify({...JSON.parse(body),created_by:'editor',can_delete:true}),1)).status,200);
  assert.equal((await(await call(editor,'GET',made.id)).json()).created_by,'creator');
  assert.equal((await call(creator,'DELETE',made.id,null,1)).status,409);
  assert.equal((await call(creator,'DELETE',made.id,null,2)).status,200);
  assert.equal((await call(editor,'PATCH',made.id,null,3)).status,403);
  assert.equal((await call(creator,'PATCH',made.id,null,3)).status,200);
  db.exec(`UPDATE documents SET created_by=NULL WHERE id='${made.id}'`);
  assert.equal((await(await call(creator,'GET',made.id)).json()).can_delete,false);
  assert.equal((await call(creator,'DELETE',made.id,null,4)).status,403);
  assert.equal((await call(admin,'DELETE',made.id,null,4)).status,200);
  assert.equal((await call(admin,'PATCH',made.id,null,5)).status,200);
 }finally{db.close();}
});
test('cloud documents authorize every operation and never expose another owner metadata',async()=>{
 const db=database();try{assert.equal((await documentApi(request('GET',null,null),db)).status,401);const created=await (await documentApi(request('POST',body),db)).json();assert.equal(created.revision,1);
 assert.deepEqual((await (await documentApi(request('GET',null,'bob'),db)).json()).documents,[]);
 for(const method of ['GET','PUT','DELETE','PATCH'])assert.equal((await documentApi(request(method,method==='PUT'?body:null,'bob',1),db,created.id)).status,404);
 assert.equal((await (await documentApi(request(),db,created.id)).json()).body,body);
 }finally{db.close();}
});
test('conditional writes prevent lost updates and trash is reversible with a fresh revision',async()=>{
 const db=database();try{const {id}=await (await documentApi(request('POST',body),db)).json();const next=body.replace('Cloud design','Updated');assert.equal((await documentApi(request('PUT',next,'alice',1),db,id)).status,200);assert.equal((await documentApi(request('PUT',body,'alice',1),db,id)).status,409);assert.equal((await documentApi(request('DELETE',null,'alice',1),db,id)).status,409);
 assert.equal((await documentApi(request('DELETE',null,'alice',2),db,id)).status,200);assert.equal((await documentApi(request('PUT',body,'alice',3),db,id)).status,409);const trashed=await (await documentApi(request(),db,id)).json();assert.ok(trashed.deleted_at);assert.equal(trashed.body,next);
 assert.equal((await documentApi(request('PATCH',null,'alice',3),db,id)).status,200);const restored=await (await documentApi(request(),db,id)).json();assert.equal(restored.deleted_at,null);assert.equal(restored.revision,4);assert.equal(restored.body,next);
 }finally{db.close();}
});
test('malformed, cross-origin, oversized and unconditional writes reject without changing data',async()=>{
 const db=database();try{for(const [data,headers,status] of [['{}',{},400],['{',{},400],[body,{origin:'https://other.example'},403],[body,{'sec-fetch-site':'cross-site'},403],['x'.repeat(5_000_001),{},413]])assert.equal((await documentApi(request('POST',data,'alice',null,headers),db)).status,status);
 const {id}=await (await documentApi(request('POST',body),db)).json();assert.equal((await documentApi(request('PUT',body),db,id)).status,428);assert.equal((await (await documentApi(request(),db,id)).json()).revision,1);
 }finally{db.close();}
});
