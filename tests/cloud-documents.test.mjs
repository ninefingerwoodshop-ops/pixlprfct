import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {documentApi} from '../lib/documents.mjs';
function database(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_flaky_phalanx.sql',import.meta.url),'utf8'));return{close:()=>sql.close(),prepare(query){return{bind(...args){const statement=sql.prepare(query);return{all:async()=>({results:statement.all(...args)}),first:async()=>statement.get(...args)??null,run:async()=>({meta:{changes:Number(statement.run(...args).changes)}})};}}}};}
const body=JSON.stringify({version:2,name:'Cloud design',shapes:[],pages:[{id:1,name:'Page 1'}],active_page:1});
function request(method='GET',data=null,owner='alice',revision=null,headers={}){return new Request('https://studio.example/api/documents',{method,headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),...(data?{'content-type':'application/json'}:{}),...(revision?{'if-match':String(revision)}:{}),...headers},...(data?{body:data}:{})});}
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
