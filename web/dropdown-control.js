import {icon} from './icons.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dropdownDefaults={preview_open:false,search:true,select_all:true,deselect_all:true,bulk_style:"links",select_all_label:"Select all",deselect_all_label:"Deselect all",checkboxes:true,pills:true,pill_limit:3,menu_width:0,menu_height:280,selected:[],items:[]};
export function dropdownConfig(c){
 const d={...dropdownDefaults,...c.dropdown};
 d.items=(d.items.length?d.items:(c.options??[]).map(label=>({label,value:label,category:'',disabled:false}))).slice(0,500);
 const seen=new Set();d.items=d.items.filter(i=>i.value&&!seen.has(i.value)&&seen.add(i.value)).map(i=>({...i,label:i.label||i.value}));
 d.selected=(c.multiple?(c.selected_values??(c.value?[c.value]:d.selected)):[c.value]).filter(v=>d.items.some(i=>i.value===v));
 return d;
}
function bulkActions(c,d){
 if(!c.multiple||d.bulk_style==='none')return '';
 const enabled=d.items.filter(i=>!i.disabled),count=enabled.filter(i=>d.selected.includes(i.value)).length,all=enabled.length>0&&count===enabled.length;
 const combined=['checkbox','switch','toggle_button'].includes(d.bulk_style);
 const role=d.bulk_style==='checkbox'?'checkbox':d.bulk_style==='switch'?'switch':null;
 const body=combined?`<button type="button" data-bulk-toggle${role?` role="${role}" aria-checked="${all?'true':count&&role==='checkbox'?'mixed':'false'}"`:` aria-pressed="${all}"`}${!enabled.length?' disabled="disabled"':''}>${role?'<span class="px-dropdown-bulk-indicator" aria-hidden="true"></span>':''}<span data-bulk-label>${esc(d.bulk_style==='toggle_button'&&all?d.deselect_all_label:d.select_all_label)}</span></button>`:
 `${d.select_all?`<button type="button" data-select-all>${esc(d.select_all_label)}</button>`:''}${d.deselect_all?`<button type="button" data-deselect-all>${esc(d.deselect_all_label)}</button>`:''}`;
 return `<div class="px-dropdown-actions" data-bulk-style="${esc(d.bulk_style)}">${body}</div>`;
}
export function dropdownMarkup(c,id){
 const d=dropdownConfig(c),base='px-dropdown-'+id,selected=d.items.filter(i=>d.selected.includes(i.value));
 const attrs=`${c.disabled?' disabled="disabled"':''}${c.required?' required="required"':''}`;
 const native=`<select class="px-dropdown-native" aria-label="${esc(c.label||'Dropdown')}" tabindex="-1" aria-hidden="true" data-validate="${esc(c.validation_trigger||'blur')}" data-error-message="${esc(c.validation_message)}"${attrs}${c.multiple?' multiple="multiple"':''} name="${esc(c.name)}" data-initial-value="${esc(c.value)}"${c.multiple?` data-initial-values="${esc(JSON.stringify(d.selected))}"`:""}><option value=""${c.multiple?' disabled="disabled"':''}>${esc(c.placeholder||'Select an option')}</option>${d.items.map(i=>`<option value="${esc(i.value)}"${d.selected.includes(i.value)?' selected="selected"':''}${i.disabled?' disabled="disabled"':''}>${esc(i.label)}</option>`).join('')}</select>`;
 const values=selected.length?(c.multiple&&d.pills?selected.slice(0,d.pill_limit).map(i=>`<span class="px-dropdown-pill">${esc(i.label)}</span>`).join('')+(selected.length>d.pill_limit?`<span class="px-dropdown-more">+ ${selected.length-d.pill_limit} more</span>`:''):esc(selected.map(i=>i.label).join(', '))):`<span class="px-dropdown-placeholder">${esc(c.placeholder||'Select an option')}</span>`;
 let category=null;const options=d.items.map((i,n)=>{const heading=i.category!==category&&i.category?`<div class="px-dropdown-category">${esc(i.category)}</div>`:'';category=i.category;return heading+`<div class="px-dropdown-option" id="${base}-option-${n}" role="option" tabindex="-1" aria-selected="${d.selected.includes(i.value)}" aria-disabled="${!!i.disabled}" data-value="${esc(i.value)}" data-category="${esc(i.category)}">${c.multiple&&d.checkboxes?'<span class="px-dropdown-checkbox" aria-hidden="true"></span>':''}<span>${esc(i.label)}</span></div>`;}).join('');
 return `<button type="button" class="px-control px-dropdown-trigger" data-dropdown="${esc(JSON.stringify({...d,items:undefined,selected:undefined,multiple:!!c.multiple}))}" aria-label="${esc(c.label||'Dropdown')}" aria-description="${c.required?'Required field':''}" aria-haspopup="listbox" aria-expanded="false" aria-controls="${base}-list"${c.disabled?' disabled="disabled"':''}><span class="px-dropdown-values">${values}</span><span class="px-dropdown-chevron" aria-hidden="true">${icon('chevron-down')}</span></button>${native}<div class="px-dropdown-menu" popover="manual" id="${base}-menu">${d.search?'<input class="px-dropdown-search" type="search" placeholder="Search options" aria-label="Search options">':''}${bulkActions(c,d)}<div class="px-dropdown-list" id="${base}-list" role="listbox" aria-label="${esc(c.label||'Options')}"${c.multiple?' aria-multiselectable="true"':''}>${options}</div><div class="px-dropdown-empty" role="status" hidden="hidden">No matching options</div></div>`;
}
export function dropdownCss(id){const r='.px-node-'+id;return `${r}>.px-dropdown-native{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none;clip-path:inset(50%)}${r}>.px-dropdown-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;text-align:left;padding:8px 12px;min-height:40px;height:auto}${r} .px-dropdown-chevron{display:flex;align-items:center;flex:none}${r} .px-dropdown-chevron svg{width:16px;height:16px}${r}>.px-dropdown-trigger[aria-expanded="true"] .px-dropdown-chevron{transform:rotate(180deg)}${r} .px-dropdown-values{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0;overflow:hidden}${r} .px-dropdown-placeholder{color:#64748b}${r} .px-dropdown-pill,${r} .px-dropdown-more{background:#e8eefb;border-radius:4px;padding:2px 6px;font-size:12px;color:#1e40af;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}${r}>.px-dropdown-menu{position:fixed;inset:auto;margin:0;box-sizing:border-box;padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#182230;box-shadow:0 8px 24px #10182826;font:14px system-ui;overflow:auto;max-width:calc(100vw - 16px)}${r} .px-dropdown-menu [hidden]{display:none!important}${r} .px-dropdown-search{box-sizing:border-box;width:100%;height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:4px 8px;font:inherit;margin-bottom:6px}${r} .px-dropdown-actions{display:flex;gap:8px;padding:4px 0 8px;flex-wrap:wrap}${r} .px-dropdown-actions button{font:inherit;color:#1d4ed8;background:transparent;border:0;padding:4px;cursor:pointer}${r} .px-dropdown-actions button{display:inline-flex;align-items:center;justify-content:center;flex:1 1 0;min-width:0;overflow-wrap:anywhere;gap:8px;border-radius:4px}${r} .px-dropdown-actions button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}${r} .px-dropdown-actions button:hover{background:#eff6ff}${r} .px-dropdown-actions button:disabled{opacity:.45;cursor:not-allowed}${r} [data-bulk-style="buttons"] button,${r} [data-bulk-style="toggle_button"] button{border:1px solid #cbd5e1;padding:6px 10px;background:#f8fafc}${r} .px-dropdown-bulk-indicator{box-sizing:border-box;flex:none;width:16px;height:16px;border:1px solid currentColor;border-radius:3px;display:grid;place-items:center}${r} [aria-checked="true"]>.px-dropdown-bulk-indicator::after{content:'✓';font-size:12px}${r} [aria-checked="mixed"]>.px-dropdown-bulk-indicator::after{content:'−';font-size:12px}${r} [role="switch"]>.px-dropdown-bulk-indicator{width:28px;border-radius:20px;background:#64748b;padding:2px;display:flex;color:white}${r} [role="switch"]>.px-dropdown-bulk-indicator::after{content:'';width:10px;height:10px;border-radius:50%;background:currentColor}${r} [role="switch"][aria-checked="true"]>.px-dropdown-bulk-indicator{background:#2563eb;justify-content:flex-end}${r} .px-dropdown-option{display:flex;align-items:center;gap:8px;padding:8px;border-radius:4px;cursor:pointer;overflow-wrap:anywhere}${r} .px-dropdown-option:hover,${r} .px-dropdown-option:focus{background:#f1f5f9}${r} .px-dropdown-option:focus-visible{outline:2px solid #2563eb;outline-offset:-2px}${r} .px-dropdown-option[aria-selected="true"]{background:#e8eefb;color:#1e40af}${r} .px-dropdown-option[aria-disabled="true"]{opacity:.45;cursor:not-allowed}${r} .px-dropdown-category{font-size:12px;font-weight:600;color:#475569;padding:10px 8px 4px}${r} .px-dropdown-checkbox{width:14px;height:14px;flex:none;box-sizing:border-box;border:1px solid currentColor;border-radius:3px;display:grid;place-items:center}${r} [aria-selected="true"]>.px-dropdown-checkbox{background:#2563eb;color:white;border-color:#2563eb}${r} [aria-selected="true"]>.px-dropdown-checkbox::after{content:'✓';font-size:11px}${r} .px-dropdown-empty{padding:12px;color:#64748b}`;}

