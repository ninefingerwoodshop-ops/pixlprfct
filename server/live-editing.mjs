import {DocumentError} from '../lib/documents.mjs';
import {readBody,storeBody} from '../lib/document-bodies.mjs';
import {automaticCheckpoint} from '../lib/automatic-history.mjs';
import {readJSON} from './input.mjs';
import {mergeDocuments} from '../web/document-merge.js';
import {libraryMembers} from './libraries.mjs';
import {workspaceAccess} from './workspace-access.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
const json=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
let engine;
async function normalize(body){
 if(!engine){engine=(async()=>{const {readFile}=await import('node:fs/promises'),m=await import('../web/pkg/pixlprfct_core.js');m.initSync({module:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});return m;})();}
 const {Editor}=await engine,e=new Editor();try{e.load(JSON.stringify(body));return JSON.parse(e.snapshot());}catch{throw new DocumentError(400,'These combined edits are not a valid design. Keep a local copy and resolve the overlapping structural changes.');}finally{e.free();}
}
export function liveEditing(db,bodies,collaboration,libraries,engine){
 const ignored=engine==='mysql'?'INSERT IGNORE':engine==='sqlite'?'INSERT OR IGNORE':'INSERT',suffix=engine==='postgres'?' ON CONFLICT (id) DO NOTHING':'';
 async function archive(row){await db.query(`${ignored} INTO live_versions(id,document_id,owner,revision,body) VALUES(?,?,?,?,?)${suffix}`,[row.id+':'+row.revision,row.id,row.owner,row.revision,row.body],'run');}
 async function current(id,access){const [r]=await db.query('SELECT * FROM documents WHERE id=? AND owner=? AND deleted_at IS NULL',[id,access.owner]);if(!r)throw new DocumentError(404,'File not found.');return r;}
 async function response(id,access,client,since){
  const row=await current(id,access);await archive(row);
  const people=await libraryMembers(db,access),visible=[];
  for(const p of people){try{await collaboration.accessFor(id,await workspaceAccess(db,p.id,access.owner));visible.push(p);}catch(error){if(![403,404].includes(error.status))throw error;}}
  const rows=await db.query('SELECT client_id,user_id,cursor,expires_at FROM live_clients WHERE document_id=? AND owner=? AND expires_at>? ORDER BY client_id LIMIT 100',[id,access.owner,Date.now()]);
  return {revision:row.revision,...(Number(since)!==row.revision?{body:await readBody(row.body,bodies)}:{}),presence:rows.filter(r=>visible.some(p=>p.id===r.user_id)).map(r=>({client:r.client_id,userId:r.user_id,name:visible.find(p=>p.id===r.user_id).name,cursor:JSON.parse(r.cursor),mine:r.client_id===client}))};
 }
 return async(request,id,access)=>{
  const state=await collaboration.accessFor(id,access),client=request.headers.get('x-pixl-client');if(!uuid(client))throw new DocumentError(400,'Open this file in an updated editor.');
  if(state.policy.editing_mode!=='live')throw new DocumentError(409,'Simultaneous editing is no longer enabled. Reopen the file.');
  const key=id+':'+client;
  if(request.method==='GET')return json(await response(id,access,client,new URL(request.url).searchParams.get('since')));
  if(request.method==='POST'){
   const value=await readJSON(request),cursor=value.cursor??null;
   if(cursor&&(!Number.isSafeInteger(cursor.page)||!Number.isFinite(cursor.x)||!Number.isFinite(cursor.y)||Math.abs(cursor.x)>1e9||Math.abs(cursor.y)>1e9))throw new DocumentError(400,'Invalid cursor.');
   let [session]=await db.query('SELECT * FROM live_clients WHERE id=?',[key]);
   if(session&&session.user_id!==access.userId)throw new DocumentError(409,'Open a new editor window.');
   if(!session){
    const row=await current(id,access),body=JSON.parse(await readBody(row.body,bodies));
    const start=Math.max(Number(state.policy.next_live_id),...body.shapes.map(s=>s.id+1),...(body.pages??[]).map(p=>p.id+1)),end=start+100000;
    if(end>=4294967295)throw new DocumentError(409,'This file has exhausted its editing ID ranges. Save it as a new file.');
    const fence=collaboration.policyFence(id,access,state),token=crypto.randomUUID();
    await db.batch([
     db.prepare(`INSERT INTO live_clients(id,document_id,owner,client_id,user_id,token,policy_revision,id_start,id_end,cursor,expires_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE 1=1${fence.sql}`).bind(key,id,access.owner,client,access.userId,token,state.policy.revision,start,end,'null',Date.now()+90000,...fence.args),
     db.prepare('UPDATE document_collaboration SET next_live_id=? WHERE document_id=? AND owner=? AND next_live_id=? AND revision=?').bind(end,id,access.owner,state.policy.next_live_id,state.policy.revision),
    ],{requireLastChange:true});
    [session]=await db.query('SELECT * FROM live_clients WHERE id=?',[key]);
   }
   // A policy change invalidates all tokens. Renew only after checking new rights.
   const token=session.policy_revision===state.policy.revision?session.token:crypto.randomUUID(),fence=collaboration.policyFence(id,access,state);
   const renewed=await db.query('UPDATE live_clients SET token=?,policy_revision=?,cursor=?,expires_at=? WHERE id=? AND user_id=?'+fence.sql,[token,state.policy.revision,JSON.stringify(cursor?{page:cursor.page,x:cursor.x,y:cursor.y}:null),Date.now()+90000,key,access.userId,...fence.args],'run');
   if(!renewed.changes)throw new DocumentError(409,'File access changed.');
   return json({...await response(id,access,client,value.since),token,range:[Number(session.id_start),Number(session.id_end)],canEdit:state.canEdit,role:state.role});
  }
  if(request.method!=='PUT')throw new DocumentError(405,'Method not allowed.');
  const value=await readJSON(request,5_100_000);if(!uuid(value.mutationId)||!Number.isSafeInteger(value.baseRevision)||value.baseRevision<1)throw new DocumentError(400,'A unique edit and base revision are required.');
  const mutation=id+':'+access.userId+':'+value.mutationId;
  for(let attempt=0;attempt<5;attempt++){
   const rights=await collaboration.writeAccess(request,id,access),row=await current(id,access),[done]=await db.query('SELECT id FROM live_mutations WHERE id=?',[mutation]);
   if(done)return json(await response(id,access,client,0));
   const [base]=await db.query('SELECT body FROM live_versions WHERE document_id=? AND owner=? AND revision=?',[id,access.owner,value.baseRevision]);
   if(!base)throw new DocumentError(409,'This editing base is unavailable. Save a copy and reopen the latest file.');
   const before=JSON.parse(await readBody(row.body,bodies)),original=JSON.parse(await readBody(base.body,bodies)),local=await normalize(value.document),merged=mergeDocuments(original,local,before);
   if(merged.conflicts.length)return json({error:'Overlapping edits need your choice.',conflicts:merged.conflicts,revision:row.revision,body:JSON.stringify(before)},409);
   const after=await normalize(merged.document);await libraries.guard({id,before,after,method:'PUT'},access);
   const stamp=Date.now(),body=await storeBody(JSON.stringify(after),bodies),fence=rights.fence;
   await archive(row);
   try{
    await db.batch([
     automaticCheckpoint(db,{id,owner:access.owner,revision:row.revision,now:stamp,fence}),
     db.prepare('INSERT INTO live_mutations(id,document_id,revision) VALUES(?,?,?)').bind(mutation,id,row.revision+1),
     db.prepare('UPDATE documents SET body=?,name=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL'+fence.sql).bind(body,after.name,stamp,id,access.owner,row.revision,...fence.args),
    ],{requireLastChange:true});
    return json(await response(id,access,client,0));
   }catch(error){if(error.status!==409&&!['23505','SQLITE_CONSTRAINT_PRIMARYKEY','ERR_SQLITE_ERROR','ER_DUP_ENTRY'].includes(error.code))throw error;if(attempt===4)throw new DocumentError(409,'The file is busy. Your changes are retained; retry saving.');}
  }
 };
}
