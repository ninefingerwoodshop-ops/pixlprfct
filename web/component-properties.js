import {renderSlotProperty,editSlotProperty} from './slots.js';
import {descendants} from './selection.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function renderComponentProperties(host,doc,shape,actions){
  host.replaceChildren();const linked=shape?.component?.type==='instance',master=linked?shape.component.master:shape?.component?.type==='master'?shape.id:0;
  const properties=(doc.component_properties??[]).filter(p=>p.component_id===master);host.hidden=!properties.length&&shape?.component?.type!=='master';if(host.hidden)return;
  let root=shape;while(linked&&root.component.master!==root.component.source)root=doc.shapes.find(s=>s.id===root.parent_id);
  const tree=descendants(doc.shapes,[root.id]);if(!linked){const heading=el('div');heading.className='slot-properties-heading';heading.append(el('h3','Properties'));const add=el('button','+');add.setAttribute('aria-label','Create property');add.title='Create property';add.onclick=event=>actions.create?.(event,add);heading.append(add);host.append(heading);}
  properties.forEach(p=>{
    const targets=linked?tree.filter(s=>s.component?.master===master&&p.targets.includes(s.component.source)):doc.shapes.filter(s=>p.targets.includes(s.id));
    if(p.kind==='slot'){renderSlotProperty(host,doc,p,targets,linked,actions);return;}
    const values=targets.map(s=>p.kind==='text'?s.text:!s.hidden),mixed=values.some(v=>v!==values[0]);
    const row=el('div');row.className='exposed-property';const label=el('label',p.name),input=el(p.kind==='text'?'textarea':'input');input.setAttribute('aria-label','Component property '+p.name);
    if(p.kind==='text'){input.rows=2;input.maxLength=10000;input.value=mixed?'':values[0]??'';if(mixed)input.placeholder='Mixed values';input.onchange=()=>actions.change(p.id,input.value);}
    else {input.type='checkbox';input.checked=!!values[0];input.indeterminate=mixed;input.onchange=()=>actions.change(p.id,input.checked);}
    label.append(input);row.append(label);
    const buttons=el('div');buttons.className='property-actions';
    if(linked){const reset=el('button','Reset');reset.setAttribute('aria-label','Reset component property '+p.name);reset.disabled=!targets.some(s=>s.component?.overrides?.includes(p.kind==='text'?'text':'hidden'));reset.onclick=()=>actions.reset(p.id);buttons.append(reset);}
    else {const edit=el('button','Edit binding'),remove=el('button','Remove');edit.setAttribute('aria-label','Edit component property '+p.name);remove.setAttribute('aria-label','Remove component property '+p.name);edit.onclick=()=>actions.edit(p);remove.onclick=()=>actions.remove(p.id);buttons.append(edit,remove);}
    row.append(buttons);host.append(row);
  });
}

export function editComponentProperty(doc,master,property,onSave){
  if(property?.kind==='slot'){editSlotProperty(doc,master,property,onSave);return;}
  const draft=property?structuredClone(property):{id:0,component_id:master,name:'Label',kind:'text',targets:[]};
  const tree=descendants(doc.shapes,[master]);const dialog=el('dialog');dialog.id='component-property-dialog';dialog.className='variant-dialog property-dialog';dialog.setAttribute('aria-labelledby','property-dialog-title');
  const title=el('h2',property?'Edit component property':'Add component property');title.id='property-dialog-title';
  const nameLabel=el('label','Property name'),name=el('input');name.value=draft.name;name.maxLength=128;name.setAttribute('aria-label','Component property name');name.oninput=()=>draft.name=name.value;nameLabel.append(name);
  const kindLabel=el('label','Property type'),kind=el('select');kind.setAttribute('aria-label','Component property type');[['text','Text'],['boolean','Visibility']].forEach(([value,text])=>{const option=el('option',text);option.value=value;kind.append(option);});kind.value=draft.kind;kindLabel.append(kind);
  const list=el('div');list.className='property-targets';const help=el('p','Choose the layers controlled by this property. They will share the first selected layer’s current value.');
  const error=el('p');error.className='variant-error';error.setAttribute('role','alert');
  const render=()=>{
    const nodes=tree.filter(s=>draft.kind!=='text'||s.kind==='text');
    const used=new Set((doc.component_properties??[]).filter(p=>p.id!==draft.id&&p.kind===draft.kind).flatMap(p=>p.targets));
    draft.targets=draft.targets.filter(id=>nodes.some(s=>s.id===id)&&!used.has(id));
    const rows=nodes.map(s=>{const label=el('label'),input=el('input');input.type='checkbox';input.checked=draft.targets.includes(s.id);input.disabled=used.has(s.id);input.setAttribute('aria-label','Bind '+s.name);input.onchange=()=>{draft.targets=input.checked?[...draft.targets,s.id]:draft.targets.filter(id=>id!==s.id);};label.append(input,el('span',s.name+(used.has(s.id)?' · Already bound':'')));return label;});
    if(!rows.length)rows.push(el('p','No compatible layers in this component.'));list.replaceChildren(...rows);
  };
  kind.onchange=()=>{draft.kind=kind.value;render();};
  const footer=el('div');footer.className='variant-actions';const cancel=el('button','Cancel'),save=el('button','Save component property');save.className='primary';cancel.onclick=()=>dialog.close();save.onclick=()=>{try{onSave(draft);dialog.close();}catch(e){error.textContent=String(e);}};footer.append(cancel,save);
  dialog.append(title,nameLabel,kindLabel,help,list,error,footer);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);render();dialog.showModal();name.focus();
}
