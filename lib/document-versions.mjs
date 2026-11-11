import {readBody,BODY_POINTER_PREFIX} from './document-bodies.mjs';
import {assertStorageQuota,utf8Bytes} from './document-storage.mjs';
import {DocumentError,requestUser,checkOrigin,expectedRevision} from './documents.mjs';
const uuid=id=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id);
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const insert='INSERT INTO document_versions(id,document_id,owner,name,body,body_bytes,label,revision,created_at) SELECT ?,id,owner,name,body,body_bytes,?,revision,? FROM documents WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL';
async function copiedBytes(db,id,owner){const row=await db.prepare('SELECT body,body_bytes FROM documents WHERE id=? AND owner=?').bind(id,owner).first();return !row||row.body.startsWith(BODY_POINTER_PREFIX)?0:Number(row.body_bytes??utf8Bytes(row.body));}
/** @param {Request} request @param {object|undefined|null} db @param {string} documentId @param {string|null} versionId @param {boolean} restore @param {import('./document-bodies.mjs').BodyStore|null} bucket @param {unknown} [guard] @param {{sql:string,args:unknown[]}|null} [writeFence] @param {{quota?:number|null,tables?:string[],objects?:string}|null} [storage] */
export async function versionApi(request,db,documentId,versionId=null,restore=false,bucket=null,guard=null,writeFence=null,storage=null,access=null){
 const fence=writeFence??{sql:'',args:[]};
 try{
  checkOrigin(request);const owner=requestUser(request);if(!db)throw new DocumentError(503,'Cloud storage is temporarily unavailable.');if(!uuid(documentId)||(versionId&&!uuid(versionId)))throw new DocumentError(404,'Version not found.');
  const current=await db.prepare('SELECT revision,deleted_at,created_by FROM documents WHERE id=? AND owner=?').bind(documentId,owner).first();if(!current)throw new DocumentError(404,'File not found.');
  if(request.method==='GET'&&!versionId){
   let cursor=null;const value=new URL(request.url).searchParams.get('before');if(value){try{cursor=JSON.parse(value);}catch{}if(!Array.isArray(cursor)||cursor.length!==2||!Number.isSafeInteger(cursor[0])||!uuid(cursor[1]))throw new DocumentError(400,'Invalid history cursor.');}
   const args=[documentId,owner,...(cursor?[cursor[0],cursor[0],cursor[1]]:[])];const {results}=await db.prepare(`SELECT id,label,name,revision,created_at,kind FROM document_versions WHERE document_id=? AND owner=? ${cursor?'AND (created_at<? OR (created_at=? AND id<?))':''} ORDER BY created_at DESC,id DESC LIMIT 41`).bind(...args).all();const versions=results.slice(0,40),last=versions.at(-1);return json({versions,next:results.length>40?JSON.stringify([last.created_at,last.id]):null});
  }
  if(request.method==='GET'&&versionId){const version=await db.prepare('SELECT id,document_id,label,name,body,revision,created_at,kind FROM document_versions WHERE id=? AND document_id=? AND owner=?').bind(versionId,documentId,owner).first();if(!version)throw new DocumentError(404,'Version not found.');version.body=await readBody(version.body,bucket);return json(version);}
  if(request.method==='DELETE'&&!restore){
   // The write fence is written against the documents table, so it is applied through it.
   // Deleting history is as final as deleting the file, so it needs the same rights.
   const actor=access??{manage:true};
   if(!actor.manage&&!(current.created_by&&current.created_by===actor.userId))throw new DocumentError(403,'Only the project creator or an administrator can delete saved versions.');
   if(versionId){
    const result=await db.prepare('DELETE FROM document_versions WHERE id=? AND document_id=? AND owner=? AND EXISTS (SELECT 1 FROM documents WHERE id=? AND owner=?'+fence.sql+')').bind(versionId,documentId,owner,documentId,owner,...fence.args).run();
    if(!result.meta.changes)throw new DocumentError(404,'Version not found.');
    return json({id:versionId,deleted:true});
   }
   // Bulk removal is limited to automatic backups older than a given time; named versions are never swept.
   const params=new URL(request.url).searchParams,before=Number(params.get('before'));
   if(params.get('automatic')!=='1'||!params.has('before')||!Number.isSafeInteger(before)||before<0)throw new DocumentError(400,'Choose which automatic backups to delete.');
   const result=await db.prepare("DELETE FROM document_versions WHERE document_id=? AND owner=? AND kind='automatic' AND created_at<? AND EXISTS (SELECT 1 FROM documents WHERE id=? AND owner=?"+fence.sql+')').bind(documentId,owner,before,documentId,owner,...fence.args).run();
   return json({deleted:Number(result.meta.changes??0)});
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  const revision=expectedRevision(request);if(current.deleted_at)throw new DocumentError(409,'Restore this file from Trash before changing its history.');if(current.revision!==revision)throw new DocumentError(409,'This file changed on another device. Open the latest version before changing its history.');
  const now=Date.now(),id=crypto.randomUUID();
  if(!versionId){
   // Labels travel in a bounded header; no document contents are accepted here.
   let label;try{label=decodeURIComponent(request.headers.get('x-version-label')??'');}catch{throw new DocumentError(400,'Invalid version name.');}label=label.trim();if(!label||new TextEncoder().encode(label).length>256)throw new DocumentError(400,'Name this version using at most 256 bytes.');
   if(storage?.quota)await assertStorageQuota(db,owner,await copiedBytes(db,documentId,owner),storage);
   const result=await db.prepare(insert+fence.sql).bind(id,label,now,documentId,owner,revision,...fence.args).run();if(!result.meta.changes)throw new DocumentError(409,'The file changed while saving this version. Try again.');return json({id,label,revision,created_at:now},201);
  }
  if(!restore)return json({error:'Method not allowed.'},405);
  const version=await db.prepare('SELECT name,body,body_bytes FROM document_versions WHERE id=? AND document_id=? AND owner=?').bind(versionId,documentId,owner).first();if(!version)throw new DocumentError(404,'Version not found.');
  const restoredBody=await readBody(version.body,bucket);
  // The current body moves into a version, so only an inline restored body adds bytes.
  if(storage?.quota)await assertStorageQuota(db,owner,version.body.startsWith(BODY_POINTER_PREFIX)?0:Number(version.body_bytes??utf8Bytes(version.body)),storage);
  if(guard){const row=await db.prepare('SELECT body FROM documents WHERE id=? AND owner=?').bind(documentId,owner).first();await guard({id:documentId,before:JSON.parse(await readBody(row.body,bucket)),after:JSON.parse(restoredBody),method:'PUT'});}
  // D1 batch is transactional: preserve the current design and restore together.
  const results=await db.batch([
   db.prepare(insert+fence.sql).bind(id,'Before restore',now,documentId,owner,revision,...fence.args),
   db.prepare('UPDATE documents SET name=?,body=?,body_bytes=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL'+fence.sql).bind(version.name,version.body,version.body_bytes??utf8Bytes(version.body),now,documentId,owner,revision,...fence.args),
  ],{requireLastChange:true});
  if(!results[1].meta.changes)throw new DocumentError(409,'The file changed while restoring. Your current design was not replaced.');
  return json({id:documentId,name:version.name,body:restoredBody,revision:revision+1,updated_at:now,deleted_at:null});
 }catch(error){if(error instanceof DocumentError)return json({error:error.message},error.status);console.error('Document history request failed',error);return json({error:'Version history is temporarily unavailable.'},503);}
}
