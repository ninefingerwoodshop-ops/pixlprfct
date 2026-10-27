import {createBreakpointPreview,restoreAllBreakpointWidths} from './breakpoint-preview.js';
import {layoutMediaState} from './layout-css.js';
import {icon} from './icons.js';
import {layoutClass,validateLayoutClass} from './layout-class.js';
export function installLayerCssInspector(parent,{current,shapes,change,changeMany}){
 const previews=createBreakpointPreview(change);
 const section=document.createElement('section');section.id='layer-css-section';section.className='property-section';
 const label=document.createElement('label');label.textContent='CSS class';
 const input=document.createElement('input');input.type='text';input.id='layer-css-class';input.spellcheck=false;input.autocomplete='off';input.setAttribute('aria-label','CSS class');input.setAttribute('aria-describedby','layer-css-class-status');const row=document.createElement('div');row.className='layer-css-class-row';
 const copy=document.createElement('button');copy.type='button';copy.className='icon-button';copy.title='Copy CSS class';copy.setAttribute('aria-label','Copy CSS class');copy.innerHTML=icon('copy');
 row.append(input,copy);label.htmlFor=input.id;
 const status=document.createElement('p');status.id='layer-css-class-status';status.setAttribute('role','status');
 const media=document.createElement('div');media.className='layer-css-media';media.hidden=true;
 const mediaTitle=document.createElement('strong');mediaTitle.textContent='Responsive layout';
 const mediaWidth=document.createElement('span');
 const mediaState=document.createElement('p');mediaState.setAttribute('role','status');mediaState.setAttribute('aria-live','polite');
 const breakpointList=document.createElement('div');breakpointList.className='layer-css-breakpoints';let breakpointKey='';
 const restore=document.createElement('button');restore.type='button';restore.className='wide-button layer-css-restore';restore.hidden=true;
 restore.onclick=()=>{const selected=current();if(!selected)return;try{previews.restore(layoutMediaState(selected,shapes()).root);render();}catch(error){status.textContent=error.message;}};
 const mediaHint=document.createElement('p');mediaHint.className='grid-caption';
 mediaHint.textContent='Visual controls edit the base layout. Edit Layout CSS to change breakpoint overrides.';
 media.append(mediaTitle,mediaWidth,mediaState,mediaHint,breakpointList,restore);
 section.append(label,row,status,media);parent.prepend(section);let selectedId;
 const allSection=document.createElement('section');allSection.className='property-section breakpoint-restore-all';
 const restoreAll=document.createElement('button');restoreAll.type='button';restoreAll.className='wide-button';restoreAll.textContent='Restore all widths';
 const allStatus=document.createElement('p');allStatus.setAttribute('role','status');
 allSection.append(restoreAll,allStatus);section.after(allSection);
 restoreAll.onclick=()=>{try{restoreAllBreakpointWidths(shapes(),changeMany);render();}catch(error){allStatus.textContent=error.message;}};
 const renderAll=()=>{const count=shapes().filter(s=>previews.original(s)).length;allSection.hidden=!count;restoreAll.textContent=`Restore all widths (${count})`;allStatus.textContent=`${count} previewed ${count===1?'frame':'frames'} across all pages`;};
 const clear=()=>{input.setCustomValidity('');input.removeAttribute('aria-invalid');status.textContent='';};
 const commit=()=>{
  const shape=current();if(!shape||shape.id!==selectedId)return;
  try{const name=validateLayoutClass(input.value.trim(),shape,shapes());clear();if(name!==layoutClass(shape))change({...shape,layout_class:name,layout_class_generated:false});else input.value=name;}
  catch(error){input.setCustomValidity(error.message);input.setAttribute('aria-invalid','true');status.textContent=error.message;}
 };
 copy.addEventListener('click',async()=>{const shape=current();if(!shape)return;try{await navigator.clipboard.writeText(layoutClass(shape));status.textContent='CSS class copied';}catch{status.textContent='Could not copy. Select the class name and copy it manually.';}});
 input.addEventListener('change',commit);
 input.addEventListener('input',clear);
 input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();commit();}if(event.key==='Escape'){event.preventDefault();input.value=layoutClass(current());clear();}});
 const render=()=>{renderAll();const shape=current();section.hidden=!shape;if(!shape){selectedId=null;return;}if(selectedId!==shape.id||document.activeElement!==input){input.value=layoutClass(shape);clear();}selectedId=shape.id;render.responsive(shapes());};
 render.responsive=scene=>{
  const selected=current(),shape=scene.find(s=>s.id===selected?.id);
  media.hidden=!shape?.layout_media?.length;if(media.hidden)return;
  const state=layoutMediaState(shape,scene),direction=state.shape.auto_layout?.direction;
  mediaWidth.textContent=`Frame width: ${Math.round(state.width*100)/100}px`;
  const text=`${state.rules.length?state.rules.map(r=>`@media ${r.query}`).join(' + '):'Base styles · no matching media query'} → ${direction==='grid'?'Grid Layout':`Flex Layout · ${direction==='vertical'?'Vertical':'Horizontal'}`}`;
  if(mediaState.textContent!==text)mediaState.textContent=text;
  const saved=previews.original(state.root);restore.hidden=!saved;restore.disabled=!!state.root.locked;
  if(saved){restore.textContent=`Restore width · ${Math.round(saved.width*100)/100}px`;restore.title=`Restore ${state.root.name} to its width before breakpoint previews`;}
  const key=JSON.stringify([shape.id,state.root.id,shape.layout_media,state.root.locked]);
  if(key!==breakpointKey){
   breakpointKey=key;breakpointList.replaceChildren();
   for(const rule of shape.layout_media){
    const entry=document.createElement('div');entry.className='layer-css-breakpoint';
    const query=document.createElement('span');query.textContent=`@media ${rule.query}`;
    const buttons=document.createElement('div');buttons.className='layer-css-breakpoint-buttons';
    const widths=[...new Set([rule.min,rule.max].filter(n=>Number.isFinite(n)&&n>0))];
    // Include the other side of the boundary to make layout switches easy to compare.
    if(rule.max!=null)widths.push(rule.max+1);else if(rule.min>1)widths.push(rule.min-1);
    for(const width of [...new Set(widths)]){
     const button=document.createElement('button');button.type='button';button.textContent=`${width}px`;
     button.dataset.width=String(width);button.title=`Resize ${state.root.name} to ${width}px`;
     button.setAttribute('aria-label',`${button.title} for ${rule.query}`);button.disabled=!!state.root.locked;
     button.onclick=()=>{const all=shapes(),selected=current();if(!selected)return;const root=layoutMediaState(selected,all).root;if(root.locked||root.width===width)return;try{previews.preview(root,width);render();}catch(error){status.textContent=error.message;}};
     buttons.append(button);
    }
    entry.append(query,buttons);breakpointList.append(entry);
   }
  }
  for(const button of breakpointList.querySelectorAll('button'))button.setAttribute('aria-pressed',String(state.width===Number(button.dataset.width)));

 };
 return render;
}
