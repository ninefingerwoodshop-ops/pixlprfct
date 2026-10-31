import {DocumentError,expectedRevision} from '../lib/documents.mjs';
import {libraryMembers} from './libraries.mjs';
import {readJSON as input} from './input.mjs';

export const EDIT_LEASE_MS=90_000;
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const uuid=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value);
const roles=new Set(['none','viewer','commenter','editor']);
const canEdit=role=>['owner','editor'].includes(role);
const canComment=role=>['owner','editor','commenter'].includes(role);

export function collaborationService(db,engine,{now=Date.now}={}){
 const databaseNow=engine==='postgres'?'(EXTRACT(EPOCH FROM clock_timestamp())*1000)':engine==='mysql'?'(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000)':"((julianday('now')-2440587.5)*86400000)";
 const ignored=engine==='mysql'?'INSERT IGNORE':engine==='sqlite'?'INSERT OR IGNORE':'INSERT';
 async function record(id,access){
  const [file]=await db.query('SELECT id,created_by,revision,deleted_at FROM documents WHERE id=? AND owner=?',[id,access.owner]);
  if(!file)throw new DocumentError(404,'File not found.');
  await db.query(`${ignored} INTO document_collaboration (document_id,owner,roles) VALUES (?,?,'{}')${engine==='postgres'?' ON CONFLICT (document_id) DO NOTHING':''}`,[id,access.owner],'run');
  const [policy]=await db.query('SELECT * FROM document_collaboration WHERE document_id=? AND owner=?',[id,access.owner]);
  const manage=access.manage||file.created_by===access.userId;
  const role=manage?'owner':JSON.parse(policy.roles)[access.userId]??policy.default_role;
  return {file,policy,manage,role,canEdit:canEdit(role),canComment:canComment(role)};
 }
 async function accessFor(id,access){const state=await record(id,access);if(state.role==='none')throw new DocumentError(403,'You no longer have access to this file.');return state;}
 const clientFor=request=>{const client=request.headers.get('x-pixl-client');if(!uuid(client))throw new DocumentError(400,'Open this file in an updated editor.');return client;};
 function membershipFence(access){let sql=' AND EXISTS (SELECT 1 FROM member WHERE organizationId=? AND userId=? AND role=?)',args=[access.organizationId,access.userId,access.memberRole];if(access.teamId){sql+=" AND (EXISTS (SELECT 1 FROM teamMember WHERE teamId=? AND userId=?) OR EXISTS (SELECT 1 FROM member WHERE organizationId=? AND userId=? AND (role LIKE '%owner%' OR role LIKE '%admin%')))";args.push(access.teamId,access.userId,access.organizationId,access.userId);}return {sql,args};}
 async function writeAccess(request,id,access,{lease=true}={}){
  const state=await accessFor(id,access),p=state.policy,stamp=now();
  if(!state.canEdit)throw new DocumentError(403,'You can review this file, but cannot edit its artwork.');
  let sql=' AND EXISTS (SELECT 1 FROM document_collaboration c WHERE c.document_id=documents.id AND c.owner=documents.owner AND c.revision=?',args=[p.revision];
  if(lease&&p.editing_mode==='live'){
   const token=request.headers.get('x-pixl-edit-token'),client=request.headers.get('x-pixl-client');
   const [live]=await db.query('SELECT token FROM live_clients WHERE document_id=? AND owner=? AND user_id=? AND client_id=? AND token=? AND policy_revision=? AND expires_at>?',[id,access.owner,access.userId,client,token,p.revision,stamp]);
   if(!live)throw new DocumentError(423,'Reconnect to simultaneous editing before saving.');
   sql+=' AND EXISTS (SELECT 1 FROM live_clients l WHERE l.document_id=c.document_id AND l.owner=c.owner AND l.user_id=? AND l.client_id=? AND l.token=? AND l.policy_revision=c.revision AND l.expires_at>'+databaseNow+')';args.push(access.userId,client,token);
  }else if(lease){
   const token=request.headers.get('x-pixl-edit-token'),client=request.headers.get('x-pixl-client');
   if(!token||p.lease_token!==token||p.lease_client!==client||p.lease_user!==access.userId||p.lease_expires<=stamp)throw new DocumentError(423,'Editing is paused. Start editing or request a handoff from the current editor.');
   sql+=' AND c.lease_token=? AND c.lease_user=? AND c.lease_client=? AND c.lease_expires>'+databaseNow;args.push(token,access.userId,client);
  }
  const membership=membershipFence(access);return {...state,fence:{sql:sql+')'+membership.sql,args:[...args,...membership.args]}};
 }
 async function members(access){return libraryMembers(db,access);}
 async function describe(id,access,client=null){
  const state=await accessFor(id,access),p=state.policy,stamp=now(),people=await members(access);
  const userName=id=>people.find(m=>m.id===id)?.name??'Teammate';
  const live=p.lease_expires>stamp&&people.some(m=>m.id===p.lease_user);
  const mine=!!live&&p.lease_user===access.userId&&p.lease_client===client;
  const requests=await db.query('SELECT id,user_id,client_id,created_at FROM document_edit_requests WHERE document_id=? AND owner=? AND created_at>? ORDER BY created_at LIMIT 20',[id,access.owner,stamp-10*60_000]);
  const result={editingMode:p.editing_mode,revision:p.revision,documentRevision:state.file.revision,userId:access.userId,role:state.role,canEdit:state.canEdit,canComment:state.canComment,manage:state.manage,serverNow:stamp,
   lease:live?{userId:p.lease_user,name:userName(p.lease_user),mine,expiresAt:p.lease_expires,...(mine?{token:p.lease_token}:{})}:null,
   requested:requests.some(r=>r.user_id===access.userId&&r.client_id===client),
   requests:mine?requests.filter(r=>people.some(m=>m.id===r.user_id)).map(r=>({id:r.id,name:userName(r.user_id),userId:r.user_id})):[],
  };
  if(state.manage)Object.assign(result,{defaultRole:p.default_role,members:people.map(m=>({id:m.id,name:m.name,email:m.email,role:m.manage||m.id===state.file.created_by?'owner':JSON.parse(p.roles)[m.id]??p.default_role})),overrides:JSON.parse(p.roles)});
  return result;
 }
 async function sharing(request,id,access){
  if(request.method==='GET')return json(await describe(id,access,request.headers.get('x-pixl-client')));
  if(request.method!=='PUT')return json({error:'Method not allowed.'},405);
  const state=await accessFor(id,access);if(!state.manage)throw new DocumentError(403,'Only the file creator or a workspace administrator can change access.');
  const value=await input(request),revision=expectedRevision(request),people=await members(access);
  if(!roles.has(value.defaultRole)||!value.overrides||typeof value.overrides!=='object'||Array.isArray(value.overrides)||Object.keys(value.overrides).length>500||Object.entries(value.overrides).some(([user,role])=>!people.some(p=>p.id===user)||!roles.has(role)))throw new DocumentError(400,'Choose existing workspace members and valid file roles.');
  const editingMode=value.editingMode??state.policy.editing_mode;if(!['handoff','live'].includes(editingMode))throw new DocumentError(400,'Choose a valid editing mode.');
  const memberFence=membershipFence(access);
  const result=await db.query('UPDATE document_collaboration SET default_role=?,roles=?,editing_mode=?,revision=revision+1,lease_user=NULL,lease_client=NULL,lease_token=NULL,lease_expires=0 WHERE document_id=? AND owner=? AND revision=?'+memberFence.sql,[value.defaultRole,JSON.stringify(value.overrides),editingMode,id,access.owner,revision,...memberFence.args],'run');
  if(!result.changes)throw new DocumentError(409,'Sharing changed. Refresh before saving access.');
  return json(await describe(id,access,request.headers.get('x-pixl-client')));
 }
 async function editing(request,id,access){
  const client=clientFor(request);if(request.method==='GET')return json(await describe(id,access,client));
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  const state=await accessFor(id,access);if(!state.canEdit)throw new DocumentError(403,'This file is read-only for you.');if(state.file.deleted_at)throw new DocumentError(409,'Restore this file from Trash before editing.');
  if(state.policy.editing_mode==='live')throw new DocumentError(409,'Use simultaneous editing for this file.');
  const {action,requestId}=await input(request),p=state.policy,stamp=now(),token=request.headers.get('x-pixl-edit-token');
  const mine=token&&p.lease_token===token&&p.lease_user===access.userId&&p.lease_client===client;
  let result;
  if(action==='acquire'){
   // Removed members cannot retain a lease; membership is checked on every write.
   const people=await members(access),orphaned=p.lease_user&&!people.some(m=>m.id===p.lease_user);
   result=await db.query('UPDATE document_collaboration SET lease_user=?,lease_client=?,lease_token=?,lease_expires=? WHERE document_id=? AND owner=? AND revision=? AND (lease_expires<=? OR (lease_user=? AND lease_client=?) OR lease_token=?)',
    [access.userId,client,crypto.randomUUID(),stamp+EDIT_LEASE_MS,id,access.owner,p.revision,stamp,access.userId,client,orphaned?p.lease_token:''],'run');
   if(!result.changes)throw new DocumentError(423,'Another teammate is editing. Request a handoff.');
  }else if(action==='renew'||action==='release'){
   if(!mine||(action==='renew'&&p.lease_expires<=stamp))throw new DocumentError(423,'Your editing session expired. Reopen the latest saved version before editing.');
   result=await db.query('UPDATE document_collaboration SET lease_expires=? WHERE document_id=? AND owner=? AND revision=? AND lease_token=?',[action==='release'?0:stamp+EDIT_LEASE_MS,id,access.owner,p.revision,token],'run');
   if(!result.changes)throw new DocumentError(423,'Your editing session changed.');
  }else if(action==='request'){
   const key=id+':'+client;
   await db.batch([db.prepare('DELETE FROM document_edit_requests WHERE document_id=? AND owner=? AND (user_id=? OR created_at<?)').bind(id,access.owner,access.userId,stamp-10*60_000),db.prepare('INSERT INTO document_edit_requests(id,document_id,owner,user_id,client_id,created_at) VALUES(?,?,?,?,?,?)').bind(key,id,access.owner,access.userId,client,stamp)]);
  }else if(action==='handoff'){
   if(!mine||p.lease_expires<=stamp)throw new DocumentError(423,'Only the current editor can hand off editing.');
   const [target]=await db.query('SELECT * FROM document_edit_requests WHERE id=? AND document_id=? AND owner=? AND created_at>?',[String(requestId),id,access.owner,stamp-10*60_000]);
   if(!target)throw new DocumentError(409,'This editing request expired.');
   const people=await members(access);if(!people.some(m=>m.id===target.user_id))throw new DocumentError(403,'This teammate no longer has workspace access.');
   // Obtain the target's actual workspace rights, including administrators.
   const {workspaceAccess}=await import('./workspace-access.mjs');const targetAccess=await workspaceAccess(db,target.user_id,access.workspace);
   if(!(await accessFor(id,targetAccess)).canEdit)throw new DocumentError(403,'This teammate no longer has editing access.');
   result=await db.query('UPDATE document_collaboration SET lease_user=?,lease_client=?,lease_token=?,lease_expires=? WHERE document_id=? AND owner=? AND revision=? AND lease_token=?',[target.user_id,target.client_id,crypto.randomUUID(),stamp+EDIT_LEASE_MS,id,access.owner,p.revision,token],'run');
   if(!result.changes)throw new DocumentError(423,'The editing session changed before handoff.');
   await db.query('DELETE FROM document_edit_requests WHERE id=? AND owner=?',[target.id,access.owner],'run');
  }else throw new DocumentError(400,'Choose a valid editing action.');
  return json(await describe(id,access,client));
 }
 async function comments(request,id,access,sessionUser){
  const state=await accessFor(id,access),url=new URL(request.url);
  if(request.method==='GET'){
   const offset=Number(url.searchParams.get('offset')??0);if(!Number.isSafeInteger(offset)||offset<0)throw new DocumentError(400,'Invalid comment offset.');
   const rows=await db.query('SELECT id,thread_id,author_id,author_name,body,anchor,resolved,revision,created_at,updated_at FROM document_comments WHERE document_id=? AND owner=? ORDER BY created_at,id LIMIT 101 OFFSET ?',[id,access.owner,offset]);
   return json({comments:rows.slice(0,100).map(r=>({...r,anchor:JSON.parse(r.anchor),resolved:!!r.resolved})),nextOffset:rows.length>100?offset+100:null});
  }
  if(!['POST','PATCH'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(!state.canComment)throw new DocumentError(403,'Commenting is not enabled for your file role.');if(state.file.deleted_at)throw new DocumentError(409,'This file is in Trash.');
  const value=await input(request),stamp=now(),membership=membershipFence(access),fence={sql:' AND EXISTS (SELECT 1 FROM document_collaboration WHERE document_id=? AND owner=? AND revision=?)'+membership.sql,args:[id,access.owner,state.policy.revision,...membership.args]};
  if(request.method==='PATCH'){
   const [comment]=await db.query('SELECT * FROM document_comments WHERE id=? AND document_id=? AND owner=?',[value.id,id,access.owner]);
   if(!comment||comment.thread_id!==comment.id)throw new DocumentError(404,'Comment thread not found.');
   if(!state.canEdit&&comment.author_id!==access.userId)throw new DocumentError(403,'Only this thread’s author or an editor can resolve it.');
   if(typeof value.resolved!=='boolean')throw new DocumentError(400,'Choose whether to resolve this thread.');
   const result=await db.query('UPDATE document_comments SET resolved=?,revision=revision+1,updated_at=? WHERE id=? AND document_id=? AND owner=? AND revision=?'+fence.sql,[value.resolved?1:0,stamp,comment.id,id,access.owner,expectedRevision(request),...fence.args],'run');
   if(!result.changes)throw new DocumentError(409,'The thread changed. Refresh it before resolving.');return json({id:comment.id,resolved:value.resolved,revision:comment.revision+1});
  }
  if(typeof value.body!=='string'||!value.body.trim()||new TextEncoder().encode(value.body).length>10_000)throw new DocumentError(400,'Write a comment using 1–10,000 bytes.');
  // Client-generated IDs make a retry after a network interruption idempotent.
  if(!uuid(value.id))throw new DocumentError(400,'A unique comment ID is required.');
  const [old]=await db.query('SELECT * FROM document_comments WHERE id=?',[value.id]);
  if(old){if(old.document_id===id&&old.owner===access.owner&&old.author_id===access.userId&&old.body===value.body.trim()&&old.thread_id===(value.threadId??value.id))return json({id:old.id});throw new DocumentError(409,'That comment ID is already in use.');}
  let anchor={};if(value.threadId){const [thread]=await db.query('SELECT id,anchor FROM document_comments WHERE id=? AND thread_id=? AND document_id=? AND owner=?',[value.threadId,value.threadId,id,access.owner]);if(!thread)throw new DocumentError(404,'Comment thread not found.');anchor=JSON.parse(thread.anchor);}else if(value.anchor){
   for(const key of ['page','layer'])if(value.anchor[key]!==undefined){if(!Number.isSafeInteger(value.anchor[key])||value.anchor[key]<1)throw new DocumentError(400,'Invalid comment location.');anchor[key]=value.anchor[key];}
  }
  const inserted=await db.query(`${ignored} INTO document_comments(id,document_id,owner,thread_id,author_id,author_name,body,anchor,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE 1=1${fence.sql}${engine==='postgres'?' ON CONFLICT (id) DO NOTHING':''}`,[value.id,id,access.owner,value.threadId??value.id,access.userId,String(sessionUser.name??'Teammate').slice(0,256),value.body.trim(),JSON.stringify(anchor),stamp,stamp,...fence.args],'run');
  if(!inserted.changes){const [retry]=await db.query('SELECT * FROM document_comments WHERE id=?',[value.id]);if(retry&&retry.document_id===id&&retry.owner===access.owner&&retry.author_id===access.userId&&retry.body===value.body.trim()&&retry.thread_id===(value.threadId??value.id))return json({id:retry.id});throw new DocumentError(409,'File access changed. Refresh before commenting.');}
  return json({id:value.id},201);
 }
 function policyFence(id,access,state){const m=membershipFence(access);return {sql:' AND EXISTS (SELECT 1 FROM document_collaboration WHERE document_id=? AND owner=? AND revision=?)'+m.sql,args:[id,access.owner,state.policy.revision,...m.args]};}
 return {accessFor,writeAccess,describe,sharing,editing,comments,policyFence};
}
