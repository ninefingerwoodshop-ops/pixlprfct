import {recoveryStore} from './recovery-store.js';
import {CloudSession,cloudRequest} from './cloud-session.js';
import {openCloudHistory} from './cloud-history.js';
export function cloudFiles({snapshot,load,status,toast,backupLocal:saveDraft,openLocal,recoveryOwner=null}){
 let tabStore,durableStore;try{tabStore=sessionStorage;}catch{}try{durableStore=localStorage;}catch{}
 const recovery=recoveryStore(tabStore,durableStore),workspaceKey=(recoveryOwner?recoveryOwner+':':'')+(new URLSearchParams(location.search).get('workspace')??'personal');
 const store={getItem:key=>recovery.getItem(key+(workspaceKey==='personal'?'':':'+workspaceKey)),setItem:(key,value)=>recovery.setItem(key+(workspaceKey==='personal'?'':':'+workspaceKey),value),removeItem:key=>recovery.removeItem(key+(workspaceKey==='personal'?'':':'+workspaceKey))};
 const session=new CloudSession({snapshot,status,storage:store}),dialog=document.createElement('dialog');dialog.className='cloud-dialog';dialog.setAttribute('aria-label','Cloud files');
 const heading=document.createElement('h2');heading.textContent='Your files';const info=document.createElement('p');info.className='cloud-info';info.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='cloud-actions';const list=document.createElement('div');list.className='cloud-list';
 const signIn=document.createElement('a');signIn.href='/signin-with-chatgpt?return_to=%2Feditor%2Findex.html';signIn.target='_top';signIn.textContent='Sign in with ChatGPT';signIn.hidden=true;
 const searchBox=document.createElement('div');searchBox.className='cloud-actions';const search=document.createElement('input');search.type='search';search.placeholder='Search files';search.setAttribute('aria-label','Search cloud files');const searchButton=button('Search',()=>refresh());searchBox.append(search,searchButton);search.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();run(()=>refresh());}};
 const moreButton=button('Load more files',()=>refresh(true));moreButton.hidden=true;
 const close=button('Close',()=>dialog.close());dialog.append(heading,info,actions,searchBox,signIn,list,moreButton,close);document.body.append(dialog);
 let busy=false,trash=false,next=null;
 fetch('/api/installation').then(r=>r.ok?r.json():null).then(config=>{if(config?.mode==='self-hosted'){signIn.href='/editor/account.html';signIn.textContent='Sign in or create account';}}).catch(()=>{});
 async function run(action){if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{await action();}catch(error){info.textContent=error.message;signIn.hidden=error.status!==401;}finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function button(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=()=>run(action);return b;}
 function backupLocal(){if(!session.active){if(saveDraft){saveDraft();return;}try{localStorage.setItem('pixlprfct.local-draft',snapshot());}catch{throw new Error('Download a local copy before opening another file; browser recovery storage is full.');}}}
 async function beforeSwitch(){await session.flush();backupLocal();}
 function applyFile(file){load(file.body);session.adopt(file,snapshot());session.remember();}
 async function refresh(more=false){
  const query=new URLSearchParams();if(trash)query.set('trash','1');if(search.value.trim())query.set('search',search.value.trim());if(more&&next)query.set('before',next);
  const result=await cloudRequest('?'+query);signIn.hidden=true;if(!more)list.replaceChildren();next=result.next;moreButton.hidden=!next;info.textContent=session.error?.message??'Changes save automatically to this workspace. Other members can open the latest saved version.';
  const files=result.documents.filter(f=>Boolean(f.deleted_at)===trash);
  if(!files.length&&!more){const empty=document.createElement('p');empty.textContent=search.value.trim()?'No matching files.':trash?'Trash is empty.':'No cloud files yet. Save this design or create a new file.';list.append(empty);}
  for(const f of files){const row=document.createElement('div');row.className='cloud-row';const text=document.createElement('div'),name=document.createElement('strong'),date=document.createElement('small');name.textContent=f.name;date.textContent=new Date(f.updated_at).toLocaleString();text.append(name,date);row.append(text);
   if(trash)row.append(button('Restore',async()=>{await cloudRequest('/'+f.id,{method:'PATCH',headers:{'if-match':String(f.revision)}});await refresh();}));
   else{row.append(button('Open',async()=>{await beforeSwitch();const file=await cloudRequest('/'+f.id);if(file.deleted_at)throw new Error('This file was moved to Trash.');applyFile(file);dialog.close();toast('Cloud file opened');}));
    row.append(button('Move to Trash',async()=>{let revision=f.revision;if(session.active?.id===f.id){await session.flush();revision=session.active.revision;}await cloudRequest('/'+f.id,{method:'DELETE',headers:{'if-match':String(revision)}});if(session.active?.id===f.id)session.detach();await refresh();}));}
   list.append(row);
  }
 }
 const saveCopy=button('Save current as a cloud file',async()=>{if(session.pending)try{await session.pending;}catch{}backupLocal();const body=snapshot(),file=await cloudRequest('',{method:'POST',body});session.adopt(file,body);session.changed();await refresh();toast('Cloud file created');});
 const create=button('New cloud file',async()=>{await beforeSwitch();const body=JSON.stringify({version:1,name:'Untitled design',shapes:[]}),file=await cloudRequest('',{method:'POST',body});applyFile({...file,body});dialog.close();toast('New cloud file');});
 const retry=button('Save / retry',async()=>{await session.flush();await refresh();});
 const reload=button('Open latest cloud version',async()=>{if(!session.active)throw new Error('The current design is a local file.');if(session.pending)try{await session.pending;}catch{}const file=await cloudRequest('/'+session.active.id);if(file.deleted_at)throw new Error('Restore this file from Trash first.');try{localStorage.setItem('pixlprfct.conflict-copy',snapshot());}catch{throw new Error('Download your current design before loading the latest version; recovery storage is full.');}applyFile(file);dialog.close();toast('Latest cloud version opened; previous local edits kept in recovery');});
 async function recoverBody(key){const body=localStorage.getItem(key);if(!body)throw new Error('No saved recovery copy is available.');if(openLocal)await openLocal(body);else{await session.flush();load(body);session.detach();}dialog.close();}
 const recover=button('Recover previous local edits',()=>recoverBody(localStorage.getItem('pixlprfct.conflict-copy')?'pixlprfct.conflict-copy':'pixlprfct.local-draft'));
 const recoverDraft=button('Recover local draft',()=>recoverBody('pixlprfct.local-draft'));
 const history=button('Version history',()=>openCloudHistory({session,useFile:applyFile,closeFiles:()=>dialog.close(),toast}));
 const toggle=button('Show Trash',async()=>{trash=!trash;toggle.textContent=trash?'Show files':'Show Trash';await refresh();});actions.append(create,saveCopy,retry,history,reload,recover,recoverDraft,toggle);
 const trigger=document.getElementById('cloud-files');trigger.onclick=()=>{dialog.showModal();run(refresh);};
 window.addEventListener('online',()=>{if(session.error?.status!==409)session.flush().catch(()=>{});});
 window.addEventListener('pagehide',()=>session.remember());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){session.remember();session.flush().catch(()=>{});}});
 window.addEventListener('beforeunload',event=>{if(session.active&&snapshot()!==session.ack){session.remember();event.preventDefault();event.returnValue='';}});
 return {session,saveCurrent:async()=>{await session.flush();backupLocal();const body=snapshot(),file=await cloudRequest('',{method:'POST',body});session.adopt(file,body);session.changed();return file;},authorize:id=>cloudRequest('/'+encodeURIComponent(id)),open:async id=>{const file=await cloudRequest('/'+encodeURIComponent(id));if(file.deleted_at)throw new Error('This file was moved to Trash.');applyFile(file);},history:()=>openCloudHistory({session,useFile:applyFile,closeFiles:()=>dialog.close(),toast}),changed:()=>session.changed(),beforeLocalOpen:async()=>{await session.flush();},localOpened:()=>session.detach(),restore(expectedId){try{const saved=JSON.parse(store?.getItem('pixlprfct.cloud.session')??'null');if(saved?.id&&saved.body&&saved.revision&&(!expectedId||expectedId===saved.id)){load(saved.body);session.adopt(saved,saved.clean?snapshot():null);session.changed();if(saved.clean){const initial=snapshot();cloudRequest('/'+saved.id).then(file=>{if(session.active?.id!==saved.id||snapshot()!==initial||session.pending)return;if(file.deleted_at){const error=Object.assign(new Error('This file was moved to Trash on another device.'),{status:409});session.error=error;status('Cloud file is in Trash — open Files');return;}applyFile(file);}).catch(error=>{if(session.active?.id===saved.id)status(error.status===401?'Sign in to reconnect cloud files':'Offline — showing the saved local copy');});}return true;}}catch(error){toast('Cloud recovery could not be loaded. Its saved copy has been retained.');}return false;}};
}
