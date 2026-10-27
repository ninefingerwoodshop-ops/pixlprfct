import {availableInputTokens,inputTokenVariable,addInputModes,ensureDropdownBase} from './input-base.js';
import {icon,iconWeights} from './icons.js';
import {fontInput,availableFontWeights,fontWeightNames} from './google-fonts.js';
import {floatingWindow} from './floating-window.js';
import {showContextMenu} from './context-menu.js';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(label,action,glyph)=>{const b=el('button',glyph?undefined:label);b.type='button';b.setAttribute('aria-label',label);b.title=label;b.onclick=action;if(glyph){b.innerHTML=icon(glyph);b.className='variable-icon-button';}return b;};
const option=(name,value)=>{const o=el('option',name);o.value=value;return o;};
const defaults={border_radius:'0, 0, 0, 0',border_width:'0, 0, 0, 0',margin:'0, 0, 0, 0',padding:'0, 0, 0, 0',color:'#0d99ff',number:0,string:'',boolean:false};
const nextId=rows=>Math.max(0,...rows.map(r=>r.id))+1;
export function variableGroups(values){return [...new Set(values.flatMap(v=>{const parts=v.name.split('/');return parts.slice(0,-1).map((_,i)=>parts.slice(0,i+1).join('/'));}))].sort();}
export function filterVariables(values,{collection,group='',query='',type=''}){const q=query.toLowerCase().trim();return values.filter(v=>v.collection_id===collection&&(!group||v.name.startsWith(group+'/'))&&(!type||v.kind===type)&&(!q||(v.name+' '+Object.values(v.values).map(x=>typeof x==='object'?'':String(x)).join(' ')).toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));}
export function resolveVariableValue(vars,id,mode,seen=new Set()){
 if(seen.has(id))throw Error('Circular variable alias');seen.add(id);
 const v=vars.values.find(v=>v.id===id);if(!v)throw Error('Missing variable');const c=vars.collections.find(c=>c.id===v.collection_id);const value=v.values[mode?.collection===c.id?mode.id:c.default_mode];
 return value&&typeof value==='object'?resolveVariableValue(vars,value.alias,mode,seen):structuredClone(value);
}
export function copyVariableValueToAllModes(variables,variableId,modeId){
 const variable=variables.values.find(v=>v.id===variableId),collection=variables.collections.find(c=>c.id===variable?.collection_id);
 if(!variable||!collection||!Object.hasOwn(variable.values,modeId))throw Error('Variable or source mode no longer exists.');
 const value=structuredClone(variable.values[modeId]);
 for(const mode of collection.modes)variable.values[mode.id]=structuredClone(value);
}
export function normalizeVariableHex(value){
 const hex=String(value).trim().replace(/^#/,'');
 if(!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex))throw Error('Enter a 3- or 6-digit hex color, such as #0d99ff.');
 return '#'+(hex.length===3?[...hex].map(c=>c+c).join(''):hex).toLowerCase();
}
let openManager=null;
export function closeVariables(){openManager?.close();}
export function syncVariables(){openManager?.sync();}
export function editVariables(read,onSave,history,collectionIdToShow){
 if(openManager){if(collectionIdToShow)openManager.select(collectionIdToShow);openManager.focus();return;}
 let draft=structuredClone(read().variables),saved=JSON.stringify(draft),selected=collectionIdToShow||draft.collections[0]?.id,group='',query='',type='',selectedRows=new Set(),anchor=null,committing=false;
 let addedModes=false;
 if(read().shapes?.some(s=>s.control?.kind==='select')){const next=ensureDropdownBase(draft).variables;if(JSON.stringify(next)!==JSON.stringify(draft)){draft=next;addedModes=true;}}
 for(const shape of read().shapes??[]){const collection=draft.collections.find(c=>c.id===shape.control?.base_collection&&['input_base','checkbox_base','switch_base','button_base','segmented_base','radio_base','calendar_base'].includes(c.preset));if(collection)addedModes=addInputModes(draft,collection,shape.control.kind)||addedModes;}
 if(addedModes){onSave(draft);draft=structuredClone(read().variables);saved=JSON.stringify(draft);}
 let variableId=nextId(draft.values),collectionId=nextId(draft.collections);const modeIds=new Map(draft.collections.map(c=>[c.id,nextId(c.modes)]));
 const dialog=el('dialog',undefined,'variables-dialog variables-workspace');dialog.setAttribute('aria-label','Variables');
 const header=el('header',undefined,'variable-window-header'),left=el('div',undefined,'variable-window-heading'),title=el('h2');title.append(el('span','Variables','variable-floating-title'),el('span',read().name,'variable-document-title'));
 const sidebarToggle=button('Hide sidebar',()=>{dialog.classList.toggle('variables-sidebar-hidden');sidebarToggle.setAttribute('aria-pressed',String(dialog.classList.contains('variables-sidebar-hidden')));sidebarToggle.title=dialog.classList.contains('variables-sidebar-hidden')?'Show sidebar':'Hide sidebar';},'panel-left');
 left.append(title,sidebarToggle);const headerTitle=el('span','Variables','variable-page-heading'),spacer=el('span',undefined,'variable-header-spacer');
 const toggle=button('Minimize',()=>{},'window-restore'),close=button('Close variables',()=>finish(),'close');header.append(left,headerTitle,spacer,toggle,close);
 const body=el('div',undefined,'variables-body'),sidebar=el('aside'),main=el('section'),error=el('p','', 'variables-error');error.setAttribute('role','alert');error.hidden=true;
 const searchbar=el('div',undefined,'variable-searchbar'),search=el('input'),typeFilter=el('select');search.type='search';search.placeholder='Search variables';search.setAttribute('aria-label','Search variables');search.oninput=()=>{query=search.value;renderTable();};typeFilter.setAttribute('aria-label','Filter variable type');typeFilter.append(option('All types',''),...Object.keys(defaults).map(t=>option(t[0].toUpperCase()+t.slice(1).replaceAll('_',' '),t)));typeFilter.onchange=()=>{type=typeFilter.value;renderTable();};searchbar.append(search,typeFilter);
 const tableHost=el('div',undefined,'variables-table-scroll'),createHost=el('div',undefined,'variable-create-row');const collectionNote=el('p','These variables are shared defaults for all input types, including text fields, text areas, and calendar inputs. You can add overrides to any component when it needs different styling.','variable-collection-note');main.append(collectionNote,searchbar,tableHost,createHost);
 function fail(message){error.textContent=String(message);error.hidden=false;}
 function commit(){
  if(JSON.stringify(read().variables)!==saved){draft=structuredClone(read().variables);saved=JSON.stringify(draft);render();fail('Variables changed elsewhere. Your last edit was not applied; try it again.');return false;}
  try{committing=true;onSave(draft);saved=JSON.stringify(read().variables);draft=structuredClone(read().variables);error.hidden=true;return true;}catch(e){fail(e);return false;}finally{committing=false;}
 }
 function change(action,redraw=true){action();if(!commit())draft=structuredClone(read().variables);if(redraw)render();}
 function field(label,value,write,kind='text'){
  const f=el('input');f.type=kind;f.setAttribute('aria-label',label);f.value=value;if(kind==='number')f.step='any';
  let dirty=false;f.oninput=()=>{dirty=true;};const apply=()=>{if(!dirty)return;dirty=false;const old=structuredClone(draft);write(kind==='number'?Number(f.value):f.value);if(!commit()){draft=old;f.value=value;f.setAttribute('aria-invalid','true');}else{f.removeAttribute('aria-invalid');renderSidebar();}};f.onchange=apply;f.onblur=apply;
  f.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();f.blur();}};return f;
 }
 function finish(){document.activeElement?.blur();dialog.close();}
 function addCollection(){change(()=>{const id=collectionId++;draft.collections.push({id,name:'Collection '+id,modes:[{id:1,name:'Mode 1'}],default_mode:1});modeIds.set(id,2);selected=id;group='';});}
 function duplicate(ids){change(()=>{for(const v of draft.values.filter(v=>ids.has(v.id))){const copy=structuredClone(v);copy.id=variableId++;copy.control_path='';const names=new Set(draft.values.filter(x=>x.collection_id===v.collection_id).map(x=>x.name));let suffix=2;copy.name=v.name+' copy';while(names.has(copy.name))copy.name=v.name+' copy '+suffix++;draft.values.push(copy);}});}
 function removeValues(ids){for(const v of draft.values)for(const m of Object.keys(v.values)){if(ids.has(v.values[m]?.alias)){const c=draft.collections.find(c=>c.id===v.collection_id);v.values[m]=resolveVariableValue(draft,v.id,{collection:c.id,id:Number(m)});}}draft.values=draft.values.filter(v=>!ids.has(v.id));selectedRows.clear();}
 function remove(ids){change(()=>removeValues(ids));}
 function renderSidebar(){
  sidebar.replaceChildren();const heading=el('div',undefined,'variable-sidebar-heading');heading.append(el('span','Collections'),button('Create collection',addCollection,'plus'));sidebar.append(heading);
  for(const c of draft.collections){const b=button(c.name,()=>{selected=c.id;group='';selectedRows.clear();render();});b.className='variable-collection';b.setAttribute('aria-pressed',String(c.id===selected));b.oncontextmenu=e=>showContextMenu(e,[{label:'Rename collection',run:()=>{const f=field('Collection name',c.name,value=>{draft.collections.find(x=>x.id===c.id).name=value;});b.replaceWith(f);f.focus();f.select();}},{label:'Delete collection',run:()=>{const ids=new Set(draft.values.filter(v=>v.collection_id===c.id).map(v=>v.id));change(()=>{removeValues(ids);draft.collections=draft.collections.filter(x=>x.id!==c.id);selected=draft.collections[0]?.id;group='';});}}],b);sidebar.append(b);}
  if(!selected)return;
  const local=draft.values.filter(v=>v.collection_id===selected),all=button('All variables',()=>{group='';render();});all.className='variable-group';all.setAttribute('aria-pressed',String(!group));sidebar.append(el('div','Groups','variable-sidebar-heading'),all);
  for(const name of variableGroups(local)){const b=button(name.split('/').at(-1),()=>{group=name;render();});b.className='variable-group';b.style.paddingLeft=(12+12*(name.split('/').length-1))+'px';b.setAttribute('aria-label','Group '+name);b.setAttribute('aria-pressed',String(group===name));sidebar.append(b);}
 }
 function chooseType(anchor){
  const collection=draft.collections.find(c=>c.id===selected);
  if(['input_base','dropdown_base','checkbox_base','switch_base','button_base','segmented_base','radio_base','calendar_base'].includes(collection?.preset)){
   const menu=el('div',undefined,'variable-type-menu');let closing=false;const dismiss=()=>{if(closing)return;closing=true;menu.remove();};menu.setAttribute('role','menu');menu.setAttribute('aria-label','Input variables');
   for(const spec of availableInputTokens(draft,selected)){
    const b=button(spec.name,()=>{dismiss();change(()=>{draft.values.push(inputTokenVariable(spec,collection,variableId++,draft));});});
    b.setAttribute('role','menuitem');b.onpointerdown=e=>e.preventDefault();menu.append(b);
   }
   if(!menu.children.length){const message=el('p','All input variables have been added');menu.append(message);}
   anchor.after(menu);menu.querySelector('button')?.focus();
   menu.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();anchor.focus();}};
   menu.addEventListener('focusout',e=>{if(!menu.contains(e.relatedTarget))dismiss();});
   return;
  }
  const menu=el('div',undefined,'variable-type-menu');let closing=false;const dismiss=()=>{if(closing)return;closing=true;menu.remove();};menu.setAttribute('role','menu');for(const kind of Object.keys(defaults)){const b=button(kind[0].toUpperCase()+kind.slice(1).replaceAll('_',' '),()=>{dismiss();if(!selected){addCollection();}change(()=>{const c=draft.collections.find(c=>c.id===selected),id=variableId++;draft.values.push({id,collection_id:c.id,name:(group?group+'/':'')+kind+'/'+id,kind,values:Object.fromEntries(c.modes.map(m=>[m.id,defaults[kind]]))});});dialog.querySelector('[aria-label="Variable '+(variableId-1)+' name"]')?.focus();});b.setAttribute('role','menuitem');menu.append(b);}anchor.after(menu);menu.querySelector('button').focus();menu.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();dismiss();anchor.focus();}};menu.addEventListener('focusout',e=>{if(!menu.contains(e.relatedTarget))dismiss();});
 }
 function aliasPicker(v,mode){
  dialog.querySelector('.variable-alias-picker')?.remove();const picker=el('div',undefined,'variable-alias-picker'),title=el('strong','Apply variable'),search=el('input'),list=el('div');picker.setAttribute('role','dialog');picker.setAttribute('aria-label','Choose variable alias');search.placeholder='Search variables';search.setAttribute('aria-label','Search aliases');
  const render=()=>{list.replaceChildren();for(const target of draft.values.filter(x=>x.id!==v.id&&x.kind===v.kind&&x.name.toLowerCase().includes(search.value.toLowerCase()))){const c=draft.collections.find(c=>c.id===target.collection_id);list.append(button(c.name+' / '+target.name,()=>{change(()=>{draft.values.find(x=>x.id===v.id).values[mode.id]={alias:target.id};});picker.remove();}));}if(!list.children.length)list.append(el('p','No matching variables'));};search.oninput=render;picker.append(title,button('Close alias picker',()=>picker.remove(),'close'),search,list);dialog.append(picker);render();search.focus();picker.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();picker.remove();}};
 }
 function renderTable(){
  tableHost.replaceChildren();createHost.replaceChildren();const c=draft.collections.find(c=>c.id===selected);searchbar.hidden=!c;createHost.hidden=!c;collectionNote.hidden=!['input_base','dropdown_base','checkbox_base','switch_base','button_base','segmented_base','radio_base','calendar_base','typography_base'].includes(c?.preset);collectionNote.textContent=c?.preset==='typography_base'?'Base text color for this project. Text and starter text inherit this value. Assign another color or variable to override it.':c?.preset==='calendar_base'?'Shared calendar panel, day and selected-date styling. Date fields inherit Input Base; calendar parts use this collection.':c?.preset==='segmented_base'?'Shared segment appearance and typography. Selected, hover, focus and disabled states follow these variables.':c?.preset==='radio_base'?'Shared radio circle, dot and label appearance. Radios with the same group name allow one selection.':c?.preset==='button_base'?'Shared button appearance, typography and icons. Hover, focus, active, selected and disabled states follow these variables.':c?.preset==='switch_base'?'Shared switch track, thumb and label appearance. Checked and disabled modes apply to linked switch starters.':c?.preset==='checkbox_base'?'Shared checkbox and label appearance. Checked, indeterminate and disabled modes apply to all linked checkbox starters.':c?.preset==='dropdown_base'?'Shared styling for dropdown panels, search, buttons, checkboxes, items and pills. Component appearance overrides take precedence.':'Shared defaults for all input types. Add component overrides only when different styling is needed.';
  if(!c){const empty=el('div',undefined,'variables-empty');empty.append(el('h3','No variables created in this file'),el('p','Save colors, numbers, text, and states to reuse them in your designs.'));const create=button('+ Create',()=>chooseType(create));create.className='primary';empty.append(create);tableHost.append(empty);return;}
  const table=el('table'),thead=el('thead'),head=el('tr'),name=el('th','Name');head.append(name);
  for(const m of c.modes){const th=el('th'),f=field('Mode '+m.id+' name',m.name,value=>{draft.collections.find(x=>x.id===c.id).modes.find(x=>x.id===m.id).name=value;});th.append(f);th.oncontextmenu=e=>showContextMenu(e,[{label:'Set as default',enabled:c.default_mode!==m.id,run:()=>change(()=>{draft.collections.find(x=>x.id===c.id).default_mode=m.id;})},{label:'Duplicate mode',run:()=>change(()=>{const current=draft.collections.find(x=>x.id===c.id),id=modeIds.get(c.id)??nextId(current.modes);modeIds.set(c.id,id+1);current.modes.push({id,name:m.name+' copy'});draft.values.filter(v=>v.collection_id===c.id).forEach(v=>v.values[id]=structuredClone(v.values[m.id]));})},{label:'Delete mode',enabled:c.modes.length>1,run:()=>change(()=>{const current=draft.collections.find(x=>x.id===c.id);current.modes=current.modes.filter(x=>x.id!==m.id);if(current.default_mode===m.id)current.default_mode=current.modes[0].id;draft.values.filter(v=>v.collection_id===c.id).forEach(v=>delete v.values[m.id]);})}],f);head.append(th);}
  const add=el('th');add.append(button('Add mode',()=>change(()=>{const current=draft.collections.find(x=>x.id===c.id),id=modeIds.get(c.id)??nextId(current.modes);modeIds.set(c.id,id+1);current.modes.push({id,name:'Mode '+id});draft.values.filter(v=>v.collection_id===c.id).forEach(v=>v.values[id]=structuredClone(v.values[c.default_mode]));}),'plus'));head.append(add);thead.append(head);table.append(thead);const tbody=el('tbody'),rows=filterVariables(draft.values,{collection:selected,group,query,type});
  for(const v of rows){
   const row=el('tr');row.tabIndex=0;row.dataset.variableId=v.id;row.setAttribute('aria-selected',String(selectedRows.has(v.id)));
   row.onclick=e=>{if(e.target.closest('input,select,button'))return;if(e.shiftKey&&anchor!==null){const a=rows.findIndex(v=>v.id===anchor),b=rows.findIndex(x=>x.id===v.id);selectedRows=new Set(rows.slice(Math.min(a,b),Math.max(a,b)+1).map(x=>x.id));}else if(e.ctrlKey||e.metaKey){selectedRows.has(v.id)?selectedRows.delete(v.id):selectedRows.add(v.id);}else selectedRows=new Set([v.id]);anchor=v.id;for(const r of tbody.children)r.setAttribute('aria-selected',String(selectedRows.has(Number(r.dataset.variableId))));};
   row.oncontextmenu=e=>{const ids=selectedRows.has(v.id)?new Set(selectedRows):new Set([v.id]);showContextMenu(e,[{label:'Duplicate variable'+(ids.size>1?'s':''),shortcut:'Shift Enter',run:()=>duplicate(ids)},{label:'Delete variable'+(ids.size>1?'s':''),run:()=>remove(ids)}],row);};
   const nameCell=el('td'),symbol=el('span',undefined,'variable-kind');symbol.innerHTML=icon({color:'variable-color',number:'frame',string:'text',boolean:'toggle',padding:'layout-grid',margin:'layout-grid',border_radius:'layout-grid',border_width:'layout-grid'}[v.kind]||'variables');symbol.setAttribute('aria-hidden','true');symbol.title=v.kind;nameCell.append(symbol,field('Variable '+v.id+' name',v.name,value=>{draft.values.find(x=>x.id===v.id).name=value;}));row.append(nameCell);
   for(const m of c.modes){const cell=el('td',undefined,'variable-value-cell'),value=v.values[m.id],write=value=>{draft.values.find(x=>x.id===v.id).values[m.id]=value;},label=v.name+' · '+m.name;
    cell.oncontextmenu=e=>{e.stopPropagation();showContextMenu(e,[{label:'Copy value to all modes',enabled:c.modes.length>1,run:()=>change(()=>copyVariableValueToAllModes(draft,v.id,m.id))},{label:'Create alias',run:()=>aliasPicker(v,m)},...(value&&typeof value==='object'?[{label:'Detach alias',run:()=>change(()=>write(resolveVariableValue(draft,v.id,{collection:c.id,id:m.id})))}]:[])],cell);};
    if(value&&typeof value==='object'){const chip=button(draft.values.find(x=>x.id===value.alias)?.name??'Missing variable',()=>aliasPicker(v,m));chip.className='variable-alias-chip';chip.setAttribute('aria-label',label+' alias');cell.append(chip,button('Detach '+label+' alias',()=>change(()=>write(resolveVariableValue(draft,v.id,{collection:c.id,id:m.id}))),'unlink'));}
    else if(v.control_path==='control.required_icon_weight'){
     const select=el('select');select.setAttribute('aria-label',label);
     for(const [name,weight] of Object.entries(iconWeights))select.append(option(name[0].toUpperCase()+name.slice(1),String(weight)));
     if(!Object.values(iconWeights).includes(value)){const current=option('Custom (existing)',String(value));current.disabled=true;select.append(current);}
     select.value=String(value);select.onchange=()=>change(()=>write(Number(select.value)),false);cell.append(select);
    }
    else if(v.control_path==='control.required_icon'){
     const select=el('select');select.setAttribute('aria-label',label);
     for(const [key,name] of [['asterisk','Asterisk (*)'],['star','Star (★)'],['dot','Dot (•)'],['text','Required text'],['icon-asterisk','Asterisk icon'],['icon-star','Star icon'],['icon-plus','Plus icon'],['svg','Custom SVG'],['none','None']])select.append(option(name,key));
     select.value=value;select.onchange=()=>change(()=>write(select.value),false);cell.append(select);
    }
    else if(v.control_path==='control.required_svg'){
     const source=el('textarea');source.rows=3;source.value=value;source.placeholder='<svg viewBox="0 0 24 24">…</svg>';source.setAttribute('aria-label',label);
     const apply=raw=>{if(raw.length>100000)throw Error('Use an SVG smaller than 100 KB.');if(raw.trim()){const xml=new DOMParser().parseFromString(raw,'image/svg+xml');if(xml.querySelector('parsererror')||xml.documentElement.localName!=='svg')throw Error('Enter valid SVG markup.');}source.setCustomValidity('');change(()=>write(raw),false);};
     source.onchange=()=>{try{apply(source.value);}catch(error){source.setCustomValidity(error.message);source.reportValidity();}};
     const upload=el('input');upload.type='file';upload.accept='.svg,image/svg+xml';upload.setAttribute('aria-label','Upload '+label);upload.onchange=async()=>{const file=upload.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('Use an SVG smaller than 100 KB.');const raw=await file.text();apply(raw);source.value=raw;}catch(error){source.setCustomValidity(error.message);source.reportValidity();}};cell.append(source,upload);
    }
    else if(v.kind==='string'&&v.control_path?.endsWith('.font_family')){const f=fontInput(value,family=>change(()=>write(family)));f.setAttribute('aria-label',label);cell.append(f);}
    else if(v.kind==='number'&&v.control_path?.endsWith('.font_weight')){
     const familyPath=v.control_path.replace(/font_weight$/,'font_family');
     const familyVariable=draft.values.find(x=>x.collection_id===c.id&&x.control_path===familyPath)||draft.values.find(x=>x.collection_id===c.id&&x.control_path==='control.states.default.parts.input.font_family');
     let family='Manrope';try{if(familyVariable)family=resolveVariableValue(draft,familyVariable.id,{collection:c.id,id:m.id});}catch{}
     const select=el('select');select.setAttribute('aria-label',label);select.disabled=true;select.append(option('Loading weights…',String(value)));cell.append(select);
     availableFontWeights(family).then(weights=>{
      if(!select.isConnected)return;select.replaceChildren(...weights.map(weight=>option(fontWeightNames[weight]+' · '+weight,String(weight))));
      if(!weights.includes(Number(value))){const current=option(value+' · unavailable for '+family,String(value));current.disabled=true;select.prepend(current);}
      select.value=String(value);select.disabled=false;
     }).catch(()=>{if(select.isConnected){select.replaceChildren(option(value+' · weights unavailable',String(value)));select.title='Could not load weights for '+family+'. Reopen the collection to retry.';}});
     select.onchange=()=>change(()=>write(Number(select.value)),false);
    }
    else if(v.kind==='boolean'){const s=el('select');s.setAttribute('aria-label',label);s.append(option('True','true'),option('False','false'));s.value=String(value);s.onchange=()=>change(()=>write(s.value==='true'),false);cell.append(s);}
    else{const f=field(label,value,write,v.kind==='number'?'number':'text');if(['padding','margin','border_radius','border_width'].includes(v.kind)){const order=v.kind==='border_radius'?'Top-left, top-right, bottom-right, bottom-left':'Top, right, bottom, left';f.placeholder='1–4 values, e.g. 12 24';f.title='CSS shorthand: 1–4 values, separated by spaces or commas. '+order;}if(v.kind==='color'){
     const swatch=el('input');swatch.type='color';swatch.value=value;swatch.setAttribute('aria-label',label+' color');
     let committed=value;
     const applyColor=raw=>{
      let color;try{color=normalizeVariableHex(raw);}catch(e){f.setCustomValidity(e.message);f.setAttribute('aria-invalid','true');f.reportValidity();return;}
      if(color!==committed){const old=structuredClone(draft);write(color);if(!commit()){draft=old;return;}committed=color;}
      f.value=color;swatch.value=color;f.setCustomValidity('');f.removeAttribute('aria-invalid');
     };
     f.oninput=()=>{f.setCustomValidity('');f.removeAttribute('aria-invalid');};
     f.onchange=()=>applyColor(f.value);f.onblur=()=>applyColor(f.value);
     swatch.oninput=()=>applyColor(swatch.value);swatch.onchange=()=>applyColor(swatch.value);
     cell.append(swatch);
    }cell.append(f);}
    const alias=button('Apply alias to '+label,()=>aliasPicker(v,m),'variables');alias.classList.add('variable-cell-action');cell.append(alias);row.append(cell);
   }row.append(el('td'));tbody.append(row);
  }table.append(tbody);tableHost.append(table);if(!rows.length)tableHost.append(el('p',query?'No matching variables':'No variables in this group','variables-no-results'));
  const create=button('+ Create variable',()=>chooseType(create));createHost.append(create);
 }
 function render(){if(!draft.collections.some(c=>c.id===selected)){selected=draft.collections[0]?.id;group='';}renderSidebar();renderTable();}
 body.append(sidebar,main);dialog.append(header,body,error);document.body.append(dialog);render();floatingWindow(dialog,header,toggle);dialog.show();
 const manager={select:id=>{selected=id;group='';query='';search.value='';render();},close:()=>dialog.close(),focus:()=>header.focus(),sync:()=>{if(committing)return;const actual=JSON.stringify(read().variables);if(actual!==saved){draft=structuredClone(read().variables);saved=actual;variableId=Math.max(variableId,nextId(draft.values));collectionId=Math.max(collectionId,nextId(draft.collections));render();}}};openManager=manager;
 dialog.addEventListener('close',()=>{if(openManager===manager)openManager=null;dialog.remove();if(!dialog.dataset.navigationDismissed)document.querySelector('[aria-label="Local variables"]')?.focus();},{once:true});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea')){e.preventDefault();e.stopPropagation();history(e.shiftKey?'redo':'undo');manager.sync();}else if(e.shiftKey&&e.key==='Enter'&&selectedRows.size){e.preventDefault();duplicate(selectedRows);}});
 header.focus();
}
