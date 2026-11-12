// Who has a file open right now, where their pointer is and what they are
// looking at. Every open editor sends a heartbeat, in any editing mode and with
// any role that can see the file, and gets the list back. A row lives for a few
// seconds, so closing the tab or losing access removes a person without a call.
import {DocumentError} from '../lib/documents.mjs';
import {readJSON} from './input.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
const json=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
const finite=(...values)=>values.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e9);
export const PRESENCE_TTL=10000,PRESENCE_LIMIT=100;
// Only the fields below are stored, so one client cannot plant anything else in another's page.
export function presenceState(value){
 const cursor=value?.cursor??null,view=value?.view??null,following=value?.following??null;
 if(cursor&&(!Number.isSafeInteger(cursor.page)||!finite(cursor.x,cursor.y)))throw new DocumentError(400,'Invalid cursor.');
 if(view&&(!Number.isSafeInteger(view.page)||!finite(view.x,view.y,view.width,view.height)||view.width<=0||view.height<=0))throw new DocumentError(400,'Invalid view.');
 if(following!==null&&!uuid(following))throw new DocumentError(400,'Invalid person to follow.');
 return {cursor:cursor?{page:cursor.page,x:cursor.x,y:cursor.y}:null,view:view?{page:view.page,x:view.x,y:view.y,width:view.width,height:view.height}:null,following};
}
export function presence(db,collaboration,engine,now=Date.now){
 const ignored=engine==='mysql'?'INSERT IGNORE':engine==='sqlite'?'INSERT OR IGNORE':'INSERT',suffix=engine==='postgres'?' ON CONFLICT (id) DO NOTHING':'';
 return async(request,id,access)=>{
  const client=request.headers.get('x-pixl-client');if(!uuid(client))throw new DocumentError(400,'Open this file in an updated editor.');
  const key=id+':'+client,stamp=now();
  if(request.method==='DELETE'){await db.query('DELETE FROM document_presence WHERE id=? AND user_id=?',[key,access.userId],'run');return json({ok:true});}
  if(request.method!=='POST')throw new DocumentError(405,'Method not allowed.');
  // Checked on every heartbeat: someone whose access ends drops out within one lifetime.
  await collaboration.accessFor(id,access);
  const state=JSON.stringify(presenceState(await readJSON(request,4096)));
  const updated=await db.query('UPDATE document_presence SET state=?,expires_at=? WHERE id=? AND user_id=?',[state,stamp+PRESENCE_TTL,key,access.userId],'run');
  if(!updated.changes){
   const [taken]=await db.query('SELECT user_id FROM document_presence WHERE id=?',[key]);if(taken)throw new DocumentError(409,'Open a new editor window.');
   const [{n}]=await db.query('SELECT COUNT(*) AS n FROM document_presence WHERE document_id=? AND owner=? AND expires_at>?',[id,access.owner,stamp]);
   if(Number(n)>=PRESENCE_LIMIT)throw new DocumentError(409,'This file has too many people in it right now.');
   await db.query(`${ignored} INTO document_presence(id,document_id,owner,client_id,user_id,state,expires_at) VALUES(?,?,?,?,?,?,?)${suffix}`,[key,id,access.owner,client,access.userId,state,stamp+PRESENCE_TTL],'run');
  }
  await db.query('DELETE FROM document_presence WHERE document_id=? AND expires_at<=?',[id,stamp],'run');
  const rows=await db.query('SELECT client_id,user_id,state FROM document_presence WHERE document_id=? AND owner=? AND expires_at>? ORDER BY client_id LIMIT '+PRESENCE_LIMIT,[id,access.owner,stamp]),names=new Map();
  for(const row of rows)if(!names.has(row.user_id)){const [user]=await db.query('SELECT name FROM "user" WHERE id=?',[row.user_id]);names.set(row.user_id,user?.name??'Someone');}
  return json({presence:rows.map(row=>({client:row.client_id,userId:row.user_id,name:names.get(row.user_id),...JSON.parse(row.state),mine:row.client_id===client}))});
 };
}
