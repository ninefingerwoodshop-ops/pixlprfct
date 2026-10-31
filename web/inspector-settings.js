import {installColorVariablePicker} from './color-variable-picker.js';
import {trackPopover,dragPopover,positionPopover} from './popover-position.js';
import {installColorPicker} from './color-picker.js';

export const element=(tag,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
// These 24px glyphs use the same one-pixel strokes and inset as the reference.
export function settingIcon(kind){
 const paths={edit:'m6 15 9-9 3 3-9 9H6v-3Zm7-7 3 3',detach:'m9 5-3 3a3 3 0 0 0 0 4l1 1m2 2 1 1a3 3 0 0 0 4 0l4-4a3 3 0 0 0 0-4l-1-1M5 4l14 16',plus:'M12 6v12M6 12h12',minus:'M6 12h12',close:'m7 7 10 10M7 17 17 7',eye:'M5 12s2.5-4 7-4 7 4 7 4-2.5 4-7 4-7-4-7-4Zm9 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',hidden:'m5 5 14 14M7 8c-1.3 1-2 2.3-2 4 0 0 2.5 4 7 4 1.3 0 2.4-.3 3.3-.8M10 8.2c.6-.1 1.3-.2 2-.2 4.5 0 7 4 7 4s-.6 1-1.8 2',drop:'M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM8 20h9a3 3 0 0 0 3-3V8',inner:'M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM8 16V8h8',grid:'M6 6h12v12H6ZM10 5v14M14 5v14M5 10h14M5 14h14',columns:'M6 5v14M10 5v14M14 5v14M18 5v14M5 6h14M5 18h14',rows:'M5 6h14M5 10h14M5 14h14M5 18h14M6 5v14M18 5v14',blur:'M6 6h.01M10 6h.01M14 6h.01M18 6h.01M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01M6 18h.01M10 18h.01M14 18h.01M18 18h.01',spread:'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',styles:'M10 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM10 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM18 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0'};
 paths.text='M5 6h14M12 6v13M9 19h6';paths.color='M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0';
 return `<svg class="setting-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[kind]??paths.blur}"/></svg>`;
}
export const action=(label,glyph,fn)=>{const b=element('button','setting-action');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=settingIcon(glyph);b.onclick=fn;return b;};
export function choose(label,options,value,change){const s=element('select');s.setAttribute('aria-label',label);for(const [v,name,disabled=false] of options){const o=element('option','',name);o.value=v;o.disabled=disabled;s.append(o);}s.value=value;s.onchange=()=>change(s.value);return s;}
export function numberField(label,value,change,{min=-100000,max=100000,step='any',prefix='',disabled=false}={}){
 const box=element('div','setting-field'),input=element('input');input.type='number';input.min=min;input.max=max;input.step=step;input.required=true;input.value=value;input.disabled=disabled;input.setAttribute('aria-label',label);
 if(prefix){const p=element('span','setting-prefix');p.innerHTML=prefix.startsWith('<')?prefix:'';if(!prefix.startsWith('<'))p.textContent=prefix;box.append(p);}box.append(input);
 input.onchange=()=>{if(input.checkValidity())change(Number(input.value));else input.reportValidity();};input.onkeydown=e=>{if(e.key==='Escape'){input.value=input.dataset.saved??String(value);input.setCustomValidity('');}};return box;
}
export function settingRow(label,field){const r=element('div','setting-row');r.append(element('span','setting-label',label),field);return r;}
export function syncInput(input,value){if(document.activeElement!==input)input.value=value;input.dataset.saved=String(value);}

// One persistent popup per inspector section. Rerendering the document must not
// replace the open form (or lose its focused field, nested dropdown, or drag).
export function settingsPopover(host,label,{width=240}={}){
 const panel=element('div','paint-popover inspector-settings-popover');panel.setAttribute('popover','auto');panel.setAttribute('role','dialog');panel.setAttribute('aria-label',label);panel.tabIndex=-1;
 const header=element('div','setting-heading'),title=element('div','setting-heading-title'),body=element('div','setting-body');const close=action('Close '+label,'close',()=>api.close(true));header.append(title,close);panel.append(header,body);(host.closest('[popover]')??document.body).append(panel);
 let anchor=null,key=null,signature=null;const position=trackPopover(panel,()=>anchor,{width,gap:0,margin:16,pinTop:true,fitHeight:true});dragPopover(panel,header,position);header.setAttribute('aria-label','Move '+label);
 const api={panel,header,title,body,get key(){return key;},get open(){return panel.matches(':popover-open');},
  show(nextKey,node){if(key!==nextKey){api.close();signature=null;}key=nextKey;anchor=node;node.querySelector('[aria-haspopup="dialog"]')?.setAttribute('aria-expanded','true');if(!api.open)panel.showPopover();panel.focus({preventScroll:true});},
  update(nextSignature,build,sync){if(!api.open)return;if(signature!==nextSignature){const focused=panel.contains(document.activeElement);title.replaceChildren();body.replaceChildren();build(title,body);signature=nextSignature;if(focused&&!panel.contains(document.activeElement))body.querySelector('input:not(:disabled)')?.focus({preventScroll:true});}sync?.(title,body);position();},
  anchor(node){anchor=node;},
  retarget(nextKey){key=nextKey;signature=null;},
  close(restore=false){if(api.open)panel.hidePopover();anchor?.querySelector('[aria-haspopup="dialog"]')?.setAttribute('aria-expanded','false');if(restore)anchor?.querySelector('button')?.focus({preventScroll:true});key=null;signature=null;},
 };
 panel.addEventListener('toggle',()=>{if(!api.open){anchor?.querySelector('[aria-haspopup="dialog"]')?.setAttribute('aria-expanded','false');key=null;signature=null;}});
 panel.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey)return;if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();api.close(true);}e.stopPropagation();});
 return api;
}
export function settingsMenu(host,label){
 const menu=element('div','setting-menu');menu.setAttribute('popover','auto');menu.setAttribute('role','menu');menu.setAttribute('aria-label',label);host.append(menu);let anchor;
 const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();anchor?.setAttribute('aria-expanded','false');};
 menu.addEventListener('toggle',()=>anchor?.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
 menu.onkeydown=e=>{if(e.ctrlKey||e.metaKey){close();return;}e.stopPropagation();const items=[...menu.querySelectorAll('button:not(:disabled)')],index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();close();anchor?.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}};
 return{show(button,items){anchor=button;if(menu.matches(':popover-open')){close();return;}menu.replaceChildren();for(const {label,glyph,run,disabled} of items){const b=element('button');b.type='button';b.setAttribute('role','menuitem');b.disabled=!!disabled;b.innerHTML=settingIcon(glyph);b.append(element('span','',label));b.onclick=()=>{close();run();};menu.append(b);}button.setAttribute('aria-expanded','true');menu.showPopover();positionPopover(menu,button.getBoundingClientRect(),{placement:'left',width:184,gap:8});menu.querySelector('button:not(:disabled)')?.focus();},close};
}
export function colorField(parent,label,get,change,variables){
 const box=element('div','setting-color-field'),swatch=action(label+' color picker','',()=>{syncPicker(get().color);picker.showPopover();variablePicker?.open();positionPopover(picker,box.getBoundingClientRect(),{width:240,gap:8});picker.focus({preventScroll:true});}),hex=element('input','setting-hex'),alpha=numberField(label+' opacity (%)',get().opacity*100,v=>change({opacity:v/100}),{min:0,max:100});swatch.innerHTML='';swatch.classList.add('setting-swatch');hex.setAttribute('aria-label',label+' hex');hex.maxLength=7;hex.spellcheck=false;
 const suffix=element('span','setting-percent','%');alpha.append(suffix);alpha.classList.add('setting-alpha');box.append(swatch,hex,alpha);
 hex.oninput=()=>hex.setCustomValidity('');hex.onchange=()=>{const color='#'+hex.value.replace(/^#/,'');if(/^#[\da-f]{6}$/i.test(color)){hex.setCustomValidity('');change({color});}else{hex.setCustomValidity('Enter six hexadecimal digits');hex.reportValidity();}};
 const picker=element('div','paint-popover inspector-settings-popover setting-color-picker');picker.setAttribute('popover','auto');picker.setAttribute('role','dialog');picker.setAttribute('aria-label',label+' color');picker.tabIndex=-1;const head=element('div','setting-heading');head.append(element('span','','Color'),action('Close color picker','close',()=>{picker.hidePopover();swatch.focus();}));const spectrum=element('div','setting-spectrum');picker.append(head,spectrum);parent.append(picker);const syncPicker=installColorPicker(spectrum,label,color=>change({color}));
 picker.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey)return;event.stopPropagation();if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();picker.hidePopover();swatch.focus();}});
 const variablePicker=variables?installColorVariablePicker({picker,head,spectrum,get,change,...variables}):null;
 const variableName=element('button','setting-variable-name'),detach=action('Detach '+label+' variable','detach',()=>change({color_variable:0}));variableName.type='button';variableName.onclick=()=>swatch.click();box.insertBefore(variableName,alpha);box.append(detach);
 const sync=()=>{const value=get(),name=variablePicker?.name();hex.hidden=!!name;variableName.hidden=detach.hidden=!name;variableName.textContent=name??'';variableName.title=name??'';variablePicker?.sync();swatch.style.setProperty('--swatch-color',value.color);syncInput(hex,value.color.slice(1).toUpperCase());syncInput(alpha.querySelector('input'),Number((value.opacity*100).toFixed(2)));syncPicker(value.color);};sync();box.sync=sync;return box;
}
