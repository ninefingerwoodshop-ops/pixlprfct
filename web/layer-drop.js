export function layerDropPosition(rect,y,frame){
 const ratio=(y-rect.top)/rect.height;
 return frame&&ratio>.25&&ratio<.75?'inside':ratio<.5?'before':'after';
}
export function layerAutoScrollSpeed(rect,y){
 const edge=Math.min(48,(rect.bottom-rect.top)/2);
 if(edge<=0||y<rect.top||y>rect.bottom)return 0;
 if(y<rect.top+edge)return -720*((rect.top+edge-y)/edge)**2;
 if(y>rect.bottom-edge)return 720*((y-rect.bottom+edge)/edge)**2;
 return 0;
}
export function layerDropReason(shapes,ids,target,position,copy=false){
 const destination=shapes.find(s=>s.id===target);
 if(!destination)return 'Drop onto a layer in this page.';
 if(position==='inside'&&!['group','frame'].includes(destination.kind))return 'Only groups and frames can contain layers.';
 const lockedInBranch=id=>{
  const visited=new Set();
  while(id){
   if(visited.has(id))return true;
   visited.add(id);const shape=shapes.find(s=>s.id===id);
   if(!shape||shape.locked)return true;
   id=shape.parent_id;
  }
  return false;
 };
 for(const id of ids){
  if(shapes.find(s=>s.id===id)?.locked)return 'Unlock the selected layer before dragging it.';
  if(lockedInBranch(id))return 'Unlock the selected layer’s parent before dragging it.';
 }
 if(lockedInBranch(position==='inside'?target:destination.parent_id))return 'Unlock the destination group or frame before dropping here.';
 if(copy)return '';
 if(ids.includes(target))return position==='inside'?'A group or frame cannot be placed inside itself.':'Drop outside the selected layers to reorder them.';
 let parent=position==='inside'?target:destination.parent_id;const seen=new Set();
 while(parent){
  if(ids.includes(parent))return 'A group or frame cannot be placed inside one of its children.';
  if(seen.has(parent))return 'This drop would create a circular layer hierarchy.';
  seen.add(parent);parent=shapes.find(s=>s.id===parent)?.parent_id;
 }
 return '';
}
export function layerDropAllowed(...args){return !layerDropReason(...args);}
export function layerDropParent(shapes,target,position){
 const row=shapes.find(s=>s.id===target);
 return row?(position==='inside'?row.id:row.parent_id):0;
}
export function layerDropDestination(shapes,target,position,pageName='Page'){
 const row=shapes.find(s=>s.id===target);if(!row)return '';
 let parent=position==='inside'?row:shapes.find(s=>s.id===row.parent_id);
 const path=[],seen=new Set();
 while(parent&&!seen.has(parent.id)){
  seen.add(parent.id);path.unshift(parent.name);
  parent=shapes.find(s=>s.id===parent.parent_id);
 }
 return [pageName,...path].join(' > ');
}
export function projectLayerDrop(shapes,target,position,deltaX,ids=[]){
 let destination=shapes.find(s=>s.id===target);
 if(!destination||!Number.isFinite(deltaX)||Math.abs(deltaX)<24)return {target,position};
 if(deltaX<0){
  let levels=1+Math.floor((-deltaX-24)/16);
  if(position==='inside'){position='after';levels--;}
  while(levels-->0&&destination.parent_id){
   const parent=shapes.find(s=>s.id===destination.parent_id);if(!parent)break;
   destination=parent;
  }
  return {target:destination.id,position};
 }
 if(!ids.includes(target)&&['frame','group'].includes(destination.kind))return {target,position:'inside'};
 // Indenting an insertion before a sibling nests under the preceding container.
 const siblings=shapes.filter(s=>s.parent_id===destination.parent_id).slice().reverse();
 const previous=position==='before'||ids.includes(target)?siblings.slice(0,siblings.findIndex(s=>s.id===target)).reverse().find(s=>!ids.includes(s.id)):destination;
 return previous&&['frame','group'].includes(previous.kind)?{target:previous.id,position:'inside'}:{target,position};
}
export function placeLayerDragPreview(point,size,viewport){
 const margin=16,gap=16,left=viewport.left??0,top=viewport.top??0;
 const right=left+viewport.width-margin,bottom=top+viewport.height-margin;
 let x=point.x+gap,y=point.y+gap;
 if(x+size.width>right)x=point.x-gap-size.width;
 if(y+size.height>bottom)y=point.y-gap-size.height;
 return {x:Math.max(left+margin,Math.min(x,right-size.width)),y:Math.max(top+margin,Math.min(y,bottom-size.height))};
}
export function createLayerDragPreview(document,layers){
 const preview=document.createElement('div');preview.className='layer-drag-preview';preview.setAttribute('aria-hidden','true');
 const stack=document.createElement('div');stack.className='layer-drag-preview-layers';preview.append(stack);
 for(const layer of layers){
  const row=document.createElement('div');row.className='layer-drag-preview-row';
  const glyph=document.createElement('span');glyph.className='glyph';glyph.innerHTML=layer.icon;
  const name=document.createElement('span');name.className='layer-drag-preview-name';name.textContent=layer.name;
  row.append(glyph,name);stack.append(row);
 }
 const more=document.createElement('div');more.className='layer-drag-preview-more';more.hidden=true;preview.append(more);
 const count=document.createElement('div');count.className='layer-drag-preview-count';count.textContent=layers.length+(layers.length===1?' layer':' layers');preview.append(count);
 return preview;
}
export function visibleLayerPreviewCount(heights,available){
 let used=0,count=0;
 for(const height of heights){if(used+height>available+.01)break;used+=height;count++;}
 return count;
}
export function fitLayerDragPreview(preview){
 const stack=preview.querySelector?.('.layer-drag-preview-layers'),more=preview.querySelector?.('.layer-drag-preview-more');
 if(!stack||!more)return;
 const rows=[...stack.children];
 rows.forEach(row=>row.hidden=false);more.hidden=true;
 const heights=rows.map(row=>row.getBoundingClientRect().height);
 if(visibleLayerPreviewCount(heights,stack.getBoundingClientRect().height)===rows.length)return;
 more.textContent='+ 0 more';more.hidden=false;
 const visible=visibleLayerPreviewCount(heights,stack.getBoundingClientRect().height);
 rows.forEach((row,index)=>row.hidden=index>=visible);
 more.textContent='+ '+(rows.length-visible)+' more';
}
export function installLayerDrop(container,drop,{expand=()=>{},collapse=()=>{},hoverDelay=600,collapseDelay=400,selection=()=>[],previewLayers=()=>[],canDrop=()=>true,project=(target,position)=>({target,position}),dropReason=()=>'This drop is not allowed.',destinationName=()=>'',destinationParent=(target,position)=>position==='inside'?target:0,onDestinationChange=()=>{},requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id)}={}){
 let highlightedParent=0;
 const reportDestination=id=>{if(id!==highlightedParent){highlightedParent=id;onDestinationChange(id);}};
 let startX=0;
 let source=0,sources=[],copyMode=false,dragged=false,cancelled=false,blocked=false,hoverRow=null,hoverTimer=null;
 const expandedRows=new Set();
 const collapseTimers=new Map();
 const cancelCollapse=row=>{clearTimeout(collapseTimers.get(row));collapseTimers.delete(row);};
 const inBranch=(expanded,row)=>!!row&&(expanded===row||!!expanded.parentElement?.contains(row));
 const restoreExpanded=(keep=null,position=null,delayed=false)=>{
  for(const expanded of [...expandedRows].reverse()){
   if(inBranch(expanded,keep)&&(expanded!==keep||position==='inside')){cancelCollapse(expanded);continue;}
   if(delayed){
    if(!collapseTimers.has(expanded))collapseTimers.set(expanded,setTimeout(()=>{
     collapseTimers.delete(expanded);expandedRows.delete(expanded);collapse(expanded);
    },collapseDelay));
   }else{cancelCollapse(expanded);expandedRows.delete(expanded);collapse(expanded);}
  }
 };
 let preview=null,reasonLabel=null,destinationLabel=null,previewPoint=null;
 const positionPreview=()=>{
  if(!preview||!previewPoint)return;
  const view=container.ownerDocument.defaultView,visual=view?.visualViewport;
  const viewport={left:visual?.offsetLeft??0,top:visual?.offsetTop??0,width:visual?.width??view?.innerWidth??1024,height:visual?.height??view?.innerHeight??768};
  preview.style.maxWidth=Math.max(0,viewport.width-32)+'px';preview.style.maxHeight=Math.max(0,viewport.height-32)+'px';
  fitLayerDragPreview(preview);
  const size=preview.getBoundingClientRect?.()??{width:240,height:64};
  const position=placeLayerDragPreview(previewPoint,size,viewport);
  preview.style.left=position.x+'px';preview.style.top=position.y+'px';
 };
 container.ownerDocument?.defaultView?.addEventListener('resize',positionPreview);
 container.ownerDocument?.defaultView?.visualViewport?.addEventListener('resize',positionPreview);
 container.ownerDocument?.defaultView?.visualViewport?.addEventListener('scroll',positionPreview);
 const showReason=reason=>{if(reasonLabel){reasonLabel.textContent=reason;reasonLabel.hidden=!reason;positionPreview();}};
 const clearPreview=()=>{preview?.remove();preview=null;reasonLabel=null;destinationLabel=null;previewPoint=null;};
 const updatePreview=event=>{
  if(!source)return;
  copyMode=!!event.altKey;
  if(!preview)return;
  preview.setAttribute('data-copy',String(copyMode));
  if(Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)){
   previewPoint={x:event.clientX,y:event.clientY};
  }
  positionPreview();
 };
 const showPreview=event=>{
  clearPreview();if(!event.dataTransfer.setDragImage)return;
  const layers=previewLayers(sources);if(!layers.length)return;
  preview=createLayerDragPreview(container.ownerDocument,layers);
  destinationLabel=container.ownerDocument.createElement('div');destinationLabel.className='layer-drag-destination';destinationLabel.hidden=true;preview.append(destinationLabel);
  reasonLabel=container.ownerDocument.createElement('div');reasonLabel.className='layer-drop-reason';reasonLabel.hidden=true;reasonLabel.setAttribute('role','tooltip');preview.append(reasonLabel);
  container.ownerDocument.body.append(preview);
  // Use a live preview so modifier changes can update it throughout the drag.
  const blank=container.ownerDocument.createElement('canvas');blank.width=blank.height=1;
  event.dataTransfer.setDragImage(blank,0,0);updatePreview(event);
 };
 container.ownerDocument?.addEventListener?.('dragover',updatePreview,true);
 let scrollFrame=null,pointer=null,lastFrameTime=null;
 const stopScroll=()=>{if(scrollFrame!==null)cancelFrame(scrollFrame);scrollFrame=null;lastFrameTime=null;pointer=null;};
 const rowAtPointer=()=>{
  const row=pointer&&container.ownerDocument?.elementFromPoint(pointer.x,pointer.y)?.closest('[data-layer-drop]');
  return row&&container.contains(row)?row:null;
 };
 const destination=(row,y,x)=>{
  if(!row)return null;
  const target=Number(row.dataset.layerDrop),position=layerDropPosition(row.getBoundingClientRect(),y,row.dataset.frame==='true');
  const result=project(target,position,(x??startX)-startX,sources);
  return {...result,row:result.target===target?row:container.querySelector?.('[data-layer-drop="'+result.target+'"]')};
 };
 const allowed=(dest,copy=copyMode)=>!!dest&&(copy||!sources.includes(dest.target))&&canDrop(sources,dest.target,dest.position,copy);
 const indicate=row=>{
  restoreExpanded(row,'inside',true);
  clear(false);const dest=destination(row,pointer.y,pointer.x),valid=allowed(dest);
  reportDestination(valid?destinationParent(dest.target,dest.position):0);
  if(destinationLabel){const name=dest?destinationName(dest.target,dest.position):'';destinationLabel.textContent=name?(copyMode?'Copy to ':'Move to ')+name:'';destinationLabel.hidden=!name;}
  showReason(!valid&&dest?dropReason(sources,dest.target,dest.position,copyMode):'');
  if(valid){
   const parent=destinationParent(dest.target,dest.position);
   if(parent)container.querySelector?.('[data-layer-drop="'+parent+'"]')?.classList.add('layer-drop-parent');
   hover(dest.position==='inside'?dest.row:row);
   const descendants=dest.position==='after'&&dest.row?.classList.contains?.('group-row')?dest.row.parentElement.querySelectorAll('[data-layer-drop]'):null;
   const indicator=descendants?.length?descendants[descendants.length-1]:dest.row;
   indicator?.classList.add('layer-drop-'+dest.position);
  }
  else cancelHover();
  return valid;
 };
 const scrollTick=time=>{
  scrollFrame=null;if(!source||!pointer)return;
  const speed=layerAutoScrollSpeed(container.getBoundingClientRect(),pointer.y);
  const elapsed=lastFrameTime===null?0:Math.min(32,time-lastFrameTime);lastFrameTime=time;
  const before=container.scrollTop;container.scrollTop+=speed*elapsed/1000;
  indicate(rowAtPointer());
  if(speed&&(elapsed===0||container.scrollTop!==before))scrollFrame=requestFrame(scrollTick);
  else lastFrameTime=null;
 };
 const trackPointer=e=>{
  pointer={x:e.clientX,y:e.clientY};
  if(layerAutoScrollSpeed(container.getBoundingClientRect(),pointer.y)){
   if(scrollFrame===null)scrollFrame=requestFrame(scrollTick);
  }else if(scrollFrame!==null){cancelFrame(scrollFrame);scrollFrame=null;lastFrameTime=null;}
 };
 const cancelHover=()=>{clearTimeout(hoverTimer);hoverTimer=null;hoverRow=null;};
 const hover=row=>{
  const eligible=row&&(copyMode||!sources.includes(Number(row.dataset.layerDrop)))&&row.dataset.frame==='true'&&row.querySelector(':scope > .layer-disclosure[aria-expanded="false"]');
  if(!eligible){cancelHover();return;}
  if(hoverRow===row)return;
  cancelHover();hoverRow=row;
  hoverTimer=setTimeout(()=>{const target=hoverRow;cancelHover();if(source&&target.isConnected){expand(target);expandedRows.add(target);}},hoverDelay);
 };
 const control=target=>!!target.closest('.layer-disclosure,.layer-actions button,input,textarea,select,[contenteditable]');
 container.addEventListener('pointerdown',e=>{cancelled=false;blocked=control(e.target);},true);
 const clearSources=()=>{clearPreview();for(const row of container.querySelectorAll('.layer-dragging')){row.classList.remove('layer-dragging');row.removeAttribute('data-drag-count');}};
 const clear=(resetDestination=true)=>{container.querySelectorAll('.layer-drop-before,.layer-drop-after,.layer-drop-inside,.layer-drop-parent').forEach(n=>n.classList.remove('layer-drop-before','layer-drop-after','layer-drop-inside','layer-drop-parent'));if(resetDestination)reportDestination(0);};
 const cancelDrag=()=>{restoreExpanded();stopScroll();cancelHover();source=0;sources=[];copyMode=false;clear();clearSources();};
 container.ownerDocument?.addEventListener?.('keydown',event=>{
  if(event.key!=='Escape'||(!source&&!dragged)){updatePreview(event);return;}
  cancelled=true;cancelDrag();
  // Keep the browser's native Escape cancellation, but do not let the
  // editor's general Escape shortcut clear the current layer selection.
  event.stopImmediatePropagation();
 },true);
 container.ownerDocument?.addEventListener?.('keyup',event=>{
  if(event.key==='Escape'&&cancelled)event.stopImmediatePropagation();else updatePreview(event);
 },true);
 container.addEventListener('dragstart',e=>{const row=e.target.closest('[data-layer-drop]');if(!row)return;if(blocked||control(e.target)){e.preventDefault();return;}startX=Number.isFinite(e.clientX)?e.clientX:0;source=Number(row.dataset.layerDrop);copyMode=!!e.altKey;const selected=selection();sources=selected.includes(source)?[...selected]:[source];dragged=true;for(const item of container.querySelectorAll('[data-layer-drop]'))if(sources.includes(Number(item.dataset.layerDrop)))item.classList.add('layer-dragging');if(sources.length>1)row.setAttribute('data-drag-count',sources.length+' layers');e.dataTransfer.effectAllowed='copyMove';e.dataTransfer.setData('application/x-pixl-layers',JSON.stringify(sources));e.dataTransfer.setData('application/x-pixl-layer',String(source));showPreview(e);e.stopPropagation();});
 container.addEventListener('dragover',e=>{if(!source)return;e.preventDefault();e.stopPropagation();updatePreview(e);trackPointer(e);const valid=indicate(e.target.closest('[data-layer-drop]'));e.dataTransfer.dropEffect=valid?(copyMode?'copy':'move'):'none';});
 container.addEventListener('drop',e=>{
  cancelHover();stopScroll();if(!source)return;e.preventDefault();e.stopPropagation();
  const row=e.target.closest('[data-layer-drop]'),id=source,ids=sources,dest=destination(row,e.clientY,e.clientX),valid=allowed(dest,!!e.altKey);
  source=0;sources=[];clear();clearSources();restoreExpanded(valid?dest.row:null,dest?.position);expandedRows.clear();
  if(valid)drop(id,dest.target,dest.position,ids,!!e.altKey);
  setTimeout(()=>{dragged=false;},0);
 });
 container.addEventListener('dragleave',e=>{if(!container.contains(e.relatedTarget)){restoreExpanded(null,null,true);if(destinationLabel)destinationLabel.hidden=true;showReason('');stopScroll();cancelHover();clear();}else if(hoverRow&&!hoverRow.contains(e.relatedTarget)){cancelHover();clear();}});
 container.addEventListener('dragend',()=>{cancelDrag();setTimeout(()=>{dragged=false;},0);});
 container.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();}},true);
}
