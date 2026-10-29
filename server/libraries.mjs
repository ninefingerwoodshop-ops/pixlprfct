import {DocumentError,expectedRevision} from '../lib/documents.mjs';
import {readBody} from '../lib/document-bodies.mjs';
import {librarySnapshot,mergeLibrary,importedContentError,protectedInstanceError,sourceEditError} from '../web/library-model.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const fail=message=>{if(message)throw new DocumentError(403,message);};
const policyOf=row=>JSON.parse(row.policy);
export function accessFor(row,access){const policy=policyOf(row);return {manage:access.manage,editAll:access.manage||policy.maintainers.includes(access.userId),components:Object.entries(policy.components).filter(([,ids])=>ids.includes(access.userId)).map(([id])=>Number(id))};}
export async function libraryMembers(db,access){
 if(!access.organizationId){const [user]=await db.query('SELECT id,name,email FROM "user" WHERE id=?',[access.userId]);return user?[user]:[];}
 const members=await db.query('SELECT userId,role FROM member WHERE organizationId=?',[access.organizationId]);
 const team=access.teamId?await db.query('SELECT userId FROM teamMember WHERE teamId=?',[access.teamId]):null;
 const result=[];for(const member of members){if(team&&!team.some(t=>t.userId===member.userId)&&!member.role.split(',').some(r=>['owner','admin'].includes(r)))continue;const [user]=await db.query('SELECT id,name,email FROM "user" WHERE id=?',[member.userId]);if(user)result.push(user);}return result;
}
async function input(request){const text=await request.text();if(text.length>50_000)throw new DocumentError(413,'Library settings are too large.');try{return JSON.parse(text);}catch{throw new DocumentError(400,'Invalid library settings.');}}
export function libraryService(db,bodies) {
 const find=async(id,owner)=>(await db.query('SELECT * FROM component_libraries WHERE id=? AND owner=?',[id,owner]))[0];
 async function describe(row,access){return {id:row.id,name:row.name,revision:row.revision,updated_at:row.updated_at,workspace:access.workspace,access:accessFor(row,access),policy:policyOf(row)};}
 async function guard({id,before,after,method},access){
  if(id){const row=await find(id,access.owner);if(row){const rights=accessFor(row,access);if(!after){if(!rights.editAll)fail('Only a library maintainer can remove or restore its source project.');}else fail(sourceEditError(before,after,rights));}}
  if(!after)return;
  const links=after.libraries??[];if(!Array.isArray(links)||links.length>50)throw new DocumentError(400,'Invalid library links.');
  if(new Set(links.map(l=>l.id)).size!==links.length)throw new DocumentError(400,'Duplicate library link.');
  for(const old of before?.libraries??[]){const next=links.find(l=>l.id===old.id);if(!next){const oldIds=new Set(Object.values(old.maps.shapes));if(after.shapes.some(s=>oldIds.has(s.id)||oldIds.has(s.component?.master)))fail('Linked library definitions cannot be detached. Remove the library from Assets instead.');continue;}if(next.workspace!==old.workspace||next.page_id!==old.page_id)fail('Library source identity cannot be changed.');for(const [key,map] of Object.entries(old.maps))for(const [source,target] of Object.entries(map))if(next.maps?.[key]?.[source]!==target)fail('Library component identity cannot be changed.');}
  const claimed=new Set();
  for(const link of links){
   if(link.workspace!==access.workspace)fail('Libraries must belong to this workspace.');
   if(!Number.isSafeInteger(link.revision)||link.revision<1||!link.maps||!Number.isSafeInteger(link.page_id))throw new DocumentError(400,'Invalid library link.');
   for(const map of Object.values(link.maps)){if(!map||typeof map!=='object'||Array.isArray(map)||Object.values(map).some(n=>!Number.isSafeInteger(n)||n<=0)||new Set(Object.values(map)).size!==Object.values(map).length)throw new DocumentError(400,'Invalid library ID map.');}
   for(const id of Object.values(link.maps.shapes??{})){if(claimed.has(id))throw new DocumentError(400,'Overlapping library definitions.');claimed.add(id);}
   const [release]=await db.query('SELECT body,name FROM component_library_versions WHERE library_id=? AND owner=? AND revision=?',[link.id,access.owner,link.revision]);
   if(!release)fail('This library release is unavailable in your workspace.');
   let expected;try{expected=mergeLibrary(after,{...release,id:link.id,workspace:link.workspace,revision:link.revision});}catch{throw new DocumentError(400,'Invalid linked library data.');}
   fail(importedContentError(after,expected));
  }
  fail(protectedInstanceError(before??{shapes:[],libraries:[]},after));
 }
 async function api(request,access,id=null,action=null){
  if(!id){if(request.method!=='GET')return json({error:'Method not allowed.'},405);const rows=await db.query('SELECT l.* FROM component_libraries l JOIN documents d ON d.id=l.id WHERE l.owner=? AND d.deleted_at IS NULL ORDER BY l.updated_at DESC',[access.owner]);return json({libraries:await Promise.all(rows.map(r=>describe(r,access)))});}
  const [document]=await db.query('SELECT * FROM documents WHERE id=? AND owner=?',[id,access.owner]);if(!document||document.deleted_at)throw new DocumentError(404,'Library source not found.');
  const row=await find(id,access.owner);
  if(request.method==='GET'){
   if(action==='access')return json({published:!!row,access:row?accessFor(row,access):{manage:access.manage,editAll:true,components:[]},policy:row?policyOf(row):{maintainers:[],components:{}},members:access.manage?await libraryMembers(db,access):[]});
   if(!row)throw new DocumentError(404,'This project has not been published as a library.');
   const [release]=await db.query('SELECT body FROM component_library_versions WHERE library_id=? AND owner=? AND revision=?',[id,access.owner,row.revision]);return json({...await describe(row,access),body:release.body});
  }
  if(!['PUT','PATCH'].includes(request.method))return json({error:'Method not allowed.'},405);
  const rights=row?accessFor(row,access):{manage:access.manage,editAll:access.manage};
  if(request.method==='PATCH'&&!rights.manage)fail('Only a workspace owner or administrator can change library permissions.');
  if(request.method==='PUT'&&!rights.editAll)fail('Only a library maintainer can publish a release.');
  const revision=expectedRevision(request);if(revision!==document.revision)throw new DocumentError(409,'The source project changed. Open its latest version before publishing or changing permissions.');
  const source=JSON.parse(await readBody(document.body,bodies)),now=Date.now(),policy=row?policyOf(row):{maintainers:[],components:{}};
  let statements=[];
  if(request.method==='PATCH'){
   if(!row)throw new DocumentError(409,'Publish the library before assigning maintainers.');
   const proposed=await input(request),members=await libraryMembers(db,access),ids=new Set(members.map(m=>m.id)),masters=new Set(source.shapes.filter(s=>s.component?.type==='master').map(s=>String(s.id)));
   const valid=list=>Array.isArray(list)&&list.length<=500&&new Set(list).size===list.length&&list.every(id=>ids.has(id));
   if(!valid(proposed.maintainers)||!proposed.components||typeof proposed.components!=='object'||Array.isArray(proposed.components)||Object.entries(proposed.components).some(([key,list])=>!masters.has(key)||!valid(list)))throw new DocumentError(400,'Choose current workspace members and existing main components.');
   policy.maintainers=proposed.maintainers;policy.components=proposed.components;
   statements.push(db.prepare('UPDATE component_libraries SET policy=?,updated_at=? WHERE id=? AND owner=? AND EXISTS (SELECT id FROM documents WHERE id=? AND revision=?)').bind(JSON.stringify(policy),now,id,access.owner,id,revision));
  }else{
   let body;try{body=JSON.stringify(librarySnapshot(source));}catch(error){throw new DocumentError(400,error.message);}
   const published=(row?.revision??0)+1;
   // Both publishing and permission edits advance the source revision. Concurrent
   // saves authorized under an older policy must lose their optimistic CAS.
   statements.push(db.prepare('INSERT INTO component_library_versions(id,library_id,owner,name,body,revision,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT id FROM documents WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL)').bind(id+'@'+published,id,access.owner,source.name,body,published,now,id,access.owner,revision));
   statements.push(row?db.prepare('UPDATE component_libraries SET name=?,revision=?,updated_at=? WHERE id=? AND owner=? AND EXISTS (SELECT id FROM documents WHERE id=? AND revision=?)').bind(source.name,published,now,id,access.owner,id,revision):db.prepare('INSERT INTO component_libraries(id,owner,name,revision,policy,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT id FROM documents WHERE id=? AND owner=? AND revision=?)').bind(id,access.owner,source.name,published,JSON.stringify(policy),now,id,access.owner,revision));
  }
  statements.push(db.prepare('UPDATE documents SET revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL').bind(now,id,access.owner,revision));
  const result=await db.batch(statements);if(!result.at(-1).meta.changes)throw new DocumentError(409,'The source changed during this operation. Refresh and try again.');
  return json({...await describe(await find(id,access.owner),access),sourceRevision:revision+1});
 }
 return {api,guard};
}