// Self-contained so preview and framework exports use exactly the same behavior.
export function mountDropdowns(root){
 const cleanup=[];
 for(const trigger of root.querySelectorAll?.('[data-dropdown]')??[]){
  const host=trigger.parentElement,native=host.querySelector('.px-dropdown-native'),menu=host.querySelector('.px-dropdown-menu');if(!native||!menu)continue;
  const config=JSON.parse(trigger.dataset.dropdown),search=menu.querySelector('.px-dropdown-search'),options=[...menu.querySelectorAll('[role="option"]')],values=trigger.querySelector('.px-dropdown-values');
  let opened=false,disposed=false,query='',typeahead='',typeTimer;
  const on=(el,event,fn,options)=>{if(el){el.addEventListener(event,fn,options);cleanup.push(()=>el.removeEventListener(event,fn,options));}};
  const visible=()=>options.filter(o=>!o.hidden&&o.getAttribute('aria-disabled')!=='true');
  const paint=()=>{
   const selected=[...native.selectedOptions].filter(o=>o.value);values.replaceChildren();
   const add=(text,cls)=>{const el=document.createElement('span');el.className=cls;el.textContent=text;values.append(el);};
   if(!selected.length)add(native.options[0].textContent,'px-dropdown-placeholder');
   else if(config.multiple&&config.pills){for(const o of selected.slice(0,config.pill_limit))add(o.textContent,'px-dropdown-pill');if(selected.length>config.pill_limit)add('+ '+(selected.length-config.pill_limit)+' more','px-dropdown-more');}
   else add(selected.map(o=>o.textContent).join(', '),'');
   const set=new Set(selected.map(o=>o.value));for(const o of options)o.setAttribute('aria-selected',String(set.has(o.dataset.value)));
   const eligible=[...native.options].filter(o=>o.value&&!o.disabled),count=eligible.filter(o=>o.selected).length,all=eligible.length>0&&count===eligible.length;
   const bulk=menu.querySelector('[data-bulk-toggle]');
   if(bulk){bulk.disabled=!eligible.length;const role=bulk.getAttribute('role');bulk.setAttribute(role?'aria-checked':'aria-pressed',all?'true':count&&role==='checkbox'?'mixed':'false');bulk.querySelector('[data-bulk-label]').textContent=config.bulk_style==='toggle_button'&&all?config.deselect_all_label:config.select_all_label;}
   trigger.setAttribute('aria-label',(native.getAttribute('aria-label')||'Dropdown')+(selected.length?': '+selected.map(o=>o.textContent).join(', '):''));
  };
  const commit=()=>{paint();native.dispatchEvent(new Event('input',{bubbles:true}));native.dispatchEvent(new Event('change',{bubbles:true}));};
  const position=()=>{if(!opened)return;const rect=trigger.getBoundingClientRect(),spaceBelow=innerHeight-rect.bottom-12,spaceAbove=rect.top-12;const below=spaceBelow>=Math.min(config.menu_height,200)||spaceBelow>=spaceAbove;menu.style.width=Math.min(config.menu_width||rect.width,innerWidth-16)+'px';menu.style.maxHeight=Math.max(40,Math.min(config.menu_height,below?spaceBelow:spaceAbove))+'px';menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.getBoundingClientRect().width-8))+'px';const height=menu.getBoundingClientRect().height;menu.style.top=Math.max(8,Math.min(below?rect.bottom+4:rect.top-height-4,innerHeight-height-8))+'px';};
  const close=(focus=false)=>{if(!opened)return;opened=false;menu.hidePopover();trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();native.dispatchEvent(new Event('blur'));};
  const focusOption=(last=false)=>{const list=visible();const o=last?list.at(-1):list.find(o=>o.getAttribute('aria-selected')==='true')||list[0];o?.focus();o?.scrollIntoView({block:'nearest'});};
  const open=()=>{if(trigger.disabled)return;opened=true;menu.showPopover();trigger.setAttribute('aria-expanded','true');position();if(search)search.focus();else focusOption();};
  const choose=o=>{if(o.getAttribute('aria-disabled')==='true')return;const item=[...native.options].find(n=>n.value===o.dataset.value);if(config.multiple)item.selected=!item.selected;else native.value=item.value;commit();if(!config.multiple)close(true);};
  on(trigger,'click',()=>opened?close():open());
  on(trigger,'keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();focusOption(e.key==='ArrowUp');}});
  for(const o of options)on(o,'click',()=>choose(o));
  on(menu,'keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
   if(e.key==='Tab'){close(true);return;}
   const list=visible(),index=list.indexOf(e.target);
   if(e.target===search&&e.key==='Enter'){e.preventDefault();if(list[0])choose(list[0]);return;}
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&!(e.target===search&&['Home','End'].includes(e.key))){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?list.length-1:e.key==='ArrowDown'?(index+1)%list.length:(index<=0?list.length:index)-1;list[next]?.focus();list[next]?.scrollIntoView({block:'nearest'});}
   else if((e.key==='Enter'||e.key===' ')&&options.includes(e.target)){e.preventDefault();choose(e.target);}
   else if(e.target!==search&&e.key.length===1&&!e.ctrlKey&&!e.metaKey){typeahead+=e.key.toLowerCase();clearTimeout(typeTimer);typeTimer=setTimeout(()=>typeahead='',600);list.find(o=>o.textContent.trim().toLowerCase().startsWith(typeahead))?.focus();}
  });
  on(search,'input',()=>{query=search.value.toLowerCase();for(const o of options)o.hidden=!(o.textContent+' '+o.dataset.category).toLowerCase().includes(query);for(const heading of menu.querySelectorAll('.px-dropdown-category')){let n=heading.nextElementSibling,shown=false;while(n&&!n.classList.contains('px-dropdown-category')){if(!n.hidden)shown=true;n=n.nextElementSibling;}heading.hidden=!shown;}menu.querySelector('.px-dropdown-empty').hidden=options.some(o=>!o.hidden);position();});
  on(menu.querySelector('[data-bulk-toggle]'),'click',()=>{const eligible=[...native.options].filter(o=>o.value&&!o.disabled),all=eligible.length>0&&eligible.every(o=>o.selected);for(const o of eligible)o.selected=!all;commit();});
  on(menu.querySelector('[data-select-all]'),'click',()=>{for(const o of native.options)if(o.value&&!o.disabled)o.selected=true;commit();});
  on(menu.querySelector('[data-deselect-all]'),'click',()=>{for(const o of native.options)if(!o.disabled)o.selected=false;commit();});
  on(document,'pointerdown',e=>{if(opened&&!e.composedPath().includes(host))close();});
  on(window,'resize',position);on(document,'scroll',position,true);
  on(native,'change',paint);on(native,'invalid',()=>{trigger.setAttribute('aria-invalid','true');trigger.focus();});
  on(native.form,'reset',()=>queueMicrotask(()=>{if(!disposed){paint();trigger.setAttribute('aria-invalid','false');close();}}));
  paint();cleanup.push(()=>{disposed=true;clearTimeout(typeTimer);close();});
 }
 return ()=>cleanup.reverse().forEach(fn=>fn());
}
