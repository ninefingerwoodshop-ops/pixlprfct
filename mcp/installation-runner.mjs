// Fixed, isolated operator actions. Never accepts shell text or credentials in argv.
import {readConfig} from '../server/config.mjs';
import {connectDatabase,migrateDocuments} from '../server/database.mjs';
import {createAuth,migrateAuth,smtpOptions} from '../server/auth.mjs';
import {startServer} from '../server/index.mjs';
import {backup,restoreDrill} from '../scripts/self-host/backup.mjs';
import nodemailer from 'nodemailer';
import {readdir,lstat,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const [action,destination]=process.argv.slice(2);
let db,instance;
try{
 const config=readConfig();
 if(action==='serve'){
  instance=await startServer({...config,webRoot:fileURLToPath(new URL('../web',import.meta.url))});
  process.send?.({ready:true});
  let closing=false;const close=async()=>{if(closing)return;closing=true;await instance.close();process.exit(0);};
  for(const signal of ['SIGINT','SIGTERM','disconnect'])process.on(signal,close);
 }else{
  let result;
  if(action==='migrate'||action==='database'){
   db=await connectDatabase(config);await db.query('SELECT 1 AS connected');
   if(action==='migrate'){await migrateAuth(createAuth(config,db,undefined,{migrating:true}));await migrateDocuments(db,config.engine);}
   let initialized=true;try{await db.query('SELECT id FROM documents LIMIT 1');}catch{initialized=false;}
   result={connected:true,initialized,engine:config.engine};
  }else if(action==='mail'){
   if(!config.smtpUrl)result={configured:false,verified:false,mode:'private local outbox'};
   else{const transport=nodemailer.createTransport(smtpOptions(config));try{await transport.verify();result={configured:true,verified:true,deliveryTested:false};}finally{transport.close();}}
  }else if(action==='backups'){let names=[];try{names=await readdir('./data/backups');}catch(error){if(error.code!=='ENOENT')throw error;}result={backups:names.filter(id=>/^mcp-[a-f0-9-]{36}$/.test(id)).slice(-100).map(id=>({id}))};}
  else if(action==='backup')result=await backup(config,destination);
  else if(action==='verify_backup'){
   if(path.resolve(path.dirname(destination))!==path.resolve('data/backups')||!/^mcp-[a-f0-9-]{36}$/.test(path.basename(destination)))throw new Error('Invalid backup location.');
   if((await lstat(destination)).isSymbolicLink())throw new Error('Invalid backup location.');
   const manifest=JSON.parse(await readFile(path.join(destination,'manifest.json'),'utf8'));if(!['database.sqlite','database.dump'].includes(manifest.file))throw new Error('Invalid backup file.');
   for(const name of ['manifest.json','auth-secret',manifest.file])if((await lstat(path.join(destination,name))).isSymbolicLink())throw new Error('Invalid backup file.');
   result=await restoreDrill(destination);
  }
  else throw new Error('Unsupported operation.');
  await db?.close();db=null;console.log(JSON.stringify(result));
 }
}catch{
 // Drivers and transports can put credentials in their errors. Keep them out of MCP.
 await db?.close().catch(()=>{});
 process.send?.({failed:true});console.error('Installation operation failed. Check configuration, service availability, TLS, and permissions.');process.exitCode=1;
}
