import {TeamSession} from './team-session.js';
import {cloudRequest} from './cloud-session.js';

// Reuse the server's exclusive-editing fence. SVG timelines do not participate
// in the shape engine's simultaneous-editing merge protocol.
export async function installSvgCloudEditing({session,record,host,load,report,changed}){
 if(!record.collaboration)return null;
 const note=document.createElement('span'),action=document.createElement('button');
 note.setAttribute('role','status');action.type='button';host.append(note,action);
 let busy=false,closed=false;
 const message=()=>model.state?.editingMode==='live'?'This file uses simultaneous editing. Save on this device to edit its SVG timeline.':model.issue?model.issue.replace(/Open Files.*$/,'Save on this device to keep these edits.'):model.editable()?'You are editing this shared file':!model.state?.canEdit?'This shared file is read-only':model.state?.lease?.name?model.state.lease.name+' is editing this file':'Start editing to change this shared file';
 const model=new TeamSession({session,request:cloudRequest,reload:async id=>{
  const file=await cloudRequest('/'+encodeURIComponent(id));if(file.deleted_at)throw new Error('This project is in Trash.');
  load(file.body);session.adopt(file,file.body);
 },changed:()=>{note.textContent=message();action.textContent=model.editable()?'Finish editing':'Start editing';action.disabled=busy||model.state?.editingMode==='live'||!model.state?.canEdit||!!model.state?.lease&&!model.state.lease.mine;changed?.();}});
 session.writeHeaders=()=>model.headers();session.beforeWrite=()=>{if(!model.editable())throw Object.assign(new Error(message()),{status:423});};
 async function sync(){if(closed||session.pending)return;try{await model.sync();}catch{/* The shared session renders its error and keeps pending edits. */}}
 action.onclick=async()=>{if(busy)return;busy=true;action.disabled=true;try{await model.action(model.editable()?'release':'acquire');if(model.editable())session.error=null;}catch(error){report(error.message);}finally{busy=false;model.changed();}};
 await model.context(record.id).catch(()=>{});
 const timer=setInterval(sync,20000),offline=()=>model.offline();window.addEventListener('online',sync);window.addEventListener('offline',offline);
 return {editable:()=>model.editable(),message,async finish(){if(model.editable())await model.action('release');},close(){closed=true;clearInterval(timer);window.removeEventListener('online',sync);window.removeEventListener('offline',offline);host.remove();}};
}
