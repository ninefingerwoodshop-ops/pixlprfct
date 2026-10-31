import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {backup} from '../scripts/self-host/backup.mjs';
import {smtpOptions,createDelivery} from './auth.mjs';
import nodemailer from 'nodemailer';
import {workspaceAccess} from './workspace-access.mjs';
import {collaborationService} from './collaboration.mjs';

export function operations(config,db,{deliver,now=Date.now}={}){
 const startedAt=now(),failures=[],directory=path.resolve(config.backupDirectory??'data/backups'),send=createDelivery(config,deliver),collaboration=collaborationService(db,config.engine);
 let backupBusy=false,mailBusy=false,lastBackup=null,lastMailError=null;
 const failure=(route,status)=>{failures.push({at:now(),route:route.replace(/[0-9a-f-]{36}/gi,':id'),status});if(failures.length>50)failures.shift();};
 async function backupTick(){
  if(config.backups===false||backupBusy||!['sqlite','postgres'].includes(config.engine))return;backupBusy=true;
  try{await mkdir(directory,{recursive:true,mode:0o700});if(!lastBackup)try{lastBackup=JSON.parse(await readFile(path.join(directory,'latest.json'),'utf8'));}catch{}
   if(lastBackup?.at&&now()-lastBackup.at<24*60*60*1000)return;
   const folder=path.join(directory,new Date(now()).toISOString().replaceAll(':','-')+'-'+crypto.randomUUID());
   const result=await backup(config,folder);lastBackup={at:now(),...result};await writeFile(path.join(directory,'latest.json'),JSON.stringify(lastBackup),{mode:0o600});
  }catch{failure('backup',503);}finally{backupBusy=false;}
 }
 async function mailTick(){
  if(mailBusy||!config.smtpUrl&&!deliver)return;mailBusy=true;
  try{
   // A crashed sender can retry after five minutes; delivery is at least once.
   await db.query("UPDATE team_notifications SET email_state='pending' WHERE email_state='sending' AND email_next<?",[now()-300000],'run');
   const rows=await db.query("SELECT * FROM team_notifications WHERE email_state='pending' AND email_next<=? AND email_attempts<5 ORDER BY created_at LIMIT 20",[now()]);
   for(const row of rows){
    const [preference]=await db.query('SELECT mode,email FROM notification_preferences WHERE user_id=?',[row.user_id]);
    let allowed=!!preference?.email&&preference.mode!=='none'&&(preference.mode==='all'||row.kind!=='comment');
    try{const access=await workspaceAccess(db,row.user_id,row.owner),rights=await collaboration.accessFor(row.document_id,access);allowed&&=!rights.file.deleted_at;}catch(error){if(![403,404].includes(error.status))throw error;allowed=false;}
    const [user]=allowed?await db.query('SELECT email FROM "user" WHERE id=?',[row.user_id]):[];
    if(!allowed||!user){await db.query("UPDATE team_notifications SET email_state='skipped' WHERE id=? AND email_state='pending'",[row.id],'run');continue;}
    const claim=await db.query("UPDATE team_notifications SET email_state='sending',email_attempts=email_attempts+1,email_next=? WHERE id=? AND email_state='pending'",[now(),row.id],'run');if(!claim.changes)continue;
    try{
     // Recheck access after claiming. No artwork or comment body is put in mail.
     const access=await workspaceAccess(db,row.user_id,row.owner);await collaboration.accessFor(row.document_id,access);
     const url=new URL('/editor/index.html',config.baseURL);url.search=new URLSearchParams({cloud:row.document_id,workspace:row.owner,...row.kind.startsWith('review_')?{review:row.target_id}:{comment:row.target_id}});
     await send({to:user.email,subject:'New activity in PixlPrfct',text:`You have new ${row.kind.replaceAll('_',' ')} activity. Sign in to view it:\n\n${url}\n\nChange notification preferences from the Notifications inbox.`});
     await db.query("UPDATE team_notifications SET email_state='sent' WHERE id=?",[row.id],'run');lastMailError=null;
    }catch{lastMailError=now();await db.query("UPDATE team_notifications SET email_state='pending',email_next=? WHERE id=?",[now()+Math.min(3600000,60000*2**Number(row.email_attempts)),row.id],'run');}
   }
  }catch{failure('notification-delivery',503);}finally{mailBusy=false;}
 }
 async function status(){
  await db.query('SELECT 1 AS ready');let restore=null;if(lastBackup?.folder)try{restore=JSON.parse(await readFile(path.join(lastBackup.folder,'restore-proof.json'),'utf8'));}catch{}
  return {database:'ready',uptimeSeconds:Math.floor((now()-startedAt)/1000),backup:{enabled:config.backups!==false,busy:backupBusy,lastAt:lastBackup?.at??null,bytes:lastBackup?.bytes??null,verifiedRestore:restore?.verifiedAt??null},mail:{configured:!!config.smtpUrl,lastFailureAt:lastMailError},recentFailures:failures};
 }
 async function verifyMail(){if(!config.smtpUrl)return {configured:false,verified:false};const transport=nodemailer.createTransport(smtpOptions(config));try{await transport.verify();return {configured:true,verified:true,deliveryTested:false};}finally{transport.close();}}
 const tasks=new Set();const track=fn=>{const task=fn();tasks.add(task);task.finally(()=>tasks.delete(task));return task;};
 let timers=[];return {failure,status,verifyMail,backupTick,mailTick,start(){timers=[setInterval(()=>track(backupTick),3600000),setInterval(()=>track(mailTick),15000)];for(const t of timers)t.unref();track(backupTick);},async stop(){for(const t of timers)clearInterval(t);await Promise.allSettled([...tasks]);}};
}
