import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {cloudDatabase} from './cloud-db.mjs';
import {documentApi} from '../lib/documents.mjs';
import {versionApi} from '../lib/document-versions.mjs';
import {storageUsage} from '../lib/document-storage.mjs';
import {teamFixture} from './helpers/team-fixture.mjs';

const design=name=>JSON.stringify({version:1,name,shapes:[]});
const request=(method,{owner='alice',revision=null,data=null,label=null,query=''}={})=>new Request('https://studio.example/api/documents'+query,{method,headers:{'oai-authenticated-user-id':owner,...(revision?{'if-match':String(revision)}:{}),...(label?{'x-version-label':encodeURIComponent(label)}:{}),...(data?{'content-type':'application/json'}:{})},...(data?{body:data}:{})});
const forever={query:'?permanent=1'};
const count=(db,table,id)=>db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${table==='documents'?'id':'document_id'}=?`).bind(id).first().then(row=>row.n);
async function fileWithHistory(db,owner='alice'){
 const {id}=await(await documentApi(request('POST',{owner,data:design('First')}),db)).json();
 assert.equal((await versionApi(request('POST',{owner,revision:1,label:'Named'}),db,id)).status,201);
 assert.equal((await documentApi(request('PUT',{owner,revision:1,data:design('Second')}),db,id)).status,200);
 return id;
}

test('permanent delete needs Trash first, a current revision, and removes the file with its history',async()=>{
 const db=cloudDatabase();try{
  const id=await fileWithHistory(db),other=await fileWithHistory(db);
  assert.equal(await count(db,'document_versions',id),2);
  const before=(await storageUsage(db,'alice')).bytes;
  // An active file is refused even with the right revision.
  let response=await documentApi(request('DELETE',{revision:2,...forever}),db,id);assert.equal(response.status,409);assert.match((await response.json()).error,/Move this file to Trash/);
  assert.equal((await documentApi(request('DELETE',{...forever}),db,id)).status,428);
  assert.equal((await documentApi(request('DELETE',{revision:2}),db,id)).status,200);
  // A stale revision deletes nothing, including history.
  response=await documentApi(request('DELETE',{revision:2,...forever}),db,id);assert.equal(response.status,409);assert.equal((await response.json()).conflict,true);
  assert.equal(await count(db,'documents',id),1);assert.equal(await count(db,'document_versions',id),2);
  response=await documentApi(request('DELETE',{revision:3,...forever}),db,id);assert.equal(response.status,200);assert.deepEqual(await response.json(),{id,deleted:true});
  assert.equal(await count(db,'documents',id),0);assert.equal(await count(db,'document_versions',id),0);
  // Another file and its history are untouched, and the space is counted as free at once.
  assert.equal(await count(db,'documents',other),1);assert.equal(await count(db,'document_versions',other),2);
  const after=(await storageUsage(db,'alice')).bytes;assert.ok(after<before);assert.equal(after*2,before);
  for(const method of ['GET','PATCH','DELETE'])assert.equal((await documentApi(request(method,{revision:4}),db,id)).status,404);
  assert.equal((await documentApi(request('DELETE',{revision:4,...forever}),db,id)).status,404);
  assert.equal((await(await documentApi(request('GET',{query:'?trash=1'}),db)).json()).documents.length,0);
 }finally{db.close();}
});

test('permanent delete is limited to the owner, and to the creator or an administrator in shared space',async()=>{
 const db=cloudDatabase();try{
  const id=await fileWithHistory(db);await documentApi(request('DELETE',{revision:2}),db,id);
  assert.equal((await documentApi(request('DELETE',{owner:'bob',revision:3,...forever}),db,id)).status,404);
  const shared=(actor,method,options)=>documentApi(request(method,{owner:'org:design',...options}),db,options.id??null,null,null,actor);
  const creator={userId:'creator',manage:false},editor={userId:'editor',manage:false},admin={userId:'admin',manage:true};
  const made=await(await shared(creator,'POST',{data:design('Shared')})).json();
  assert.equal((await shared(creator,'DELETE',{id:made.id,revision:1})).status,200);
  const refused=await shared(editor,'DELETE',{id:made.id,revision:2,...forever});assert.equal(refused.status,403);assert.match((await refused.json()).error,/permanently delete/);
  assert.equal(await count(db,'documents',made.id),1);
  assert.equal((await shared(admin,'DELETE',{id:made.id,revision:2,...forever})).status,200);
  assert.equal(await count(db,'documents',made.id),0);
  // Cross-site requests cannot delete.
  const cross=new Request('https://studio.example/api/documents?permanent=1',{method:'DELETE',headers:{'oai-authenticated-user-id':'alice','if-match':'3',origin:'https://evil.example'}});
  assert.equal((await documentApi(cross,db,id)).status,403);assert.equal(await count(db,'documents',id),1);
 }finally{db.close();}
});

test('single versions can be deleted without touching the file or other versions',async()=>{
 const db=cloudDatabase();try{
  const id=await fileWithHistory(db),other=await fileWithHistory(db);
  const list=async file=>(await(await versionApi(request('GET'),db,file)).json()).versions;
  const [named]=(await list(id)).filter(v=>v.label==='Named'),[foreign]=await list(other);
  // A version id from another file, another owner, or a malformed id deletes nothing.
  assert.equal((await versionApi(request('DELETE'),db,id,foreign.id)).status,404);
  assert.equal((await versionApi(request('DELETE',{owner:'bob'}),db,id,named.id)).status,404);
  assert.equal((await versionApi(request('DELETE'),db,id,'nope')).status,404);
  assert.equal((await list(id)).length,2);assert.equal((await list(other)).length,2);
  const response=await versionApi(request('DELETE'),db,id,named.id);assert.equal(response.status,200);assert.deepEqual(await response.json(),{id:named.id,deleted:true});
  assert.deepEqual((await list(id)).map(v=>v.label),['Automatic backup']);assert.equal((await list(other)).length,2);
  assert.equal((await versionApi(request('DELETE'),db,id,named.id)).status,404);
  const file=await(await documentApi(request('GET'),db,id)).json();assert.equal(JSON.parse(file.body).name,'Second');assert.equal(file.revision,2);
  // The restore route does not accept DELETE.
  assert.equal((await versionApi(request('DELETE'),db,id,(await list(id))[0].id,true)).status,405);assert.equal((await list(id)).length,1);
  // History of a file in Trash can still be trimmed.
  await documentApi(request('DELETE',{revision:2}),db,id);assert.equal((await versionApi(request('DELETE'),db,id,(await list(id))[0].id)).status,200);
 }finally{db.close();}
});

test('bulk deletion only removes automatic backups older than the given time',async()=>{
 const db=cloudDatabase();try{
  const id=await fileWithHistory(db),other=await fileWithHistory(db);
  db.exec(`UPDATE document_versions SET created_at=1000 WHERE document_id='${id}' AND kind='automatic'`);
  db.exec(`INSERT INTO document_versions(id,document_id,owner,name,body,body_bytes,label,revision,created_at,kind) SELECT '${randomUUID()}',document_id,owner,name,body,body_bytes,label,revision,5000,kind FROM document_versions WHERE document_id='${id}' AND kind='automatic'`);
  db.exec(`UPDATE document_versions SET created_at=1 WHERE document_id='${id}' AND kind<>'automatic'`);
  db.exec(`UPDATE document_versions SET created_at=1 WHERE document_id='${other}'`);
  const bulk=(query,options={})=>versionApi(request('DELETE',{query,...options}),db,id);
  for(const query of ['','?automatic=1','?before=2000','?automatic=1&before=abc','?automatic=1&before=-1','?automatic=0&before=2000'])assert.equal((await bulk(query)).status,400,query);
  assert.equal((await bulk('?automatic=1&before=2000',{owner:'bob'})).status,404);
  assert.equal(await count(db,'document_versions',id),3);
  assert.deepEqual(await(await bulk('?automatic=1&before=2000')).json(),{deleted:1});
  // The old named version and the newer automatic backup remain; the other file is untouched.
  const left=(await(await versionApi(request('GET'),db,id)).json()).versions;assert.deepEqual(left.map(v=>[v.label,v.created_at]),[['Automatic backup',5000],['Named',1]]);
  assert.equal(await count(db,'document_versions',other),2);
  assert.deepEqual(await(await bulk('?automatic=1&before=2000')).json(),{deleted:0});
 }finally{db.close();}
});

test('shared history can only be deleted by the creator or an administrator',async()=>{
 const db=cloudDatabase();try{
  const creator={userId:'creator',manage:false},editor={userId:'editor',manage:false},admin={userId:'admin',manage:true},owner='org:design';
  const {id}=await(await documentApi(request('POST',{owner,data:design('Shared')}),db,null,null,null,creator)).json();
  for(const label of ['One','Two','Three'])await versionApi(request('POST',{owner,revision:1,label}),db,id);
  const versions=(await(await versionApi(request('GET',{owner}),db,id)).json()).versions;
  const remove=(actor,version,query='')=>versionApi(request('DELETE',{owner,query}),db,id,version,false,null,null,null,null,actor);
  let response=await remove(editor,versions[0].id);assert.equal(response.status,403);assert.match((await response.json()).error,/delete saved versions/);
  assert.equal((await remove(editor,null,'?automatic=1&before=9999999999999')).status,403);
  assert.equal(await count(db,'document_versions',id),3);
  assert.equal((await remove(creator,versions[0].id)).status,200);assert.equal((await remove(admin,versions[1].id)).status,200);
  // A legacy shared file with no creator record is administrator-only.
  db.exec(`UPDATE documents SET created_by=NULL WHERE id='${id}'`);
  assert.equal((await remove(creator,versions[2].id)).status,403);assert.equal((await remove(admin,versions[2].id)).status,200);
 }finally{db.close();}
});

test('self-hosted permanent delete removes collaboration data and protects published libraries',async()=>{
 const f=await teamFixture();try{
  const {owner:a,designer:b,reviewer:c,path,query}=f,document={version:1,name:'Team project',shapes:[]};
  const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
  const id=ok(await a.call('/api/documents'+query,document),201).id,kept=ok(await a.call('/api/documents'+query,document),201).id;
  for(const file of [id,kept]){
   ok(await a.call(path(file,'/sharing')));
   ok(await c.call(path(file,'/comments'),{id:randomUUID(),body:'Looks right.',anchor:{x:1,y:2}}),201);
   ok(await a.call(path(file,'/versions'),undefined,{method:'POST',revision:1,headers:{'x-version-label':'Checkpoint'}}),201);
  }
  const rows=async file=>Object.fromEntries(await Promise.all(['document_versions','document_comments','document_collaboration'].map(async table=>[table,(await f.db.query(`SELECT COUNT(*) AS n FROM ${table} WHERE document_id=?`,[file]))[0].n])));
  assert.deepEqual(await rows(id),{document_versions:1,document_comments:1,document_collaboration:1});
  const permanent=path(id)+'&permanent=1';
  assert.equal((await a.call(permanent,undefined,{method:'DELETE',revision:1})).status,409);
  // A teammate who did not create the file cannot trash or permanently delete it.
  assert.equal((await b.call(path(id),undefined,{method:'DELETE',revision:1})).status,403);
  ok(await a.call(path(id),undefined,{method:'DELETE',revision:1}));
  assert.equal((await b.call(permanent,undefined,{method:'DELETE',revision:2})).status,403);
  // A published library source stays in Trash.
  await f.db.query('INSERT INTO component_libraries(id,owner,name,revision,policy,updated_at) VALUES(?,?,?,?,?,?)',[id,'org:'+f.org.id,'Team project',1,'{}',1],'run');
  let result=await a.call(permanent,undefined,{method:'DELETE',revision:2});assert.equal(result.status,409);assert.match(result.data.error,/published library/);
  assert.deepEqual(await rows(id),{document_versions:1,document_comments:1,document_collaboration:1});
  await f.db.query('DELETE FROM component_libraries WHERE id=?',[id],'run');
  assert.equal((await a.call(permanent,undefined,{method:'DELETE',revision:1})).status,409);
  result=ok(await a.call(permanent,undefined,{method:'DELETE',revision:2}));assert.deepEqual(result,{id,deleted:true});
  assert.deepEqual(await rows(id),{document_versions:0,document_comments:0,document_collaboration:0});
  assert.equal((await f.db.query('SELECT id FROM documents WHERE id=?',[id])).length,0);
  for(const table of ['team_notifications','live_versions','live_mutations','live_clients','document_edit_requests','document_reviews'])assert.equal((await f.db.query(`SELECT COUNT(*) AS n FROM ${table} WHERE document_id=?`,[id]))[0].n,0,table);
  // The other file keeps everything and still opens.
  assert.deepEqual(await rows(kept),{document_versions:1,document_comments:1,document_collaboration:1});
  assert.equal((await a.call(path(kept))).status,200);
  const trash=ok(await a.call('/api/documents'+query+'&trash=1'));assert.deepEqual(trash.documents,[]);
  // Teammates can read history but only the creator can delete a version.
  const version=ok(await b.call(path(kept,'/versions'))).versions[0];
  assert.equal((await b.call(path(kept,'/versions/'+version.id),undefined,{method:'DELETE'})).status,403);
  assert.deepEqual(ok(await a.call(path(kept,'/versions/'+version.id),undefined,{method:'DELETE'})),{id:version.id,deleted:true});
 }finally{await f.close();}
});
