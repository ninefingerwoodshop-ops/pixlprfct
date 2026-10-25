import {workspaceWindow} from './workspace-window.js';
export function matchingActions(actions,query){
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return actions.filter(a=>words.every(w=>`${a.label} ${a.category} ${a.keywords??''}`.toLowerCase().includes(w)));
}
export function installActionPanel(actions){
 const content=document.createElement('div');content.className='workspace-actions';
 const help=document.createElement('p');help.textContent='Search commands. Unavailable actions explain what to select.';
 const search=document.createElement('input');search.type='search';search.placeholder='Search tools and actions…';search.setAttribute('aria-label','Search tools and actions');
 const list=document.createElement('div');list.className='action-results';list.setAttribute('aria-label','Matching actions');
 content.append(help,search,list);const window=workspaceWindow('Tools and actions',content),dialog=window.dialog;
 function render(){list.replaceChildren();for(const a of matchingActions(actions,search.value)){
  const row=document.createElement('button'),enabled=!a.enabled||a.enabled();row.className='action-result';row.disabled=!enabled;
  const label=document.createElement('strong');label.textContent=a.label;
  const detail=document.createElement('span');detail.textContent=enabled?`${a.category}${a.shortcut?' · '+a.shortcut:''}`:a.unavailable??'Not available for this selection';
  row.append(label,detail);row.onclick=()=>{dialog.close();a.run();};list.append(row);
 }if(!list.children.length){const empty=document.createElement('p');empty.textContent='No matching commands.';list.append(empty);}}
 search.oninput=render;
 dialog.addEventListener('keydown',event=>{
  event.stopPropagation();
  if(event.key==='Escape'){event.preventDefault();dialog.close();return;}
  if(event.target!==search&&!list.contains(event.target))return;
  if(!['ArrowDown','ArrowUp','Enter'].includes(event.key))return;
  const rows=[...list.querySelectorAll('button:not(:disabled)')];if(!rows.length)return;
  if(event.key==='Enter'&&event.target===search){event.preventDefault();rows[0].click();return;}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const index=rows.indexOf(document.activeElement),next=index<0?(event.key==='ArrowDown'?0:rows.length-1):(index+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows[next].focus();}
 });
 return ()=>{search.value='';render();window.open();search.focus();};
}
