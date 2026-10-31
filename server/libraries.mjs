import {readJSON as input} from './input.mjs';
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
 const result=[];for(const member of members){if(team&&!team.some(t=>t.userId===member.userId)&&!member.role.split(',').some(r=>['owner','admin'].includes(r)))continue;const [user]=await db.query('SELECT id,name,email FROM "user" WHERE id=?',[member.userId]);if(user)result.push({...user,manage:member.role.split(',').some(r=>['owner','admin'].includes(r))});}return result;
}
export function libraryService(db,bodies,{canReadDocument=async()=>true}={}) {
 const find=async(id,owner)=>(await db.query('SELECT * FROM component_libraries WHERE id=? AND owner=?',[id,owner]))[0];
 async function describe(row,access){return {id:row.id,name:row.name,revision:row.revision,updated_at:row.updated_at,workspace:access.workspace,access:accessFor(row,access),policy:policyOf(row),retired:!!policyOf(row).retired};}
 async function guard({id,before,after,method},access){
  if(id){const row=await find(id,access.owner);if(row){const rights=accessFor(row,access);if(!after){if(!rights.editAll)fail('Only a library maintainer can remove or restore its source project.');}else fail(sourceEditError(before,after,rights));}}
  if(!after)return;
  const links=after.libraries??[];if(!Array.isArray(links)||links.length>50)throw new DocumentError(400,'Invalid library links.');
  if(new Set(links.map(l=>l.id)).size!==links.length)throw new DocumentError(400,'Duplicate library link.');
  for(const old of before?.libraries??[]){const next=links.find(l=>l.id===old.id);if(!next){const oldIds=new Set(Object.values(old.maps.shapes));if(after.shapes.some(s=>oldIds.has(s.id)||oldIds.has(s.component?.master)))fail('Linked library definitions cannot be detached. Remove the library from Assets instead.');continue;}if(old.pinned&&next.pinned&&next.revision!==old.revision)fail('Unpin this library before changing its release.');if(next.workspace!==old.workspace||next.page_id!==old.page_id)fail('Library source identity cannot be changed.');for(const [key,map] of Object.entries(old.maps))for(const [source,target] of Object.entries(map))if(next.maps?.[key]?.[source]!==target)fail('Library component identity cannot be changed.');}
  const claimed=new Set();
  for(const link of links){
   if(link.pinned!==undefined&&typeof link.pinned!=='boolean')throw new DocumentError(400,'Invalid library pin.');
   const published=await find(link.id,access.owner);if(published&&policyOf(published).retired&&!before?.libraries?.some(l=>l.id===link.id))fail('This library is retired. Existing projects can keep using it.');
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
 async function api(request,access,id=null,action=null,writeFence=null){
  const fence=writeFence??{sql:'',args:[]};
  if(!id){if(request.method!=='GET')return json({error:'Method not allowed.'},405);const rows=await db.query('SELECT l.* FROM component_libraries l JOIN documents d ON d.id=l.id WHERE l.owner=? AND d.deleted_at IS NULL ORDER BY l.updated_at DESC',[access.owner]);return json({libraries:await Promise.all(rows.map(r=>describe(r,access)))});}
  const [document]=await db.query('SELECT * FROM documents WHERE id=? AND owner=?',[id,access.owner]);if(!document||document.deleted_at)throw new DocumentError(404,'Library source not found.');
  const row=await find(id,access.owner);
  if(request.method==='GET'){
   if(action==='releases'){if(!row)throw new DocumentError(404,'This library is not published.');const releases=await db.query('SELECT v.revision,v.name,v.created_at,n.notes FROM component_library_versions v LEFT JOIN library_release_notes n ON n.id=v.id WHERE v.library_id=? AND v.owner=? ORDER BY v.revision DESC LIMIT 100',[id,access.owner]);return json({releases});}
   if(action==='usage'){if(!row||!accessFor(row,access).editAll)fail('Only a library maintainer can inspect usage.');const offset=Number(new URL(request.url).searchParams.get('offset')??0);if(!Number.isSafeInteger(offset)||offset<0)throw new DocumentError(400,'Invalid offset.');const files=await db.query('SELECT id,name,body FROM documents WHERE owner=? AND deleted_at IS NULL ORDER BY id LIMIT 101 OFFSET ?',[access.owner,offset]),projects=[];for(const file of files.slice(0,100)){if(!await canReadDocument(file.id,access))continue;const doc=JSON.parse(await readBody(file.body,bodies)),link=doc.libraries?.find(l=>l.id===id&&l.workspace===access.workspace);if(link)projects.push({id:file.id,name:file.name,revision:link.revision,pinned:!!link.pinned,enabled:link.enabled!==false});}return json({projects,nextOffset:files.length>100?offset+100:null});}
   if(action==='access')return json({published:!!row,access:row?accessFor(row,access):{manage:access.manage,editAll:true,components:[]},policy:row?policyOf(row):{maintainers:[],components:{}},members:access.manage?await libraryMembers(db,access):[]});
   if(!row)throw new DocumentError(404,'This project has not been published as a library.');
   const version=Number(new URL(request.url).searchParams.get('revision')??row.revision);if(!Number.isSafeInteger(version)||version<1)throw new DocumentError(400,'Invalid release.');const [release]=await db.query('SELECT v.body,n.notes FROM component_library_versions v LEFT JOIN library_release_notes n ON n.id=v.id WHERE v.library_id=? AND v.owner=? AND v.revision=?',[id,access.owner,version]);if(!release)throw new DocumentError(404,'Release not found.');return json({...await describe(row,access),revision:version,body:release.body,notes:release.notes??''});
  }
  if(!['PUT','PATCH'].includes(request.method))return json({error:'Method not allowed.'},405);
  const rights=row?accessFor(row,access):{manage:access.manage,editAll:access.manage};
  if(request.method==='PATCH'&&(action==='lifecycle'?!rights.editAll:!rights.manage))fail('Only a workspace owner or administrator can change library permissions.');
  if(request.method==='PUT'&&!rights.editAll)fail('Only a library maintainer can publish a release.');
  const revision=expectedRevision(request);if(revision!==document.revision)throw new DocumentError(409,'The source project changed. Open its latest version before publishing or changing permissions.');
  const source=JSON.parse(await readBody(document.body,bodies)),now=Date.now(),policy=row?policyOf(row):{maintainers:[],components:{}};
  let statements=[];
  if(request.method==='PATCH'&&action==='lifecycle'){
   if(!row)throw new DocumentError(404,'Publish this library first.');const value=await input(request);if(typeof value.retired!=='boolean')throw new DocumentError(400,'Choose a retirement state.');policy.retired=value.retired;statements.push(db.prepare('UPDATE component_libraries SET policy=?,updated_at=? WHERE id=? AND owner=? AND EXISTS (SELECT id FROM documents WHERE id=? AND revision=?'+fence.sql+')').bind(JSON.stringify(policy),now,id,access.owner,id,revision,...fence.args));
  }else if(request.method==='PATCH'){
   if(!row)throw new DocumentError(409,'Publish the library before assigning maintainers.');
   const proposed=await input(request),members=await libraryMembers(db,access),ids=new Set(members.map(m=>m.id)),masters=new Set(source.shapes.filter(s=>s.component?.type==='master').map(s=>String(s.id)));
   const valid=list=>Array.isArray(list)&&list.length<=500&&new Set(list).size===list.length&&list.every(id=>ids.has(id));
   if(!valid(proposed.maintainers)||!proposed.components||typeof proposed.components!=='object'||Array.isArray(proposed.components)||Object.entries(proposed.components).some(([key,list])=>!masters.has(key)||!valid(list)))throw new DocumentError(400,'Choose current workspace members and existing main components.');
   policy.maintainers=proposed.maintainers;policy.components=proposed.components;
   statements.push(db.prepare('UPDATE component_libraries SET policy=?,updated_at=? WHERE id=? AND owner=? AND EXISTS (SELECT id FROM documents WHERE id=? AND revision=?'+fence.sql+')').bind(JSON.stringify(policy),now,id,access.owner,id,revision,...fence.args));
  }else{
   const options=await input(request);if(options.notes!==undefined&&(typeof options.notes!=='string'||options.notes.length>4000))throw new DocumentError(400,'Release notes must be at most 4,000 characters.');
   let body;try{body=JSON.stringify(librarySnapshot(source));}catch(error){throw new DocumentError(400,error.message);}
   if(options.rollbackRevision!==undefined){if(!Number.isSafeInteger(options.rollbackRevision)||options.rollbackRevision<1)throw new DocumentError(400,'Choose a published release.');const [old]=await db.query('SELECT body FROM component_library_versions WHERE library_id=? AND owner=? AND revision=?',[id,access.owner,options.rollbackRevision]);if(!old)throw new DocumentError(404,'Rollback release not found.');body=old.body;}
   const published=(row?.revision??0)+1;
   statements.push(db.prepare('INSERT INTO library_release_notes(id,library_id,owner,revision,notes) SELECT ?,?,?,?,? WHERE EXISTS (SELECT id FROM documents WHERE id=? AND owner=? AND revision=?'+fence.sql+')').bind(id+'@'+published,id,access.owner,published,(options.rollbackRevision?'Rollback to release '+options.rollbackRevision+'. ':'')+(options.notes??''),id,access.owner,revision,...fence.args));
   // Both publishing and permission edits advance the source revision. Concurrent
   // saves authorized under an older policy must lose their optimistic CAS.
   statements.push(db.prepare('INSERT INTO component_library_versions(id,library_id,owner,name,body,revision,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT id FROM documents WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL'+fence.sql+')').bind(id+'@'+published,id,access.owner,source.name,body,published,now,id,access.owner,revision,...fence.args));
   statements.push(row?db.prepare('UPDATE component_libraries SET name=?,revision=?,updated_at=? WHERE id=? AND owner=? AND EXISTS (SELECT id FROM documents WHERE id=? AND revision=?'+fence.sql+')').bind(source.name,published,now,id,access.owner,id,revision,...fence.args):db.prepare('INSERT INTO component_libraries(id,owner,name,revision,policy,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT id FROM documents WHERE id=? AND owner=? AND revision=?'+fence.sql+')').bind(id,access.owner,source.name,published,JSON.stringify(policy),now,id,access.owner,revision,...fence.args));
  }
  statements.push(db.prepare('UPDATE documents SET revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL'+fence.sql).bind(now,id,access.owner,revision,...fence.args));
  const result=await db.batch(statements,{requireLastChange:true});if(!result.at(-1).meta.changes)throw new DocumentError(409,'The source changed during this operation. Refresh and try again.');
  return json({...await describe(await find(id,access.owner),access),sourceRevision:revision+1});
 }
 return {api,guard};
}
