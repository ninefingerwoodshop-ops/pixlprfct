import {documentApi,DocumentError,checkOrigin} from '../lib/documents.mjs';
import {workspaceAccess} from './workspace-access.mjs';
import {libraryService} from './libraries.mjs';
import QRCode from 'qrcode';
import {databaseBodyStore} from './database.mjs';
import {versionApi} from '../lib/document-versions.mjs';
import {adminData} from './admin.mjs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const isAdmin=(session,config)=>session?.user.emailVerified&&session.user.email.toLowerCase()===config.adminEmail;
export function createApplication({config,db,auth}) {
 const bodies=databaseBodyStore(db,config.engine);
 async function sessionFor(request){const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)throw new DocumentError(401,'Sign in with a verified account to continue.');return session;}
 const libraries=libraryService(db,bodies);
 const accessFor=(request,session)=>workspaceAccess(db,session.user.id,new URL(request.url).searchParams.get('workspace')||'personal');
 async function documentOwner(request,session){return (await accessFor(request,session)).owner;}

 return async request=>{
   try {
     const url=new URL(request.url),path=url.pathname;
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
     const libraryMatch=path.match(/^\/api\/libraries(?:\/([0-9a-f-]{36})(?:\/(access))?)?$/i);
     if(libraryMatch)return await libraries.api(request,await accessFor(request,session),libraryMatch[1]??null,libraryMatch[2]??null);
     const match=path.match(/^\/api\/documents(?:\/([0-9a-f-]{36})(?:\/versions(?:\/([0-9a-f-]{36})(\/restore)?)?)?)?$/i);
     if(match){
       const access=await accessFor(request,session),owner=access.owner,headers=new Headers(request.headers);
       // Project lifecycle permissions are enforced by documentApi. Library
       // maintainership grants content editing, not permission to delete files.
       const guard=change=>change.after?libraries.guard(change,access):undefined;
       // Identity is derived from the verified session and membership on EVERY request.
       headers.set('oai-authenticated-user-id',owner);
       const internal=new Request(request,{headers});
       return path.includes('/versions')?versionApi(internal,db,match[1],match[2]??null,!!match[3],bodies,guard):documentApi(internal,db,match[1]??null,bodies,guard,{userId:session.user.id,manage:access.manage||!!isAdmin(session,config)});
     }
     return json({error:'Not found.'},404);
   } catch(error) {
     if(error instanceof DocumentError)return json({error:error.message},error.status);
     // Never expose driver messages or connection strings to clients/logs.
     console.error('Application request failed:',error?.name||'Error');
     return json({error:'The request could not be completed. Please try again.'},503);
   }
 };
}
