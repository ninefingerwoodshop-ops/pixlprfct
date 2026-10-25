// Keep native selects as the inspector's value/event API, with one shared menu UI.
export function installInspectorDropdowns(root){
 const roots=[root,...document.querySelectorAll('.paint-popover')];
 const entries=new Map();let active=null,sequence=0,pending=false,typeBuffer='',typeTime=0;
 const menu=document.createElement('div');menu.className='inspector-select-menu';menu.setAttribute('popover','manual');menu.setAttribute('role','listbox');menu.id='inspector-select-menu';document.body.append(menu);
 const close=(restore=false)=>{if(!active)return;const previous=active;active=null;previous.button.setAttribute('aria-expanded','false');if(menu.matches(':popover-open'))menu.hidePopover();if(restore&&previous.button.isConnected)previous.button.focus();};
 const visible=select=>!select.hidden&&!select.closest('[hidden]')&&select.parentElement.getClientRects().length>0;
 const position=()=>{if(!active)return;const r=active.button.getBoundingClientRect(),width=Math.min(Math.max(r.width,180),innerWidth-16),availableBelow=innerHeight-r.bottom-12,above=r.top-12,height=Math.min(320,Math.max(availableBelow,above));menu.style.width=width+'px';menu.style.maxHeight=Math.max(60,height)+'px';menu.style.left=Math.max(8,Math.min(r.left,innerWidth-width-8))+'px';menu.style.top=(availableBelow>=Math.min(320,menu.scrollHeight)||availableBelow>=above?r.bottom+5:Math.max(8,r.top-Math.min(menu.scrollHeight,height)-5))+'px';};
 const optionButtons=()=>[...menu.querySelectorAll('[role="option"]:not(:disabled)')];
 const open=entry=>{
  if(entry.select.disabled)return;close();active=entry;typeBuffer='';const {select,button}=entry;button.setAttribute('aria-expanded','true');menu.setAttribute('aria-label',button.getAttribute('aria-label'));menu.replaceChildren();
  let group=null;
  for(const option of select.options){if(option.hidden)continue;const parent=option.parentElement;if(parent.tagName==='OPTGROUP'&&parent!==group){group=parent;const label=document.createElement('div');label.className='inspector-select-group';label.textContent=parent.label;menu.append(label);}
   const item=document.createElement('button');item.type='button';item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.disabled=option.disabled||(parent.tagName==='OPTGROUP'&&parent.disabled);item.tabIndex=-1;
   const label=document.createElement('span'),check=document.createElement('span');label.textContent=option.label;check.textContent=option.selected?'✓':'';check.setAttribute('aria-hidden','true');item.append(label,check);
   item.onclick=()=>{const changed=select.selectedIndex!==option.index;select.selectedIndex=option.index;close(true);if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}sync();};menu.append(item);
  }
  (button.closest('[popover]')??document.body).append(menu);menu.showPopover();position();const selected=menu.querySelector('[aria-selected="true"]:not(:disabled)')??optionButtons()[0];selected?.focus();selected?.scrollIntoView({block:'nearest'});
 };
 function sync(){
  for(const [select,entry] of entries)if(!roots.some(host=>host.contains(select))){if(active===entry)close();entry.button.remove();entries.delete(select);}
  for(const select of roots.flatMap(host=>[...host.querySelectorAll('select:not([multiple])')])){
   let entry=entries.get(select);
   if(!entry){const button=document.createElement('button'),label=document.createElement('span'),chevron=document.createElementNS('http://www.w3.org/2000/svg','svg');button.type='button';button.className='inspector-select-trigger';button.id='inspector-select-'+(++sequence);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',menu.id);chevron.setAttribute('viewBox','0 0 16 16');chevron.setAttribute('aria-hidden','true');chevron.innerHTML='<path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';button.append(label,chevron);
    const nativeLabel=select.labels?.[0],caption=select.getAttribute('aria-label')||nativeLabel?.textContent.replace(select.textContent,'').trim()||select.title||select.id||'Choose an option';button.setAttribute('aria-label',caption);select.dataset.customDropdown='true';select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(button);entry={select,button,label};entries.set(select,entry);
    button.onclick=e=>{e.preventDefault();active===entry?close(true):open(entry);};button.onkeydown=e=>{e.stopPropagation();if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();open(entry);if(e.key==='Home')optionButtons()[0]?.focus();if(e.key==='End')optionButtons().at(-1)?.focus();}};
    select.addEventListener('change',sync);
   }
   const text=select.selectedOptions[0]?.label||'Choose…';if(entry.label.textContent!==text)entry.label.textContent=text;
   if(entry.button.disabled!==select.disabled)entry.button.disabled=select.disabled;
   const hidden=!visible(select);if(entry.button.hidden!==hidden)entry.button.hidden=hidden;
   if(active===entry&&(hidden||select.disabled))close();
  }
 }
 menu.onkeydown=e=>{e.stopPropagation();const items=optionButtons(),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Tab'){close(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?items.length-1:e.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length;items[next]?.focus();items[next]?.scrollIntoView({block:'nearest'});}else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&e.key!==' '){e.preventDefault();typeBuffer=Date.now()-typeTime>700?e.key:typeBuffer+e.key;typeTime=Date.now();items.find(item=>item.textContent.toLowerCase().startsWith(typeBuffer.toLowerCase()))?.focus();}};
 document.addEventListener('pointerdown',e=>{if(active&&!menu.contains(e.target)&&!active.button.contains(e.target))close();});
 document.addEventListener('focusin',e=>{if(active&&!menu.contains(e.target)&&e.target!==active.button)close();});
 for(const host of roots){host.addEventListener('scroll',event=>{if(!menu.contains(event.target))close();},true);host.addEventListener('toggle',()=>{sync();},true);}
 window.addEventListener('resize',()=>close());
 const observer=new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;sync();});}});
 for(const host of roots)observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','label','value','selected','open']});
 sync();return sync;
}
