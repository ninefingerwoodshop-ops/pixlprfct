import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readConfig} from '../server/config.mjs';
import {connectDatabase,migrateDocuments,postgresSQL} from '../server/database.mjs';
import {createAuth,migrateAuth,smtpOptions} from '../server/auth.mjs';
import {createApplication} from '../server/application.mjs';
import {setupPlan} from '../web/setup-plan.js';
const base={PIXL_APP_URL:'http://localhost:4174',PIXL_LOCAL_DEVELOPMENT:'true',PIXL_SQLITE_PATH:':memory:',BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),PIXL_ADMIN_EMAIL:'owner@example.com'};
async function fixture(){const config=readConfig(base),db=await connectDatabase(config),mails=[];await migrateAuth(createAuth(config,db,async mail=>mails.push(mail),{migrating:true}));const auth=createAuth(config,db,async mail=>mails.push(mail));await migrateDocuments(db,'sqlite');const handle=createApplication({config,db,auth});
 function client(){let cookies=new Map();return {get cookies(){return cookies;},async call(path,body,{method=body===undefined?'GET':'POST',headers={}}={}){const request=new Request(config.baseURL+path,{method,headers:{origin:config.baseURL,'content-type':'application/json','x-pixl-client-ip':'192.0.2.1',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});const response=await handle(request);for(const cookie of response.headers.getSetCookie()){const [key,...value]=cookie.split(';')[0].split('=');cookies.set(key,value.join('='));}return {status:response.status,data:await response.json().catch(()=>null),response};}};}
 async function register(email,name='Designer'){const c=client();let r=await c.call('/api/auth/sign-up/email',{email,name,password:'long-and-private-password',callbackURL:config.baseURL+'/account'});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal((await c.call('/api/workspaces')).status,401);const mail=mails.findLast(m=>m.to===email),url=mail.text.match(/https?:\/\/\S+/)[0];r=await c.call(new URL(url).pathname+new URL(url).search);assert.ok([200,302].includes(r.status),JSON.stringify(r.data));r=await c.call('/api/workspaces');assert.equal(r.status,200,JSON.stringify(r.data));return {client:c,user:r.data.user};}
 return {db,auth,mails,client,register};}
const document={version:1,name:'Team project',shapes:[]};
test('configuration refuses insecure public installs and unsafe provider settings',()=>{assert.throws(()=>readConfig({...base,PIXL_APP_URL:'http://example.com'}),/loopback/);assert.throws(()=>readConfig({...base,PIXL_APP_URL:'http://example.com',PIXL_LOCAL_DEVELOPMENT:'false'}),/HTTPS/);assert.throws(()=>readConfig({...base,PIXL_APP_URL:'https://example.com',PIXL_LOCAL_DEVELOPMENT:'false'}),/SMTP/);assert.throws(()=>readConfig({...base,BETTER_AUTH_SECRET:'short'}),/random/);assert.throws(()=>readConfig({...base,PIXL_DATABASE_PROVIDER:'mongo'}),/Choose/);assert.throws(()=>readConfig({...base,PIXL_DATABASE_PROVIDER:'mysql',DATABASE_URL:'postgres://a:b@host/db'}),/match/);});
test('setup builder supplies engine-specific templates without credentials',()=>{for(const provider of ['sqlite','supabase','render','neon','postgres','mysql','mariadb']){const plan=setupPlan({provider,email:'admin@example.com'});assert.match(plan.env,/REPLACE_WITH_A_RANDOM_SECRET/);assert.match(plan.commands,/selfhost:migrate/);assert.ok(plan.env.includes(provider));}assert.throws(()=>setupPlan({url:'http://example.com',local:false,email:'a@example.com'}),/HTTPS/);});
test('PostgreSQL compatibility preserves binding order and quoted auth identifiers',()=>{assert.equal(postgresSQL('SELECT role FROM teamMember WHERE organizationId=? AND userId=?'),'SELECT role FROM "teamMember" WHERE "organizationId"=$1 AND "userId"=$2');assert.equal(postgresSQL('SELECT id FROM documents WHERE owner=? AND instr(lower(name),lower(?))>0'),'SELECT id FROM documents WHERE owner=$1 AND strpos(lower(name),lower($2))>0');});
test('verified accounts, tenant isolation, memberships, revocation, and forged identity',async()=>{const f=await fixture();try{const {client:a,user:owner}=await f.register('owner@example.com','Owner');const {client:b,user:other}=await f.register('other@example.com','Other');const anonymous=f.client();assert.equal((await anonymous.call('/api/documents',undefined,{headers:{'oai-authenticated-user-id':'user:'+owner.id}})).status,401);
 let r=await a.call('/api/documents',document);assert.equal(r.status,201);const personal=r.data;assert.equal((await b.call('/api/documents/'+personal.id)).status,404);
 r=await a.call('/api/auth/organization/create',{name:'Design team',slug:'design-team'});assert.equal(r.status,200,JSON.stringify(r.data));const org=r.data;
 r=await a.call('/api/auth/organization/create-team',{name:'Product',organizationId:org.id});assert.equal(r.status,200,JSON.stringify(r.data));const team=r.data;
 assert.equal((await a.call('/api/teams/'+team.id+'/members')).status,200);assert.equal((await b.call('/api/teams/'+team.id+'/members')).status,403);assert.ok((await a.call('/api/workspaces')).data.teams.some(item=>item.id===team.id));
 const target='?workspace=team:'+team.id;r=await a.call('/api/documents'+target,document);assert.equal(r.status,201);const shared=r.data;assert.equal((await b.call('/api/documents/'+shared.id+target)).status,403);
 r=await a.call('/api/auth/organization/invite-member',{organizationId:org.id,email:'other@example.com',role:'member'});assert.equal(r.status,200,JSON.stringify(r.data));const invitation=r.data;
 assert.equal((await a.call('/api/auth/organization/accept-invitation',{invitationId:invitation.id})).status,403);
 r=await b.call('/api/auth/organization/accept-invitation',{invitationId:invitation.id});assert.equal(r.status,200,JSON.stringify(r.data));
 assert.equal((await b.call('/api/documents/'+shared.id+target)).status,403);
 r=await a.call('/api/auth/organization/add-team-member',{teamId:team.id,userId:other.id});assert.equal(r.status,200,JSON.stringify(r.data));
 assert.equal((await b.call('/api/documents/'+shared.id+target)).status,200);
 assert.equal((await b.call('/api/auth/organization/create-team',{name:'Unauthorized',organizationId:org.id})).status,403);
 r=await b.call('/api/documents/'+shared.id+target,{...document,name:'Edited by team member'},{method:'PUT',headers:{'if-match':'1'}});assert.equal(r.status,200,JSON.stringify(r.data));
 assert.equal((await a.call('/api/documents/'+shared.id+target,document,{method:'PUT',headers:{'if-match':'1'}})).status,409);
 assert.equal((await b.call('/api/documents/'+shared.id+'/versions'+target)).status,200);
 assert.equal((await b.call('/api/documents/'+shared.id+target)).data.can_delete,false);
 assert.equal((await b.call('/api/documents/'+shared.id+target,undefined,{method:'DELETE',headers:{'if-match':'2','oai-authenticated-user-id':'user:'+owner.id,'x-admin':'true'}})).status,403);
 const own=(await b.call('/api/documents'+target,document)).data;
 assert.equal(own.created_by,other.id);assert.equal(own.can_delete,true);
 assert.equal((await b.call('/api/documents/'+own.id+target,undefined,{method:'DELETE',headers:{'if-match':'1'}})).status,200);
 assert.equal((await b.call('/api/documents/'+own.id+target,undefined,{method:'PATCH',headers:{'if-match':'2'}})).status,200);
 assert.equal((await a.call('/api/documents/'+own.id+target,undefined,{method:'DELETE',headers:{'if-match':'3'}})).status,200);
 assert.equal((await a.call('/api/installation/check',{})).status,200);assert.equal((await b.call('/api/installation/check',{})).status,403);
 assert.equal((await a.call('/api/documents',document,{headers:{origin:'https://evil.example'}})).status,403);
 r=await a.call('/api/auth/organization/remove-team-member',{teamId:team.id,userId:other.id});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal((await b.call('/api/documents/'+shared.id+target)).status,403);assert.equal((await b.call('/api/documents/'+shared.id+'/versions'+target)).status,403);
 await a.call('/api/auth/sign-out',{});assert.equal((await a.call('/api/documents/'+personal.id)).status,401);
 }finally{await f.db.close();}});

test('password recovery revokes existing sessions and reset links are single use',async()=>{const f=await fixture();try{const {client}=await f.register('reset@example.com');let result=await client.call('/api/auth/request-password-reset',{email:'reset@example.com',redirectTo:base.PIXL_APP_URL+'/account?mode=reset'});assert.equal(result.status,200);const mail=f.mails.findLast(mail=>mail.subject.includes('Reset')),resetURL=new URL(mail.text.match(/https?:\/\/\S+/)[0]);const token=resetURL.pathname.split('/').at(-1);const anonymous=f.client();result=await anonymous.call('/api/auth/reset-password',{newPassword:'another-private-password',token});assert.equal(result.status,200,JSON.stringify(result.data));assert.equal((await client.call('/api/workspaces')).status,401);assert.equal((await anonymous.call('/api/auth/reset-password',{newPassword:'another-private-password',token})).status,400);assert.equal((await anonymous.call('/api/auth/sign-in/email',{email:'reset@example.com',password:'another-private-password'})).status,200);}finally{await f.db.close();}});

test('two-factor enrollment, sign-in challenge, and one-time backup code',async()=>{const {createHmac}=await import('node:crypto');const f=await fixture();try{const {client}=await f.register('twofactor@example.com');let result=await client.call('/api/auth/two-factor/enable',{password:'long-and-private-password'});assert.equal(result.status,200,JSON.stringify(result.data));assert.match(result.data.qrCode,/^data:image\/png;base64,/);const {backupCodes,totpURI}=result.data;const secret=new URL(totpURI).searchParams.get('secret');const bits=[...secret.replace(/=+$/,'')].map(c=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5,'0')).join('');const bytes=Buffer.from(bits.match(/.{8}/g).map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',bytes).update(counter).digest(),offset=digest[19]&15,code=String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');result=await client.call('/api/auth/two-factor/verify-totp',{code});assert.equal(result.status,200,JSON.stringify(result.data));await client.call('/api/auth/sign-out',{});
 const login=f.client();result=await login.call('/api/auth/sign-in/email',{email:'twofactor@example.com',password:'long-and-private-password'});assert.equal(result.status,200);assert.equal(result.data.twoFactorRedirect,true);assert.equal((await login.call('/api/workspaces')).status,401);result=await login.call('/api/auth/two-factor/verify-backup-code',{code:backupCodes[0]});assert.equal(result.status,200,JSON.stringify(result.data));assert.equal((await login.call('/api/workspaces')).status,200);await login.call('/api/auth/sign-out',{});await login.call('/api/auth/sign-in/email',{email:'twofactor@example.com',password:'long-and-private-password'});assert.notEqual((await login.call('/api/auth/two-factor/verify-backup-code',{code:backupCodes[0]})).status,200);
 }finally{await f.db.close();}});

