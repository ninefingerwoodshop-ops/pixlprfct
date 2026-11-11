import {cloudRequest} from './cloud-session.js';
import {confirmDestructive} from './confirm-dialog.js';
const AUTOMATIC_BACKUP_AGE_MS=30*24*60*60*1000;
export function openCloudHistory({session,useFile,closeFiles,toast}){
 if(!session.active)throw new Error('Open or save a cloud file before using version history.');
 const documentId=session.active.id,dialog=document.createElement('dialog');dialog.className='cloud-dialog';dialog.setAttribute('aria-label','Version history');
 const title=document.createElement('h2');title.textContent='Version history';const info=document.createElement('p');info.className='cloud-info';info.setAttribute('role','status');info.textContent='Save named checkpoints. Automatic backups preserve prior saved work every five minutes while editing. Restoring also saves the current design as “Before restore”.';
 const actions=document.createElement('div');actions.className='cloud-actions';const input=document.createElement('input');input.placeholder='Version name';input.maxLength=256;input.setAttribute('aria-label','Version name');
 const list=document.createElement('div');list.className='cloud-list';let busy=false,next=null;
 async function run(action){if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{await action();}catch(error){info.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function button(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=()=>run(action);return b;}
 function current(){if(session.active?.id!==documentId)throw new Error('The active file changed. Reopen its version history.');}
 async function refresh(more=false){
  current();const result=await cloudRequest('/'+documentId+'/versions'+(more&&next?'?before='+encodeURIComponent(next):''));if(!more)list.replaceChildren();next=result.next;
  if(!result.versions.length&&!more){const empty=document.createElement('p');empty.textContent='No saved versions yet.';list.append(empty);}
  for(const v of result.versions){const row=document.createElement('div');row.className='cloud-row';const details=document.createElement('div'),name=document.createElement('strong'),date=document.createElement('small');name.textContent=v.label;date.textContent=`${new Date(v.created_at).toLocaleString()} · Revision ${v.revision} · ${v.name}`;details.append(name,date);row.append(details);
   row.append(button('Open copy',async()=>{current();await session.flush();const version=await cloudRequest('/'+documentId+'/versions/'+v.id),file=await cloudRequest('',{method:'POST',body:version.body});useFile({...file,body:version.body});dialog.close();closeFiles();toast('Saved version opened as a new cloud file');}));
   row.append(button('Restore version',async()=>{current();await session.flush();const file=await cloudRequest('/'+documentId+'/versions/'+v.id+'/restore',{method:'POST',headers:{...session.writeHeaders(),'if-match':String(session.active.revision)}});useFile(file);dialog.close();closeFiles();toast('Version restored; previous design saved in history');}));
   row.append(button('Delete',async()=>{current();if(!await confirmDestructive({title:'Delete this version?',message:`“${v.label}” from ${new Date(v.created_at).toLocaleString()} will be permanently deleted. The current design is not changed. This cannot be undone.`,confirm:'Delete version'}))return;await cloudRequest('/'+documentId+'/versions/'+v.id,{method:'DELETE',headers:session.writeHeaders()});await refresh();info.textContent='Version deleted.';}));
   list.append(row);
  }
  moreButton.hidden=!next;
 }
 const save=button('Save version',async()=>{current();await session.flush();await cloudRequest('/'+documentId+'/versions',{method:'POST',headers:{...session.writeHeaders(),'if-match':String(session.active.revision),'x-version-label':encodeURIComponent(input.value)}});input.value='';await refresh();info.textContent='Version saved. You can keep editing or restore it later.';});actions.append(input,save);
 const moreButton=button('Load older versions',()=>refresh(true));moreButton.hidden=true;
 // Named versions are only ever deleted one at a time; the bulk action is limited to old automatic backups.
 const prune=button('Delete automatic backups older than 30 days',async()=>{current();if(!await confirmDestructive({title:'Delete old automatic backups?',message:'Automatic backups of this file made more than 30 days ago will be permanently deleted. Named versions and newer backups are kept. This cannot be undone.',confirm:'Delete backups'}))return;const result=await cloudRequest('/'+documentId+'/versions?automatic=1&before='+(Date.now()-AUTOMATIC_BACKUP_AGE_MS),{method:'DELETE',headers:session.writeHeaders()});await refresh();info.textContent=result.deleted?result.deleted+(result.deleted===1?' automatic backup deleted.':' automatic backups deleted.'):'No automatic backups are older than 30 days.';});
 const close=button('Close history',()=>dialog.close());dialog.append(title,info,actions,list,moreButton,prune,close);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();run(()=>refresh());
}
