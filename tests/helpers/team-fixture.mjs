import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readConfig} from '../../server/config.mjs';
import {connectDatabase,migrateDocuments} from '../../server/database.mjs';
import {createAuth,migrateAuth} from '../../server/auth.mjs';
import {startServer} from '../../server/index.mjs';
import {createApplication} from '../../server/application.mjs';

// These are simulated accounts. Mail remains in this fixture's private memory.
export async function teamFixture({server=false,baseURL='http://localhost:4174',sqlitePath=':memory:'}={}){
 const config=readConfig({PIXL_APP_URL:baseURL,PORT:new URL(baseURL).port,PIXL_LOCAL_DEVELOPMENT:'true',PIXL_SQLITE_PATH:sqlitePath,BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),PIXL_ADMIN_EMAIL:'owner@example.test'});
 const mail=[];let db,auth,instance;
 const deliver=async value=>mail.push(value);
 if(server){instance=await startServer(config,{migrate:true,deliver});db=instance.db;auth=instance.auth;}else{db=await connectDatabase(config);await migrateAuth(createAuth(config,db,deliver,{migrating:true}));await migrateDocuments(db,'sqlite');auth=createAuth(config,db,deliver);}
 let handle=server?request=>fetch(request,{redirect:'manual'}):createApplication({config,db,auth});
 function client(){
  const cookies=new Map(),clientId=randomUUID();let user;
  return {clientId,cookies,get user(){return user;},async call(path,body,{method=body===undefined?'GET':'POST',revision,token,headers={}}={}){
   const response=await handle(new Request(config.baseURL+path,{method,headers:{origin:config.baseURL,'content-type':'application/json','x-pixl-client':clientId,'x-pixl-client-ip':'192.0.2.1',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...(revision?{'if-match':String(revision)}:{}),...(token?{'x-pixl-edit-token':token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}));
   for(const cookie of response.headers.getSetCookie()){const [key,...value]=cookie.split(';')[0].split('=');cookies.set(key,value.join('='));}
   const data=await response.json().catch(()=>null);if(path==='/api/workspaces'&&data?.user)user=data.user;
   return {status:response.status,data};
  }};
 }
 async function register(name){
  const actor=client(),email=name.toLowerCase()+'@example.test';
  let r=await actor.call('/api/auth/sign-up/email',{email,name:'Simulated '+name,password:'team-acceptance-only-password',callbackURL:config.baseURL+'/account'});assert.equal(r.status,200,JSON.stringify(r.data));
  const url=new URL(mail.findLast(m=>m.to===email).text.match(/https?:\/\/\S+/)[0]);r=await actor.call(url.pathname+url.search);assert([200,302].includes(r.status));
  assert.equal((await actor.call('/api/workspaces')).status,200);return actor;
 }
 const owner=await register('Owner'),designer=await register('Designer'),reviewer=await register('Reviewer'),viewer=await register('Viewer'),outsider=await register('Outsider');
 const org=(await owner.call('/api/auth/organization/create',{name:'Simulated product team',slug:'simulated-'+randomUUID()})).data;
 for(const actor of [designer,reviewer,viewer]){const r=await owner.call('/api/auth/organization/invite-member',{organizationId:org.id,email:actor.user.email,role:'member'});assert.equal(r.status,200);assert.equal((await actor.call('/api/auth/organization/accept-invitation',{invitationId:r.data.id})).status,200);}
 const query='?workspace=org:'+org.id,path=(id,suffix='')=>'/api/documents/'+id+suffix+query;
 return {get db(){return db;},config,auth,owner,designer,reviewer,viewer,outsider,org,query,path,client,async restart(){if(server){if(instance)await instance.close();instance=await startServer(config,{deliver});db=instance.db;auth=instance.auth;}else handle=createApplication({config,db,auth});},async close(){if(server){if(instance){const current=instance;instance=null;await current.close();}}else await db.close();}};
}