test('persistent authentication rate limiting rejects repeated logins',async()=>{const f=await fixture();try{const client=f.client();let result;for(let i=0;i<11;i++)result=await client.call('/api/auth/sign-in/email',{email:'nobody@example.com',password:'incorrect-password'},{headers:{'x-pixl-client-ip':'192.0.2.33'}});assert.equal(result.status,429);assert.ok((await f.db.query('SELECT * FROM rateLimit')).length>0);}finally{await f.db.close();}});

test('large designs and history stay in the shared database without object-storage dependencies',async()=>{const f=await fixture();try{const {client}=await f.register('large@example.com');const body=JSON.stringify({...document,shapes:[{text:'x'.repeat(1_600_000)}]});let result=await client.call('/api/documents',body);assert.equal(result.status,201,JSON.stringify(result.data));const id=result.data.id;assert.equal((await client.call('/api/documents/'+id)).data.body,body);assert.equal((await f.db.query('SELECT id FROM document_bodies')).length,1);result=await client.call('/api/documents/'+id,document,{method:'PUT',headers:{'if-match':'1'}});assert.equal(result.status,200);const versions=(await client.call('/api/documents/'+id+'/versions')).data.versions;assert.equal(versions.length,1);assert.equal((await client.call('/api/documents/'+id+'/versions/'+versions[0].id)).data.body,body);result=await client.call('/api/documents/'+id+'/versions/'+versions[0].id+'/restore',{}, {headers:{'if-match':'2'}});assert.equal(result.status,200);assert.equal(result.data.body,body);}finally{await f.db.close();}});

