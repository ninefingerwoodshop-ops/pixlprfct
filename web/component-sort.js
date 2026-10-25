export function componentEntries(doc){
 const grouped=new Set((doc.component_sets??[]).flatMap(s=>s.variants.map(v=>v.component_id)));
 const entries=[...(doc.component_sets??[]).filter(s=>s.variants.length).map(s=>({key:'set:'+s.id,id:s.variants[0].component_id,name:s.name,count:s.variants.length})),...doc.shapes.filter(s=>s.component?.type==='master'&&!grouped.has(s.id)).map(s=>({...s,key:'component:'+s.id}))];
 const rank=new Map((doc.component_order??[]).map((key,i)=>[key,i]));
 return entries.sort((a,b)=>(rank.get(a.key)??Infinity)-(rank.get(b.key)??Infinity));
}
export function moveComponent(keys,source,target,after=false){
 if(source===target||!keys.includes(source)||!keys.includes(target))return keys.slice();
 const result=keys.filter(key=>key!==source),index=result.indexOf(target)+(after?1:0);result.splice(index,0,source);return result;
}
export function renderSortableComponents(container,entries,{insert,reorder}){
 let dragged=null,suppressClick=false;
 const keys=entries.map(e=>e.key),rows=[];
 const clear=()=>{for(const row of rows)row.classList.remove('drop-before','drop-after','component-dragging');};
 const announce=document.createElement('span');announce.className='component-sort-status';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');
 const commit=(next,key)=>{if(next.every((k,i)=>k===keys[i]))return;reorder(next);const newRows=[...container.querySelectorAll('[data-component-key]')];newRows.find(r=>r.dataset.componentKey===key)?.querySelector('.component-sort-handle')?.focus();const status=container.querySelector('[role=status]');if(status)status.textContent='Component moved to position '+(next.indexOf(key)+1)+' of '+next.length;};
 for(const entry of entries){
  const row=document.createElement('div');row.className='component-sort-row';row.dataset.componentKey=entry.key;row.draggable=true;row.setAttribute('role','listitem');
  const handle=document.createElement('button');handle.type='button';handle.className='component-sort-handle';handle.setAttribute('aria-label','Reorder '+entry.name);handle.title='Drag to reorder · Alt+↑ / Alt+↓';handle.innerHTML='<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="5" cy="4" r="1"/><circle cx="11" cy="4" r="1"/><circle cx="5" cy="8" r="1"/><circle cx="11" cy="8" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="11" cy="12" r="1"/></svg>';
  handle.onkeydown=e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const index=keys.indexOf(entry.key),to=index+(e.key==='ArrowUp'?-1:1);if(to>=0&&to<keys.length)commit(moveComponent(keys,entry.key,keys[to],to>index),entry.key);};
  const b=document.createElement('button');b.type='button';b.className='component-asset';b.textContent=(entry.count?'▦ ':'◆ ')+entry.name+(entry.count?` · ${entry.count} variants`:'');b.title='Insert instance of '+entry.name;b.setAttribute('aria-label',b.title);b.onclick=()=>{if(!suppressClick)insert(entry.id);};row.append(handle,b);
  row.ondragstart=e=>{dragged=entry.key;suppressClick=true;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-pixl-component-order',entry.key);row.classList.add('component-dragging');e.stopPropagation();};
  row.ondragover=e=>{if(!dragged||dragged===entry.key)return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';clear();const rect=row.getBoundingClientRect();row.classList.add(e.clientY>rect.top+rect.height/2?'drop-after':'drop-before');};
  row.ondragleave=e=>{if(!row.contains(e.relatedTarget))row.classList.remove('drop-before','drop-after');};
  row.ondrop=e=>{if(!dragged)return;e.preventDefault();e.stopPropagation();const source=dragged,rect=row.getBoundingClientRect(),after=e.clientY>rect.top+rect.height/2;clear();dragged=null;commit(moveComponent(keys,source,entry.key,after),source);};
  row.ondragend=()=>{clear();dragged=null;setTimeout(()=>{suppressClick=false;},0);};rows.push(row);
 }
 container.setAttribute('role','list');container.setAttribute('aria-label','Components');container.replaceChildren(...rows,announce);
 if(!entries.length){const hint=document.createElement('p');hint.textContent='Select layers and choose Create component, or press Ctrl/⌘ Alt K.';container.prepend(hint);}
}
