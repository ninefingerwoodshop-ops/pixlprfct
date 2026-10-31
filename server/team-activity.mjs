import {DocumentError,expectedRevision} from '../lib/documents.mjs';
import {readJSON} from './input.mjs';
import {libraryMembers} from './libraries.mjs';
import {workspaceAccess} from './workspace-access.mjs';

const json=data=>Response.json(data,{headers:{'cache-control':'no-store'}});
const uuid=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value);
export function teamActivity(db,engine,collaboration){
 const insert=engine==='mysql'?'INSERT IGNORE':engine==='sqlite'?'INSERT OR IGNORE':'INSERT';
 const conflict=engine==='postgres'?' ON CONFLICT (id) DO NOTHING':'';
 async function recipients(id,access){
  const people=await libraryMembers(db,access),result=[];
  for(const person of people){try{const rights=await collaboration.accessFor(id,await workspaceAccess(db,person.id,access.workspace));result.push({...person,role:rights.role,canComment:rights.canComment});}catch(error){if(![403,404].includes(error.status))throw error;}}
  return result;
 }
 async function event({id,access,actor,source,kind,targets,stamp=Date.now()}){
  const people=await recipients(id,access),statements=[];
  for(const userId of new Set(targets)){if(userId===actor.id||!people.some(p=>p.id===userId))continue;
   statements.push(db.prepare(`${insert} INTO team_notifications(id,owner,document_id,user_id,actor_id,actor_name,kind,target_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)${conflict}`).bind(`${source}:${kind}:${userId}`,access.owner,id,userId,actor.id,String(actor.name??'Teammate').slice(0,256),kind,source,stamp));
  }
  if(statements.length)await db.batch(statements);
 }
 async function commentEvent(id,access,actor,value){
  const people=await recipients(id,access),mentioned=people.filter(p=>value.body.includes('@['+p.name+']('+p.id+')')).map(p=>p.id);
  const replies=value.threadId?(await db.query('SELECT DISTINCT author_id FROM document_comments WHERE document_id=? AND owner=? AND thread_id=?',[id,access.owner,value.threadId])).map(c=>c.author_id):[];
  const direct=new Set([...mentioned,...replies]);
  await event({id,access,actor,source:value.id,kind:'mention',targets:mentioned});
  await event({id,access,actor,source:value.id,kind:'reply',targets:replies.filter(id=>!mentioned.includes(id))});
  await event({id,access,actor,source:value.id,kind:'comment',targets:people.filter(p=>!direct.has(p.id)).map(p=>p.id)});
 }
 async function preferences(userId,request){
  if(request.method==='PUT'){
   const value=await readJSON(request);if(!['all','mentions','none'].includes(value.mode)||typeof value.email!=='boolean')throw new DocumentError(400,'Choose a notification preference.');
   await db.batch([db.prepare('DELETE FROM notification_preferences WHERE user_id=?').bind(userId),db.prepare('INSERT INTO notification_preferences(user_id,mode,email) VALUES(?,?,?)').bind(userId,value.mode,value.email?1:0)]);
  }else if(request.method!=='GET')throw new DocumentError(405,'Method not allowed.');
  const [row]=await db.query('SELECT mode,email FROM notification_preferences WHERE user_id=?',[userId]);return json({mode:row?.mode??'mentions',email:!!row?.email});
 }
 async function inbox(request,userId){
  if(request.method==='PATCH'){
   const value=await readJSON(request);if(!Array.isArray(value.ids)||value.ids.length>100||value.ids.some(id=>typeof id!=='string'||id.length>512)||typeof value.read!=='boolean')throw new DocumentError(400,'Choose up to 100 notifications.');
   if(value.ids.length)await db.batch(value.ids.map(id=>db.prepare('UPDATE team_notifications SET read_at=? WHERE id=? AND user_id=?').bind(value.read?Date.now():null,id,userId)));
   return json({updated:true});
  }
  if(request.method!=='GET')throw new DocumentError(405,'Method not allowed.');
  const params=new URL(request.url).searchParams,before=params.get('before');let cursor=null;
  if(before){try{cursor=JSON.parse(before);}catch{}if(!Array.isArray(cursor)||cursor.length!==2||!Number.isSafeInteger(cursor[0])||typeof cursor[1]!=='string'||cursor[1].length>512)throw new DocumentError(400,'Invalid notification cursor.');}
  const [preference]=await db.query('SELECT mode,email FROM notification_preferences WHERE user_id=?',[userId]),mode=preference?.mode??'mentions';
  const clauses=['user_id=?'],args=[userId];if(mode==='none')return json({notifications:[],next:null});if(mode!=='all')clauses.push("kind<>'comment'");if(params.get('unread')==='1')clauses.push('read_at IS NULL');
  if(cursor){clauses.push('(created_at<? OR (created_at=? AND id<?))');args.push(cursor[0],cursor[0],cursor[1]);}
  const rows=await db.query(`SELECT * FROM team_notifications WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC,id DESC LIMIT 101`,args),notifications=[];
  for(const row of rows.slice(0,100)){try{
   const access=await workspaceAccess(db,userId,row.owner),state=await collaboration.accessFor(row.document_id,access);if(state.file.deleted_at)continue;
   const [file]=await db.query('SELECT name FROM documents WHERE id=? AND owner=?',[row.document_id,row.owner]);
   notifications.push({id:row.id,documentId:row.document_id,workspace:access.workspace,name:file.name,actor:row.actor_name,kind:row.kind,targetId:row.target_id,createdAt:Number(row.created_at),read:row.read_at!==null});
  }catch(error){if(![403,404].includes(error.status))throw error;}}
  const last=rows[99];return json({notifications,next:rows.length>100?JSON.stringify([Number(last.created_at),last.id]):null});
 }
 async function reviews(request,id,access,actor){
  const state=await collaboration.accessFor(id,access);
  if(request.method==='GET'){
   const rows=await db.query('SELECT * FROM document_reviews WHERE document_id=? AND owner=? ORDER BY created_at DESC LIMIT 100',[id,access.owner]),people=await recipients(id,access);
   return json({reviews:rows.map(r=>({...r,stale:r.document_revision!==state.file.revision,reviewer:people.find(p=>p.id===r.reviewer_id)?.name??'Former teammate',requester:people.find(p=>p.id===r.requester_id)?.name??'Former teammate'})),members:people.filter(p=>p.canComment).map(p=>({id:p.id,name:p.name})),documentRevision:state.file.revision});
  }
  if(state.file.deleted_at)throw new DocumentError(409,'This file is in Trash.');
  const value=await readJSON(request),stamp=Date.now();if(!uuid(value.id))throw new DocumentError(400,'A unique review ID is required.');
  if(request.method==='POST'){
   if(!state.canEdit)throw new DocumentError(403,'Only an editor can request a review.');
   const people=await recipients(id,access);if(!people.some(p=>p.id===value.reviewerId&&p.canComment)||value.reviewerId===access.userId)throw new DocumentError(400,'Choose another teammate who can comment.');
   if(value.documentRevision!==state.file.revision)throw new DocumentError(409,'Save and load the latest version before requesting review.');
   if(typeof value.note!=='string'||value.note.length>2000)throw new DocumentError(400,'Use a review note of at most 2,000 characters.');
   const fence=(await collaboration.writeAccess(request,id,access,{lease:false})).fence;
   await db.query(`${insert} INTO document_reviews(id,document_id,owner,requester_id,reviewer_id,document_revision,note,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? FROM documents WHERE id=? AND owner=? AND revision=?${fence.sql}${conflict}`,[value.id,id,access.owner,actor.id,value.reviewerId,value.documentRevision,value.note,stamp,stamp,id,access.owner,value.documentRevision,...fence.args],'run');
   const [review]=await db.query('SELECT * FROM document_reviews WHERE id=? AND document_id=? AND owner=?',[value.id,id,access.owner]);
   if(!review||review.requester_id!==actor.id||review.reviewer_id!==value.reviewerId||review.document_revision!==value.documentRevision||review.note!==value.note)throw new DocumentError(409,'Review or access changed. Refresh and try again.');
   await event({id,access,actor,source:value.id,kind:'review_requested',targets:[value.reviewerId]});return json({id:value.id});
  }
  if(request.method!=='PATCH')throw new DocumentError(405,'Method not allowed.');
  const [review]=await db.query('SELECT * FROM document_reviews WHERE id=? AND document_id=? AND owner=?',[value.id,id,access.owner]);if(!review)throw new DocumentError(404,'Review not found.');
  if(!['approved','changes_requested','canceled'].includes(value.status))throw new DocumentError(400,'Choose a review decision.');
  if(value.status==='canceled'?!(state.canEdit&&(review.requester_id===actor.id||state.manage)):!(state.canComment&&review.reviewer_id===actor.id))throw new DocumentError(403,'Only the assigned reviewer can decide this review.');
  if(value.status!=='canceled'&&review.document_revision!==state.file.revision)throw new DocumentError(409,'The artwork changed. Ask for a new review of the current version.');
  if(review.status===value.status&&review.revision===expectedRevision(request)+1){await event({id,access,actor,source:review.id,kind:'review_'+value.status,targets:[review.requester_id]});return json({id:review.id,status:value.status});}
  if(review.status!=='pending')throw new DocumentError(409,'This review is already decided. Request a new review.');
  const fence=collaboration.policyFence(id,access,state);
  const result=await db.query('UPDATE document_reviews SET status=?,revision=revision+1,updated_at=? WHERE id=? AND document_id=? AND owner=? AND revision=? AND EXISTS (SELECT 1 FROM documents WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL)'+fence.sql,[value.status,stamp,review.id,id,access.owner,expectedRevision(request),id,access.owner,state.file.revision,...fence.args],'run');
  if(!result.changes)throw new DocumentError(409,'Review or access changed. Refresh and try again.');
  await event({id,access,actor,source:review.id,kind:'review_'+value.status,targets:[review.requester_id]});return json({id:review.id,status:value.status});
 }
 return {inbox,preferences,reviews,commentEvent,recipients};
}
