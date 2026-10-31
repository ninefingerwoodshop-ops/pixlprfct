import {DocumentError} from '../lib/documents.mjs';
export async function workspaceAccess(db,userId,workspace='personal') {
 if(workspace==='personal')return {owner:'user:'+userId,manage:true,userId,workspace};
 const [kind,id,...rest]=workspace.split(':');if(!id||rest.length||!['org','team'].includes(kind))throw new DocumentError(400,'Choose a valid workspace.');
 let org=id;if(kind==='team'){const [team]=await db.query('SELECT organizationId FROM team WHERE id=?',[id]);if(!team)throw new DocumentError(403,'You no longer have access to this team.');org=team.organizationId;}
 const [member]=await db.query('SELECT role FROM member WHERE organizationId=? AND userId=?',[org,userId]);
 const manage=!!member?.role.split(',').some(role=>['owner','admin'].includes(role));
 if(!member)throw new DocumentError(403,'You no longer have access to this workspace.');
 if(kind==='team'&&!manage&&!(await db.query('SELECT id FROM teamMember WHERE teamId=? AND userId=?',[id,userId])).length)throw new DocumentError(403,'You no longer have access to this team.');
 return {owner:workspace,manage,userId,workspace,memberRole:member.role,organizationId:org,teamId:kind==='team'?id:null};
}
