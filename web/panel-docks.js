import {icon} from './icons.js';
import {panelGlyphs,panelSide} from './panel-icons.js';

// A collapsed dock and its flyout keep the same live controls in the editor.
// Only the separate tear-out action creates a window.
export function installPanelDocks({panels,changed=()=>{},storageKey='pixlprfct.panel-icons.v1:'+location.pathname}){
 const records=new Map();let collapsed=new Set(),open=null;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)??'[]');if(Array.isArray(saved))collapsed=new Set(saved.filter(k=>typeof k==='string'));}catch{}
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify([...collapsed]));}catch{}};
 const glyphs=panelGlyphs;
 const button=(label,glyph,fn)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.innerHTML=icon(glyph);b.onclick=e=>{e.preventDefault();e.stopPropagation();fn();};return b;};
 const setGlyph=(button,glyph)=>{if(button.dataset.actionIcon!==glyph){button.dataset.actionIcon=glyph;button.innerHTML=icon(glyph);}};
 function close(restore=false){if(!open)return;const r=open;open=null;r.node.classList.remove('panel-flyout');if(r.role)r.node.setAttribute('role',r.role);else r.node.removeAttribute('role');if(r.labelBefore)r.node.setAttribute('aria-label',r.labelBefore);else r.node.removeAttribute('aria-label');r.trigger.setAttribute('aria-expanded','false');for(const p of r.node.querySelectorAll(':popover-open'))p.hidePopover();if(restore)r.trigger.focus();changed();}
 function place(){if(!open)return;const r=open,b=r.rail.getBoundingClientRect(),width=Math.min(r.width,innerWidth-32),height=Math.min(r.height,innerHeight-32);let left=r.side==='right'?b.left-width-4:b.right+4,top=Math.max(16,b.top);if(r.side==='bottom'){left=Math.max(16,Math.min(innerWidth-width-16,b.left));top=b.top-height-4;}const styles={'--panel-flyout-x':Math.max(8,Math.min(innerWidth-width-8,left))+'px','--panel-flyout-y':Math.max(8,Math.min(innerHeight-height-8,top))+'px','--panel-flyout-width':width+'px','--panel-flyout-height':height+'px'};for(const [name,value] of Object.entries(styles))r.node.style.setProperty(name,value);}
 function show(r){if(panels.isDetached(r.key)){panels.show(r.key);return;}if(open===r){close();return;}close();open=r;r.role=r.node.getAttribute('role');r.labelBefore=r.node.getAttribute('aria-label');r.node.setAttribute('role','dialog');r.node.setAttribute('aria-label',r.label+' panel');r.node.classList.add('panel-flyout');r.trigger.setAttribute('aria-expanded','true');place();changed();}
 function setCollapsed(r,value){close();if(value){const box=r.node.getBoundingClientRect();if(box.width>48)r.width=box.width;if(box.height>48)r.height=Math.max(240,box.height);collapsed.add(r.key);}else collapsed.delete(r.key);persist();sync();(value?r.expand:r.collapse)?.focus({preventScroll:true});changed();}
 function sync(){
  for(const entry of panels.entries()){
   const node=entry.node;if(!node)continue;const key=entry.key,label=entry.label,heading=entry.heading;if(!heading)continue;let r=records.get(key);
   if(!r){
    const rail=document.createElement('div');rail.className='panel-icon-rail';rail.dataset.panelRail=key;rail.setAttribute('role','toolbar');rail.setAttribute('aria-label',label+' dock');
    r={key,label,node,rail,width:key==='timeline'?900:280,height:key==='timeline'?320:600,side:panelSide(key,node)};
    r.expand=button('Expand '+label+' panel','chevrons-right',()=>setCollapsed(r,false));r.trigger=button('Show '+label+' flyout',glyphs[key]??'panel-left',()=>show(r));r.trigger.setAttribute('aria-haspopup','dialog');r.trigger.setAttribute('aria-expanded','false');rail.append(r.expand,r.trigger);records.set(key,r);
   }
   if(!r.observer){r.observer=new MutationObserver(sync);r.observer.observe(node,{attributes:true,attributeFilter:['hidden']});}
   if(node.hidden&&open===r)close();
   r.node=node;r.side=node.dataset.panelSide??r.side;
   if(!heading.querySelector('.panel-type-icon')){const glyph=document.createElement('span');glyph.className='panel-type-icon';glyph.innerHTML=icon(glyphs[key]??'panel-left');glyph.setAttribute('aria-hidden','true');heading.prepend(glyph);}
   if(r.heading!==heading){r.collapse?.remove();r.heading=heading;r.collapse=button('Collapse '+label+' panel','chevrons-left',()=>setCollapsed(r,true));r.collapse.className='panel-collapse';heading.append(r.collapse);}
   // Point toward the next state: outward to collapse, inward to expand.
   const collapseIcon=r.side==='right'?'chevrons-right':r.side==='bottom'?'chevrons-down':'chevrons-left',expandIcon=r.side==='right'?'chevrons-left':r.side==='bottom'?'chevrons-up':'chevrons-right';
   setGlyph(r.collapse,collapseIcon);setGlyph(r.expand,expandIcon);
   if(key==='timeline'){const toggle=node.querySelector('button[aria-label="Collapse Motion timeline"]');if(toggle){toggle.onclick=()=>setCollapsed(r,true);setGlyph(toggle,collapseIcon);}}
   const detached=panels.isDetached(key),isCollapsed=collapsed.has(key)&&!detached,home=entry.placeholder??node;
   if(entry.placeholder)entry.placeholder.hidden=node.hidden;
   if(home.ownerDocument===document&&home.parentNode){
    // Expanded headers share their existing brand/title row; compact docks start with the toggle.
    const sidebar=r.side==='left'&&home.parentElement.matches('.left-panel')?home.parentElement:null;
    if(sidebar){
     let top=sidebar.querySelector(':scope > .panel-sidebar-top');
     if(!top){top=document.createElement('div');top.className='panel-sidebar-top';const logo=sidebar.querySelector('.svg-file-heading img');if(logo){const brand=document.createElement('div');brand.className='panel-sidebar-brand';brand.append(logo);top.append(brand);}sidebar.prepend(top);}
     if(!r.sidebarHeading){r.sidebarHeading=document.createElement('div');r.sidebarHeading.className='panel-sidebar-toggle';const menu=sidebar.querySelector(':scope > .file-heading > #document-actions');if(menu)menu.after(r.sidebarHeading);else top.append(r.sidebarHeading);}
     if(r.rail.parentNode!==top)top.append(r.rail);
     r.sidebarHeading.hidden=detached||isCollapsed||node.hidden;
     const toggleHome=r.sidebarHeading.hidden?heading:r.sidebarHeading;if(r.collapse.parentNode!==toggleHome)toggleHome.append(r.collapse);
    }
    else if(r.rail.nextSibling!==home)home.before(r.rail);
   }
   r.rail.hidden=!isCollapsed||node.hidden;r.rail.dataset.side=r.side;node.classList.toggle('panel-collapsed',isCollapsed);node.classList.toggle('panel-detachable-parent',true);
   if(detached&&open===r)close();if(!isCollapsed)node.classList.remove('panel-flyout');
   document.body.classList.toggle('panel-'+key+'-collapsed',isCollapsed&&!node.hidden);
   document.body.classList.toggle('panel-'+key+'-detached',detached&&!node.hidden);
  }
  document.body.classList.toggle('panel-left-compact',[...records.values()].some(r=>r.side==='left'&&!r.node.hidden&&(collapsed.has(r.key)||panels.isDetached(r.key))));
  place();
 }
 document.addEventListener('pointerdown',e=>{if(!open||open.node.contains(e.target)||open.rail.contains(e.target)||e.target.closest('[popover],dialog'))return;close();},true);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.documentElement.dataset.panelDragging&&!e.defaultPrevented&&open&&!e.target.closest('[popover],dialog')){e.preventDefault();e.stopImmediatePropagation();close(true);}},true);
 window.addEventListener('resize',place);sync();return {sync,close,isCollapsed:key=>collapsed.has(key)};
}
