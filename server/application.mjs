import {liveEditing} from './live-editing.mjs';
import {onboarding} from './onboarding.mjs';
import {documentApi,DocumentError,checkOrigin} from '../lib/documents.mjs';
import {workspaceAccess} from './workspace-access.mjs';
import {libraryService} from './libraries.mjs';
import QRCode from 'qrcode';
import {databaseBodyStore} from './database.mjs';
import {versionApi} from '../lib/document-versions.mjs';
import {adminData} from './admin.mjs';
import {collaborationService} from './collaboration.mjs';
import {teamActivity} from './team-activity.mjs';
import {readJSON} from './input.mjs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const isAdmin=(session,config)=>session?.user.emailVerified&&session.user.email.toLowerCase()===config.adminEmail;
export function createApplication({config,db,auth,operations}) {
 const bodies=databaseBodyStore(db,config.engine);
 async function sessionFor(request){const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)throw new DocumentError(401,'Sign in with a verified account to continue.');return session;}
 const libraries=libraryService(db,bodies,{canReadDocument:async(id,access)=>{try{await collaboration.accessFor(id,access);return true;}catch(error){if(error.status===403)return false;throw error;}}});
 const collaboration=collaborationService(db,config.engine);
 const live=liveEditing(db,bodies,collaboration,libraries,config.engine);
 const activity=teamActivity(db,config.engine,collaboration);
 const accessFor=(request,session)=>workspaceAccess(db,session.user.id,new URL(request.url).searchParams.get('workspace')||'personal');
 async function documentOwner(request,session){return (await accessFor(request,session)).owner;}

 return async request=>{
   try {
     const url=new URL(request.url),path=url.pathname;
     if(path==='/api/health'&&request.method==='GET'){await db.query('SELECT 1 AS ready');return json({status:'ready'});}
     if(path==='/api/installation'&&request.method==='GET')return json({mode:'self-hosted',provider:config.provider,registration:config.registration,localDevelopment:config.local,emailVerification:true});
     if(!['GET','HEAD'].includes(request.method)){
       checkOrigin(request);
       if(request.headers.get('origin')!==config.baseURL)throw new DocumentError(403,'Requests must come from this installation.');
     }
     if(path.startsWith('/api/auth/')){
       const response=await auth.handler(request);
       if(path==='/api/auth/two-factor/enable'&&response.ok){
         const data=await response.json(),headers=new Headers(response.headers);headers.delete('content-length');
         if(data.totpURI)data.qrCode=await QRCode.toDataURL(data.totpURI,{width:240,margin:2});
         return new Response(JSON.stringify(data),{status:response.status,headers});
       }
       return response;
     }
     const session=await sessionFor(request);
     if(path==='/api/installation/operations'||path==='/api/installation/verify-mail'){
       if(!isAdmin(session,config))throw new DocumentError(403,'Only the installation administrator can inspect operations.');
       if(!operations)throw new DocumentError(503,'Operations monitoring is unavailable.');
       if(path.endsWith('verify-mail')&&request.method==='POST')return json(await operations.verifyMail());
       if(path.endsWith('operations')&&request.method==='GET')return json(await operations.status());
       throw new DocumentError(405,'Method not allowed.');
     }
     if(path==='/api/onboarding'&&request.method==='GET')return json(await onboarding(db,await accessFor(request,session),collaboration));
     if(path==='/api/notifications/preferences')return await activity.preferences(session.user.id,request);
     if(path==='/api/notifications')return await activity.inbox(request,session.user.id);
     const adminMatch=path.match(/^\/api\/admin\/(overview|people)$/);
     if(adminMatch&&request.method==='GET')return json(await adminData(request,db,session,adminMatch[1]));
     if(path==='/api/installation/check'&&request.method==='POST'){
       if(!isAdmin(session,config))throw new DocumentError(403,'Only the installation administrator can check server configuration.');
       await db.query('SELECT 1 AS ready');
       return json({database:'Connected',accounts:'Ready',email:config.smtpUrl?'Configured':'Private development outbox',https:!config.local,provider:config.provider});
     }
     if(path==='/api/workspaces'&&request.method==='GET'){
       const organizations=await auth.api.listOrganizations({headers:request.headers});
       const teams=await auth.api.listUserTeams({headers:request.headers});
       for(const org of organizations){
         const [member]=await db.query('SELECT role FROM member WHERE organizationId=? AND userId=?',[org.id,session.user.id]);
         org.role=member?.role??'member';
         if(member?.role.split(',').some(role=>['owner','admin'].includes(role))){
           const managed=await db.query('SELECT id,name,organizationId FROM team WHERE organizationId=?',[org.id]);
           for(const team of managed)if(!teams.some(item=>item.id===team.id))teams.push(team);
         }
       }
       return json({user:{id:session.user.id,name:session.user.name,email:session.user.email,twoFactorEnabled:!!session.user.twoFactorEnabled},administrator:!!isAdmin(session,config),organizations,teams});
     }
     const teamMatch=path.match(/^\/api\/teams\/([0-9a-f-]{36})\/members$/i);
     if(teamMatch&&request.method==='GET'){
       const target=new URL(request.url);target.searchParams.set('workspace','team:'+teamMatch[1]);
       await documentOwner(new Request(target,{headers:request.headers}),session);
       return json(await db.query('SELECT id,userId FROM teamMember WHERE teamId=?',[teamMatch[1]]));
     }
     const libraryMatch=path.match(/^\/api\/libraries(?:\/([0-9a-f-]{36})(?:\/(access|releases|usage|lifecycle))?)?$/i);
     if(libraryMatch){
       const access=await accessFor(request,session),id=libraryMatch[1]??null;
       let fence=null;
       if(access.organizationId&&id){await collaboration.accessFor(id,access);if(!['GET','HEAD'].includes(request.method))fence=(await collaboration.writeAccess(request,id,access,{lease:request.method==='PUT'})).fence;}
       const response=await libraries.api(request,access,id,libraryMatch[2]??null,fence);
       if(access.organizationId&&!id&&response.ok){const data=await response.json(),visible=[];for(const item of data.libraries){try{await collaboration.accessFor(item.id,access);visible.push(item);}catch(error){if(error.status!==403)throw error;}}return json({...data,libraries:visible});}
       return response;
     }
     const collaborationMatch=path.match(/^\/api\/documents\/([0-9a-f-]{36})\/(sharing|editing|comments|reviews|members|live)$/i);
     if(collaborationMatch){
       const access=await accessFor(request,session);if(!access.organizationId)throw new DocumentError(400,'Save this file in a shared workspace to collaborate.');
       const [,id,action]=collaborationMatch;
       if(action==='live')return await live(request,id,access);
       if(action==='reviews')return await activity.reviews(request,id,access,session.user);
       if(action==='members'){if(request.method!=='GET')throw new DocumentError(405,'Method not allowed.');await collaboration.accessFor(id,access);return json({members:(await activity.recipients(id,access)).map(p=>({id:p.id,name:p.name}))});}
       const comment=action==='comments'&&request.method==='POST'?await readJSON(request.clone()):null;
       const response=await collaboration[action](request,id,access,session.user);
       if(comment&&response.ok)await activity.commentEvent(id,access,session.user,comment);
       return response;
     }
     const match=path.match(/^\/api\/documents(?:\/([0-9a-f-]{36})(?:\/versions(?:\/([0-9a-f-]{36})(\/restore)?)?)?)?$/i);
     if(match){
       const access=await accessFor(request,session),owner=access.owner,headers=new Headers(request.headers);
       let fence=null;
       if(access.organizationId&&match[1]){
         const rights=await collaboration.accessFor(match[1],access);
         if(request.method==='PUT'&&rights.policy.editing_mode==='live')throw new DocumentError(409,'This file uses simultaneous editing. Reopen it in the updated editor.');
         if(!['GET','HEAD'].includes(request.method))fence=(await collaboration.writeAccess(request,match[1],access,{lease:request.method==='PUT'||!!match[3]})).fence;
       }
       // Project lifecycle permissions are enforced by documentApi. Library
       // maintainership grants content editing, not permission to delete files.
       const guard=change=>change.after?libraries.guard(change,access):undefined;
       // Identity is derived from the verified session and membership on EVERY request.
       headers.set('oai-authenticated-user-id',owner);
       const internal=new Request(request,{headers});
       const response=path.includes('/versions')?await versionApi(internal,db,match[1],match[2]??null,!!match[3],bodies,guard,fence):await documentApi(internal,db,match[1]??null,bodies,guard,{userId:session.user.id,manage:access.manage||!!isAdmin(session,config),fence});
       if(access.organizationId&&!path.includes('/versions')&&response.ok){
         const data=await response.json();
         if(Array.isArray(data.documents)){const visible=[];for(const item of data.documents){try{const rights=await collaboration.accessFor(item.id,access);visible.push({...item,role:rights.role,can_edit:rights.canEdit,can_delete:item.can_delete&&rights.canEdit});}catch(error){if(error.status!==403)throw error;}}data.documents=visible;}
         else if(data.id&&request.method==='GET'){const rights=await collaboration.accessFor(data.id,access);Object.assign(data,{role:rights.role,can_edit:rights.canEdit,collaboration:true});}
         return json(data,response.status);
       }
       return response;
     }
     return json({error:'Not found.'},404);
   } catch(error) {
     if(error instanceof DocumentError)return json({error:error.message},error.status);
     // Never expose driver messages or connection strings to clients/logs.
     operations?.failure(new URL(request.url).pathname,503);
     console.error('Application request failed:',error?.name||'Error');
     return json({error:'The request could not be completed. Please try again.'},503);
   }
 };
}
