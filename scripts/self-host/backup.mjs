import {execFile as exec} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,readFile,stat,chmod,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readConfig} from '../../server/config.mjs';
import {connectDatabase,postgresPoolOptions} from '../../server/database.mjs';
const execute=promisify(exec);
const execFile=(name,args,options)=>execute(process.env.PIXL_POSTGRES_BIN?path.join(process.env.PIXL_POSTGRES_BIN,name):name,args,options);
const digest=value=>createHash('sha256').update(value).digest('hex');
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&!(v instanceof Date)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const cleanEnv=()=>Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')&&key!=='DATABASE_URL'));
function postgresEnv(config){const u=new URL(config.databaseUrl);return {...cleanEnv(),PGHOST:u.hostname,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGSSLMODE:config.databaseTLS===false?'disable':'verify-full',...(config.databaseCAFile?{PGSSLROOTCERT:config.databaseCAFile}:{}),PGCONNECT_TIMEOUT:'15'};}
export async function fingerprint(client,schema){
 const {rows:tables}=await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type=$2 ORDER BY table_name',[schema,'BASE TABLE']),result={};
 for(const {table_name:name} of tables){const {rows}=await client.query(`SELECT * FROM ${quote(schema)}.${quote(name)}`);result[name]={rows:rows.length,sha256:digest(rows.map(stable).sort().join('\n'))};}
 return result;
}
export async function backup(config,destination){
 if(!['sqlite','postgres'].includes(config.engine))throw new Error('Use a consistent provider snapshot for MySQL. This command supports SQLite and PostgreSQL.');
 const folder=path.resolve(destination);await mkdir(folder,{mode:0o700});await chmod(folder,0o700);
 const manifest={format:'pixlprfct-backup',version:1,engine:config.engine,createdAt:new Date().toISOString(),schema:config.databaseSchema??'public'};
 if(config.engine==='sqlite'){
  const db=await connectDatabase(config);try{await db.query('VACUUM INTO ?',[path.join(folder,'database.sqlite')],'run');}finally{await db.close();}
  manifest.file='database.sqlite';
 }else{
  const {Client}=await import('pg'),client=new Client(await postgresPoolOptions(config));await client.connect();
  try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const {rows}=await client.query('SELECT pg_export_snapshot() AS snapshot');
   await execFile('pg_dump',['--format=custom','--no-owner','--no-acl','--schema='+manifest.schema,'--snapshot='+rows[0].snapshot,'--file='+path.join(folder,'database.dump')],{env:postgresEnv(config),maxBuffer:1024*1024,timeout:300000});
   manifest.tables=await fingerprint(client,manifest.schema);await client.query('COMMIT');
  }finally{await client.end();}manifest.file='database.dump';
 }
 const file=path.join(folder,manifest.file);await chmod(file,0o600);manifest.sha256=digest(await readFile(file));manifest.bytes=(await stat(file)).size;
 await writeFile(path.join(folder,'auth-secret'),config.secret+'\n',{mode:0o600,flag:'wx'});
 await writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
 return {folder,engine:manifest.engine,bytes:manifest.bytes,tables:Object.keys(manifest.tables??{}).length};
}
export async function restoreDrill(folder,{port=55439}={}){
 folder=path.resolve(folder);const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
 if(manifest.format!=='pixlprfct-backup'||manifest.version!==1||!['database.dump','database.sqlite'].includes(manifest.file))throw new Error('Unsupported backup manifest.');
 const archive=path.join(folder,manifest.file);if(digest(await readFile(archive))!==manifest.sha256)throw new Error('Backup checksum does not match.');
 if((await readFile(path.join(folder,'auth-secret'),'utf8')).trim().length<32)throw new Error('Backup is missing its stable authentication secret.');
 if(manifest.engine==='sqlite'){const {DatabaseSync}=await import('node:sqlite'),db=new DatabaseSync(archive,{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('SQLite integrity check failed.');const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();const result={engine:'sqlite',verifiedAt:new Date().toISOString(),integrity:'ok',tables:tables.length,documents:db.prepare('SELECT COUNT(*) AS n FROM documents').get().n};await writeFile(path.join(folder,'restore-proof.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});return result;}finally{db.close();}}
 if(manifest.engine!=='postgres')throw new Error('Unsupported restore engine.');
 const dir=await mkdtemp(path.join(tmpdir(),'pixl-restore-')),data=path.join(dir,'data'),env={...cleanEnv(),PGHOST:dir,PGPORT:String(port),PGUSER:process.env.USER,PGDATABASE:'postgres',PGSSLMODE:'disable'};await chmod(dir,0o700);let started=false;
 try{
  await execFile('initdb',['-D',data,'--auth-local=trust','--auth-host=scram-sha-256','--no-locale','--encoding=UTF8'],{env,timeout:60000});
  await execFile('pg_ctl',['-D',data,'-l',path.join(dir,'postgres.log'),'-o',`-k ${dir} -h '' -p ${port}`,'-w','start'],{env,timeout:60000});started=true;
  await execFile('pg_restore',['--exit-on-error','--no-owner','--no-acl','--dbname=postgres',archive],{env,timeout:300000,maxBuffer:1024*1024});
  const {Client}=await import('pg'),client=new Client({host:dir,port,user:env.PGUSER,database:'postgres'});await client.connect();let actual;
  try{actual=await fingerprint(client,manifest.schema);}finally{await client.end();}
  if(stable(actual)!==stable(manifest.tables))throw new Error('Restored table counts or data hashes differ from the consistent source snapshot.');
  const result={engine:'postgres',verifiedAt:new Date().toISOString(),tables:Object.keys(actual).length,documents:actual.documents?.rows??0,allTableHashesMatch:true,isolated:true};
  await writeFile(path.join(folder,'restore-proof.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});return result;
 }finally{if(started)await execFile('pg_ctl',['-D',data,'-m','fast','-w','stop'],{env,timeout:60000});await rm(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [action,folder]=process.argv.slice(2);
 try{if(!folder||!['create','verify'].includes(action))throw new Error('Usage: backup.mjs create|verify /absolute/backup-folder');console.log(JSON.stringify(action==='create'?await backup(readConfig(),folder):await restoreDrill(folder),null,2));}
 catch(error){console.error(error.code?'Backup operation failed ('+error.code+'). Check local tool availability and database permissions.':error.message);process.exitCode=1;}
}
