import {element} from './inspector-settings.js';

export function localRecovery({session,host,download,load,report}){
 const trigger=element('button','local-recovery-trigger','Recover unsaved changes');trigger.hidden=true;host.append(trigger);
 const dialog=element('dialog','cloud-dialog local-recovery-dialog');dialog.setAttribute('aria-label','Recover local changes');
 const heading=element('h2','','Local changes couldn’t be saved'),message=element('p','cloud-info'),actions=element('div','cloud-actions');message.setAttribute('role','status');
 const button=(label,run)=>{const b=element('button','',label);b.type='button';b.onclick=async()=>{for(const n of actions.children)n.disabled=true;try{await run();}catch(error){message.textContent=error.message;report(error.message);}finally{for(const n of actions.children)n.disabled=false;}};actions.append(b);return b;};
 button('Try saving again',async()=>{await session.flush();dialog.close();});
 button('Save as separate project',async()=>{await session.copy();dialog.close();});
 button('Download .pixl copy',download);
 const latest=button('Open latest saved version',async()=>{load(await session.latest());dialog.close();});
 button('Close',()=>dialog.close());dialog.append(heading,message,actions);document.body.append(dialog);
 trigger.onclick=()=>{message.textContent=session.error?.message??'Download your edits or save a separate project before opening the latest saved version.';latest.hidden=!session.drafts.activeId;dialog.showModal();};
 return error=>{trigger.hidden=!error||!session.enabled;if(!error&&dialog.open)dialog.close();message.textContent=error?.message??'';};
}
