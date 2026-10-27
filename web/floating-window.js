import {icon} from './icons.js';
export function fitWindow(rect,bounds){
 const width=Math.min(bounds.width,Math.max(Math.min(560,bounds.width),rect.width));
 const height=Math.min(bounds.height,Math.max(Math.min(320,bounds.height),rect.height));
 return {x:Math.max(0,Math.min(bounds.width-width,rect.x)),y:Math.max(0,Math.min(bounds.height-height,rect.y)),width,height};
}
export function resizeWindow(rect,edge,dx,dy,bounds){
 const minW=Math.min(560,bounds.width),minH=Math.min(320,bounds.height);
 let left=rect.x,top=rect.y,right=rect.x+rect.width,bottom=rect.y+rect.height;
 if(edge.includes('w'))left=Math.max(0,Math.min(right-minW,left+dx));
 if(edge.includes('e'))right=Math.min(bounds.width,Math.max(left+minW,right+dx));
 if(edge.includes('n'))top=Math.max(0,Math.min(bottom-minH,top+dy));
 if(edge.includes('s'))bottom=Math.min(bounds.height,Math.max(top+minH,bottom+dy));
 return {x:left,y:top,width:right-left,height:bottom-top};
}
const windowStates=new Map();
const navigationRails=new WeakSet();
function leaveWorkspacePages(except){
 for(const page of document.querySelectorAll('dialog.variables-page[open]')){
  if(page===except)continue;
  page.dataset.navigationDismissed='true';
  page.close();
 }
}
function syncWorkspaceAccessibility(){
 const page=document.querySelector('dialog.variables-page[open]');
 const main=document.querySelector('body > main');
 if(main)main.inert=!!page;
}
function selectWorkspaceNavigation(name){
 const rail=document.querySelector('[aria-label="Editor navigation"]');
 if(!rail)return;
 const target=name==='Assets'?'nav-assets':name==='Variables'?'variables':name?'nav-tools':'nav-layers';
 for(const button of rail.querySelectorAll('#nav-layers,#nav-assets,#nav-tools,[aria-label="Local variables"]')){
  const active=target==='variables'?button.getAttribute('aria-label')==='Local variables':button.id===target;
  button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
 }
}
function installWorkspaceNavigation(){
 const rail=document.querySelector('[aria-label="Editor navigation"]');
 if(!rail||navigationRails.has(rail))return;
 navigationRails.add(rail);
 // Run before the clicked navigation item opens its destination.
 rail.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const title=button.id==='nav-assets'?'Assets':button.id==='nav-tools'?'Tools and actions':button.getAttribute('aria-label')==='Local variables'?'Variables':null;
  const current=[...document.querySelectorAll('dialog.variables-page[open]')].find(page=>page.getAttribute('aria-label')===title);
  leaveWorkspacePages(current);selectWorkspaceNavigation(current?title:null);
 },true);
}

export function floatingWindow(dialog,header,toggle,name="Variables",defaults={}){
 installWorkspaceNavigation();
 delete dialog.dataset.navigationDismissed;
 const remembered=windowStates.get(name);
 const viewport=()=>({width:window.innerWidth,height:window.innerHeight});
 const initial=viewport(),width=defaults.width??640,height=defaults.height??380;let rect=fitWindow(remembered?.rect??{x:defaults.center?(initial.width-width)/2:16,y:defaults.center?(initial.height-height)/2:16,width,height},initial),page=remembered?.page??defaults.page??true;
 const controller=new AbortController(),options={signal:controller.signal};
 const paint=()=>{if(page){leaveWorkspacePages(dialog);selectWorkspaceNavigation(name);}else if(dialog.classList.contains('variables-page'))selectWorkspaceNavigation(null);dialog.style.zIndex=page?'1000':'1001';rect=fitWindow(rect,viewport());dialog.classList.toggle('variables-page',page);const inset=window.innerWidth>640?48:0;const shown=page?{x:inset,y:0,width:window.innerWidth-inset,height:window.innerHeight}:rect;Object.assign(dialog.style,{left:shown.x+'px',top:shown.y+'px',width:shown.width+'px',height:shown.height+'px'});toggle.innerHTML=icon(page?'window-restore':'window-expand');toggle.title=page?'Minimize':'Expand';toggle.setAttribute('aria-label',toggle.title);toggle.setAttribute('aria-pressed',String(page));windowStates.set(name,{rect:{...rect},page});};
 toggle.onclick=()=>{page=!page;paint();};
 header.tabIndex=0;header.setAttribute('aria-label',name+' window title bar. Arrow keys move the floating window.');
 const start=(event,edge)=>{
  if(page||event.button!==0||(!edge&&event.target.closest('button,input,select')))return;
  event.preventDefault();const target=event.currentTarget,origin={...rect},x=event.clientX,y=event.clientY;target.setPointerCapture(event.pointerId);
  const move=e=>{if(e.pointerId!==event.pointerId)return;rect=edge?resizeWindow(origin,edge,e.clientX-x,e.clientY-y,viewport()):fitWindow({...origin,x:origin.x+e.clientX-x,y:origin.y+e.clientY-y},viewport());paint();};
  const finish=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',finish);target.removeEventListener('lostpointercapture',finish);};
  target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',finish);target.addEventListener('lostpointercapture',finish);
 };
 header.addEventListener('pointerdown',e=>start(e,''),options);
 header.addEventListener('dblclick',e=>{if(!e.target.closest('button')){page=!page;paint();}},options);
 header.addEventListener('keydown',e=>{if(e.target!==header||page||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?10:1;rect=fitWindow({...rect,x:rect.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y:rect.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)},viewport());paint();},options);
 for(const edge of ['n','e','s','w','ne','se','sw','nw']){const grip=document.createElement('div');grip.className='window-resize window-resize-'+edge;grip.tabIndex=0;grip.setAttribute('role','button');grip.setAttribute('aria-label','Resize '+name.toLowerCase()+' '+({n:'top',e:'right',s:'bottom',w:'left',ne:'top right',se:'bottom right',sw:'bottom left',nw:'top left'}[edge]));grip.addEventListener('pointerdown',e=>start(e,edge),options);grip.addEventListener('keydown',e=>{if(page||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const step=e.shiftKey?10:1;rect=resizeWindow(rect,edge,e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0,e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0,viewport());paint();},options);dialog.append(grip);}
 const visibilityObserver=new MutationObserver(syncWorkspaceAccessibility);visibilityObserver.observe(dialog,{attributes:true,attributeFilter:['open','class']});
 window.addEventListener('resize',paint,options);dialog.addEventListener('close',()=>{controller.abort();visibilityObserver.disconnect();syncWorkspaceAccessibility();if(!document.querySelector('dialog.variables-page[open]'))selectWorkspaceNavigation(null);},{once:true});paint();
}
