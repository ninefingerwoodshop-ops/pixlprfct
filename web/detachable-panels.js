import {icon} from './icons.js';
import {installInspectorDropdowns} from './inspector-dropdown.js';
import {registerEditorPanel} from './editor-dom.js';
import {restorePanelPopovers} from './popover-position.js';
import {panelGlyphs,panelIcon,panelSide,dockGlyph} from './panel-icons.js';

// Portals share the editor's live controls and history. A panel never loads a
// second editor or writes a competing copy of the document.
export function installDetachablePanels({root=document.body,dropdowns,keydown,report,changed=()=>{},contexts=false,parentKeys=null,storageKey='pixlprfct.panels.v1:'+location.pathname}){
 const entries=new Map();let closing=false,nativeClosing=false;
 window.pixlPanels?.onClosing(value=>{nativeClosing=value;closing=value;for(const entry of entries.values())remember(entry);});
 let saved={};try{const value=JSON.parse(localStorage.getItem(storageKey)??'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
 if(parentKeys){const migrated={};for(const [key,value] of Object.entries(saved)){const parent=parentKeys.includes(key)?key:key==='pages'?'layers':'inspector';migrated[parent]??=value;}saved=migrated;}
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}};
 const remember=entry=>{const child=entry.window;if(!entry.ready||!child||child.closed)return;const next={label:entry.label,x:child.screenX,y:child.screenY,width:child.outerWidth,height:child.outerHeight};if(JSON.stringify(saved[entry.key])!==JSON.stringify(next)){saved[entry.key]=next;persist();}};
 const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const button=(label,run,glyph)=>{const b=make('button','panel-action',glyph?'':label);b.type='button';b.onclick=run;b.setAttribute('aria-label',label);b.title=label;if(glyph)b.innerHTML=icon(glyph);return b;};
 function release(node,sync){sync?.release(node);for(const p of node.querySelectorAll(':popover-open'))p.hidePopover();}
 function dock(entry){
  entry.drag?.finish();
  if(!entry.window)return;
  if(!closing){delete saved[entry.key];persist();}
  const child=entry.window;entry.window=null;
  entry.observer?.disconnect();entry.observer=null;entry.dropdowns?.destroy();entry.dropdowns=null;
  restorePanelPopovers(child.document);
  if(entry.node&&entry.placeholder?.isConnected){entry.placeholder.replaceWith(entry.node);delete entry.node.dataset.detached;}
  entry.placeholder=null;entry.host=null;entry.ready=false;entry.contextRoot=null;
  if(!child.closed)child.close();dropdowns()?.();changed();
 }
 function mount(entry){
  if(!entry.ready||!entry.window||entry.window.closed)return;
  entry.dropdowns?.release(entry.host);
  if(!entry.node){entry.host.replaceChildren(make('p','panel-empty','Select artwork to show this panel.'));return;}
  release(entry.node,dropdowns());
  if(root.contains(entry.node)){
   const stub=make('div','panel-placeholder'),side=panelSide(entry.key,entry.node);stub.dataset.panelPlaceholder=entry.key;stub.dataset.side=side;stub.setAttribute('role','toolbar');stub.setAttribute('aria-label',entry.label+' detached panel');
   stub.append(button('Show '+entry.label+' panel',()=>entry.window?.focus(),panelGlyphs[entry.key]??'panel-left'),button('Dock '+entry.label+' panel',()=>dock(entry),dockGlyph(side)));
   entry.node.replaceWith(stub);entry.placeholder=stub;
  }
  entry.node.dataset.detached='true';entry.host.replaceChildren(entry.node);
  if(contexts){
   buildContext(entry);
   entry.empty=make('p','panel-empty','Select artwork or switch editor mode to show this panel.');entry.host.append(entry.empty);syncContext(entry);
  }
  entry.dropdowns?.();changed();
 }
 function contextAncestors(entry){const list=[];for(let node=entry.placeholder?.parentElement;node&&node!==document.body;node=node.parentElement)list.unshift(node);return list;}
 function buildContext(entry){
  const ancestors=contextAncestors(entry);entry.host.replaceChildren(entry.node);let host=entry.host;
  entry.contexts=ancestors.map(source=>{const copy=make(source.localName,'');copy.dataset.panelContext='';host.append(copy);host=copy;return {source,copy};});
  entry.contextRoot=entry.contexts[0]?.copy;if(entry.contextRoot)host.append(entry.node);
  if(entry.empty)entry.host.append(entry.empty);
 }
 function syncContext(entry){
  if(!contexts||!entry.ready||!entry.node)return;
  const ancestors=contextAncestors(entry);if(ancestors.length!==entry.contexts?.length||ancestors.some((n,i)=>n!==entry.contexts[i].source))buildContext(entry);
  entry.window.document.body.className=document.body.className+' detached-panel-window';
  for(const {source,copy} of entry.contexts??[]){copy.className=source.className;copy.id=source.id;}
  const unavailable=entry.node.hidden||(entry.contexts??[]).some(({source})=>source.hidden);
  if(entry.contextRoot)entry.contextRoot.classList.toggle('panel-unavailable',unavailable);
  if(entry.empty)entry.empty.hidden=!unavailable;
 }
 function detach(entry,event){
  if(entry.window&&!entry.window.closed){entry.window.focus();return;}
  const wide=entry.key==='timeline',rect=entry.node?.getBoundingClientRect()??{left:100,top:100,width:280,height:320},previous=saved[entry.key];
  const valid=v=>typeof v==='number'&&Number.isFinite(v);
  const width=previous&&valid(previous.width)?Math.max(260,Math.min(1600,previous.width)):wide?900:Math.max(280,Math.min(480,rect.width)),height=previous&&valid(previous.height)?Math.max(180,Math.min(1200,previous.height)):wide?360:Math.max(240,Math.min(760,rect.height+52));
  const x=Math.round(!event&&valid(previous?.x)?previous.x:event?.screenX??window.screenX+rect.left),y=Math.round(!event&&valid(previous?.y)?previous.y:event?.screenY??window.screenY+rect.top);
  const child=window.open(new URL('./panel.html',import.meta.url).href,'pixl-panel-'+crypto.randomUUID(),`popup,width=${Math.round(width)},height=${Math.round(height)},left=${x},top=${y}`);
  if(!child){report('Allow pop-up windows for PixlPrfct, then try tearing out the panel again.');return;}
  entry.window=child;entry.ready=false;
  // Wait for the real same-origin shell, rather than the initial about:blank.
  const ready=()=>{
   if(entry.window!==child||child.closed||closing||entry.ready)return;
   try{
    if(child.location.href!==new URL('./panel.html',import.meta.url).href)return;
    const doc=child.document;doc.title=entry.label+' · PixlPrfct';
    for(const link of document.querySelectorAll('link[rel=stylesheet]')){const copy=doc.createElement('link');copy.rel='stylesheet';copy.href=link.href;doc.head.append(copy);}
    doc.body.className=document.body.className+' detached-panel-window';doc.body.dataset.panel=entry.key;
    const bar=make('header','panel-window-header'),logo=make('img','');logo.src=new URL('./favicon.svg',import.meta.url).href;logo.alt='PixlPrfct';
    const glyph=make('span','panel-type-icon');glyph.setAttribute('aria-hidden','true');glyph.innerHTML=panelIcon(entry.key);
    bar.append(logo,glyph,make('strong','',entry.label),button('Dock panel',()=>dock(entry),dockGlyph(panelSide(entry.key,entry.node))));
    entry.host=make('div','panel-window-content workspace-window');doc.body.replaceChildren(bar,entry.host);
    entry.dropdowns=installInspectorDropdowns(doc.body);entry.ready=true;
    entry.observer=new child.ResizeObserver(changed);entry.observer.observe(entry.host);
    child.addEventListener('keydown',keydown);
    entry.drag?.attach(child);entry.drag?.follow();
    child.addEventListener('pagehide',()=>{if(!closing)dock(entry);},{once:true});
    mount(entry);if(previous){child.resizeTo(width,height);child.moveTo(x,y);}remember(entry);
   }catch(error){dock(entry);report('The panel could not open: '+error.message);}
  };
  child.addEventListener('load',ready,{once:true});
  // Handles a cached shell which finished loading before the listener attached.
  if(child.document.readyState==='complete')ready();
 }
 function decorate(entry,node){
  const heading=node.querySelector(':scope > h3,:scope > summary,:scope > .file-tabs,:scope > .panel-heading,:scope > .svg-layer-header,:scope > .svg-pen-heading,:scope > .panel-tear-heading')??[...node.querySelectorAll('h3')].find(h=>h.closest('[data-detachable-panel]')===node);if(!heading)return;
  heading.classList.add('panel-tear-heading');heading.tabIndex=-1;heading.title='Drag to open '+entry.label+' in a separate window';
  if(!heading.querySelector(':scope > .panel-popout')){const pop=button('',event=>{event.preventDefault();event.stopPropagation();detach(entry,event);});pop.classList.add('panel-popout');pop.innerHTML=icon('external-link');pop.setAttribute('aria-label','Open '+entry.label+' in separate window');pop.title='Open '+entry.label+' in separate window';heading.append(pop);}
  if(heading===entry.heading)return;entry.heading=heading;
  let drag=null,suppressClick=false;
  heading.addEventListener('pointerdown',e=>{
   if(node.ownerDocument!==document||e.button!==0||e.target.closest('input,select,button:not(.inspector-section-toggle):not(.inspector-accordion-toggle)'))return;
   suppressClick=false;const capture=document.documentElement,rect=node.getBoundingClientRect(),listeners=[];capture.dataset.panelDragging='true';
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,screenX:e.screenX,screenY:e.screenY,offsetX:Math.max(16,Math.min(e.clientX-rect.left,240)),torn:false};
   const current=drag;
   const follow=()=>{const child=entry.window;if(!child||child.closed)return;const frame=Math.max(0,child.outerHeight-child.innerHeight);child.moveTo(Math.round(current.screenX-current.offsetX),Math.round(current.screenY-frame-22));};
   const finish=()=>{if(drag!==current)return;drag=null;entry.drag=null;delete capture.dataset.panelDragging;remember(entry);for(const [win,type,fn] of listeners)win.removeEventListener(type,fn,true);if(capture.hasPointerCapture(current.id))capture.releasePointerCapture(current.id);if(heading.hasPointerCapture(current.id))heading.releasePointerCapture(current.id);};
   const move=event=>{
    if(drag!==current)return;
    if(event.buttons===0){finish();return;}
    current.screenX=event.screenX;current.screenY=event.screenY;
    if(!current.torn&&Math.hypot(event.clientX-current.x,event.clientY-current.y)>=4){
     current.torn=true;suppressClick=true;capture.setPointerCapture(current.id);entry.drag={finish,follow,attach};detach(entry,event);
     if(!entry.window){finish();return;}entry.window.blur();window.focus();
    }
    if(current.torn){event.preventDefault();follow();}
   };
   const up=event=>{if(current.torn){current.screenX=event.screenX;current.screenY=event.screenY;follow();event.preventDefault();}finish();};
   const cancel=()=>{const torn=current.torn;finish();if(torn)dock(entry);};
   const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}};
   const attach=win=>{for(const [type,fn] of [['pointermove',move],['pointerup',up],['pointercancel',cancel],['keydown',escape]]){win.addEventListener(type,fn,true);listeners.push([win,type,fn]);}};
   attach(window);heading.setPointerCapture(e.pointerId);
  });
  heading.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 }
 function sync(){
  for(const node of root.querySelectorAll('[data-detachable-panel]')){
   if(node.parentElement.closest('[data-detachable-panel]'))continue;
   const key=node.dataset.detachablePanel;let entry=entries.get(key);
   if(!entry){entry={key,label:node.dataset.panelLabel??key,node:null};entries.set(key,entry);registerEditorPanel(entry);}
   if(entry.node!==node){entry.node=node;decorate(entry,node);if(entry.window)mount(entry);}
  }
  for(const entry of entries.values()){
   if(entry.window?.closed){dock(entry);continue;}
   // Inspector sections are rebuilt when selection or values change. Remove
   // stale callbacks if the new selection does not have this section.
   if(entry.window&&entry.placeholder&&!entry.placeholder.isConnected){entry.node=null;entry.placeholder=null;mount(entry);}
   if(entry.node){decorate(entry,entry.node);syncContext(entry);}
  }
 }
 // Save native moves/resizes as well as pointer-driven tear-outs. Browser window
 // movement has no DOM event; polling stops when the owning editor unloads.
 const timer=setInterval(()=>{for(const entry of entries.values())remember(entry);},500);
 window.addEventListener('beforeunload',()=>{for(const entry of entries.values())remember(entry);closing=true;setTimeout(()=>{if(!nativeClosing)closing=false;},0);});
 window.addEventListener('pagehide',()=>{closing=true;clearInterval(timer);for(const entry of entries.values()){remember(entry);entry.observer?.disconnect();entry.dropdowns?.destroy();entry.window?.close();}});
 queueMicrotask(()=>{sync();for(const [key,value] of Object.entries(saved)){if(!value||typeof value.label!=='string')continue;let entry=entries.get(key);if(!entry){entry={key,label:value.label,node:null};entries.set(key,entry);registerEditorPanel(entry);}detach(entry);}});
 return {sync,entries:()=>[...entries.values()],isDetached(key){const e=entries.get(key);return !!e?.ready&&!e.window?.closed;},show(key){entries.get(key)?.window?.focus();},dock(key){const entry=entries.get(key);if(entry)dock(entry);},focusedDocument(){for(const e of entries.values())if(e.ready&&!e.window?.closed&&e.window.document.hasFocus())return e.window.document;return document;},find(id){for(const e of entries.values())if(e.ready&&!e.window?.closed){const node=e.node?.id===id?e.node:e.node?.querySelector('#'+CSS.escape(id));if(node)return node;}return null;}};
}
