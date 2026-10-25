export function componentSet(doc,master){return doc.component_sets?.find(s=>s.variants.some(v=>v.component_id===master));}
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function renderVariantProperties(host,doc,master,onChange){
  const set=componentSet(doc,master);host.replaceChildren();host.hidden=!set;if(!set)return;
  host.append(element('h3',set.name));
  const current=set.variants.find(v=>v.component_id===master);
  set.properties.forEach((name,index)=>{const label=element('label',name),select=element('select');select.setAttribute('aria-label','Variant '+name);
    [...new Set(set.variants.map(v=>v.values[index]))].forEach(value=>{const option=element('option',value);option.value=value;select.append(option);});
    select.value=current.values[index];select.onchange=()=>onChange(name,select.value);label.append(select);host.append(label);
  });
  host.append(element('p','If a combination is unavailable, the closest variant is used.'));
}

export function editVariantSet(doc,master,onSave,onRemove){
  const existing=componentSet(doc,master),draft=existing?structuredClone(existing):{id:0,name:doc.shapes.find(s=>s.id===master)?.name??'Component set',properties:['State'],variants:[{component_id:master,values:['Default']}]};
  const assigned=new Set((doc.component_sets??[]).filter(s=>s.id!==draft.id).flatMap(s=>s.variants.map(v=>v.component_id)));
  const mains=doc.shapes.filter(s=>s.component?.type==='master'&&!assigned.has(s.id));
  const dialog=element('dialog');dialog.id='variant-dialog';dialog.className='variant-dialog';dialog.setAttribute('aria-labelledby','variant-dialog-title');
  const title=element('h2',existing?'Edit variant set':'Create variant set');title.id='variant-dialog-title';
  const help=element('p','Give each component a unique combination of property values. Changes apply together when you save.');
  const nameLabel=element('label','Set name'),nameInput=element('input');nameInput.value=draft.name;nameInput.maxLength=128;nameInput.setAttribute('aria-label','Variant set name');nameInput.oninput=()=>draft.name=nameInput.value;nameLabel.append(nameInput);
  const matrix=element('div');matrix.className='variant-matrix';
  const error=element('p');error.className='variant-error';error.setAttribute('role','alert');
  const toolbar=element('div');toolbar.className='variant-actions';
  const addProperty=element('button','Add property'),addVariant=element('button','Add existing component');toolbar.append(addProperty,addVariant);
  const render=()=>{
    const table=element('table'),head=element('thead'),row=element('tr');row.append(element('th','Main component'));
    draft.properties.forEach((p,index)=>{const th=element('th'),input=element('input');input.value=p;input.maxLength=128;input.setAttribute('aria-label',`Property ${index+1} name`);input.oninput=()=>draft.properties[index]=input.value;
      const remove=element('button','×');remove.title='Remove property';remove.setAttribute('aria-label',`Remove property ${index+1}`);remove.disabled=draft.properties.length===1;remove.onclick=()=>{draft.properties.splice(index,1);draft.variants.forEach(v=>v.values.splice(index,1));render();};th.append(input,remove);row.append(th);
    });row.append(element('th',''));head.append(row);table.append(head);
    const body=element('tbody');draft.variants.forEach((v,vi)=>{
      const tr=element('tr'),td=element('td'),select=element('select');select.setAttribute('aria-label',`Variant ${vi+1} component`);
      mains.forEach(s=>{const o=element('option',s.name);o.value=s.id;o.disabled=draft.variants.some((other,i)=>i!==vi&&other.component_id===s.id);select.append(o);});select.value=v.component_id;select.onchange=()=>{v.component_id=Number(select.value);render();};td.append(select);tr.append(td);
      draft.properties.forEach((p,pi)=>{const cell=element('td'),input=element('input');input.value=v.values[pi];input.maxLength=128;input.setAttribute('aria-label',`Variant ${vi+1} property ${pi+1} value`);input.oninput=()=>v.values[pi]=input.value;cell.append(input);tr.append(cell);});
      const actions=element('td'),remove=element('button','Remove');remove.setAttribute('aria-label',`Remove variant ${vi+1}`);remove.disabled=draft.variants.length===1;remove.onclick=()=>{draft.variants.splice(vi,1);render();};actions.append(remove);tr.append(actions);body.append(tr);
    });table.append(body);matrix.replaceChildren(table);addProperty.disabled=draft.properties.length>=16;addVariant.disabled=!mains.some(s=>!draft.variants.some(v=>v.component_id===s.id));
  };
  addProperty.onclick=()=>{let n=2;while(draft.properties.includes('Property '+n))n++;draft.properties.push('Property '+n);draft.variants.forEach(v=>v.values.push('Default'));render();};
  addVariant.onclick=()=>{const next=mains.find(s=>!draft.variants.some(v=>v.component_id===s.id));if(!next)return;const values=draft.properties.map(()=> 'Default');let n=2;do{values[values.length-1]='Variant '+n++;}while(draft.variants.some(v=>v.values.every((x,i)=>x===values[i])));draft.variants.push({component_id:next.id,values});render();};
  const footer=element('div');footer.className='variant-actions';const cancel=element('button','Cancel'),save=element('button','Save variant set');save.className='primary';cancel.onclick=()=>dialog.close();save.onclick=()=>{try{onSave(draft);dialog.close();}catch(e){error.textContent=String(e);}};
  if(existing){const remove=element('button','Ungroup variant set');remove.onclick=()=>{try{onRemove(draft.id);dialog.close();}catch(e){error.textContent=String(e);}};footer.append(remove);}
  footer.append(cancel,save);dialog.append(title,help,nameLabel,toolbar,matrix,error,footer);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);render();dialog.showModal();nameInput.focus();
}
