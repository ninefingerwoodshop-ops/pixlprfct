// A link to one file for people outside its workspace. Whoever opens it must
// sign in; redeeming the link then lets that account VIEW that one file, and
// nothing else in the workspace. Access lasts only while the same link is on:
// turning it off or replacing it ends it for everyone who came in through it.
import {randomBytes} from 'node:crypto';
import {DocumentError} from '../lib/documents.mjs';
import {readJSON} from './input.mjs';
import {workspaceAccess} from './workspace-access.mjs';
const json=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
const validToken=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
// What a link guest may call. Everything else in the workspace answers 403.
const GUEST_ROUTES=[['GET',''],['GET','/editing'],['GET','/comments'],['POST','/presence'],['DELETE','/presence']];
export function guestRoute(method,path,documents){
 const match=/^\/api\/documents\/([0-9a-f-]{36})(\/[a-z]+)?$/i.exec(path);
 return !!match&&documents.includes(match[1].toLowerCase())&&GUEST_ROUTES.some(([m,suffix])=>m===method&&suffix===(match[2]??''));
}
export function shareLinks(db,collaboration,engine,baseURL,now=Date.now){
 const ignored=engine==='mysql'?'INSERT IGNORE':engine==='sqlite'?'INSERT OR IGNORE':'INSERT',suffix=engine==='postgres'?' ON CONFLICT (id) DO NOTHING':'';
 const urlFor=token=>baseURL+'/editor/account.html?join='+token;
 const guestsOf=(id,owner)=>db.query('SELECT g.user_id FROM document_guests g JOIN document_links l ON l.document_id=g.document_id AND l.token=g.token WHERE g.document_id=? AND g.owner=?',[id,owner]);
 // The files in this workspace that this account may view through a link that is still on.
 async function guestAccess(userId,workspace){
  const [kind,id,...rest]=String(workspace).split(':');if(!id||rest.length||!['org','team'].includes(kind))return null;
  const rows=await db.query('SELECT g.document_id FROM document_guests g JOIN document_links l ON l.document_id=g.document_id AND l.token=g.token WHERE g.user_id=? AND g.owner=?',[userId,workspace]);if(!rows.length)return null;
  let organizationId=id;if(kind==='team'){const [team]=await db.query('SELECT organizationId FROM team WHERE id=?',[id]);if(!team)return null;organizationId=team.organizationId;}
  return {owner:workspace,manage:false,userId,workspace,memberRole:null,organizationId,teamId:kind==='team'?id:null,guest:true,guestDocuments:rows.map(r=>String(r.document_id).toLowerCase())};
 }
 // Sign-in is already checked. A member of the workspace is simply sent to the file.
 async function redeem(request,user){
  if(request.method!=='POST')throw new DocumentError(405,'Method not allowed.');
  const {token}=await readJSON(request,1024);if(!validToken(token))throw new DocumentError(404,'This link is no longer active. Ask the person who shared it for a new one.');
  const [link]=await db.query('SELECT l.document_id,l.owner,d.name FROM document_links l JOIN documents d ON d.id=l.document_id AND d.owner=l.owner WHERE l.token=? AND d.deleted_at IS NULL',[token]);
  if(!link)throw new DocumentError(404,'This link is no longer active. Ask the person who shared it for a new one.');
  let membership=null;try{membership=await workspaceAccess(db,user.id,link.owner);}catch(error){if(error.status!==403)throw error;}
  // A member keeps the role the workspace gave them, including none: the link does not override it.
  if(membership)await collaboration.accessFor(link.document_id,membership);
  const member=!!membership;
  if(!member)await db.query(`${ignored} INTO document_guests(id,document_id,owner,user_id,token,created_at) VALUES(?,?,?,?,?,?)${suffix}`,[link.document_id+':'+user.id,link.document_id,link.owner,user.id,token,now()],'run');
  // An earlier grant from a replaced link is brought up to this one.
  if(!member)await db.query('UPDATE document_guests SET token=? WHERE id=?',[token,link.document_id+':'+user.id],'run');
  return json({id:link.document_id,workspace:link.owner,name:link.name,role:member?'member':'viewer'});
 }
 // The link itself: anyone with the file may read and copy it; only its managers change it.
 async function link(request,id,access){
  const state=await collaboration.accessFor(id,access);
  const describe=async()=>{
   const [row]=await db.query('SELECT token FROM document_links WHERE document_id=? AND owner=?',[id,access.owner]),guests=[];
   if(row&&state.manage)for(const guest of await guestsOf(id,access.owner)){const [user]=await db.query('SELECT id,name,email FROM "user" WHERE id=?',[guest.user_id]);if(user)guests.push(user);}
   return json({enabled:!!row,url:row?urlFor(row.token):null,manage:state.manage,guests});
  };
  if(request.method==='GET')return describe();
  if(request.method!=='POST')throw new DocumentError(405,'Method not allowed.');
  if(!state.manage)throw new DocumentError(403,'Only the file creator or a workspace administrator can change the link.');
  const value=await readJSON(request,1024);
  if(value.action==='remove'){if(typeof value.userId!=='string')throw new DocumentError(400,'Choose a person to remove.');await db.query('DELETE FROM document_guests WHERE id=? AND owner=?',[id+':'+value.userId,access.owner],'run');return describe();}
  if(!['create','replace','disable'].includes(value.action))throw new DocumentError(400,'Choose a valid link action.');
  const [current]=await db.query('SELECT token FROM document_links WHERE document_id=? AND owner=?',[id,access.owner]);
  if(value.action==='create'&&current)return describe();
  // Removing people and turning the link off still work in Trash; making a link does not.
  if(value.action!=='disable'&&state.file.deleted_at)throw new DocumentError(409,'Restore this file from Trash before sharing it.');
  // Off, or replaced: everyone who came in through the old link is out.
  await db.batch([db.prepare('DELETE FROM document_guests WHERE document_id=? AND owner=?').bind(id,access.owner),db.prepare('DELETE FROM document_links WHERE document_id=? AND owner=?').bind(id,access.owner)]);
  if(value.action!=='disable')await db.query('INSERT INTO document_links(document_id,owner,token,created_by,created_at) VALUES(?,?,?,?,?)',[id,access.owner,randomBytes(32).toString('base64url'),access.userId,now()],'run');
  return describe();
 }
 return {guestAccess,redeem,link};
}
