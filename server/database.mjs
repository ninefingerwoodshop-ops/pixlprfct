import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
export function postgresSQL(query) {
  let index = 0;
  return query.replace(/\b(organizationId|userId|teamId|teamMember)\b/g, '"$1"').replace(/instr\(lower\(name\),lower\(\?\)\)/g, 'strpos(lower(name),lower(?))').replace(/\?/g, () => '$' + (++index));
}
const numbers = row => row && Object.fromEntries(Object.entries(row).map(([key,value]) => [key, /^(revision|created_at|updated_at|deleted_at)$/.test(key) && value !== null ? Number(value) : value]));
export async function postgresPoolOptions(config){
  const parsed=new URL(config.databaseUrl);
  // URL SSL parameters override node-postgres's ssl object. Keep certificate
  // verification under server configuration, including for custom provider CAs.
  for(const key of [...parsed.searchParams.keys()])if(key.startsWith('ssl'))parsed.searchParams.delete(key);
  const ca=config.databaseCAFile?await readFile(config.databaseCAFile,'utf8'):undefined;
  return {connectionString:parsed.href,max:10,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,
    ssl:config.databaseTLS===false&&!ca?false:{rejectUnauthorized:true,...(ca?{ca}:{})},
    ...(config.databaseSchema?{onConnect:async client=>{
      // Session poolers can discard startup options. Set and verify the schema
      // before the pool gives a connection to auth, migrations, or documents.
      await client.query('SELECT set_config($1,$2,false)',['search_path',config.databaseSchema]);
      const {rows}=await client.query('SELECT current_schema() AS schema');
      if(rows[0]?.schema!==config.databaseSchema)throw new Error('The configured database schema is missing or inaccessible.');
    }}:{}),
  };
}
export async function connectDatabase(config) {
  let connection, query, close, batch;
  if (config.engine === 'sqlite') {
    const {DatabaseSync} = await import('node:sqlite');
    if (config.sqlitePath !== ':memory:') await mkdir(path.dirname(config.sqlitePath), {recursive:true,mode:0o700});
    connection = new DatabaseSync(config.sqlitePath);
    connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const execute = (sql, args, mode) => { const statement=connection.prepare(sql); return mode==='all'?statement.all(...args):{changes:Number(statement.run(...args).changes)}; };
    query = async (sql,args=[],mode='all') => execute(sql,args,mode);
    batch = async statements => { connection.exec('BEGIN IMMEDIATE'); try { const result=statements.map(s=>({meta:execute(s.sql,s.args,'run')}));connection.exec('COMMIT');return result; } catch(error) {connection.exec('ROLLBACK');throw error;} };
    close = async () => connection.close();
  } else if (config.engine === 'postgres') {
    const {Pool} = await import('pg');
    connection = new Pool(await postgresPoolOptions(config));
    const execute = async (client,sql,args,mode) => {const result=await client.query(postgresSQL(sql),args);return mode==='all'?result.rows.map(numbers):{changes:result.rowCount};};
    query = (sql,args=[],mode='all') => execute(connection,sql,args,mode);
    batch = async statements => {const client=await connection.connect();try{await client.query('BEGIN');const result=[];for(const s of statements)result.push({meta:await execute(client,s.sql,s.args,'run')});await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}};
    close=()=>connection.end();
  } else {
    const {createPool} = await import('mysql2');
    const parsed=new URL(config.databaseUrl);parsed.search='';
    connection = createPool({uri:parsed.href,connectionLimit:10,connectTimeout:10000,supportBigNumbers:true,bigNumberStrings:true,...(config.databaseTLS!==false?{ssl:{rejectUnauthorized:true}}:{})});
    const pool=connection.promise();
    const execute=async(client,sql,args,mode)=>{const [result]=await client.execute(sql.replaceAll('"user"','`user`'),args);return mode==='all'?result.map(numbers):{changes:result.affectedRows};};
    query=(sql,args=[],mode='all')=>execute(pool,sql,args,mode);
    batch=async statements=>{const client=await pool.getConnection();try{await client.beginTransaction();const results=[];for(const s of statements)results.push({meta:await execute(client,s.sql,s.args,'run')});await client.commit();return results;}catch(error){await client.rollback();throw error;}finally{client.release();}};
    close=()=>pool.end();
  }
  const db={connection,query,close,batch,prepare(sql){return{bind(...args){return{sql,args,all:async()=>({results:await query(sql,args)}),first:async()=>(await query(sql,args))[0]??null,run:async()=>({meta:await query(sql,args,'run')})};}};}};
  return db;
}
export async function migrateDocuments(db, engine) {
  const text=engine==='mysql'?'LONGTEXT':'TEXT';
  // Additive, repeatable bootstrap. Existing designs and revisions are never replaced.
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS documents (id VARCHAR(64) PRIMARY KEY,owner VARCHAR(191) NOT NULL,name VARCHAR(256) NOT NULL,body ${text} NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL,deleted_at BIGINT)`,
    `CREATE TABLE IF NOT EXISTS document_versions (id VARCHAR(64) PRIMARY KEY,document_id VARCHAR(64) NOT NULL,owner VARCHAR(191) NOT NULL,name VARCHAR(256) NOT NULL,body ${text} NOT NULL,label VARCHAR(256) NOT NULL,revision INTEGER NOT NULL,created_at BIGINT NOT NULL,kind VARCHAR(16) NOT NULL DEFAULT 'named')`,
    `CREATE TABLE IF NOT EXISTS component_libraries (id VARCHAR(64) PRIMARY KEY,owner VARCHAR(191) NOT NULL,name VARCHAR(256) NOT NULL,revision INTEGER NOT NULL,policy ${text} NOT NULL,updated_at BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS component_library_versions (id VARCHAR(96) PRIMARY KEY,library_id VARCHAR(64) NOT NULL,owner VARCHAR(191) NOT NULL,name VARCHAR(256) NOT NULL,body ${text} NOT NULL,revision INTEGER NOT NULL,created_at BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS document_bodies (id VARCHAR(128) PRIMARY KEY,body ${text} NOT NULL)`,
  ]) await db.query(sql,[],'run');
  const columns=engine==='sqlite'?await db.query('PRAGMA table_info(documents)'):engine==='mysql'?await db.query('SHOW COLUMNS FROM documents'):await db.query("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='documents'");
  if(!columns.some(column=>(column.name??column.Field)==='created_by'))await db.query('ALTER TABLE documents ADD COLUMN created_by VARCHAR(191)',[],'run');
  // A personal file has an unambiguous creator. Historical shared files have
  // no creator evidence and remain admin-only; never assign the last editor.
  await db.query("UPDATE documents SET created_by=substr(owner,6) WHERE created_by IS NULL AND owner LIKE 'user:%'",[],'run');
  for (const [name,table,columns] of [['documents_owner_updated','documents','owner,updated_at'],['versions_document_created','document_versions','document_id,created_at,id']]) {
    if (engine==='mysql') { const indexes=await db.query(`SHOW INDEX FROM ${table} WHERE Key_name=?`,[name]);if(!indexes.length)await db.query(`CREATE INDEX ${name} ON ${table} (${columns})`,[],'run'); }
    else await db.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${columns})`,[],'run');
  }
}
export function databaseBodyStore(db,engine){
  return {
    async put(id,bytes){
      const prefix=engine==='mysql'?'INSERT IGNORE':engine==='sqlite'?'INSERT OR IGNORE':'INSERT';
      await db.query(`${prefix} INTO document_bodies (id,body) VALUES (?,?)${engine==='postgres'?' ON CONFLICT (id) DO NOTHING':''}`,[id,new TextDecoder('utf-8',{fatal:true}).decode(bytes)],'run');
    },
    async get(id){const [row]=await db.query('SELECT body FROM document_bodies WHERE id=?',[id]);return row?{text:async()=>row.body}:null;},
  };
}
