import {CloudSession,cloudRequest} from './cloud-session.js';
export function cloudFiles({snapshot,load,status,toast}){
 let store;try{store=sessionStorage;}catch{}
 const session=new CloudSession({snapshot,status,storage:store}),dialog=document.createElement('dialog');dialog.className='cloud-dialog';dialog.setAttribute('aria-label','Cloud files');
 const heading=document.createElement('h2');heading.textContent='Your files';const info=document.createElement('p');info.className='cloud-info';info.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='cloud-actions';const list=document.createElement('div');list.className='cloud-list';
 const signIn=document.createElement('a');signIn.href='/signin-with-chatgpt?return_to=%2Feditor%2Findex.html';signIn.target='_top';signIn.textContent='Sign in with ChatGPT';signIn.hidden=true;
 const close=button('Close',()=>dialog.close());dialog.append(heading,info,actions,signIn,list,close);document.body.append(dialog);
 let busy=false,trash=false;
 async function run(action){if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{await action();}catch(error){info.textContent=error.message;signIn.hidden=error.status!==401;}finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function button(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=()=>run(action);return b;}
 function backupLocal(){if(!session.active){try{localStorage.setItem('pixlprfct.local-draft',snapshot());}catch{throw new Error('Download a local copy before opening another file; browser recovery storage is full.');}}}
 async function beforeSwitch(){await session.flush();backupLocal();}
 function useFile(file){load(file.body);session.adopt(file,snapshot());session.remember();}
 async function refresh(){
  const result=await cloudRequest();signIn.hidden=true;list.replaceChildren();info.textContent=session.error?.message??'Cloud files are private to your account. Changes save automatically.';
  const files=result.documents.filter(f=>Boolean(f.deleted_at)===trash);
  if(!files.length){const empty=document.createElement('p');empty.textContent=trash?'Trash is empty.':'No cloud files yet. Save this design or create a new file.';list.append(empty);}
  for(const f of files){const row=document.createElement('div');row.className='cloud-row';const text=document.createElement('div'),name=document.createElement('strong'),date=document.createElement('small');name.textContent=f.name;date.textContent=new Date(f.updated_at).toLocaleString();text.append(name,date);row.append(text);
   if(trash)row.append(button('Restore',async()=>{await cloudRequest('/'+f.id,{method:'PATCH',headers:{'if-match':String(f.revision)}});await refresh();}));
   else{row.append(button('Open',async()=>{await beforeSwitch();const file=await cloudRequest('/'+f.id);if(file.deleted_at)throw new Error('This file was moved to Trash.');useFile(file);dialog.close();toast('Cloud file opened');}));
    row.append(button('Move to Trash',async()=>{let revision=f.revision;if(session.active?.id===f.id){await session.flush();revision=session.active.revision;}await cloudRequest('/'+f.id,{method:'DELETE',headers:{'if-match':String(revision)}});if(session.active?.id===f.id)session.detach();await refresh();}));}
   list.append(row);
  }
 }
 const saveCopy=button('Save current as a cloud file',async()=>{if(session.pending)try{await session.pending;}catch{}backupLocal();const body=snapshot(),file=await cloudRequest('',{method:'POST',body});session.adopt(file,body);session.changed();await refresh();toast('Cloud file created');});
 const create=button('New cloud file',async()=>{await beforeSwitch();const body=JSON.stringify({version:1,name:'Untitled design',shapes:[]}),file=await cloudRequest('',{method:'POST',body});useFile({...file,body});dialog.close();toast('New cloud file');});
 const retry=button('Save / retry',async()=>{await session.flush();await refresh();});
 const reload=button('Open latest cloud version',async()=>{if(!session.active)throw new Error('The current design is a local file.');if(session.pending)try{await session.pending;}catch{}const file=await cloudRequest('/'+session.active.id);if(file.deleted_at)throw new Error('Restore this file from Trash first.');try{localStorage.setItem('pixlprfct.conflict-copy',snapshot());}catch{throw new Error('Download your current design before loading the latest version; recovery storage is full.');}useFile(file);dialog.close();toast('Latest cloud version opened; previous local edits kept in recovery');});
 const recover=button('Recover previous local edits',async()=>{const body=localStorage.getItem('pixlprfct.conflict-copy')??localStorage.getItem('pixlprfct.local-draft');if(!body)throw new Error('No previous local copy is available.');await session.flush();load(body);session.detach();dialog.close();});
 const toggle=button('Show Trash',async()=>{trash=!trash;toggle.textContent=trash?'Show files':'Show Trash';await refresh();});actions.append(create,saveCopy,retry,reload,recover,toggle);
 const trigger=document.getElementById('cloud-files');trigger.onclick=()=>{dialog.showModal();run(refresh);};
 window.addEventListener('online',()=>{if(session.error?.status!==409)session.flush().catch(()=>{});});
 window.addEventListener('pagehide',()=>session.remember());
 window.addEventListener('beforeunload',event=>{if(session.active&&snapshot()!==session.ack){session.remember();event.preventDefault();event.returnValue='';}});
 return {session,changed:()=>session.changed(),beforeLocalOpen:async()=>{await session.flush();},localOpened:()=>session.detach(),restore(){try{const saved=JSON.parse(store?.getItem('pixlprfct.cloud.session')??'null');if(saved?.id&&saved.body&&saved.revision){load(saved.body);session.adopt(saved,saved.clean?snapshot():null);session.changed();if(saved.clean){const initial=snapshot();cloudRequest('/'+saved.id).then(file=>{if(session.active?.id!==saved.id||snapshot()!==initial||session.pending)return;if(file.deleted_at){const error=Object.assign(new Error('This file was moved to Trash on another device.'),{status:409});session.error=error;status('Cloud file is in Trash — open Files');return;}useFile(file);}).catch(error=>{if(session.active?.id===saved.id)status(error.status===401?'Sign in to reconnect cloud files':'Offline — showing the saved local copy');});}return true;}}catch(error){toast('Cloud recovery could not be loaded. Its saved copy has been retained.');}return false;}};
}