test('remote databases and SMTP verify TLS even during a local app trial',()=>{const config=readConfig({...base,PIXL_DATABASE_PROVIDER:'supabase',DATABASE_URL:'postgresql://user:password@db.example.com:5432/pixl'});assert.equal(config.databaseTLS,true);assert.equal(readConfig({...base,PIXL_DATABASE_PROVIDER:'postgres',DATABASE_URL:'postgresql://user:password@localhost:5432/pixl'}).databaseTLS,false);assert.throws(()=>readConfig({...base,PIXL_DATABASE_PROVIDER:'postgres',DATABASE_URL:'postgresql://user:password@db.example.com/pixl?sslmode=disable'}),/TLS/);const mail=smtpOptions({...config,smtpUrl:'smtp://user:password@mail.example.com:587?ignoreTLS=true'});assert.equal(mail.requireTLS,true);assert.equal(mail.tls.rejectUnauthorized,true);assert.equal(mail.ignoreTLS,undefined);});

test('creator migration is repeatable and does not invent historical shared creators',async()=>{
 const db=await connectDatabase(readConfig(base));
 try{
  await db.query('CREATE TABLE documents(id TEXT PRIMARY KEY,owner TEXT,name TEXT,body TEXT,revision INTEGER,created_at BIGINT,updated_at BIGINT,deleted_at BIGINT)',[],'run');
  await db.query("INSERT INTO documents VALUES ('personal','user:alice','Personal','{}',1,1,1,NULL),('shared','org:team','Shared','{}',1,1,1,NULL)",[],'run');
  await migrateDocuments(db,'sqlite');await migrateDocuments(db,'sqlite');
  const rows=await db.query('SELECT id,created_by,body,revision FROM documents ORDER BY id');
  assert.equal(rows[0].created_by,'alice');assert.equal(rows[1].created_by,null);
  assert.ok(rows.every(row=>row.body==='{}'&&row.revision===1));
 }finally{await db.close();}
});

