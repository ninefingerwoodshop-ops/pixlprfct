import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {teamFixture} from './helpers/team-fixture.mjs';
import {operations} from '../server/operations.mjs';
import {backup,restoreDrill} from '../scripts/self-host/backup.mjs';
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
test('onboarding invites expose details only to the intended recipient and record first shared work',async()=>{
 const f=await teamFixture();try{
  const {owner:a,outsider:b,reviewer:c,org,query}=f,invite=ok(await a.call('/api/auth/organization/invite-member',{organizationId:org.id,email:b.user.email,role:'member'}));
  assert.equal((await c.call('/api/auth/organization/get-invitation?id='+invite.id)).status,403);
  const details=ok(await b.call('/api/auth/organization/get-invitation?id='+invite.id));assert.equal(details.organizationName,org.name);
  ok(await b.call('/api/auth/organization/accept-invitation',{invitationId:invite.id}));assert.equal((await b.call('/api/onboarding'+query)).status,200);
  let data=ok(await a.call('/api/onboarding'+query));assert.equal(data.firstProject,null);
  ok(await a.call('/api/documents'+query,{version:1,name:'First shared project',shapes:[]}),201);data=ok(await a.call('/api/onboarding'+query));assert(data.firstProject);
 }finally{await f.close();}
});
test('mail outbox retries without leaking content and skips members whose access was revoked',async()=>{
 const f=await teamFixture();try{
  const {owner:a,reviewer:b,path:docPath,query}=f,id=ok(await a.call('/api/documents'+query,{version:1,name:'Private artwork title',shapes:[]}),201).id;
  ok(await b.call('/api/notifications/preferences',{mode:'mentions',email:true},{method:'PUT'}));
  ok(await a.call(docPath(id,'/comments'),{id:crypto.randomUUID(),body:`@[${b.user.name}](${b.user.id}) confidential review body`}),201);
  let clock=Date.now(),attempts=0;const delivered=[],ops=operations({...f.config,backups:false},f.db,{now:()=>clock,deliver:async value=>{attempts++;if(attempts===1)throw new Error('simulated transport outage');delivered.push(value);}});
  await ops.mailTick();assert.equal(delivered.length,0);clock+=120000;await ops.mailTick();assert.equal(delivered.length,1);assert(!delivered[0].text.includes('confidential'));assert(!delivered[0].text.includes('Private artwork'));assert(delivered[0].text.includes('comment='));
  ok(await a.call(docPath(id,'/comments'),{id:crypto.randomUUID(),body:`@[${b.user.name}](${b.user.id}) another body`}),201);
  const p=ok(await a.call(docPath(id,'/sharing')));ok(await a.call(docPath(id,'/sharing'),{defaultRole:'editor',overrides:{[b.user.id]:'none'}},{method:'PUT',revision:p.revision}));await ops.mailTick();assert.equal(delivered.length,1);assert.deepEqual(await ops.verifyMail(),{configured:false,verified:false});await ops.stop();
 }finally{await f.close();}
});
test('SQLite backup restores in isolation',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'pixl-backup-check-')),f=await teamFixture({sqlitePath:path.join(dir,'source.sqlite')});try{
  const folder=path.join(dir,'snapshot');await backup(f.config,folder);const result=await restoreDrill(folder);assert.equal(result.engine,'sqlite');assert(result.verifiedAt);assert(await readFile(path.join(folder,'restore-proof.json'),'utf8'));
 }finally{await f.close();await rm(dir,{recursive:true,force:true});}
});
