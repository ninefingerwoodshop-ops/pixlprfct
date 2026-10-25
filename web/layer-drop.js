export function layerDropPosition(rect,y,frame){
 const ratio=(y-rect.top)/rect.height;
 return frame&&ratio>.25&&ratio<.75?'inside':ratio<.5?'before':'after';
}
export function installLayerDrop(container,drop){
 let source=0,dragged=false;
 const clear=()=>container.querySelectorAll('.layer-drop-before,.layer-drop-after,.layer-drop-inside').forEach(n=>n.classList.remove('layer-drop-before','layer-drop-after','layer-drop-inside'));
 container.addEventListener('dragstart',e=>{const row=e.target.closest('[data-layer-drop]');if(!row)return;source=Number(row.dataset.layerDrop);dragged=true;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-pixl-layer',String(source));e.stopPropagation();});
 container.addEventListener('dragover',e=>{if(!source)return;const row=e.target.closest('[data-layer-drop]');if(!row)return;e.preventDefault();e.stopPropagation();clear();e.dataTransfer.dropEffect='move';if(Number(row.dataset.layerDrop)!==source)row.classList.add('layer-drop-'+layerDropPosition(row.getBoundingClientRect(),e.clientY,row.dataset.frame==='true'));const box=container.getBoundingClientRect();if(e.clientY<box.top+28)container.scrollTop-=12;else if(e.clientY>box.bottom-28)container.scrollTop+=12;});
 container.addEventListener('drop',e=>{if(!source)return;e.preventDefault();e.stopPropagation();const row=e.target.closest('[data-layer-drop]'),id=source;source=0;clear();if(row)drop(id,Number(row.dataset.layerDrop),layerDropPosition(row.getBoundingClientRect(),e.clientY,row.dataset.frame==='true'));setTimeout(()=>{dragged=false;},0);});
 container.addEventListener('dragend',()=>{source=0;clear();setTimeout(()=>{dragged=false;},0);});
 container.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();}},true);
}
