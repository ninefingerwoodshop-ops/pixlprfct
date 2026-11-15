// Storage accounting, optional per-owner quotas, and safe removal of large
// document bodies that no saved row references any more.
//
// Large bodies are content-addressed objects (`documents/<sha256>`) referenced
// from rows as `@pixlprfct-r2:<sha256>`. Saves inside the 5-minute automatic
// history window, lost compare-and-swap races and pruned live-edit bases leave
// objects that nothing references. Each object store keeps a tracker row
// (`id`, `bytes`, `touched_at`) that every write refreshes *before* the row that
// references the object is committed. A sweep only removes objects that are
// unreferenced and have not been touched for the grace period.
import {DocumentError} from './documents.mjs';
import {BODY_POINTER_PREFIX} from './document-bodies.mjs';

export const OBJECT_PREFIX='documents/';
export const SWEEP_GRACE_MS=24*60*60*1000;
const pointerLike=BODY_POINTER_PREFIX+'%';
const hashOf=id=>id.slice(OBJECT_PREFIX.length);
export const utf8Bytes=value=>new TextEncoder().encode(value).length;

// Tables whose `body` column may hold an object reference. live_versions exists
// only on the self-hosted server.
// Permanent deletion removes every row keyed by `document_id` in these tables
// together with the file. A row in a PROTECTED table (keyed by the file id)
// blocks it: other files may still depend on a published library.
export const DEPENDENT_TABLES=Object.freeze({cloud:['document_versions'],selfHosted:['document_versions','live_versions','live_mutations','live_clients','document_presence','document_collaboration','document_edit_requests','document_comments','document_reviews','team_notifications']});
export const PROTECTED_TABLES=Object.freeze({cloud:[],selfHosted:['component_libraries']});
export const REFERENCE_TABLES=Object.freeze({cloud:['documents','document_versions'],selfHosted:['documents','document_versions','live_versions']});

const unreferenced=tables=>tables.map(t=>`NOT EXISTS (SELECT 1 FROM ${t} WHERE body=?)`).join(' AND ');

/** Bytes stored for an owner: inline bodies plus each referenced object once. */
export async function storageUsage(db,owner,{tables=REFERENCE_TABLES.cloud,objects='document_objects'}={}){
 const inline=tables.map(t=>`(SELECT COALESCE(SUM(body_bytes),0) FROM ${t} WHERE owner=? AND body NOT LIKE ?)`).join(' + ');
 const referenced=tables.map(t=>`SELECT substr(body,${BODY_POINTER_PREFIX.length+1}) FROM ${t} WHERE owner=? AND body LIKE ?`).join(' UNION ');
 const row=await db.prepare(`SELECT ${inline} AS inline_bytes,(SELECT COALESCE(SUM(bytes),0) FROM ${objects} WHERE substr(id,${OBJECT_PREFIX.length+1}) IN (${referenced})) AS object_bytes`)
  .bind(...tables.flatMap(()=>[owner,pointerLike]),...tables.flatMap(()=>[owner,pointerLike])).first();
 const inlineBytes=Number(row?.inline_bytes??0),objectBytes=Number(row?.object_bytes??0);
 return {bytes:inlineBytes+objectBytes,inlineBytes,objectBytes};
}

export function quotaFromMegabytes(value){
 if(value===undefined||value===null||value==='')return null;
 const megabytes=Number(value);
 if(!Number.isFinite(megabytes)||megabytes<1||megabytes>1_000_000)throw new Error('PIXL_STORAGE_QUOTA_MB must be a number of megabytes from 1 to 1000000.');
 return Math.floor(megabytes*1_000_000);
}

const megabytes=bytes=>(bytes/1_000_000).toFixed(bytes<10_000_000?1:0)+' MB';
/** Rejects a write that would add `added` bytes beyond the owner's quota. Quotas are optional. */
export async function assertStorageQuota(db,owner,added,storage){
 const quota=storage?.quota;if(!quota||added<=0)return;
 const usage=await storageUsage(db,owner,storage);
 if(usage.bytes+added>quota)throw new DocumentError(507,`Cloud storage is full: ${megabytes(usage.bytes)} of ${megabytes(quota)} used, including Trash and version history. Ask an administrator for more storage. Your local copy is still available.`);
}

/** Stored bytes of a document's current body: inline length, or its object's size. */
export async function currentBodyBytes(db,id,owner,{objects='document_objects'}={}){
 const row=await db.prepare(`SELECT body_bytes,CASE WHEN body LIKE ? THEN substr(body,${BODY_POINTER_PREFIX.length+1}) ELSE NULL END AS hash FROM documents WHERE id=? AND owner=?`).bind(pointerLike,id,owner).first();
 if(!row)return 0;if(!row.hash)return Number(row.body_bytes??0);
 const object=await db.prepare(`SELECT bytes FROM ${objects} WHERE id=?`).bind(OBJECT_PREFIX+row.hash).first();return Number(object?.bytes??0);
}

