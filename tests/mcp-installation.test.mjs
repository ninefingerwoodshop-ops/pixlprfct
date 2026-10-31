import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,stat,chmod,symlink,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {parseEnv} from 'node:util';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createInstallationManager} from '../mcp/installation.mjs';
const temporary=async t=>{const dir=await mkdtemp(path.join(tmpdir(),'pixl-install-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;};
const manager=async(t,options={})=>{const directory=await temporary(t),instance=await createInstallationManager({directory,...options});t.after(()=>instance.close());return {instance,directory};};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function done(instance,id){for(let i=0;i<400;i++){const job=await instance.job({id});if(job.status!=='running')return job;await wait(25);}throw new Error('Job did not finish.');}
async function apply(instance,settings={}){const plan=await instance.plan({administratorEmail:'owner@example.test',...settings});assert.equal(plan.ready,true,JSON.stringify(plan));return instance.apply(plan);}
async function freePort(){const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const {port}=server.address();await new Promise(resolve=>server.close(resolve));return port;}

test('installation access is explicit; planning redacts credentials and reports team-owned prerequisites',async t=>{
 const disabled=await createInstallationManager();assert.equal((await disabled.state()).enabled,false);await assert.rejects(disabled.plan(),/disabled/);
 const secret='test-SMTP-password',database='test-database-password',{instance,directory}=await manager(t,{environment:{...process.env,PIXL_SETUP_SMTP:`smtps://operator:${secret}@mail.example.test:465`,PIXL_SETUP_DB:`postgresql://operator:${database}@db.example.test/team`}});
 let plan=await instance.plan({mode:'team',url:'https://design.example.test',provider:'postgres'});assert.equal(plan.ready,false);assert.ok(plan.missing.includes('smtpUrlEnv'));assert.ok(plan.missing.includes('databaseUrlEnv'));
 plan=await instance.plan({mode:'team',url:'https://design.example.test',provider:'postgres',administratorEmail:'owner@example.test',mailSender:'PixlPrfct <mail@example.test>',smtpUrlEnv:'PIXL_SETUP_SMTP',databaseUrlEnv:'PIXL_SETUP_DB'});
 assert.equal(plan.ready,true);assert.equal(plan.settings.deployment,'docker');assert(!JSON.stringify(plan).includes(secret));assert(!JSON.stringify(plan).includes(database));
 const result=await instance.apply(plan),raw=await readFile(path.join(directory,'.env.selfhost'),'utf8');assert(raw.includes(secret));assert(raw.includes(database));assert.equal((await stat(path.join(directory,'.env.selfhost'))).mode&0o777,0o600);assert(!JSON.stringify(result).includes(secret));
 const compose=JSON.parse(await readFile(path.join(directory,'compose.mcp.yaml'),'utf8'));assert.deepEqual(compose.services.app.ports,['127.0.0.1:4174:4174']);assert.equal(compose.services.app.restart,'unless-stopped');assert(!JSON.stringify(compose).includes(secret));
 const invalid=await instance.plan({url:'https://secret:password@example.test'});assert.equal(invalid.ready,false);assert(!JSON.stringify(invalid).includes('password'));assert(!JSON.stringify(invalid).includes('secret:'));
 await assert.rejects(instance.plan({smtpUrlEnv:'HOME'}),/PIXL_SETUP/);
});

test('applying settings preserves auth secrets and detects conflicts across operator sessions',async t=>{
 const {instance,directory}=await manager(t);const first=await apply(instance);const original=parseEnv(await readFile(path.join(directory,'.env.selfhost'),'utf8'));
 const pending=await instance.plan({registration:'closed'}),other=await createInstallationManager({directory});t.after(()=>other.close());await apply(other,{backups:false});await assert.rejects(instance.apply(pending),/changed/);
 await apply(instance,{registration:'closed'});const current=parseEnv(await readFile(path.join(directory,'.env.selfhost'),'utf8'));assert.equal(current.BETTER_AUTH_SECRET,original.BETTER_AUTH_SECRET);assert.equal(current.PIXL_REGISTRATION,'closed');assert.equal(current.PIXL_BACKUPS,'false');assert.notEqual((await instance.state()).revision,first.revision);
 assert.ok((await readdir(directory)).some(name=>name.startsWith('.env.selfhost.previous-')));
 const change=await instance.plan({deployment:'docker'});assert.equal(change.ready,false);assert.match(change.validationError,/different deployment/);
 await writeFile(path.join(directory,'.pixl-setup.lock'),'other',{mode:0o600});await assert.rejects(instance.apply(await instance.plan({backups:true})),/holds the lock/);await rm(path.join(directory,'.pixl-setup.lock'));
});

test('configuration and backup paths reject symlinks, public secrets, shell interpolation and stale writes',async t=>{
 const {instance,directory}=await manager(t);await apply(instance);const file=path.join(directory,'.env.selfhost');await chmod(file,0o644);await assert.rejects(instance.state(),/private/);await chmod(file,0o600);
 const outside=await temporary(t);await rm(file);await writeFile(path.join(outside,'env'),'outside',{mode:0o600});await symlink(path.join(outside,'env'),file);await assert.rejects(instance.state(),/symlinks/);assert.equal(await readFile(path.join(outside,'env'),'utf8'),'outside');await rm(file);
 const blocked=await instance.plan({mailSender:'$(touch /tmp/should-not-execute)\nSMTP_URL="evil"'});assert.equal(blocked.ready,false);
 await apply(instance);const revision=(await instance.state()).revision;await assert.rejects(instance.operate({action:'database',revision:'old'}),/changed/);await assert.rejects(instance.operate({action:'verify_backup',revision,backupId:'../../outside'}),/backupId/);
 await rm(path.join(directory,'data/backups'),{recursive:true});await symlink(outside,path.join(directory,'data/backups'));await assert.rejects(instance.operate({action:'backup',revision}),/symlinks/);
});

test('operation failures are redacted, release locks, and do not silently claim verification',async t=>{
 const {instance,directory}=await manager(t,{environment:{...process.env,PIXL_SETUP_SMTP:'smtp://operator:fake-secret-123@127.0.0.1:1'}});await apply(instance,{smtpUrlEnv:'PIXL_SETUP_SMTP',mailSender:'owner@example.test',backups:false});
 const revision=(await instance.state()).revision,started=await instance.operate({action:'mail',revision});const result=await done(instance,started.id);assert.equal(result.status,'failed');assert(!JSON.stringify(result).includes('fake-secret-123'));assert(!JSON.stringify(result).includes('smtp://'));await assert.rejects(stat(path.join(directory,'.pixl-setup.lock')),{code:'ENOENT'});
 const check=await instance.operate({action:'database',revision});assert.equal((await done(instance,check.id)).status,'succeeded');
});

test('standard MCP client provisions a local installation, verifies a synthetic administrator, preserves data across restart and checks backup recovery',async t=>{
 const directory=await temporary(t),workspace=path.join(directory,'projects'),installation=path.join(directory,'installation'),port=await freePort(),url=`http://127.0.0.1:${port}`;
 let client;
 const connect=async()=>{client=new Client({name:'setup-acceptance',version:'1.0'});await client.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve('mcp/server.mjs'),'--workspace',workspace,'--installation',installation,'--no-live'],stderr:'pipe'}));};
 await connect();t.after(()=>client.close());
 const call=async(name,args={})=>{const response=await client.callTool({name:'pixlprfct_'+name,arguments:args});assert.equal(response.isError,undefined,JSON.stringify(response.content));return response.structuredContent??JSON.parse(response.content[0].text);};
 const operation=async action=>{const revision=(await call('installation_status')).revision,{id}=await call('installation_run',{action,revision});for(let i=0;i<400;i++){const job=await call('installation_job',{id});if(job.status!=='running'){assert.equal(job.status,'succeeded',JSON.stringify(job));return job.result;}await wait(25);}throw new Error('MCP job timed out.');};
 assert.equal((await call('installation_status')).configured,false);assert.match((await client.getPrompt({name:'setup-team',arguments:{brief:'Local SQLite trial'}})).messages[0].content.text,/installation_plan/);
 const plan=await call('installation_plan',{mode:'local',url,port,administratorEmail:'owner@example.test',backups:false});assert.equal(plan.ready,true);await call('installation_apply',{planId:plan.planId,revision:plan.revision});
 assert.equal((await operation('database')).initialized,false);assert.equal((await operation('migrate')).initialized,true);assert.equal((await operation('migrate')).initialized,true);assert.equal((await operation('mail')).configured,false);await operation('start');assert.equal((await operation('health')).ready,true);
 assert.equal((await fetch(url+'/editor/index.html')).status,200,'static root resolves independently of MCP cwd');
 const cookies=new Map();const request=async(route,body)=>{const response=await fetch(url+route,{method:body?'POST':'GET',headers:{origin:url,'content-type':'application/json',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual'});for(const cookie of response.headers.getSetCookie()){const [key,...value]=cookie.split(';')[0].split('=');cookies.set(key,value.join('='));}return {status:response.status,data:await response.json().catch(()=>null)};};
 assert.equal((await request('/api/auth/sign-up/email',{email:'owner@example.test',name:'Synthetic owner',password:'synthetic-local-password-only',callbackURL:url+'/account'})).status,200);
 assert.equal((await request('/api/workspaces')).status,401);
 const outbox=path.join(installation,'data/outbox'),mail=JSON.parse(await readFile(path.join(outbox,(await readdir(outbox))[0]),'utf8')),verify=new URL(mail.text.match(/https?:\/\/\S+/)[0]);assert.ok([200,302].includes((await request(verify.pathname+verify.search)).status));
 assert.equal((await request('/api/workspaces')).status,200);const organization=await request('/api/auth/organization/create',{name:'Synthetic studio',slug:'synthetic-studio'});assert.equal(organization.status,200);const project=await request('/api/documents',{version:1,name:'Preserve this project',shapes:[]});assert.equal(project.status,201);
 assert.equal((await request('/api/installation/check',{})).status,200);
 const backup=await operation('backup');assert.match(backup.backupId,/^mcp-/);assert.ok((await call('installation_backups')).backups.some(b=>b.id===backup.backupId));
 const run=await call('installation_run',{action:'verify_backup',revision:(await call('installation_status')).revision,backupId:backup.backupId});let verified;for(let i=0;i<400;i++){verified=await call('installation_job',{id:run.id});if(verified.status!=='running')break;await wait(25);}assert.equal(verified.status,'succeeded',JSON.stringify(verified));assert.equal(verified.result.integrity,'ok');assert.equal(verified.result.documents,1);
 await operation('stop');await assert.rejects(fetch(url+'/api/health'));await client.close();await connect();assert.equal((await call('installation_status')).configured,true);await operation('start');assert.equal((await request('/api/documents/'+project.data.id)).data.name,'Preserve this project');assert.equal((await request('/api/workspaces')).status,200,'stable secret preserves login');
 await client.close();for(let i=0;i<100;i++){try{await fetch(url+'/api/health');await wait(25);}catch{return;}}assert.fail('Native trial survived MCP shutdown');
});

test('Docker orchestration passes credentials only in the environment, preserves its volume, and fences modified Compose files',async t=>{
 const bin=await temporary(t),trace=path.join(bin,'trace.jsonl'),executable=path.join(bin,'docker');
 const program=`#!${process.execPath}\nconst fs=require('node:fs'); const args=process.argv.slice(2); fs.appendFileSync(${JSON.stringify(trace)},JSON.stringify({args,secret:process.env.SMTP_URL})+'\\n');if(args.includes('mail'))console.log(JSON.stringify({configured:true,verified:true,deliveryTested:false}));if(args.includes('backups'))console.log(JSON.stringify({backups:[]}));`;
 await writeFile(executable,program,{mode:0o700});
 const smtp='smtps://operator:dollar%24password@mail.example.test:465',environment={...process.env,PATH:bin+path.delimiter+process.env.PATH,PIXL_SETUP_SMTP:smtp};
 const {instance,directory}=await manager(t,{environment});await apply(instance,{deployment:'docker',smtpUrlEnv:'PIXL_SETUP_SMTP',mailSender:'owner@example.test'});const revision=(await instance.state()).revision;
 const start=await instance.operate({action:'docker_start',revision});assert.equal((await done(instance,start.id)).status,'succeeded');assert.equal((await instance.state()).service.running,null,'unobserved daemon state is not claimed');
 const mail=await instance.operate({action:'mail',revision});assert.equal((await done(instance,mail.id)).result.verified,true);assert.deepEqual((await instance.backups()).backups,[]);
 const stop=await instance.operate({action:'docker_stop',revision});assert.equal((await done(instance,stop.id)).status,'succeeded');
 const calls=(await readFile(trace,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(calls.length,7);assert.deepEqual(calls.slice(0,4).map(c=>c.args.slice(5)),[['build'],['stop'],['run','--rm','app','node','scripts/self-host/migrate.mjs'],['up','-d']]);assert.ok(calls.every(c=>c.secret===smtp));assert(!JSON.stringify(calls.map(c=>c.args)).includes(smtp));assert(!calls.some(c=>c.args.includes('down')||c.args.includes('-v')));
 const compose=JSON.parse(await readFile(path.join(directory,'compose.mcp.yaml'),'utf8'));assert.equal(compose.services.app.environment.SMTP_URL,'${SMTP_URL}');assert.equal(compose.services.app.env_file,undefined);
 await writeFile(path.join(directory,'compose.mcp.yaml'),JSON.stringify({...compose,services:{app:{image:'unexpected-image'}}}));const changed=await instance.operate({action:'docker_start',revision});assert.equal((await done(instance,changed.id)).status,'failed');assert.equal((await readFile(trace,'utf8')).trim().split('\n').length,7);
});

test('setup rejects unworkable port combinations and unsupported automatic container backups',async t=>{
 const {instance}=await manager(t,{environment:{...process.env,PIXL_SETUP_DB:'postgresql://user:fakepass@db.example.test/team'}});
 assert.equal((await instance.plan({url:'http://127.0.0.1:9876'})).ready,false);
 const docker=await instance.plan({administratorEmail:'owner@example.test',deployment:'docker',provider:'postgres',databaseUrlEnv:'PIXL_SETUP_DB'});assert.equal(docker.ready,true);assert.equal(docker.settings.backups,false);
 const unsupported=await instance.plan({deployment:'docker',provider:'postgres',databaseUrlEnv:'PIXL_SETUP_DB',backups:true});assert.equal(unsupported.ready,false);assert.match(unsupported.validationError,/backup utilities/);
});
