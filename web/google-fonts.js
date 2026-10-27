import {fontWeightCatalog} from './font-weight-catalog.js';
// Google Fonts CSS2 loads only the families/weights used by the document.
export const fontSuggestions=['Manrope','DM Sans','Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Nunito','Raleway','Ubuntu','Work Sans','Outfit','Space Grotesk','Plus Jakarta Sans','Source Sans 3','Noto Sans','Noto Serif','Merriweather','Lora','Playfair Display','Roboto Slab','Libre Baskerville','Oswald','Bebas Neue','Fira Sans','Fira Code','JetBrains Mono','Roboto Mono','Georgia','monospace'];
export const validFontFamily=value=>typeof value==='string'&&value.length>0&&value.length<=100&&/^[a-zA-Z0-9][a-zA-Z0-9 -]*$/.test(value);
const system=new Set(['Arial','Georgia','monospace','serif','sans-serif','system-ui','Verdana','Tahoma','Times New Roman']);
export function googleFontUrl(family,weight=400){return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g,'+')}:wght@${weight}&display=swap`;}
export function usedFonts(shapes){
 const fonts=new Map();
 const add=t=>{if(t&&validFontFamily(t.font_family)&&!system.has(t.font_family))fonts.set(t.font_family+'|'+(t.font_weight??400),{font_family:t.font_family,font_weight:t.font_weight??400});};
 for(const s of shapes){
  add(s.typography);
  for(const [state,style] of Object.entries(s.control?.states??{}))for(const [part,values] of Object.entries(style.parts??{})){
   add({...s.typography,...s.control?.states?.default?.parts?.[part],...values});
  }
 }
 return [...fonts.values()];
}
export function fontImports(shapes){return usedFonts(shapes).map(t=>'@import url("'+googleFontUrl(t.font_family,t.font_weight)+'");').join('\n');}

const pending=new Map();
export function loadGoogleFont(family,weight=400){
 if(!validFontFamily(family))return Promise.reject(new Error('Enter a Google Fonts family name.'));
 if(system.has(family))return Promise.resolve();
 const key=family+'|'+weight;if(pending.has(key))return pending.get(key);
 const promise=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=googleFontUrl(family,weight);link.onload=async()=>{try{const faces=await document.fonts.load(`${weight} 16px "${family}"`);if(!faces.length)throw new Error();resolve();}catch{reject(new Error('Font could not load. Check its name and weight.'));}};link.onerror=()=>{link.remove();reject(new Error('Font could not load. Check its name, weight, and connection.'));};document.head.append(link);});
 pending.set(key,promise);promise.catch(()=>pending.delete(key));return promise;
}

let closeFontPicker=()=>{},fontPickerSequence=0;
export function fontInput(value,apply){
 const input=document.createElement('input');input.type='text';input.value=value;
 input.setAttribute('aria-label','Google Fonts family');input.placeholder='Search or enter a Google font';
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
 let revision=0,menu=null,cleanup=()=>{},active=-1,original=value;
 const close=()=>{cleanup();cleanup=()=>{};menu?.remove();menu=null;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
 const commit=async()=>{
  const request=++revision,family=input.value.trim();close();
  try{await loadGoogleFont(family);if(request===revision&&input.isConnected){input.setCustomValidity('');apply(family);}}
  catch(error){if(request===revision&&input.isConnected){input.setCustomValidity(error.message);input.reportValidity();}}
 };
 const position=()=>{
  if(!menu)return;
  const r=input.getBoundingClientRect(),width=Math.min(Math.max(r.width,220),innerWidth-16);
  const below=innerHeight-r.bottom-12,above=r.top-12,height=Math.min(320,Math.max(below,above));
  Object.assign(menu.style,{width:width+'px',maxHeight:Math.max(40,height)+'px',left:Math.max(8,Math.min(r.left,innerWidth-width-8))+'px'});
  menu.style.top=(below>=Math.min(320,menu.scrollHeight)||below>=above?r.bottom+4:Math.max(8,r.top-Math.min(menu.scrollHeight,height)-4))+'px';
 };
 const render=query=>{
  if(!menu)return;menu.replaceChildren();active=-1;input.removeAttribute('aria-activedescendant');
  const matches=fontSuggestions.filter(f=>f.toLowerCase().includes(query.trim().toLowerCase()));
  for(const family of matches){
   const item=document.createElement('button');item.type='button';item.tabIndex=-1;item.role='option';item.id=menu.id+'-'+menu.children.length;
   item.textContent=family;item.setAttribute('aria-selected',String(family===input.value));
   item.onpointerdown=e=>e.preventDefault();
   item.onclick=()=>{input.value=family;input.setCustomValidity('');commit();};
   menu.append(item);
  }
  if(!matches.length){const message=document.createElement('div');message.className='inspector-select-group';message.textContent='Press Enter to load this Google Fonts family';menu.append(message);}
  position();
 };
 const open=()=>{
  if(menu)return;closeFontPicker();closeFontPicker=close;
  menu=document.createElement('div');menu.className='inspector-select-menu';menu.id='font-picker-'+(++fontPickerSequence);menu.role='listbox';menu.setAttribute('aria-label','Font families');menu.setAttribute('popover','manual');
  document.body.append(menu);input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded','true');
  menu.showPopover();render('');
  const controller=new AbortController(),options={signal:controller.signal};
  document.addEventListener('pointerdown',e=>{if(e.target!==input&&!menu?.contains(e.target))close();},options);
  window.addEventListener('resize',close,options);
  document.addEventListener('scroll',e=>{if(!menu?.contains(e.target))close();},{...options,capture:true});
  const observer=new MutationObserver(()=>{if(!input.isConnected)close();});observer.observe(document.body,{childList:true,subtree:true});
  cleanup=()=>{controller.abort();observer.disconnect();};
 };
 input.onfocus=()=>{original=input.value;};
 input.onclick=()=>{open();input.select();};
 input.oninput=()=>{revision++;input.setCustomValidity('');open();render(input.value);};
 input.onchange=commit;
 input.onblur=()=>close();
 input.onkeydown=e=>{
  e.stopPropagation();
  if(e.key==='Escape'&&menu){e.preventDefault();revision++;input.value=original;close();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();open();const items=[...menu.querySelectorAll('[role=option]')];if(!items.length)return;
   active=(active+(e.key==='ArrowDown'?1:active<0?0:-1)+items.length)%items.length;
   for(const [i,item] of items.entries())item.classList.toggle('active',i===active);
   input.setAttribute('aria-activedescendant',items[active].id);items[active].scrollIntoView({block:'nearest'});return;
  }
  if(e.key==='Enter'){e.preventDefault();const item=menu?.querySelectorAll('[role=option]')[active];if(item)input.value=item.textContent;commit();}
  if(e.key==='Tab')close();
 };
 return input;
}

const weightRequests=new Map();
export const fontWeightNames={100:'Thin',200:'Extra light',300:'Light',400:'Regular',500:'Medium',600:'Semibold',700:'Bold',800:'Extra bold',900:'Black'};
export function availableFontWeights(family){
 if(fontWeightCatalog[family])return Promise.resolve([...fontWeightCatalog[family]]);
 if(system.has(family))return Promise.resolve([400,700]);
 if(!validFontFamily(family))return Promise.reject(new Error('Choose a font family first.'));
 if(weightRequests.has(family))return weightRequests.get(family);
 const request=Promise.all(Object.keys(fontWeightNames).map(async key=>{
  const weight=Number(key),response=await fetch(googleFontUrl(family,weight)+'&text=A');
  if(response.status===400)return null;
  if(!response.ok)throw new Error('Could not load font weights.');
  return weight;
 })).then(weights=>{const available=weights.filter(x=>x!==null);if(!available.length)throw new Error('No font weights available.');return available;});
 weightRequests.set(family,request);request.catch(()=>weightRequests.delete(family));return request;
}
