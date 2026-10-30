import {icon} from './icons.js';
import {element,action,settingRow,settingsPopover} from './inspector-settings.js';
import {showContextMenu} from './context-menu.js';

export function componentSet(doc,master){return doc.component_sets?.find(s=>s.variants.some(v=>v.component_id===master));}
export function componentSetFrame(doc,id){return id?doc.component_sets?.find(s=>s.frame_id===id):undefined;}
export function canCombineVariants(doc,shapes){return shapes.length>1&&shapes.every(s=>s.component?.type==='master'&&s.parent_id===shapes[0].parent_id&&!componentSet(doc,s.id));}
const field=(label,value)=>{const box=element('div','setting-field'),input=element('input');input.value=value;input.maxLength=128;input.setAttribute('aria-label',label);box.append(input);return {box,input};};
const editField=(input,initial,save)=>{let cancelled=false;const commit=()=>{if(cancelled||input.value===initial)return;try{save(input.value.trim());}catch(error){input.setCustomValidity(String(error));input.reportValidity();}};input.oninput=()=>input.setCustomValidity('');input.onchange=commit;input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){e.preventDefault();cancelled=true;input.value=initial;input.blur();}};};
export function renderVariantProperties(host,doc,master,onChange){
 const set=componentSet(doc,master);host.replaceChildren();host.hidden=!set;if(!set)return;
 const current=set.variants.find(v=>v.component_id===master);
 set.properties.forEach((name,index)=>{const select=element('select');select.setAttribute('aria-label','Variant '+name);
  [...new Set(set.variants.map(v=>v.values[index]))].forEach(value=>{const option=element('option','',value);option.value=value;select.append(option);});
  select.value=current.values[index];select.onchange=()=>onChange(name,select.value);host.append(settingRow(name,select));
 });
}
let createPopup;
function createProperty(host,set,anchor,save){
 createPopup??=settingsPopover(host,'Create property',{width:304});
 createPopup.panel.classList.add('variant-property-popover');createPopup.show(set.id,host);
 createPopup.update(String(set.id)+':'+set.properties.join('|'),(title,body)=>{
  title.textContent='Create property';body.classList.add('variant-create-body');
  let name='Property';let n=1;while(set.properties.includes(name))name='Property '+n++;
  const prop=field('Property name',name),value=field('Property value','Default');
  const error=element('p','variant-error');error.setAttribute('role','alert');error.hidden=true;
  const footer=element('div','variant-create-footer'),submit=element('button','primary','Create property');submit.type='button';
  submit.onclick=()=>{try{const draft=structuredClone(set);draft.properties.push(prop.input.value.trim());draft.variants.forEach(v=>v.values.push(value.input.value.trim()));save(draft);createPopup.close();}catch(e){error.hidden=false;error.textContent=String(e);}};
  footer.append(submit);body.append(settingRow('Name',prop.box),settingRow('Value',value.box),error,footer);
  for(const input of [prop.input,value.input])input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit.click();}});
 });
 createPopup.body.querySelector('input')?.select();createPopup.body.querySelector('input')?.focus();
}
// Match Figma's Properties list for the set and Current variant rows for a main.
export function renderVariantAuthoring(host,doc,shape,{save,selectSet}){
 const container=componentSetFrame(doc,shape?.id),set=container??componentSet(doc,shape?.component?.type==='master'?shape.id:0);
 if(createPopup?.open&&createPopup.key!==set?.id)createPopup.close();
 host.classList.add('setting-section');host.replaceChildren();host.hidden=!set;if(!set)return;
 const header=element('div','variant-section-heading'),heading=element('span','',container?'Properties':'Current variant');header.append(heading);
 if(container){const add=action('Create property','plus',event=>{const rect=add.getBoundingClientRect();showContextMenu({preventDefault:()=>event.preventDefault(),clientX:rect.left,clientY:rect.bottom},[
   {label:'Variant',run:()=>createProperty(host,set,add,save)}
  ],add,{label:'Create property',heading:'Create property'});});add.disabled=set.properties.length>=16;header.append(add);
 }else{const go=action('Select component set','',()=>selectSet(set));go.innerHTML='<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="m5 10 7-7 7 7M12 3v18M3 14l9-9 9 9"/></svg>';go.hidden=!set.frame_id;header.append(go);}
 host.append(header);
 set.properties.forEach((name,index)=>{
  const rename=value=>{const draft=structuredClone(set);draft.properties[index]=value;save(draft);};
  if(container){
   const row=element('div','variant-definition'),button=element('button','variant-definition-name');button.type='button';button.setAttribute('aria-label','Rename variant property '+name);button.innerHTML=icon('instance');
   button.append(element('span','variant-property-label',name),element('span','variant-property-values','· '+[...new Set(set.variants.map(v=>v.values[index]))].join(', ')));
   button.onclick=()=>{const input=field('Property '+(index+1)+' name',name);input.box.classList.add('variant-rename');input.box.prepend(button.firstElementChild.cloneNode(true));row.replaceChildren(input.box);editField(input.input,name,rename);input.input.onblur=()=>{if(!input.input.validationMessage){button.hidden=false;row.replaceChildren(button,remove);}};input.input.focus();input.input.select();};
   const remove=action('Remove property '+name,'minus',()=>{const draft=structuredClone(set);draft.properties.splice(index,1);draft.variants.forEach(v=>v.values.splice(index,1));try{save(draft);}catch(e){const error=element('p','variant-error',String(e));error.setAttribute('role','alert');host.append(error);}});remove.disabled=set.properties.length===1;remove.classList.add('variant-remove-property');row.append(button,remove);host.append(row);
  }else{
   const current=set.variants.find(v=>v.component_id===shape.id),value=current.values[index];
   const input=field('Variant '+name,value),label=element('button','variant-property-rename',name);label.type='button';label.title='Rename property '+name;label.setAttribute('aria-label','Rename variant property '+name);
   label.onclick=()=>{const edit=field('Property '+(index+1)+' name',name);label.replaceWith(edit.box);editField(edit.input,name,rename);edit.input.focus();edit.input.select();};
   const change=value=>{const draft=structuredClone(set);draft.variants.find(v=>v.component_id===shape.id).values[index]=value;save(draft);};editField(input.input,value,change);
   const choices=element('select');choices.setAttribute('aria-label','Choose '+name+' value');choices.dataset.triggerIcon='chevron-down';
   for(const value of new Set(set.variants.map(v=>v.values[index]))){const option=element('option','',value);option.value=value;choices.append(option);}choices.value=value;choices.onchange=()=>{try{change(choices.value);}catch(error){input.input.setCustomValidity(String(error));input.input.reportValidity();choices.value=value;}};
   input.box.append(choices);input.box.classList.add('variant-value-field');const row=element('div','setting-row');row.append(label,input.box);host.append(row);
  }
 });
}
