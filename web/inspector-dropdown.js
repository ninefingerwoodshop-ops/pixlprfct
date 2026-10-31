import {positionPopover} from './popover-position.js';
import {icon} from './icons.js';
// Shared editor dropdown: retain selects as the value/event API for every panel.
export function installInspectorDropdowns(root){
 const roots=[root],controller=new AbortController(),signal=controller.signal;let destroyed=false;
 const chrome='.left-panel,.right-panel,.paint-popover,.workspace-window,.variables-workspace,dialog,#project-home,#admin-app,.account-app';
 const selects=()=>[...root.querySelectorAll('select:not([multiple])')].filter(select=>select.closest(chrome)&&!select.closest('#workspace,.prototype-player')); 
 const entries=new Map();let active=null,anchorBounds=null,sequence=0,pending=false,typeBuffer='',typeTime=0;
 const menu=document.createElement('div');menu.className='inspector-select-menu';menu.setAttribute('popover','manual');menu.setAttribute('role','listbox');menu.id='inspector-select-menu';document.body.append(menu);
 const close=(restore=false)=>{if(!active)return;const previous=active;active=null;previous.button.setAttribute('aria-expanded','false');if(menu.matches(':popover-open'))menu.hidePopover();if(restore&&previous.button.isConnected)previous.button.focus();};
 // The custom trigger is a sibling of the select and inherits the same ancestor
 // visibility. Measuring every parent forced layout even for closed controls.
 const visible=select=>!select.hidden&&!select.closest('[hidden]');
 const position=()=>{if(!active)return;const r=active.button.getBoundingClientRect();anchorBounds=r;positionPopover(menu,r,{placement:'below',width:Number(active.select.dataset.menuWidth)||Math.max(r.width,180),maxHeight:Number(active.select.dataset.menuHeight)||320,gap:5});};
 const optionButtons=()=>[...menu.querySelectorAll('[role="option"]:not(:disabled)')];
 const open=entry=>{
  if(entry.select.disabled)return;close();active=entry;typeBuffer='';const {select,button}=entry;button.setAttribute('aria-expanded','true');menu.setAttribute('aria-label',button.getAttribute('aria-label'));menu.replaceChildren();
  let group=null;
  for(const option of select.options){if(option.hidden)continue;const parent=option.parentElement;if(parent.tagName==='OPTGROUP'&&parent!==group){group=parent;const label=document.createElement('div');label.className='inspector-select-group';label.textContent=parent.label;menu.append(label);}
   const item=document.createElement('button');item.type='button';item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.disabled=option.disabled||(parent.tagName==='OPTGROUP'&&parent.disabled);item.tabIndex=-1;
   const label=document.createElement('span'),check=document.createElement('span');label.textContent=option.label;check.className='inspector-select-check';if(option.selected)check.innerHTML=icon('check');check.setAttribute('aria-hidden','true');item.append(label,check);
   item.onclick=()=>{const changed=select.selectedIndex!==option.index;select.selectedIndex=option.index;close(true);if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}sync();};menu.append(item);
  }
  (button.closest('[popover],dialog')??document.body).append(menu);menu.showPopover();position();const selected=menu.querySelector('[aria-selected="true"]:not(:disabled)')??optionButtons()[0];selected?.focus();selected?.scrollIntoView({block:'nearest'});
 };
 function sync(){
  if(destroyed)return;
  for(const [select,entry] of entries)if(!roots.some(host=>host.contains(select))){if(active===entry)close();entry.button.remove();entries.delete(select);}
  for(const select of selects()){
   let entry=entries.get(select);
   if(!entry){const button=document.createElement('button'),label=document.createElement('span'),chevron=document.createElementNS('http://www.w3.org/2000/svg','svg');button.type='button';button.className='inspector-select-trigger';button.dataset.selectId=select.id;button.id='inspector-select-'+(++sequence);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',menu.id);chevron.setAttribute('class','app-icon');chevron.setAttribute('viewBox','0 0 16 16');chevron.setAttribute('aria-hidden','true');chevron.innerHTML='<path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';button.append(label,chevron);
    const nativeLabel=select.labels?.[0],caption=select.getAttribute('aria-label')||nativeLabel?.textContent.replace(select.textContent,'').trim()||select.title||select.id||'Choose an option';button.setAttribute('aria-label',caption);select.dataset.customDropdown='true';select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(button);entry={select,button,label,caption};entries.set(select,entry);
    if(select.dataset.triggerIcon){button.classList.add('inspector-select-icon');label.hidden=true;chevron.remove();const glyph=document.createElement('span');glyph.className='inspector-select-glyph';glyph.innerHTML=icon(select.dataset.triggerIcon);button.append(glyph);button.title=caption;}
    button.onclick=e=>{e.preventDefault();active===entry?close(true):open(entry);};button.onkeydown=e=>{if(e.ctrlKey||e.metaKey)return;e.stopPropagation();if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();open(entry);if(e.key==='Home')optionButtons()[0]?.focus();if(e.key==='End')optionButtons().at(-1)?.focus();}};
    select.addEventListener('change',sync,{signal});
   }
   const text=select.selectedOptions[0]?.dataset.shortLabel||select.selectedOptions[0]?.label||'Choose…';if(entry.label.textContent!==text){entry.label.textContent=text;entry.button.setAttribute('aria-label',entry.caption+': '+text);}
   if(entry.button.disabled!==select.disabled)entry.button.disabled=select.disabled;
  }
  // Read visibility in one phase. Interleaving getClientRects with hidden/text
  // writes forced a full inspector layout for each dropdown on every edit.
  const visibility=[...entries.values()].map(entry=>[entry,!visible(entry.select)]);
  for(const [entry,hidden] of visibility){if(entry.button.hidden!==hidden)entry.button.hidden=hidden;if(active===entry&&(hidden||entry.select.disabled||!entry.button.getClientRects().length))close();}
 }
 menu.onkeydown=e=>{if(e.ctrlKey||e.metaKey){close(true);return;}e.stopPropagation();const items=optionButtons(),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Tab'){close(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?items.length-1:e.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length;items[next]?.focus();items[next]?.scrollIntoView({block:'nearest'});}else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&e.key!==' '){e.preventDefault();typeBuffer=Date.now()-typeTime>700?e.key:typeBuffer+e.key;typeTime=Date.now();items.find(item=>item.textContent.toLowerCase().startsWith(typeBuffer.toLowerCase()))?.focus();}};
 document.addEventListener('pointerdown',e=>{if(active&&!menu.contains(e.target)&&!active.button.contains(e.target))close();},{signal});
 document.addEventListener('focusin',e=>{if(active&&!menu.contains(e.target)&&e.target!==active.button)close();},{signal});
 for(const host of roots){host.addEventListener('scroll',event=>{
  if(!active||menu.contains(event.target))return;
  // A scroll that revealed the trigger may be delivered after its click. Only
  // dismiss when the anchor actually moves after the menu has been positioned.
  const bounds=active.button.getBoundingClientRect();
  if(!anchorBounds||bounds.x!==anchorBounds.x||bounds.y!==anchorBounds.y)close();
 },{capture:true,signal});host.addEventListener('toggle',()=>{sync();},{capture:true,signal});}
 window.addEventListener('resize',()=>close(),{signal});
 const observer=new MutationObserver(records=>{if(!records.some(record=>record.target===root||record.target.closest?.(chrome)))return;if(!pending){pending=true;queueMicrotask(()=>{pending=false;sync();});}});
 for(const host of roots)observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','label','value','selected','open','class']});
 sync.destroy=()=>{destroyed=true;close();controller.abort();observer.disconnect();menu.remove();for(const [select,entry] of entries){entry.button.remove();delete select.dataset.customDropdown;select.removeAttribute('aria-hidden');select.removeAttribute('tabindex');}entries.clear();};
 sync();return sync;
}