test('admin console scopes summaries, search, pagination and role changes to current organization admins',async()=>{
 const f=await fixture();try{
  const {client:owner,user:ownerUser}=await f.register('owner@example.com','Owner');
  const {client:member}=await f.register('member@example.com','Member');
  const {client:outsider}=await f.register('outside@example.com','Outside');
  const org=(await owner.call('/api/auth/organization/create',{name:'Studio',slug:'studio'})).data;
  const foreign=(await outsider.call('/api/auth/organization/create',{name:'Private',slug:'private'})).data;
  const invite=(await owner.call('/api/auth/organization/invite-member',{organizationId:org.id,email:'member@example.com',role:'member'})).data;
  assert.equal((await member.call('/api/auth/organization/accept-invitation',{invitationId:invite.id})).status,200);
  const query='?organization='+org.id;
  assert.equal((await f.client().call('/api/admin/overview'+query)).status,401);
  for(const client of [member,outsider])assert.equal((await client.call('/api/admin/overview'+query,undefined,{headers:{'x-admin':'true','oai-authenticated-user-id':ownerUser.id}})).status,403);
  assert.equal((await owner.call('/api/admin/overview?organization='+foreign.id)).status,403);
  assert.equal((await owner.call('/api/workspaces')).data.organizations[0].role,'owner');
  const summary=(await owner.call('/api/admin/overview'+query)).data;assert.equal(summary.organization.name,'Studio');assert.equal(summary.people,2);
  const people=(await owner.call('/api/admin/people'+query+'&q=member%40example.com')).data;
  assert.equal(people.total,1);const target=people.members[0];assert.equal(target.email,'member@example.com');
  assert.equal((await member.call('/api/auth/organization/update-member-role',{organizationId:org.id,memberId:target.id,role:'admin'})).status,403);
  assert.equal((await owner.call('/api/auth/organization/update-member-role',{organizationId:org.id,memberId:target.id,role:'admin'})).status,200);
  assert.equal((await member.call('/api/admin/overview'+query)).status,200);
  const ownMember=(await owner.call('/api/admin/people'+query+'&role=owner')).data.members[0];
  assert.notEqual((await owner.call('/api/auth/organization/update-member-role',{organizationId:org.id,memberId:ownMember.id,role:'member'})).status,200);
  const team=(await member.call('/api/auth/organization/create-team',{organizationId:org.id,name:'Product'})).data;
  assert.equal((await member.call('/api/auth/organization/update-team',{teamId:team.id,data:{organizationId:org.id,name:'Design'}})).status,200);
  assert.equal((await member.call('/api/auth/organization/add-team-member',{teamId:team.id,userId:target.userId,organizationId:org.id})).status,200);
  const teamPeople=await member.call('/api/admin/people'+query+'&team='+team.id);assert.equal(teamPeople.status,200);assert.ok(teamPeople.data.members.some(p=>p.userId===target.userId));
  assert.equal((await owner.call('/api/admin/people'+query+'&team='+randomUUID())).status,404);
  for(let i=0;i<51;i++){const userId=randomUUID();await f.db.query('INSERT INTO "user"(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,?,?)',[userId,i===0?'100% Design':'Person '+String(i).padStart(2,'0'),'person'+i+'@example.com',Date.now(),Date.now()],'run');await f.db.query('INSERT INTO member(id,organizationId,userId,role,createdAt) VALUES(?,?,?,?,?)',[randomUUID(),org.id,userId,'member',Date.now()],'run');}
  const page=(await owner.call('/api/admin/people'+query)).data;assert.equal(page.members.length,50);assert.equal(page.next,50);assert.equal(page.total,53);
  const last=(await owner.call('/api/admin/people'+query+'&offset=50')).data;assert.equal(last.members.length,3);assert.equal(last.next,null);
  assert.equal((await owner.call('/api/admin/people'+query+'&q=%25')).data.total,1);
  assert.equal((await owner.call('/api/admin/people'+query+'&offset=-1')).status,400);
  assert.equal((await owner.call('/api/admin/people'+query+'&role=bogus')).status,400);
  await owner.call('/api/auth/organization/update-member-role',{organizationId:org.id,memberId:target.id,role:'member'});
  assert.equal((await member.call('/api/admin/people'+query)).status,403);
  assert.equal((await member.call('/api/installation/check',{})).status,403);
 }finally{await f.db.close();}
});
