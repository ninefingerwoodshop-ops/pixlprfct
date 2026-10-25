import {icon} from './icons.js';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,action,label)=>{const b=el('button',text);b.type='button';b.onclick=action;if(label)b.setAttribute('aria-label',label);return b;};
const input=(label,value,change,type='text')=>{const e=el('input');e.type=type;e.setAttribute('aria-label',label);e.value=value;e.oninput=()=>change(type==='number'?Number(e.value):e.value);return e;};
const option=(label,value)=>{const o=el('option',label);o.value=value;return o;};
const nextId=list=>Math.max(0,...list.map(x=>x.id))+1;
const defaults={color:'#0d99ff',number:16,string:'Text',boolean:true};
const definitions=[['fill','Fill','color'],['appearance.stroke_color','Stroke color','color'],['width','Width','number'],['height','Height','number'],['appearance.opacity','Opacity (0–1)','number'],['appearance.corner_radius','Corner radius','number'],['stroke_width','Stroke weight','number'],['hidden','Hidden','boolean'],['clip_content','Clip content','boolean'],['text','Text content','string'],['typography.font_family','Font family','string'],['typography.font_size','Font size','number'],['auto_layout.gap','Gap','number'],['auto_layout.cross_gap','Row / column gap','number'],...['top','right','bottom','left'].map(s=>['auto_layout.padding_'+s,'Padding '+s,'number'])];
export const variableProperties=shape=>definitions.filter(([path])=>shape&&(!path.startsWith('auto_layout.')||shape.auto_layout)&&(!(path==='text'||path.startsWith('typography.'))||shape.kind==='text'));
export function editVariables(doc,onSave){
 const draft=structuredClone(doc.variables??{collections:[],values:[]});let selected=draft.collections[0]?.id,collectionId=nextId(draft.collections),variableId=nextId(draft.values);const modeIds=new Map(draft.collections.map(c=>[c.id,nextId(c.modes)]));
 const dialog=el('dialog',undefined,'variables-dialog');dialog.setAttribute('aria-labelledby','variables-title');
 const header=el('header'),title=el('h2','Local variables');title.id='variables-title';header.append(title,button('×',()=>dialog.close(),'Close variables'));
 const body=el('div',undefined,'variables-body'),sidebar=el('aside'),main=el('section'),error=el('p','', 'variables-error');error.setAttribute('role','alert');
 const footer=el('footer');footer.append(el('span','Changes apply together when you save.'),button('Cancel',()=>dialog.close()));
 const save=button('Save variables',()=>{try{onSave(draft);dialog.close();}catch(e){error.textContent=String(e);}});save.className='primary';footer.append(save);
 const addCollection=()=>{const id=collectionId++;draft.collections.push({id,name:'Collection '+id,modes:[{id:1,name:'Mode 1'}],default_mode:1});modeIds.set(id,2);selected=id;render();};
 function render(){
  sidebar.replaceChildren(el('h3','Collections'));
  for(const c of draft.collections){const b=button(c.name,()=>{selected=c.id;render();});b.className='variable-collection';b.setAttribute('aria-pressed',String(c.id===selected));sidebar.append(b);}
  sidebar.append(button('+ Collection',addCollection));main.replaceChildren();
  const c=draft.collections.find(c=>c.id===selected);
  if(!c){main.append(el('h3','Create your first collection'),el('p','Reuse colors, spacing, text, and boolean values across your design. Add modes for themes or other contexts.'),button('Create collection',addCollection));return;}
  const toolbar=el('div',undefined,'variables-toolbar'),name=input('Collection name',c.name,v=>{c.name=v;});name.maxLength=128;
  toolbar.append(name,button('+ Mode',()=>{const id=modeIds.get(c.id);modeIds.set(c.id,id+1);c.modes.push({id,name:'Mode '+id});for(const v of draft.values.filter(v=>v.collection_id===c.id))v.values[id]=structuredClone(v.values[c.default_mode]);render();}),button('Delete collection',()=>{draft.collections=draft.collections.filter(x=>x.id!==c.id);draft.values=draft.values.filter(v=>v.collection_id!==c.id);selected=draft.collections[0]?.id;render();}));main.append(toolbar);
  const scroll=el('div',undefined,'variables-table-scroll'),table=el('table'),head=el('tr');head.append(el('th','Name'),el('th','Type'));
  for(const m of c.modes){const th=el('th');th.append(input('Mode '+m.id+' name',m.name,v=>m.name=v));const tools=el('div',undefined,'variable-mode-actions');const def=button(c.default_mode===m.id?'Default':'Set default',()=>{c.default_mode=m.id;render();},'Use '+m.name+' as default');def.disabled=c.default_mode===m.id;const remove=button('×',()=>{c.modes=c.modes.filter(x=>x.id!==m.id);if(c.default_mode===m.id)c.default_mode=c.modes[0].id;for(const v of draft.values.filter(v=>v.collection_id===c.id))delete v.values[m.id];render();},'Remove '+m.name+' mode');remove.disabled=c.modes.length===1;tools.append(def,remove);th.append(tools);head.append(th);}
  head.append(el('th',''));const thead=el('thead');thead.append(head);table.append(thead);const tbody=el('tbody');
  for(const v of draft.values.filter(v=>v.collection_id===c.id)){
   const row=el('tr'),nameCell=el('td');nameCell.append(input('Variable '+v.id+' name',v.name,value=>v.name=value));row.append(nameCell,el('td',v.kind));
   for(const m of c.modes){const cell=el('td'),value=v.values[m.id],alias=value&&typeof value==='object';const source=el('select');source.setAttribute('aria-label',v.name+' · '+m.name+' source');source.append(option('Value','literal'),...draft.values.filter(other=>other.id!==v.id&&other.kind===v.kind).map(other=>option('↗ '+other.name,other.id)));source.value=alias?value.alias:'literal';source.onchange=()=>{v.values[m.id]=source.value==='literal'?defaults[v.kind]:{alias:Number(source.value)};render();};
    if(!alias){const label=v.name+' · '+m.name;if(v.kind==='boolean'){const select=el('select');select.setAttribute('aria-label',label);select.append(option('True','true'),option('False','false'));select.value=String(value);select.onchange=()=>v.values[m.id]=select.value==='true';cell.append(select);}else{const field=input(label,value,value=>v.values[m.id]=value,v.kind==='number'?'number':'text');if(v.kind==='number')field.step='any';if(v.kind==='color'){field.pattern='#[0-9a-fA-F]{6}';const swatch=input(label+' color',value,value=>{v.values[m.id]=value;field.value=value;},'color');cell.append(swatch);}cell.append(field);}}
    cell.append(source);row.append(cell);
   }
   const actions=el('td');actions.append(button('×',()=>{draft.values=draft.values.filter(x=>x.id!==v.id);render();},'Delete '+v.name));row.append(actions);tbody.append(row);
  }
  table.append(tbody);scroll.append(table);main.append(scroll);
  const create=el('div',undefined,'variables-toolbar'),type=el('select');type.setAttribute('aria-label','New variable type');for(const t of Object.keys(defaults))type.append(option(t[0].toUpperCase()+t.slice(1),t));create.append(type,button('+ Create variable',()=>{const id=variableId++,kind=type.value;draft.values.push({id,collection_id:c.id,name:kind+'/'+id,kind,values:Object.fromEntries(c.modes.map(m=>[m.id,defaults[kind]]))});render();}));main.append(create);
 }
 body.append(sidebar,main);dialog.append(header,body,error,footer);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);render();dialog.showModal();
}
export function installVariables({document:read,current,save,bind,mode}){
 const manage=()=>editVariables(read(),save),nav=button('',manage,'Local variables');nav.className='rail-button';nav.title='Local variables';nav.innerHTML='<span>'+icon('variables')+'</span><span>Variables</span>';document.getElementById('nav-help').before(nav);
 const section=el('section',undefined,'property-section variable-inspector');section.id='variable-inspector';document.getElementById('appearance-section').after(section);
 return()=>{
  const doc=read(),shape=current(),vars=doc.variables??{collections:[],values:[]};section.hidden=!shape;section.replaceChildren();if(!shape)return;
  const heading=el('div',undefined,'variable-section-heading');heading.append(el('h3','Variables'),button('Manage',manage));section.append(heading);
  if(!vars.collections.length){section.append(el('p','Create reusable design values in Local variables.'));return;}
  for(const c of vars.collections){let inherited=c.default_mode,parent=doc.shapes.find(s=>s.id===shape.parent_id);const visited=new Set();while(parent&&!visited.has(parent.id)){visited.add(parent.id);if(parent.variable_modes?.[c.id]){inherited=parent.variable_modes[c.id];break;}parent=doc.shapes.find(s=>s.id===parent.parent_id);}const label=el('label',c.name+' mode'),select=el('select');select.setAttribute('aria-label',c.name+' mode');select.append(option('Inherit · '+c.modes.find(m=>m.id===inherited)?.name,0),...c.modes.map(m=>option(m.name,m.id)));select.value=shape.variable_modes?.[c.id]??0;select.onchange=()=>mode(shape.id,c.id,Number(select.value));label.append(select);section.append(label);}
  const props=variableProperties(shape);for(const [path,id] of Object.entries(shape.variable_bindings??{})){const row=el('div',undefined,'variable-binding');row.append(el('span',(props.find(p=>p[0]===path)?.[1]??path)+' · '+(vars.values.find(v=>v.id===id)?.name??'Missing')),button('×',()=>bind(shape.id,path,0),'Detach '+path+' variable'));section.append(row);}
  const properties=el('select');properties.setAttribute('aria-label','Variable property');props.forEach(([path,label])=>properties.append(option(label,path)));
  const values=el('select');values.setAttribute('aria-label','Variable to apply');const update=()=>{const kind=props.find(p=>p[0]===properties.value)?.[2];values.replaceChildren(option('Choose variable…',''),...vars.values.filter(v=>v.kind===kind).map(v=>option(v.name,v.id)));};properties.onchange=update;values.onchange=()=>{if(values.value)bind(shape.id,properties.value,Number(values.value));};update();section.append(properties,values);
 };
}
