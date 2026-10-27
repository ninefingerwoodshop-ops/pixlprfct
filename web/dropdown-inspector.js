import {dropdownConfig} from './dropdown-control.js';
const editingItems=new Map();
export function renderDropdownInspector({id,c,save,field,newGroup,make,instance=false}){
 const commitInput=(input,apply)=>{let dirty=false;input.oninput=()=>{dirty=true;input.setCustomValidity('');};const commit=()=>{if(!dirty)return;dirty=false;apply();};input.onchange=commit;input.onblur=commit;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit();}};};
 const d=dropdownConfig(c),set=patch=>save({dropdown:{...d,...patch,items:patch.items??d.items}});
 const text=(label,value,apply)=>{const input=make('input');input.setAttribute('aria-label',label);input.value=value??'';commitInput(input,()=>apply(input.value));field(label,input);return input;};
 const choice=(label,value,items,apply)=>{const input=make('select');input.setAttribute('aria-label',label);for(const [key,name] of items){const option=make('option',name);option.value=key;input.append(option);}input.value=value;input.onchange=()=>apply(input.value);field(label,input);};
 const toggle=(label,value,apply)=>{const input=make('input');input.type='checkbox';input.checked=value;input.setAttribute('aria-label',label);input.onchange=()=>apply(input.checked);field(label,input);};
 const number=(label,key,min,max)=>{const input=text(label,d[key],v=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||!Number.isInteger(n)){input.setCustomValidity(`Enter a whole number from ${min} to ${max}.`);input.reportValidity();return;}input.setCustomValidity('');set({[key]:n});});input.type='number';input.min=min;input.max=max;};
 newGroup('Dropdown selection');
 text('Placeholder',c.placeholder,v=>save({placeholder:v}));
 if(!instance)choice('Selection mode',String(!!c.multiple),[['false','Single select'],['true','Multi-select']],v=>save({multiple:v==='true',selected_values:v==='true'?(c.value?[c.value]:d.selected):[],value:v==='true'?'':d.selected[0]||''}));
 const selected=make('select');selected.setAttribute('aria-label','Selected item');const empty=make('option',c.multiple?'Choose an item to toggle':'None');empty.value='';selected.append(empty);
 for(const item of d.items){const o=make('option',(d.selected.includes(item.value)&&c.multiple?'✓ ':'')+(item.category?item.category+' / ':'')+item.label);o.value=item.value;o.disabled=item.disabled;selected.append(o);}selected.value=c.multiple?'':c.value||'';
 selected.onchange=()=>{const value=selected.value;if(c.multiple&&value)save({selected_values:d.selected.includes(value)?d.selected.filter(v=>v!==value):[...d.selected,value]});else if(!c.multiple)save({value});};field(c.multiple?'Toggle selected item':'Selected item',selected);
 if(c.multiple){const summary=make('p',d.selected.length?d.items.filter(i=>d.selected.includes(i.value)).map(i=>i.label).join(', '):'No items selected');summary.className='control-hint';field('Selection',summary);}
 if(instance)return;
 const panelGroup=newGroup('');
 const panelLabel=make('label');panelLabel.className='control-check control-check-heading';
 const panelToggle=make('input');panelToggle.type='checkbox';panelToggle.checked=d.preview_open;panelToggle.setAttribute('aria-label','Show dropdown panel');panelToggle.onchange=()=>set({preview_open:panelToggle.checked});
 panelLabel.append(make('span','Dropdown panel'),panelToggle);panelGroup.querySelector('h4').append(panelLabel);
 if(!d.preview_open)return;
 toggle('Search options',d.search,v=>set({search:v}));
 if(c.multiple){
  choice('Bulk selection control',d.bulk_style,[['none','None'],['links','Text actions'],['buttons','Two buttons'],['checkbox','Checkbox toggle'],['switch','Switch'],['toggle_button','Button with changing label']],v=>set({bulk_style:v}));
  if(['links','buttons'].includes(d.bulk_style)){toggle('Select all action',d.select_all,v=>set({select_all:v}));toggle('Deselect all action',d.deselect_all,v=>set({deselect_all:v}));}
  if(d.bulk_style!=='none'){text('Select all label',d.select_all_label,v=>set({select_all_label:v}));if(!['checkbox','switch'].includes(d.bulk_style))text('Deselect all label',d.deselect_all_label,v=>set({deselect_all_label:v}));}
  toggle('Item checkboxes',d.checkboxes,v=>set({checkboxes:v}));toggle('Selected pills',d.pills,v=>set({pills:v}));if(d.pills)number('Visible pills','pill_limit',0,30);
 }
 newGroup('Dropdown size');number('Menu width (0 = field)','menu_width',0,2000);number('Menu max height','menu_height',80,1200);
 const itemsGroup=newGroup('Dropdown items');
 const chooser=make('select');chooser.setAttribute('aria-label','Edit dropdown item');for(const [index,item] of d.items.entries()){const o=make('option',(item.category?item.category+' / ':'')+item.label);o.value=index;chooser.append(o);}const remembered=d.items.findIndex(i=>i.value===editingItems.get(id));if(remembered>=0)chooser.value=remembered;field('Edit item',chooser);
 const details=make('div');details.className='control-fields';itemsGroup.append(details);
 const detailField=(label,node)=>{const row=make('label');row.className='control-field';row.append(make('span',label),node);details.append(row);};
 const draw=()=>{details.replaceChildren();const index=Number(chooser.value),item=d.items[index];if(!item)return;const update=patch=>{const items=d.items.map((i,n)=>n===index?{...i,...patch}:i);set({items});};
  for(const [key,label] of [['label','Item label'],['value','Item value'],['category','Category']]){const input=make('input');input.value=item[key]||'';input.setAttribute('aria-label',label);input.placeholder=key==='category'?'Uncategorized':'';commitInput(input,()=>{if(key==='value'&&(!input.value||d.items.some((i,n)=>n!==index&&i.value===input.value))){input.setCustomValidity('Use a unique, non-empty value.');input.reportValidity();return;}if(key==='value'){editingItems.set(id,input.value);const items=d.items.map((i,n)=>n===index?{...i,value:input.value}:i);save({value:c.value===item.value?input.value:c.value,selected_values:d.selected.map(v=>v===item.value?input.value:v),dropdown:{...d,items}});}else update({[key]:input.value});});detailField(label,input);}
  const disabled=make('input');disabled.type='checkbox';disabled.checked=item.disabled;disabled.setAttribute('aria-label','Disable item');disabled.onchange=()=>update({disabled:disabled.checked});detailField('Disabled',disabled);
  for(const [label,delta] of [['Move item up',-1],['Move item down',1]]){const b=make('button',label);b.type='button';b.disabled=index+delta<0||index+delta>=d.items.length;b.onclick=()=>{const items=[...d.items];[items[index],items[index+delta]]=[items[index+delta],items[index]];set({items});};details.append(b);}
  const remove=make('button','Remove item');remove.type='button';remove.onclick=()=>save({value:c.value===item.value?'':c.value,selected_values:d.selected.filter(v=>v!==item.value),dropdown:{...d,items:d.items.filter((_,n)=>n!==index)},options:[]});details.append(remove);
 };chooser.onchange=()=>{editingItems.set(id,d.items[Number(chooser.value)]?.value);draw();};draw();
 const buttons=make('div');buttons.className='control-source-row';
 for(const [label,category] of [['Add item',false],['Add category',true]]){const b=make('button',label);b.type='button';b.disabled=d.items.length>=500;b.onclick=()=>{let n=d.items.length+1;while(d.items.some(i=>i.value==='option-'+n))n++;editingItems.set(id,'option-'+n);set({items:[...d.items,{label:'Option '+n,value:'option-'+n,category:category?'New category':'',disabled:false}]});};buttons.append(b);}itemsGroup.append(buttons);
 const hint=make('p','Give items the same category to group them. Style the menu, items, checkboxes, pills and more count under Appearance override, or edit shared variables in Dropdown Base. Use Try native control to test the open menu.');hint.className='control-hint';itemsGroup.append(hint);
}
