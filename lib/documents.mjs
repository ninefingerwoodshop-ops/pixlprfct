import {storeBody,readBody} from './document-bodies.mjs';
import {automaticCheckpoint} from './automatic-history.mjs';
const LIMIT=5_000_000;
export class DocumentError extends Error {constructor(status,message){super(message);this.status=status;}}
export function requestUser(request){const id=request.headers.get('oai-authenticated-user-id');if(!id)throw new DocumentError(401,'Sign in to access cloud files.');return id;}
export function checkOrigin(request){if(!['GET','HEAD'].includes(request.method)){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new DocumentError(403,'Cross-origin writes are not allowed.');if(request.headers.get('sec-fetch-site')==='cross-site')throw new DocumentError(403,'Cross-site writes are not allowed.');}}
export async function readDocument(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new DocumentError(415,'Send a JSON design document.');
 const reader=request.body?.getReader();if(!reader)throw new DocumentError(400,'Missing design document.');let size=0,chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();throw new DocumentError(413,'Designs must be smaller than 5 MB.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let body,doc;try{body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);doc=JSON.parse(body);}catch{throw new DocumentError(400,'Invalid design JSON.');}
 if(!doc||typeof doc!=='object'||![1,2].includes(doc.version)||!Array.isArray(doc.shapes)||doc.shapes.length>10000||typeof doc.name!=='string'||!doc.name.trim()||new TextEncoder().encode(doc.name).length>256)throw new DocumentError(400,'Invalid design document.');
 if(doc.version===2&&(!Array.isArray(doc.pages)||doc.pages.length<1||doc.pages.length>100))throw new DocumentError(400,'Invalid design pages.');
 return {body,name:doc.name};
}
export function expectedRevision(request){const value=request.headers.get('if-match');if(!value||!/^"?[1-9][0-9]*"?$/.test(value))throw new DocumentError(428,'A document revision is required.');const revision=Number(value.replaceAll('"',''));if(!Number.isSafeInteger(revision))throw new DocumentError(400,'Invalid revision.');return revision;}
const meta='id,name,revision,created_at,updated_at,deleted_at';
/** @param {Request} request @param {object|undefined|null} db @param {string|null} id @param {import('./document-bodies.mjs').BodyStore|null} bucket */
export async function documentApi(request,db,id=null,bucket=null,guard=null){
 try{
  checkOrigin(request);const owner=requestUser(request);if(!db)throw new DocumentError(503,'Cloud storage is temporarily unavailable.');
  if(id&&!/^[0-9a-f-]{36}$/i.test(id))throw new DocumentError(404,'File not found.');
  const method=request.method;
  if(!id&&method==='GET'){
   const params=new URL(request.url).searchParams,trash=params.get('trash')==='1',search=(params.get('search')??'').trim();if(search.length>256)throw new DocumentError(400,'Search is too long.');
   let cursor=null;if(params.has('before')){try{cursor=JSON.parse(params.get('before'));}catch{}if(!Array.isArray(cursor)||cursor.length!==2||!Number.isSafeInteger(cursor[0])||typeof cursor[1]!=='string'||!/^[0-9a-f-]{36}$/i.test(cursor[1]))throw new DocumentError(400,'Invalid file cursor.');}
   const conditions=['owner=?',trash?'deleted_at IS NOT NULL':'deleted_at IS NULL'],args=[owner];
   if(search){conditions.push("instr(lower(name),lower(?))>0");args.push(search);}
   if(cursor){conditions.push('(updated_at<? OR (updated_at=? AND id<?))');args.push(cursor[0],cursor[0],cursor[1]);}
   const {results}=await db.prepare(`SELECT ${meta} FROM documents WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC,id DESC LIMIT 41`).bind(...args).all();const documents=results.slice(0,40),last=documents.at(-1);return json({documents,next:results.length>40?JSON.stringify([last.updated_at,last.id]):null});
  }
  if(!id&&method==='POST'){const design=await readDocument(request);if(guard)await guard({id:null,before:null,after:JSON.parse(design.body),method});const name=design.name,body=await storeBody(design.body,bucket),id=crypto.randomUUID(),now=Date.now();await db.prepare('INSERT INTO documents(id,owner,name,body,revision,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').bind(id,owner,name,body,now,now).run();return json({id,name,revision:1,created_at:now,updated_at:now},201);}
  if(id&&method==='GET'){const row=await db.prepare(`SELECT ${meta},body FROM documents WHERE id=? AND owner=?`).bind(id,owner).first();if(!row)throw new DocumentError(404,'File not found.');row.body=await readBody(row.body,bucket);return json(row);}
  if(id&&['PUT','DELETE','PATCH'].includes(method)){
   const revision=expectedRevision(request),now=Date.now();let result;
   const previous=guard?await db.prepare('SELECT body,revision FROM documents WHERE id=? AND owner=?').bind(id,owner).first():null;
   if(guard&&(!previous||previous.revision!==revision))throw new DocumentError(previous?409:404,previous?'The file changed. Open its latest version.':'File not found.');
   if(guard&&method!=='PUT')await guard({id,before:JSON.parse(await readBody(previous.body,bucket)),after:null,method});
   if(method==='PUT'){const current=await db.prepare('SELECT revision,deleted_at FROM documents WHERE id=? AND owner=?').bind(id,owner).first();if(!current)throw new DocumentError(404,'File not found.');if(current.revision!==revision||current.deleted_at)throw new DocumentError(409,'This file changed on another device. Open the latest version or save your work as a separate file.');const design=await readDocument(request);if(guard)await guard({id,before:JSON.parse(await readBody(previous.body,bucket)),after:JSON.parse(design.body),method});const name=design.name,body=await storeBody(design.body,bucket);const results=await db.batch([automaticCheckpoint(db,{id,owner,revision,now}),db.prepare('UPDATE documents SET body=?,name=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL').bind(body,name,now,id,owner,revision)]);result=results[1];}
   else if(method==='DELETE')result=await db.prepare('UPDATE documents SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL').bind(now,now,id,owner,revision).run();
   else result=await db.prepare('UPDATE documents SET deleted_at=NULL,updated_at=?,revision=revision+1 WHERE id=? AND owner=? AND revision=? AND deleted_at IS NOT NULL').bind(now,id,owner,revision).run();
   if(!result.meta.changes){const exists=await db.prepare('SELECT revision,deleted_at FROM documents WHERE id=? AND owner=?').bind(id,owner).first();if(!exists)throw new DocumentError(404,'File not found.');return json({error:'This file changed on another device. Open the latest version or save your work as a separate file.',conflict:true,...exists},409);}
   return json({id,revision:revision+1,updated_at:now,deleted_at:method==='DELETE'?now:null});
  }
  return json({error:'Method not allowed.'},405);
 }catch(error){if(error instanceof DocumentError)return json({error:error.message},error.status);console.error('Cloud document request failed',error);return json({error:'Cloud storage is temporarily unavailable. Your local copy is still available.'},503);}
}
function json(value,status=200){return Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});}
