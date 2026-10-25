import {editVariables,syncVariables} from './variable-manager.js';
import {icon} from './icons.js';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,action,label)=>{const b=el('button',text);b.type='button';b.onclick=action;if(label)b.setAttribute('aria-label',label);return b;};
const input=(label,value,change,type='text')=>{const e=el('input');e.type=type;e.setAttribute('aria-label',label);e.value=value;e.oninput=()=>change(type==='number'?Number(e.value):e.value);return e;};
const option=(label,value)=>{const o=el('option',label);o.value=value;return o;};
const nextId=list=>Math.max(0,...list.map(x=>x.id))+1;
const defaults={color:'#0d99ff',number:16,string:'Text',boolean:true};
const definitions=[['fill','Fill','color'],['appearance.stroke_color','Stroke color','color'],['width','Width','number'],['height','Height','number'],['appearance.opacity','Opacity (0–1)','number'],['appearance.corner_radius','Corner radius','number'],['stroke_width','Stroke weight','number'],['hidden','Hidden','boolean'],['clip_content','Clip content','boolean'],['text','Text content','string'],['typography.font_family','Font family','string'],['typography.font_size','Font size','number'],['auto_layout.gap','Gap','number'],['auto_layout.cross_gap','Row / column gap','number'],...['top','right','bottom','left'].map(s=>['auto_layout.padding_'+s,'Padding '+s,'number'])];
export const variableProperties=shape=>definitions.filter(([path])=>shape&&(!path.startsWith('auto_layout.')||shape.auto_layout)&&(!(path==='text'||path.startsWith('typography.'))||shape.kind==='text'));
export function installVariables({document:read,current,save,bind,mode,history}){
 const manage=()=>editVariables(read,save,history),nav=button('',manage,'Local variables');nav.className='rail-button';nav.title='Local variables';nav.innerHTML='<span>'+icon('variables')+'</span><span>Variables</span>';document.getElementById('nav-help').before(nav);
 const section=el('section',undefined,'property-section variable-inspector');section.id='variable-inspector';document.getElementById('appearance-section').after(section);
 return()=>{
  syncVariables();
  const doc=read(),shape=current(),vars=doc.variables??{collections:[],values:[]};section.hidden=!shape;section.replaceChildren();if(!shape)return;
  const heading=el('div',undefined,'variable-section-heading');heading.append(el('h3','Variables'),button('Manage',manage));section.append(heading);
  if(!vars.collections.length){section.append(el('p','Create reusable design values in Local variables.'));return;}
  for(const c of vars.collections){let inherited=c.default_mode,parent=doc.shapes.find(s=>s.id===shape.parent_id);const visited=new Set();while(parent&&!visited.has(parent.id)){visited.add(parent.id);if(parent.variable_modes?.[c.id]){inherited=parent.variable_modes[c.id];break;}parent=doc.shapes.find(s=>s.id===parent.parent_id);}const label=el('label',c.name+' mode'),select=el('select');select.setAttribute('aria-label',c.name+' mode');select.append(option('Inherit · '+c.modes.find(m=>m.id===inherited)?.name,0),...c.modes.map(m=>option(m.name,m.id)));select.value=shape.variable_modes?.[c.id]??0;select.onchange=()=>mode(shape.id,c.id,Number(select.value));label.append(select);section.append(label);}
  const props=variableProperties(shape);for(const [path,id] of Object.entries(shape.variable_bindings??{})){const row=el('div',undefined,'variable-binding');row.append(el('span',(props.find(p=>p[0]===path)?.[1]??path)+' · '+(vars.values.find(v=>v.id===id)?.name??'Missing')),button('×',()=>bind(shape.id,path,0),'Detach '+path+' variable'));section.append(row);}
  const properties=el('select');properties.setAttribute('aria-label','Variable property');props.forEach(([path,label])=>properties.append(option(label,path)));
  const values=el('select');values.setAttribute('aria-label','Variable to apply');const update=()=>{const kind=props.find(p=>p[0]===properties.value)?.[2];values.replaceChildren(option('Choose variable…',''),...vars.values.filter(v=>v.kind===kind).map(v=>option(v.name,v.id)));};properties.onchange=update;values.onchange=()=>{if(values.value)bind(shape.id,properties.value,Number(values.value));};update();section.append(properties,values);
 };
}