/** Wraps R2 so every upload first refreshes its D1 tracker row. */
export function trackedObjectStore(db,bucket,clock=()=>Date.now()){
 if(!bucket)return null;
 return {
  async put(key,bytes,options){
   await db.prepare('INSERT INTO document_objects(id,bytes,touched_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET bytes=excluded.bytes,touched_at=excluded.touched_at').bind(key,bytes.length,clock()).run();
   return bucket.put(key,bytes,options);
  },
  get:key=>bucket.get(key),
 };
}

/**
 * Removes unreferenced R2 objects. The D1 tracker delete is the commit point:
 * it succeeds only if no row references the object and no write touched it
 * during the grace period. If a write touches the object after that point,
 * the re-check below restores the bytes it read before deleting.
 */
export async function sweepObjects(db,bucket,{now=Date.now(),grace=SWEEP_GRACE_MS,limit=50,cursor}={}){
 const cutoff=now-grace,tables=REFERENCE_TABLES.cloud,listing=await bucket.list({prefix:OBJECT_PREFIX,limit,...(cursor?{cursor}:{})});
 let deleted=0,freed=0,restored=0;
 for(const object of listing.objects){
  const key=object.key,hash=hashOf(key);if(!/^[0-9a-f]{64}$/.test(hash))continue;
  const pointer=BODY_POINTER_PREFIX+hash,uploaded=+new Date(object.uploaded);
  if(!(uploaded<cutoff))continue;
  // Objects stored before tracking existed get a tracker dated by their upload.
  await db.prepare('INSERT INTO document_objects(id,bytes,touched_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').bind(key,object.size,uploaded).run();
  const claim=await db.prepare(`DELETE FROM document_objects WHERE id=? AND touched_at<? AND ${unreferenced(tables)}`).bind(key,cutoff,...tables.map(()=>pointer)).run();
  if(!claim.meta.changes)continue;
  const stored=await bucket.get(key);if(!stored)continue;
  const bytes=new Uint8Array(await stored.arrayBuffer());
  await bucket.delete(key);
  const again=await db.prepare(`SELECT 1 AS present FROM document_objects WHERE id=? UNION ALL ${tables.map(t=>`SELECT 1 FROM ${t} WHERE body=?`).join(' UNION ALL ')} LIMIT 1`).bind(key,...tables.map(()=>pointer)).first();
  if(again){
   await bucket.put(key,bytes,{httpMetadata:{contentType:'application/json'}});
   await db.prepare('INSERT INTO document_objects(id,bytes,touched_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').bind(key,bytes.length,now).run();
   restored++;continue;
  }
  deleted++;freed+=bytes.length;
 }
 return {deleted,freed,restored,cursor:listing.truncated?listing.cursor:null};
}

const MAINTENANCE_INTERVAL_MS=6*60*60*1000;
/**
 * Runs one bounded sweep page at most every six hours, claimed atomically so
 * concurrent requests do not repeat it. Failures never affect the caller.
 */
export async function maybeSweepObjects(db,bucket,{now=Date.now(),limit=25}={}){
 if(!db||!bucket?.list||!bucket.delete)return null;
 try{
  const row=await db.prepare("SELECT next_run,cursor FROM storage_maintenance WHERE id='objects'").bind().first();
  if(!row||Number(row.next_run)>now)return null;
  const claim=await db.prepare("UPDATE storage_maintenance SET next_run=? WHERE id='objects' AND next_run=?").bind(now+MAINTENANCE_INTERVAL_MS,row.next_run).run();
  if(!claim.meta.changes)return null;
  const result=await sweepObjects(db,bucket,{now,limit,cursor:row.cursor||undefined});
  // Continue a long listing soon; start over from the beginning after the last page.
  await db.prepare("UPDATE storage_maintenance SET cursor=?,next_run=? WHERE id='objects'").bind(result.cursor,result.cursor?now+60_000:now+MAINTENANCE_INTERVAL_MS).run();
  return result;
 }catch(error){console.error('Storage maintenance failed',error);return null;}
}

/** Self-hosted bodies live in SQL, so the delete and its reference check are one statement. */
export async function sweepDatabaseBodies(db,{now=Date.now(),grace=SWEEP_GRACE_MS,limit=500,tables=REFERENCE_TABLES.selfHosted}={}){
 const cutoff=now-grace;let deleted=0,freed=0,after='';
 for(;;){
  const rows=await db.query('SELECT id,bytes FROM document_bodies WHERE touched_at<? AND id>? ORDER BY id LIMIT ?',[cutoff,after,limit]);
  for(const row of rows){
   after=row.id;const hash=hashOf(row.id);if(!row.id.startsWith(OBJECT_PREFIX)||!/^[0-9a-f]{64}$/.test(hash))continue;
   const pointer=BODY_POINTER_PREFIX+hash,result=await db.query(`DELETE FROM document_bodies WHERE id=? AND touched_at<? AND ${unreferenced(tables)}`,[row.id,cutoff,...tables.map(()=>pointer)],'run');
   if(result.changes){deleted++;freed+=Number(row.bytes??0);}
  }
  if(rows.length<limit)break;
 }
 return {deleted,freed};
}
