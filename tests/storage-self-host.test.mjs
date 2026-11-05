import test from 'node:test';
import assert from 'node:assert/strict';
import {connectDatabase,migrateDocuments,databaseBodyStore} from '../server/database.mjs';
import {documentApi} from '../lib/documents.mjs';
import {storageUsage,sweepDatabaseBodies,REFERENCE_TABLES,SWEEP_GRACE_MS} from '../lib/document-storage.mjs';

// SQLite always runs. Set PIXL_TEST_POSTGRES_URL (a disposable database) to
// run the same checks against PostgreSQL.
const engines=[{name:'sqlite',config:{engine:'sqlite',sqlitePath:':memory:'}}];
if(process.env.PIXL_TEST_POSTGRES_URL)engines.push({name:'postgres',config:{engine:'postgres',databaseUrl:process.env.PIXL_TEST_POSTGRES_URL,databaseTLS:false}});
const hash=n=>String(n).repeat(64).slice(0,64),pointer=n=>'@pixlprfct-r2:'+hash(n),key=n=>'documents/'+hash(n);
const design=(name,size=0)=>JSON.stringify({version:1,name,shapes:[],...(size?{padding:'x'.repeat(size)}:{})});
async function reset(db,engine){
 if(engine==='postgres')for(const table of ['documents','document_versions','document_bodies','live_versions','live_mutations','live_clients','component_libraries','component_library_versions','document_collaboration','document_edit_requests','document_comments','library_release_notes','team_notifications','notification_preferences','document_reviews'])await db.query(`DROP TABLE IF EXISTS ${table}`,[],'run');
}

for(const {name,config} of engines){
 test(`${name}: migration adds byte counts and touch times to existing data`,async()=>{
  const db=await connectDatabase(config);try{
   await reset(db,config.engine);
   // The schema of releases before storage accounting.
   await db.query('CREATE TABLE documents (id VARCHAR(64) PRIMARY KEY,owner VARCHAR(191) NOT NULL,name VARCHAR(256) NOT NULL,body TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL,deleted_at BIGINT)',[],'run');
   await db.query('CREATE TABLE document_bodies (id VARCHAR(128) PRIMARY KEY,body TEXT NOT NULL)',[],'run');
   await db.query("INSERT INTO documents (id,owner,name,body,created_at,updated_at) VALUES ('a','user:1','Café','{\"name\":\"Café\"}',0,0)",[],'run');
   await db.query("INSERT INTO document_bodies (id,body) VALUES (?,'héllo')",[key(1)],'run');
   await migrateDocuments(db,config.engine);await migrateDocuments(db,config.engine);// repeatable
   const [doc]=await db.query("SELECT body_bytes FROM documents WHERE id='a'"),[body]=await db.query('SELECT bytes,touched_at FROM document_bodies');
   assert.equal(Number(doc.body_bytes),16);assert.equal(Number(body.bytes),6);assert.equal(Number(body.touched_at),0);
  }finally{await reset(db,config.engine);await db.close();}
 });

 test(`${name}: body writes refresh touch times and the sweep removes only old unreferenced bodies`,async()=>{
  const db=await connectDatabase(config);try{
   await reset(db,config.engine);await migrateDocuments(db,config.engine);
   let now=1_000_000;const store=databaseBodyStore(db,config.engine,()=>now),bytes=n=>new TextEncoder().encode('body '+n);
   for(const n of [1,2,3,4,5])await store.put(key(n),bytes(n));
   await store.put(key(5),bytes(5));// identical content again is fine
   now+=SWEEP_GRACE_MS+10;
   await store.put(key(4),bytes(4));// touched recently: kept although unreferenced
   await db.query("INSERT INTO documents (id,owner,name,body,body_bytes,created_at,updated_at) VALUES ('d','user:1','D',?,78,0,0)",[pointer(1)],'run');
   await db.query("INSERT INTO document_versions (id,document_id,owner,name,body,body_bytes,label,revision,created_at) VALUES ('v','d','user:1','D',?,78,'L',1,0)",[pointer(2)],'run');
   await db.query("INSERT INTO live_versions (id,document_id,owner,revision,body,body_bytes) VALUES ('d:1','d','user:1',1,?,78)",[pointer(3)],'run');
   const result=await sweepDatabaseBodies(db,{now,limit:2});
   assert.deepEqual(result,{deleted:1,freed:6});
   assert.deepEqual((await db.query('SELECT id FROM document_bodies ORDER BY id')).map(r=>r.id),[key(1),key(2),key(3),key(4)]);
   const usage=await storageUsage(db,'user:1',{tables:REFERENCE_TABLES.selfHosted,objects:'document_bodies'});
   assert.deepEqual(usage,{bytes:18,inlineBytes:0,objectBytes:18},'three referenced 6-byte bodies');
  }finally{await reset(db,config.engine);await db.close();}
 });

 test(`${name}: quotas apply through the shared document API`,async()=>{
  const db=await connectDatabase(config);try{
   await reset(db,config.engine);await migrateDocuments(db,config.engine);
   const bodies=databaseBodyStore(db,config.engine),storage={quota:2_000_000,tables:REFERENCE_TABLES.selfHosted,objects:'document_bodies'};
   const request=(method,data,revision=1)=>new Request('https://studio.example/api/documents',{method,headers:{'oai-authenticated-user-id':'user:1','if-match':String(revision),...(data?{'content-type':'application/json'}:{})},...(data?{body:data}:{})});
   const created=await documentApi(request('POST',design('Large',1_600_000)),db,null,bodies,null,null,storage);assert.equal(created.status,201);
   const [row]=await db.query('SELECT body,body_bytes FROM documents');assert.match(row.body,/^@pixlprfct-r2:/);assert.equal(Number(row.body_bytes),row.body.length);
   assert.equal((await documentApi(request('POST',design('Second',600_000)),db,null,bodies,null,null,storage)).status,507);
   assert.equal((await documentApi(request('POST',design('Small')),db,null,bodies,null,null,storage)).status,201);
  }finally{await reset(db,config.engine);await db.close();}
 });
}
