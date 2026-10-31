import {mkdir,readFile,writeFile,lstat,realpath,rename,unlink,readdir,open,link} from 'node:fs/promises';
import {constants} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readConfig,providers} from '../server/config.mjs';

const source=fileURLToPath(new URL('..',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const secretKeys=['DATABASE_URL','SMTP_URL','BETTER_AUTH_SECRET'];
const configKeys=['PIXL_DEPLOYMENT','PIXL_APP_URL','PIXL_DATABASE_PROVIDER','PIXL_LOCAL_DEVELOPMENT','PIXL_ADMIN_EMAIL','PIXL_REGISTRATION','PORT','HOST','PIXL_SQLITE_PATH','PIXL_DATABASE_SCHEMA','PIXL_DATABASE_CA_FILE','PIXL_BACKUPS','PIXL_BACKUP_DIRECTORY','PIXL_POSTGRES_BIN','SMTP_FROM',...secretKeys];
const failure='Operation failed. Check service availability, credentials, TLS, and file permissions. Raw service output is withheld because it can contain secrets.';
const quote=value=>{if(/[\r\n\0"`]/.test(value))throw new Error('Configuration values cannot contain line breaks, double quotes, or backticks. URL-encode credentials.');const result=value.includes("'")?'"'+value+'"':"'"+value+"'";if(parseEnv('VALUE='+result).VALUE!==value)throw new Error('This configuration value cannot round-trip safely. URL-encode credentials.');return result;};
const encode=env=>Object.entries(env).map(([key,value])=>{if(!/^[A-Z][A-Z0-9_]*$/.test(key))throw new Error('Invalid configuration key.');return key+'='+quote(value);}).join('\n')+'\n';

export async function createInstallationManager({directory,environment=process.env}={}){
 let root=null,service=null,closed=false,active=null;
 const plans=new Map(),jobs=new Map();
 if(directory&&!path.isAbsolute(directory))throw new Error('Use an absolute installation directory in the MCP launch configuration.');
 if(directory){await mkdir(directory,{recursive:true,mode:0o700});root=await realpath(directory);}
 const enabled=()=>{if(!root)throw new Error('Installation access is disabled. Add --installation /absolute/team-server-directory to the MCP launch configuration.');if(closed)throw new Error('Installation manager is closed.');};
 async function file(name,{missing=false,directory=false}={}){
  enabled();const parts=name.split('/');let current=root;
  if(path.isAbsolute(name)||parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')))throw new Error('Use a path inside the installation.');
  for(let i=0;i<parts.length;i++){current=path.join(current,parts[i]);try{const s=await lstat(current);if(s.isSymbolicLink()||(!s.isDirectory()&&i<parts.length-1))throw new Error('Installation paths cannot traverse symlinks.');if(i===parts.length-1&&(!directory&&!s.isFile()||directory&&!s.isDirectory()))throw new Error('Unexpected installation file type.');}catch(error){if(error.code!=='ENOENT'||!missing)throw error;}}
  return current;
 }
 async function read(){
  const filename=await file('.env.selfhost',{missing:true});
  try{const handle=await open(filename,constants.O_RDONLY|constants.O_NOFOLLOW);try{const s=await handle.stat();if(s.size>65536||s.nlink!==1||(process.platform!=='win32'&&(s.mode&0o077)))throw new Error('Configuration must be a private regular file (chmod 600), at most 64 KiB, without hard links.');const raw=await handle.readFile('utf8');return {raw,env:parseEnv(raw),revision:hash(raw)};}finally{await handle.close();}}
  catch(error){if(error.code==='ENOENT')return {raw:null,env:{},revision:'unconfigured'};throw error;}
 }
 async function lock(){const filename=await file('.pixl-setup.lock',{missing:true});try{await writeFile(filename,String(process.pid),{flag:'wx',mode:0o600});}catch(error){if(error.code==='EEXIST')throw new Error('Another installation operation holds the lock. Wait for it to finish; inspect a stale lock locally after a crash.');throw error;}return ()=>unlink(filename);}
 function summary(env){let url=null;try{url=new URL(env.PIXL_APP_URL).origin;}catch{}return {deployment:env.PIXL_DEPLOYMENT||'native',mode:env.PIXL_LOCAL_DEVELOPMENT==='true'?'local':'team',url,provider:env.PIXL_DATABASE_PROVIDER,administratorEmail:env.PIXL_ADMIN_EMAIL,registration:env.PIXL_REGISTRATION,port:Number(env.PORT||4174),backups:env.PIXL_BACKUPS==='true',credentials:Object.fromEntries(secretKeys.map(key=>[key,!!env[key]])),mailSender:env.SMTP_FROM||null};}
 function childEnv(env){return {...Object.fromEntries(['PATH','HOME','USER','TMPDIR','SYSTEMROOT','NODE_EXTRA_CA_CERTS','DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG'].filter(k=>environment[k]).map(k=>[k,environment[k]])),...Object.fromEntries(configKeys.filter(k=>env[k]!==undefined).map(k=>[k,env[k]]))};}
 async function preparePaths(){for(const name of ['data','data/backups']){const target=await file(name,{missing:true,directory:true});await mkdir(target,{recursive:true,mode:0o700});}}
 async function state(){
  if(!root)return {enabled:false,enable:'Add --installation /absolute/team-server-directory to this MCP server configuration.',guide:'pixlprfct_reference topic installation',publisherServicesRequired:false};
  const current=await read();let valid=true;if(current.raw)try{readConfig(current.env);}catch{valid=false;}
  return {enabled:true,directory:root,configured:current.raw!==null,valid:!!current.raw&&valid,revision:current.revision,settings:current.raw?summary(current.env):null,service:{kind:current.env.PIXL_DEPLOYMENT||'native',running:current.env.PIXL_DEPLOYMENT==='docker'?null:!!service,ownership:current.env.PIXL_DEPLOYMENT==='docker'?'Docker daemon; use health to verify readiness':service?'this MCP session':null,lifetime:'Native trial stops when this MCP server stops. Docker services persist.'},jobs:[...jobs.values()],next:current.raw?'Follow the deploymentActions in a setup plan, then create and verify the first administrator account.':'Plan a local SQLite trial or a team HTTPS installation. Each team supplies its own services.'};
 }
 async function plan(settings={}){
  enabled();const current=await read(),env={...current.env},missing=[];
  const local=settings.mode?settings.mode==='local':env.PIXL_LOCAL_DEVELOPMENT!=='false';
  const provider=settings.provider??env.PIXL_DATABASE_PROVIDER??'sqlite';if(!providers[provider])throw new Error('Choose a supported database provider.');
  Object.assign(env,{PIXL_DEPLOYMENT:settings.deployment??env.PIXL_DEPLOYMENT??(current.raw?'native':local?'native':'docker'),PIXL_LOCAL_DEVELOPMENT:String(local),PIXL_DATABASE_PROVIDER:provider,PIXL_APP_URL:settings.url??env.PIXL_APP_URL??'http://127.0.0.1:4174',PIXL_ADMIN_EMAIL:settings.administratorEmail??env.PIXL_ADMIN_EMAIL??'',PIXL_REGISTRATION:settings.registration??env.PIXL_REGISTRATION??'open',PORT:String(settings.port??env.PORT??4174),PIXL_SQLITE_PATH:env.PIXL_SQLITE_PATH??path.join(root,'data/pixlprfct.sqlite'),PIXL_BACKUPS:String(settings.backups??(env.PIXL_BACKUPS?env.PIXL_BACKUPS==='true':(providers[provider]==='sqlite'||providers[provider]==='postgres'&&(settings.deployment??env.PIXL_DEPLOYMENT??(local?'native':'docker'))!=='docker'))),PIXL_BACKUP_DIRECTORY:env.PIXL_BACKUP_DIRECTORY??path.join(root,'data/backups')});
  if(settings.databaseSchema!==undefined)env.PIXL_DATABASE_SCHEMA=settings.databaseSchema;
  if(settings.mailSender!==undefined)env.SMTP_FROM=settings.mailSender;
  if(settings.clearMail){delete env.SMTP_URL;delete env.SMTP_FROM;}
  for(const [field,key] of [['databaseUrlEnv','DATABASE_URL'],['smtpUrlEnv','SMTP_URL']])if(settings[field]){const ref=settings[field];if(!/^PIXL_SETUP_[A-Z0-9_]+$/.test(ref))throw new Error('Secret references must name a PIXL_SETUP_* environment variable configured in the MCP host.');if(!environment[ref])missing.push(ref);else env[key]=environment[ref];}
  if(providers[provider]!=='sqlite'&&!env.DATABASE_URL)missing.push('databaseUrlEnv');
  if(!env.PIXL_ADMIN_EMAIL)missing.push('administratorEmail');
  if(!local){if(!env.SMTP_URL)missing.push('smtpUrlEnv');if(!env.SMTP_FROM)missing.push('mailSender');}
  env.BETTER_AUTH_SECRET??=randomBytes(48).toString('base64url');
  let validationError=null;try{readConfig(env);encode(env);if(local&&Number(new URL(env.PIXL_APP_URL).port||80)!==Number(env.PORT))throw new Error('Local URL and listener port must match.');}catch{validationError='Configuration is incomplete or invalid. Use a valid site origin, administrator email, matching database URL, SMTP URL/sender for team mode, and supported port.';}
  if(current.raw&&env.PIXL_DEPLOYMENT!==(current.env.PIXL_DEPLOYMENT||'native'))validationError='Use a new installation directory for a different deployment type. Native and Docker storage must not be silently switched.';
  const warnings=[];if(env.PIXL_DEPLOYMENT==='docker')warnings.push('Requires Docker Compose. Data persists in a dedicated Docker volume, separate from native trial storage. The standard image provides SQLite backups. Use provider snapshots for PostgreSQL/MySQL. Private CA files require a custom deployment; the generated container does not mount host certificates.');if(local)warnings.push('Local trial binds to loopback and uses a private email outbox when SMTP is absent.');else warnings.push('The team must arrange DNS and an HTTPS reverse proxy to this server. This tool does not purchase hosting, register domains, or issue public certificates.');
  if(env.PIXL_DEPLOYMENT==='docker'&&env.PIXL_DATABASE_CA_FILE)validationError='The generated Docker deployment does not mount host CA files. Use a provider with a publicly trusted certificate or a separately managed container configuration.';
  if(env.PIXL_BACKUPS==='true'&&env.PIXL_DEPLOYMENT==='docker'&&providers[provider]==='postgres')validationError='The standard Docker image has no PostgreSQL backup utilities. Set backups false and use provider snapshots or a custom deployment.';
  if(env.PIXL_BACKUPS==='true'&&providers[provider]==='mysql'){validationError='Scheduled backups support SQLite and PostgreSQL. Set backups false and configure provider snapshots for MySQL/MariaDB.';}
  if(current.raw&&(env.PIXL_DATABASE_PROVIDER!==current.env.PIXL_DATABASE_PROVIDER||env.DATABASE_URL!==current.env.DATABASE_URL))warnings.push('Changing the database target does not move existing data. Back up and arrange data migration before switching.');
  const id=randomUUID(),ready=!missing.length&&!validationError;
  if(plans.size>=20)plans.delete(plans.keys().next().value);
  if(ready)plans.set(id,{env,revision:current.revision,expires:Date.now()+600000});
  return {planId:ready?id:null,ready,revision:current.revision,expiresInSeconds:600,settings:summary(env),missing:[...new Set(missing)],validationError,warnings,files:['.env.selfhost','compose.mcp.yaml'],deploymentActions:env.PIXL_DEPLOYMENT==='docker'?['docker_start','database','mail','health']:['database','migrate','mail','start','health'],next:ready?'Review the plan, then call installation_apply with planId and revision.':'Supply the missing settings or private environment references and plan again.'};
 }
 function compose(env){const config=readConfig(env);return JSON.stringify({'x-pixlprfct-managed':1,services:{app:{build:{context:source,dockerfile:'Dockerfile.selfhost'},environment:{...Object.fromEntries(configKeys.filter(key=>env[key]!==undefined).map(key=>[key,'${'+key+'}'])),HOST:'0.0.0.0',PIXL_SQLITE_PATH:'/app/data/pixlprfct.sqlite',PIXL_BACKUP_DIRECTORY:'/app/data/backups'},command:['node','scripts/self-host/container.mjs'],ports:[`127.0.0.1:${config.port}:${config.port}`],volumes:['pixlprfct-data:/app/data'],restart:'unless-stopped',init:true,security_opt:['no-new-privileges:true'],cap_drop:['ALL']}},volumes:{'pixlprfct-data':{}}},null,2)+'\n';}
 async function apply({planId,revision}){
  enabled();const pending=plans.get(planId);if(!pending||pending.expires<Date.now())throw new Error('Plan expired or not found. Create a fresh plan.');if(pending.revision!==revision)throw new Error('Revision does not match the plan.');if(service)throw new Error('Stop the native trial before changing its configuration.');
  const release=await lock();try{
   const current=await read();if(current.revision!==revision)throw new Error('Configuration changed. Create a fresh plan.');await preparePaths();
   const composeFile=await file('compose.mcp.yaml',{missing:true});
   let previous=null;try{previous=await readFile(composeFile,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
   // Only overwrite a Compose file previously generated by this operator.
   if(previous&&JSON.parse(previous)['x-pixlprfct-managed']!==1)throw new Error('compose.mcp.yaml already exists and is not an operator configuration.');
   const raw=encode(pending.env),temp=await file('.env.selfhost.'+randomUUID()+'.tmp',{missing:true});
   try{await writeFile(temp,raw,{flag:'wx',mode:0o600});
    if((await read()).revision!==revision)throw new Error('Configuration changed. Create a fresh plan.');
    if(current.raw!==null)await writeFile(await file('.env.selfhost.previous-'+randomUUID(),{missing:true}),current.raw,{flag:'wx',mode:0o600});
    if(current.raw===null)await link(temp,path.join(root,'.env.selfhost'));else await rename(temp,path.join(root,'.env.selfhost'));
   }finally{await unlink(temp).catch(()=>{});}
   await writeFile(composeFile,compose(pending.env),{mode:0o600});plans.delete(planId);
   return {...await state(),applied:true,restartRequired:true,accountURL:new URL('/account',pending.env.PIXL_APP_URL).href};
  }finally{await release();}
 }
 function run(command,args,{env,timeout=300000,ipc=false,capture=true}={}){
  const child=spawn(command,args,{cwd:root,env:childEnv(env),stdio:ipc?['ignore','pipe','pipe','ipc']:['ignore','pipe','pipe'],shell:false});let output='',overflow=false;
  child.stdout.on('data',chunk=>{if(!capture)return;if(output.length+chunk.length>65536)overflow=true;else output+=chunk;});child.stderr.resume();
  const promise=new Promise((resolve,reject)=>{const timer=timeout?setTimeout(()=>{child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),2000).unref();reject(new Error(failure));},timeout):null;child.once('error',()=>{clearTimeout(timer);reject(new Error(failure));});child.once('exit',code=>{clearTimeout(timer);if(code===0&&!overflow)resolve(output);else reject(new Error(failure));});});
  return {child,promise};
 }
 async function stop(){if(!service)return {stopped:false};const current=service;current.child.kill('SIGTERM');const kill=setTimeout(()=>current.child.kill('SIGKILL'),5000);try{await current.promise.catch(()=>{});}finally{clearTimeout(kill);}if(service===current)service=null;return {stopped:true};}
 async function start(env){
  if(service)return {running:true,lifetime:'MCP session'};
  const current=run(process.execPath,[path.join(source,'mcp/installation-runner.mjs'),'serve'],{env,timeout:0,ipc:true});service=current;current.promise.catch(()=>{}).finally(()=>{if(service===current)service=null;});
  try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(failure)),20000);current.child.on('message',message=>{if(message.ready){clearTimeout(timer);resolve();}if(message.failed){clearTimeout(timer);reject(new Error(failure));}});current.promise.then(()=>{clearTimeout(timer);reject(new Error(failure));},()=>{clearTimeout(timer);reject(new Error(failure));});});}
  catch(error){await stop();throw error;}
  return {running:true,url:env.PIXL_APP_URL,lifetime:'Native trial stops when this MCP session closes. Use docker_start for a persistent deployment.'};
 }
 async function dockerArgs(env){const composeFile=await file('compose.mcp.yaml');if(await readFile(composeFile,'utf8')!==compose(env))throw new Error('Compose configuration changed. Reapply a reviewed installation plan.');return ['compose','--project-name','pixl-'+hash(root).slice(0,12),'-f',composeFile];}
 async function operate({action,revision,backupId}){
  enabled();if(active)throw new Error('An installation job is already running. Check its status.');const current=await read();if(current.revision!==revision)throw new Error('Configuration changed. Read installation status first.');if(!current.raw)throw new Error('Configure the installation first.');const config=readConfig(current.env),docker=current.env.PIXL_DEPLOYMENT==='docker';
  if(docker&&config.engine!=='sqlite'&&['backup','verify_backup'].includes(action))throw new Error('The standard Docker image supports SQLite backups. Use consistent provider snapshots for this database.');
  if((docker&&['start','stop'].includes(action))||(!docker&&action.startsWith('docker_')))throw new Error('Use the startup operation matching the planned deployment type.');
  if(action==='start'&&!config.local)throw new Error('Native MCP startup is for local trials. Use docker_start or your server supervisor for a persistent team installation.');
  if(['migrate','docker_start','docker_stop'].includes(action)&&service)throw new Error('Stop the native trial before migrating or starting a persistent service.');
  let destination;if(action==='backup'){const id='mcp-'+randomUUID();if(docker)destination='/app/data/backups/'+id;else{await preparePaths();destination=await file('data/backups/'+id,{missing:true,directory:true});}}
  if(action==='verify_backup'){if(!/^mcp-[a-f0-9-]{36}$/.test(backupId??''))throw new Error('Choose a backupId from installation_backups.');if(docker)destination='/app/data/backups/'+backupId;else{destination=await file('data/backups/'+backupId,{directory:true});for(const name of ['manifest.json','auth-secret'])await file('data/backups/'+backupId+'/'+name);const manifest=JSON.parse(await readFile(path.join(destination,'manifest.json'),'utf8'));if(!['database.sqlite','database.dump'].includes(manifest.file))throw new Error('Invalid backup manifest.');await file('data/backups/'+backupId+'/'+manifest.file);}}
  const release=await lock();try{if((await read()).revision!==revision)throw new Error('Configuration changed. Read installation status first.');}catch(error){await release();throw error;}
  const id=randomUUID(),job={id,action,status:'running',startedAt:new Date().toISOString()};if(jobs.size>=30)jobs.delete(jobs.keys().next().value);jobs.set(id,job);active=id;
  const work=async()=>{
   if(action==='start')return start(current.env);if(action==='stop')return stop();
   if(action==='health'){const response=await fetch(new URL('/api/health',config.baseURL),{signal:AbortSignal.timeout(10000),redirect:'error'});const body=await response.json().catch(()=>null);return {reachable:true,status:response.status,ready:response.ok&&body?.status==='ready'};}
   if(action.startsWith('docker_')){
    const base=await dockerArgs(current.env);
    const steps=action==='docker_start'?[['build'],['stop'],['run','--rm','app','node','scripts/self-host/migrate.mjs'],['up','-d']]:[['stop']];
    for(const args of steps)await run('docker',[...base,...args],{env:current.env,timeout:1800000,capture:false}).promise;
    return {running:action==='docker_start',persistent:true,dataPreserved:true};
   }
   if(!['migrate','database','mail','backup','verify_backup'].includes(action))throw new Error('Unsupported operation.');
   const args=[action,...(destination?[destination]:[])];
   const result=await (docker?run('docker',[...await dockerArgs(current.env),'exec','-T','app','node','mcp/installation-runner.mjs',...args],{env:current.env}):run(process.execPath,[path.join(source,'mcp/installation-runner.mjs'),...args],{env:current.env})).promise;
   const value=JSON.parse(result.trim().split('\n').at(-1));return destination?{...value,backupId:path.basename(destination)}:value;
  };
  job.done=(async()=>{try{job.result=await work();job.status='succeeded';}catch{job.status='failed';job.error=failure;}finally{job.finishedAt=new Date().toISOString();try{await release();}catch{job.status='failed';job.error='Could not release the installation lock. Inspect it locally before retrying.';}active=null;}})();
  // Promise stays internal; status contains only serializable, redacted results.
  Object.defineProperty(job,'done',{enumerable:false,value:job.done});return {...job};
 }
 async function job({id}){enabled();const value=jobs.get(id);if(!value)throw new Error('Job not found in this MCP session. Inspect installation status before retrying.');return {...value};}
 async function backups(){enabled();const current=await read();if(current.env.PIXL_DEPLOYMENT==='docker'){const result=await run('docker',[...await dockerArgs(current.env),'exec','-T','app','node','mcp/installation-runner.mjs','backups'],{env:current.env}).promise;return JSON.parse(result.trim().split('\n').at(-1));}const folder=await file('data/backups',{missing:true,directory:true});let names=[];try{names=await readdir(folder);}catch(error){if(error.code!=='ENOENT')throw error;}return {backups:names.filter(name=>/^mcp-[a-f0-9-]{36}$/.test(name)).slice(-100).map(id=>({id})),scope:'Backups created by this MCP operator. Scheduled backups are reported in the app administrator view.'};}
 return {state,plan,apply,operate,job,backups,async close(){if(closed)return;await Promise.allSettled([...jobs.values()].map(j=>j.done));await stop();closed=true;}};
}
