import {DocumentError} from '../lib/documents.mjs';
import {workspaceAccess} from './workspace-access.mjs';

// Read-only admin summaries. Every request rechecks current organization
// membership; installation administration does not bypass tenant boundaries.
export async function adminData(request,db,session,section){
 const params=new URL(request.url).searchParams,id=params.get('organization');
 if(!id)throw new DocumentError(400,'Choose an organization.');
 const access=await workspaceAccess(db,session.user.id,'org:'+id);
 if(!access.manage)throw new DocumentError(403,'Only organization owners and admins can open these tools.');
 if(section==='overview'){
  const [organization]=await db.query('SELECT id,name,slug FROM organization WHERE id=?',[id]);
  const [people]=await db.query('SELECT COUNT(*) AS total FROM member WHERE organizationId=?',[id]);
  const teams=await db.query('SELECT t.id,t.name,(SELECT COUNT(*) FROM teamMember tm WHERE tm.teamId=t.id) AS people FROM team t WHERE t.organizationId=? ORDER BY t.name,t.id',[id]);
  const [member]=await db.query('SELECT role FROM member WHERE organizationId=? AND userId=?',[id,session.user.id]);
  return {organization:{...organization,role:member.role},people:Number(people.total),teams:teams.map(t=>({...t,people:Number(t.people)}))};
 }
 if(section==='people'){
  const offset=Number(params.get('offset')||0),query=(params.get('q')||'').trim().slice(0,200),role=params.get('role'),team=params.get('team');
  if(!Number.isSafeInteger(offset)||offset<0)throw new DocumentError(400,'Invalid page.');
  const conditions=['m.organizationId=?'],args=[id];
  if(params.has('email')){conditions.push('LOWER(u.email)=?');args.push(params.get('email').trim().toLowerCase().slice(0,256));}
  if(query){conditions.push('(LOWER(u.name) LIKE ? ESCAPE \'!\' OR LOWER(u.email) LIKE ? ESCAPE \'!\')');const search='%'+query.toLowerCase().replace(/[!%_]/g,c=>'!'+c)+'%';args.push(search,search);}
  if(role){if(!['owner','admin','member'].includes(role))throw new DocumentError(400,'Choose a valid role.');conditions.push('(m.role=? OR m.role LIKE ? OR m.role LIKE ? OR m.role LIKE ?)');args.push(role,role+',%','%,'+role,'%,'+role+',%');}
  if(team){const [found]=await db.query('SELECT id FROM team WHERE id=? AND organizationId=?',[team,id]);if(!found)throw new DocumentError(404,'Team not found.');conditions.push('m.userId IN (SELECT userId FROM teamMember WHERE teamId=?)');args.push(team);}
  const from='FROM member m JOIN "user" u ON u.id=m.userId WHERE '+conditions.join(' AND ');
  const [count]=await db.query('SELECT COUNT(*) AS total '+from,args);
  const members=await db.query('SELECT m.id,m.userId,m.role,u.name,u.email '+from+' ORDER BY u.name,m.id LIMIT 50 OFFSET ?', [...args,offset]);
  return {members,total:Number(count.total),offset,next:offset+members.length<Number(count.total)?offset+members.length:null};
 }
 throw new DocumentError(404,'Not found.');
}
