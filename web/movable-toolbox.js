import {icon} from './icons.js';

// The drawing toolbelt stays in its canvas workspace; placement is UI state.
export function installMovableToolbox(toolbar,workspace){
 const storageKey='pixlprfct.toolbelt-position.v1:'+location.pathname;
 let position=null,drag=null,suppressClick=false;
 try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&['x','y'].every(k=>Number.isFinite(saved[k])&&Math.abs(saved[k])<=100000))position=saved;}catch{}
 const grip=document.createElement('button');grip.type='button';grip.className='toolbelt-grip';grip.setAttribute('aria-label','Move drawing toolbar');grip.title='Drag to move toolbar. Arrow keys move; Home resets.';grip.innerHTML=icon('grip-vertical');toolbar.prepend(grip);
 const persist=()=>{try{if(position)localStorage.setItem(storageKey,JSON.stringify(position));else localStorage.removeItem(storageKey);}catch{}};
 const current=()=>{const box=toolbar.getBoundingClientRect(),host=workspace.getBoundingClientRect();return {x:box.left-host.left-workspace.clientLeft,y:box.top-host.top-workspace.clientTop};};
 function place(){
  if(!position){for(const property of ['left','top','bottom','transform'])toolbar.style.removeProperty(property);}
  else{
   position={x:Math.max(12,Math.min(Math.max(12,workspace.clientWidth-toolbar.offsetWidth-12),position.x)),y:Math.max(12,Math.min(Math.max(12,workspace.clientHeight-toolbar.offsetHeight-12),position.y))};
   Object.assign(toolbar.style,{left:position.x+'px',top:position.y+'px',bottom:'auto',transform:'none'});
  }
  toolbar.dispatchEvent(new Event('toolbeltmove'));
 }
 function finish(cancel=false){
  if(!drag)return;const previous=drag;drag=null;if(cancel)position=previous.position;
  toolbar.classList.remove('toolbelt-dragging');if(toolbar.hasPointerCapture(previous.id))toolbar.releasePointerCapture(previous.id);place();persist();
 }
 toolbar.addEventListener('pointerdown',e=>{
  if(!drag)suppressClick=false;
  const control=e.target.closest('button,input,textarea,select,summary,a,[role=button]');
  if(e.button!==0||drag||control&&control!==grip)return;
  e.preventDefault();e.stopPropagation();suppressClick=false;grip.focus({preventScroll:true});
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:current(),position:position?{...position}:null};toolbar.setPointerCapture(e.pointerId);
 });
 toolbar.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;if(!e.buttons){finish();return;}
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!suppressClick&&Math.hypot(dx,dy)<3)return;
  e.preventDefault();e.stopPropagation();suppressClick=true;toolbar.classList.add('toolbelt-dragging');position={x:drag.start.x+dx,y:drag.start.y+dy};place();
 });
 toolbar.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.id){e.preventDefault();e.stopPropagation();finish();}});
 toolbar.addEventListener('pointercancel',()=>finish(true));toolbar.addEventListener('lostpointercapture',()=>finish(true));
 toolbar.addEventListener('click',e=>{if(suppressClick&&e.detail>0){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 window.addEventListener('keydown',e=>{if(drag&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(true);}},true);
 window.addEventListener('blur',()=>finish(true));
 grip.addEventListener('keydown',e=>{
  if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();return;}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!directions[e.key]&&e.key!=='Home')return;
  e.preventDefault();e.stopPropagation();finish(true);
  if(e.key==='Home')position=null;else{const at=position??current(),[x,y]=directions[e.key],step=e.shiftKey?50:10;position={x:at.x+x*step,y:at.y+y*step};}place();persist();
 });
 const observer=new ResizeObserver(()=>{if(position&&!drag){place();persist();}});observer.observe(workspace);observer.observe(toolbar);place();
 window.addEventListener('pagehide',()=>{finish(true);observer.disconnect();},{once:true});
}
