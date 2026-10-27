import {baseTextVariable,baseTextColor,textColorPath} from './base-text.js';
const token=(name,kind,value,part,key,state='default',basic=false)=>({name,kind,value,control_path:'control.states.'+state+'.parts.'+part+'.'+key,basic});
export const inputTokens=[
 ...[['menu','Menu'],['option','Item'],['option_hover','Item hover'],['option_selected','Selected item'],['category','Category'],['pill','Pill'],['more','More count'],['actions','Bulk actions'],['checkbox','Checkbox'],['checkbox_selected','Checkbox / Checked']].flatMap(([part,label])=>[
 token('Dropdown / '+label+' / Color','color','#222222',part,'color'),
 token('Dropdown / '+label+' / Background','color','#ffffff',part,'background'),
 token('Dropdown / '+label+' / Padding','padding','8',part,'padding'),
 token('Dropdown / '+label+' / Radius','border_radius','4',part,'radius'),
 token('Dropdown / '+label+' / Border color','color','#cbd5e1',part,'border_color'),
 token('Dropdown / '+label+' / Border width','border_width','1',part,'border_width'),
 token('Dropdown / '+label+' / Font size','number',14,part,'font_size')]),
 ...['left','right'].flatMap(side=>[['Color','color','#222222','color'],['Size','number',20,'size'],['Weight','number',1.5,'weight'],['Spacing','number',8,'gap'],['Vertical offset','number',0,'offset']].map(([label,kind,value,key])=>({name:side[0].toUpperCase()+side.slice(1)+' icon / '+label,kind,value,control_path:'control.'+side+'_adornment.'+key}))),
 {name:'Required / Icon',kind:'string',value:'icon-asterisk',control_path:'control.required_icon'},
 {name:'Required / SVG',kind:'string',value:'',control_path:'control.required_svg'},
 {name:'Required / Icon size',kind:'number',value:14,control_path:'control.required_icon_size'},
 {name:'Required / Icon color',kind:'color',value:'#222222',control_path:'control.required_icon_color'},
 {name:'Required / Icon vertical offset',kind:'number',value:0,control_path:'control.required_icon_offset'},
 {name:'Required / Icon weight',kind:'number',value:1.5,control_path:'control.required_icon_weight'},
 token('Border radius','border_radius','6','input','radius','default',true),
 token('Border width','border_width','1','input','border_width','default',true),
 token('Border color','color','#cbd5e1','input','border_color','default',true),
 token('Background','color','#ffffff','input','background','default',true),
 token('Text color','color','#222222','input','color','default',true),
 token('Padding','padding','8 12','input','padding','default',true),
 token('Height','number',40,'input','height','default',true),
 token('Font family','string','Manrope','input','font_family','default',true),
 token('Font size','number',14,'input','font_size','default',true),
 token('Halo / Color','color','#0d99ff','input','halo_color'),
 token('Halo / Thickness','number',0,'input','halo_width'),
 token('Halo / Offset','number',2,'input','halo_offset'),
 token('Focus / Halo color','color','#0d99ff','input','halo_color','focus'),
 token('Focus / Halo thickness','number',3,'input','halo_width','focus'),
 token('Focus / Halo offset','number',2,'input','halo_offset','focus'),
 token('Font weight','number',400,'input','font_weight'),
 token('Line height','number',1.4,'input','line_height'),
 token('Letter spacing','number',0,'input','letter_spacing'),
 token('Label / Color','color','#222222','label','color'),
 token('Label / Font family','string','Manrope','label','font_family'),
 token('Label / Font size','number',12,'label','font_size'),
 token('Label / Font weight','number',500,'label','font_weight'),
 token('Label / Margin','margin','0','label','margin'),
 token('Placeholder / Color','color','#64748b','placeholder','color'),
 token('Placeholder / Font size','number',14,'placeholder','font_size'),
 token('Helper / Color','color','#64748b','helper','color'),
 token('Helper / Font size','number',12,'helper','font_size'),
 token('Helper / Margin','margin','0','helper','margin'),
 token('Required / Border color','color','#cbd5e1','input','border_color','required'),
 token('Required / Label color','color','#222222','label','color','required'),
 token('Validation / Border color','color','#dc2626','input','border_color','invalid'),
 token('Validation / Label color','color','#dc2626','label','color','invalid'),
 token('Validation / Color','color','#dc2626','validation','color'),
 token('Validation / Font size','number',12,'validation','font_size'),
 token('Validation / Margin','margin','0','validation','margin'),
 token('Hover / Border color','color','#94a3b8','input','border_color','hover'),
 token('Hover / Background','color','#f8fafc','input','background','hover'),
 token('Focus / Border color','color','#0d99ff','input','border_color','focus'),
 token('Disabled / Background','color','#f1f5f9','input','background','disabled'),
 token('Disabled / Text color','color','#64748b','input','color','disabled'),
 token('Read only / Background','color','#f8fafc','input','background','readonly'),
];
export const dropdownTokens=[
 ...[
  ['menu','Panel',{background:'#ffffff',border_color:'#cbd5e1',border_width:'1',radius:'8',padding:'8',color:'#182230',font_size:14}],
  ['search','Search',{background:'#ffffff',border_color:'#cbd5e1',border_width:'1',radius:'4',padding:'4 8',color:'#182230',font_size:14}],
  ['actions','Buttons',{background:'#f8fafc',border_color:'#cbd5e1',border_width:'1',radius:'4',padding:'6 10',color:'#1d4ed8',font_size:14}],
  ['actions_hover','Buttons / Hover',{background:'#eff6ff',color:'#1d4ed8'}],
  ['checkbox','Checkbox',{size:14,background:'#ffffff',border_color:'#475569',border_width:'1',radius:'3'}],
  ['checkbox_selected','Checkbox / Checked',{background:'#2563eb',border_color:'#2563eb',color:'#ffffff'}],
  ['bulk_indicator','Bulk toggle indicator',{border_color:'#475569',border_width:'1'}],
  ['option','Items',{color:'#182230',padding:'8',radius:'4',font_size:14}],
  ['option_hover','Items / Hover',{background:'#f1f5f9'}],
  ['option_selected','Items / Selected',{background:'#e8eefb',color:'#1e40af'}],
  ['category','Categories',{color:'#475569',font_size:12,font_weight:600,padding:'10 8 4'}],
  ['pill','Pills',{background:'#e8eefb',color:'#1e40af',radius:'4',padding:'2 6',font_size:12}],
  ['more','More count',{background:'#e8eefb',color:'#1e40af',radius:'4',padding:'2 6',font_size:12}]
 ].flatMap(([part,label,props])=>Object.entries(props).map(([key,value])=>token(label+' / '+({color:'Text color',border_color:'Border color',border_width:'Border width',radius:'Corner radius',font_size:'Font size',font_weight:'Font weight'}[key]||key[0].toUpperCase()+key.slice(1)),['color','background','border_color'].includes(key)?'color':key==='radius'?'border_radius':key==='border_width'?'border_width':key==='padding'?'padding':'number',value,part,key)))
];
export function ensureDropdownBase(source){
 const variables=structuredClone(source);let collection=variables.collections.find(c=>c.preset==='dropdown_base');
 if(!collection){let name='Dropdown Base',n=2;while(variables.collections.some(c=>c.name===name))name='Dropdown Base '+n++;
  collection={id:Math.max(0,...variables.collections.map(c=>c.id))+1,name,preset:'dropdown_base',modes:[{id:1,name:'Default'}],default_mode:1};variables.collections.push(collection);
  let id=Math.max(0,...variables.values.map(v=>v.id))+1;for(const spec of dropdownTokens)variables.values.push(inputTokenVariable(spec,collection,id++,variables));
 }
 for(const v of variables.values.filter(v=>v.collection_id===collection.id)){
  for(const [oldName,newName] of [['Checked checkbox / ','Checkbox / Checked / '],['Buttons hover / ','Buttons / Hover / '],['Items hover / ','Items / Hover / '],['Selected items / ','Items / Selected / ']])if(v.name.startsWith(oldName))v.name=newName+v.name.slice(oldName.length);
 }
 const prefix='control.states.default.parts.checkbox.';
 const dimensions=variables.values.filter(v=>v.collection_id===collection.id&&[prefix+'width',prefix+'height'].includes(v.control_path));
 if(dimensions.length){let size=variables.values.find(v=>v.collection_id===collection.id&&v.control_path===prefix+'size');if(!size){size=dimensions.find(v=>v.control_path===prefix+'width')||dimensions[0];size.control_path=prefix+'size';size.name='Checkbox / Size';}variables.values=variables.values.filter(v=>!dimensions.includes(v)||v===size);}
 return {variables,collection,bindings:Object.fromEntries(variables.values.filter(v=>v.collection_id===collection.id&&v.control_path).map(v=>[v.control_path,v.id]))};
}
export const checkboxTokens=[
 token('Checkbox / Size','number',20,'input','height'),
 token('Checkbox / Border color','color','#475569','input','border_color'),
 token('Checkbox / Border width','border_width','1','input','border_width'),
 token('Checkbox / Radius','border_radius','4','input','radius'),
 token('Checkbox / Background','color','#ffffff','input','background'),
 token('Checkbox / Mark color','color','#ffffff','input','color'),
 token('Label / Gap','number',8,'container','gap'),
 token('Label / Color','color','#222222','label','color'),
 token('Label / Font family','string','Manrope','label','font_family'),
 token('Label / Font size','number',14,'label','font_size'),
 token('Label / Font weight','number',400,'label','font_weight'),
 token('Label / Line height','number',1.4,'label','line_height')
];
export const calendarTokens=[
 token('Panel / Background','color','#ffffff','calendar','background'),
 token('Panel / Border color','color','#cbd5e1','calendar','border_color'),
 token('Panel / Border width','border_width','1','calendar','border_width'),
 token('Panel / Radius','border_radius','8','calendar','radius'),
 token('Panel / Padding','padding','12','calendar','padding'),
 token('Panel / Text color','color','#222222','calendar','color'),
 token('Day / Text color','color','#222222','calendar_day','color'),
 token('Day / Radius','border_radius','4','calendar_day','radius'),
 token('Selected day / Background','color','#2563eb','calendar_selected','background'),
 token('Selected day / Text color','color','#ffffff','calendar_selected','color'),
 token('Header / Text color','color','#222222','calendar_header','color')
];
function ensureCalendarBase(source){
 const variables=structuredClone(source);let collection=variables.collections.find(c=>c.preset==='calendar_base');
 if(!collection){collection={id:Math.max(0,...variables.collections.map(c=>c.id))+1,name:'Calendar Base',preset:'calendar_base',modes:[{id:1,name:'Default'}],default_mode:1};variables.collections.push(collection);let id=Math.max(0,...variables.values.map(v=>v.id))+1;for(const spec of calendarTokens)variables.values.push(inputTokenVariable(spec,collection,id++,variables));}
 return {variables,collection,bindings:Object.fromEntries(variables.values.filter(v=>v.collection_id===collection.id&&v.control_path).map(v=>[v.control_path,v.id]))};
}
export const radioTokens=[
 token('Circle / Size','number',20,'input','height'),
 token('Circle / Background','color','#ffffff','input','background'),
 token('Circle / Border color','color','#475569','input','border_color'),
 token('Circle / Border width','border_width','1','input','border_width'),
 token('Dot / Size','number',10,'dot','size'),
 token('Dot / Color','color','#2563eb','dot','background'),
 ...checkboxTokens.filter(t=>t.name.startsWith('Label / '))
];
function ensureRadioBase(source){
 const variables=structuredClone(source);let collection=variables.collections.find(c=>c.preset==='radio_base');
 if(!collection){collection={id:Math.max(0,...variables.collections.map(c=>c.id))+1,name:'Radio Base',preset:'radio_base',modes:[{id:1,name:'Default'}],default_mode:1};variables.collections.push(collection);
 let id=Math.max(0,...variables.values.map(v=>v.id))+1;
 for(const spec of radioTokens)variables.values.push(inputTokenVariable(spec,collection,id++,variables));
 addInputModes(variables,collection,'radio');
 for(const mode of collection.modes)for(const v of variables.values.filter(v=>v.collection_id===collection.id)){
  if(mode.name==='Checked'&&v.name==='Circle / Border color')v.values[mode.id]='#2563eb';
  if(mode.name==='Disabled'&&v.name==='Label / Color')v.values[mode.id]='#666666';
 }
 }
 return {variables,collection,bindings:Object.fromEntries(variables.values.filter(v=>v.collection_id===collection.id&&v.control_path).map(v=>[v.control_path,v.id]))};
}
export const buttonTokens=[
 token('Background','color','#2563eb','input','background'),
 token('Text color','color','#ffffff','input','color'),
 token('Border color','color','#2563eb','input','border_color'),
 token('Border width','border_width','1','input','border_width'),
 token('Border radius','border_radius','6','input','radius'),
 token('Padding','padding','10 16','input','padding'),
 token('Minimum height','number',40,'input','min_height'),
 token('Font family','string','Manrope','input','font_family'),
 token('Font size','number',14,'input','font_size'),
 token('Font weight','number',600,'input','font_weight'),
 token('Line height','number',1.4,'input','line_height'),
 token('Focus / Halo color','color','#2563eb','input','halo_color','focus'),
 token('Focus / Halo thickness','number',2,'input','halo_width','focus'),
 token('Focus / Halo offset','number',2,'input','halo_offset','focus'),
 ...inputTokens.filter(t=>/^Left icon|^Right icon/.test(t.name)).map(t=>({...t,value:t.kind==='color'?'#ffffff':t.value}))
];
export const segmentedTokens=[...buttonTokens.filter(t=>!/^Left icon|^Right icon/.test(t.name)).map(t=>({...t,value:t.name==='Padding'?'8 12':t.name==='Minimum height'?36:t.name==='Font weight'?500:t.value})),token('Container / Background','color','#f1f5f9','container','background'),token('Container / Border color','color','#cbd5e1','container','border_color'),token('Container / Border width','border_width','1','container','border_width'),token('Container / Radius','border_radius','8','container','radius'),token('Container / Padding','padding','4','container','padding'),token('Container / Gap','number',2,'container','gap')];
function ensureButtonBase(source,segmented=false){
 const preset=segmented?'segmented_base':'button_base';
 const variables=structuredClone(source);let collection=variables.collections.find(c=>c.preset===preset);
 if(!collection){collection={id:Math.max(0,...variables.collections.map(c=>c.id))+1,name:segmented?'Segmented Base':'Button Base',preset,modes:[{id:1,name:'Default'}],default_mode:1};variables.collections.push(collection);
 let id=Math.max(0,...variables.values.map(v=>v.id))+1;
 for(const spec of (segmented?segmentedTokens:buttonTokens))variables.values.push(inputTokenVariable(spec,collection,id++,variables));
 addInputModes(variables,collection,'button');
 for(const mode of collection.modes)for(const v of variables.values.filter(v=>v.collection_id===collection.id)){
  if(segmented&&v.name==='Text color')v.values[mode.id]=mode.name==='Selected'?'#ffffff':'#222222';
  if(segmented&&['Background','Border color'].includes(v.name)){v.values[mode.id]=({Default:'#f1f5f9',Hover:'#e2e8f0',Active:'#cbd5e1',Selected:'#2563eb',Disabled:'#f1f5f9'})[mode.name]||'#f1f5f9';continue;}
  if(['Background','Border color'].includes(v.name))v.values[mode.id]=({Hover:'#1d4ed8',Active:'#1e40af',Selected:'#1e40af',Disabled:'#64748b'})[mode.name]||v.values[mode.id];
 }
 }
 return {variables,collection,bindings:Object.fromEntries(variables.values.filter(v=>v.collection_id===collection.id&&v.control_path).map(v=>[v.control_path,v.id]))};
}
export const switchTokens=[
 token('Track / Width','number',44,'input','width'),
 token('Track / Height','number',24,'input','height'),
 token('Track / Background','color','#64748b','input','background'),
 token('Track / Border color','color','#64748b','input','border_color'),
 token('Track / Border width','border_width','1','input','border_width'),
 token('Track / Radius','border_radius','999','input','radius'),
 token('Thumb / Size','number',18,'thumb','size'),
 token('Thumb / Inset','number',2,'thumb','gap'),
 token('Thumb / Color','color','#ffffff','thumb','background'),
 token('Thumb / Radius','border_radius','999','thumb','radius'),
 ...checkboxTokens.filter(t=>t.name.startsWith('Label / '))
];
function ensureSwitchBase(source){
 const variables=structuredClone(source);let collection=variables.collections.find(c=>c.preset==='switch_base');
 if(!collection){collection={id:Math.max(0,...variables.collections.map(c=>c.id))+1,name:'Switch Base',preset:'switch_base',modes:[{id:1,name:'Default'}],default_mode:1};variables.collections.push(collection);
 let id=Math.max(0,...variables.values.map(v=>v.id))+1;
 for(const spec of switchTokens)variables.values.push(inputTokenVariable(spec,collection,id++,variables));
 addInputModes(variables,collection,'switch');
 for(const mode of collection.modes)for(const v of variables.values.filter(v=>v.collection_id===collection.id)){
  if(mode.name==='Checked'&&['Track / Background','Track / Border color'].includes(v.name))v.values[mode.id]='#2563eb';
  if(mode.name==='Disabled'&&v.name==='Label / Color')v.values[mode.id]='#666666';
 }
 }
 return {variables,collection,bindings:Object.fromEntries(variables.values.filter(v=>v.collection_id===collection.id&&v.control_path).map(v=>[v.control_path,v.id]))};
}
function ensureCheckboxBase(source){
 const variables=structuredClone(source);let collection=variables.collections.find(c=>c.preset==='checkbox_base');
 if(!collection){collection={id:Math.max(0,...variables.collections.map(c=>c.id))+1,name:'Checkbox Base',preset:'checkbox_base',modes:[{id:1,name:'Default'}],default_mode:1};variables.collections.push(collection);
 let id=Math.max(0,...variables.values.map(v=>v.id))+1;for(const spec of checkboxTokens)variables.values.push(inputTokenVariable(spec,collection,id++,variables));
 addInputModes(variables,collection,'checkbox');
 for(const mode of collection.modes)for(const v of variables.values.filter(v=>v.collection_id===collection.id)){
 if(['Checked','Indeterminate'].includes(mode.name)&&/Background|Border color/.test(v.name))v.values[mode.id]='#2563eb';
 if(mode.name==='Disabled'&&v.name==='Label / Color')v.values[mode.id]='#666666';
 }
 }
 return {variables,collection,bindings:Object.fromEntries(variables.values.filter(v=>v.collection_id===collection.id&&v.control_path).map(v=>[v.control_path,v.id]))};
}
export function availableInputTokens(variables,collection){
 const paths=new Set(variables.values.filter(v=>v.collection_id===collection).map(v=>v.control_path));
 return (variables.collections.find(c=>c.id===collection)?.preset==='calendar_base'?calendarTokens:variables.collections.find(c=>c.id===collection)?.preset==='radio_base'?radioTokens:variables.collections.find(c=>c.id===collection)?.preset==='segmented_base'?segmentedTokens:variables.collections.find(c=>c.id===collection)?.preset==='button_base'?buttonTokens:variables.collections.find(c=>c.id===collection)?.preset==='switch_base'?switchTokens:variables.collections.find(c=>c.id===collection)?.preset==='checkbox_base'?checkboxTokens:variables.collections.find(c=>c.id===collection)?.preset==='dropdown_base'?dropdownTokens:inputTokens).filter(t=>!paths.has(t.control_path));
}
export function inputTokenVariable(spec,collection,id,variables){
 const base=variables&&baseTextVariable(variables);if(base&&textColorPath(spec.control_path)&&['#000000','#222222','#182230','#475569','#64748b'].includes(spec.value))spec={...spec,value:{alias:base.id}};
 return {id,collection_id:collection.id,name:spec.name,kind:spec.kind,control_path:spec.control_path,values:Object.fromEntries(collection.modes.map(m=>[m.id,spec.value]))};
}
export function addInputModes(variables,collection,kind='text'){
 const names=['Default'];
 if(kind!=='hidden')names.push('Hover','Focus','Active','Disabled');
 if(['text','password','email','number','tel','url','search','date','datetime-local','month','week','time','textarea'].includes(kind))names.push('Read only','Required','Validation');
 if(kind==='file')names.push('Required','Validation');
 if(['checkbox','switch','radio'].includes(kind))names.push('Checked');
 if(['select','button','segmented'].includes(kind))names.push('Selected');
 if(kind==='checkbox')names.push('Indeterminate');
 let changed=false;
 for(const name of names){
  if(collection.modes.some(m=>m.name.toLowerCase()===name.toLowerCase()))continue;
  const id=Math.max(0,...collection.modes.map(m=>m.id))+1;
  collection.modes.push({id,name});
  for(const variable of variables.values.filter(v=>v.collection_id===collection.id))variable.values[id]=structuredClone(variable.values[collection.default_mode]);
  changed=true;
 }
 return changed;
}
export function ensureInputBase(source,kind='text'){
 if(kind==='segmented')return ensureButtonBase(source,true);
 if(kind==='radio')return ensureRadioBase(source);
 if(kind==='button')return ensureButtonBase(source);
 if(kind==='switch')return ensureSwitchBase(source);
 if(kind==='checkbox')return ensureCheckboxBase(source);
 const variables=kind==='select'?ensureDropdownBase(source).variables:kind==='date'?ensureCalendarBase(source).variables:structuredClone(source);
 let collection=variables.collections.find(c=>c.preset==='input_base');
 if(!collection){
  const names=new Set(variables.collections.map(c=>c.name));let name='Input Base',suffix=2;
  while(names.has(name))name='Input Base '+suffix++;
  collection={id:Math.max(0,...variables.collections.map(c=>c.id))+1,name,preset:'input_base',modes:[{id:1,name:'Default'}],default_mode:1};
  variables.collections.push(collection);
  let id=Math.max(0,...variables.values.map(v=>v.id))+1;
  for(const spec of inputTokens.filter(t=>t.basic))variables.values.push(inputTokenVariable(spec,collection,id++,variables));
 }
 addInputModes(variables,collection,kind);
 const bindings=Object.fromEntries(variables.values.filter(v=>v.collection_id===collection.id&&v.control_path).map(v=>[v.control_path,v.id]));
 if(kind==='select')Object.assign(bindings,ensureDropdownBase(variables).bindings);
 if(kind==='date')Object.assign(bindings,ensureCalendarBase(variables).bindings);
 return {variables,collection,bindings};
}

// Resolve behavior modes into control states without persisting derived overrides.
export function inputBaseControl(shape,variables,modes={}){
 const control=shape.control;if(!control)return control;
 const result=structuredClone(control),states=result.states??={};result.base_text_color=baseTextColor(variables,modes);
 // Old local Required border values must not override Default. Required border
 // color is opt-in through a live variable binding, including legacy paths.
 const bound=path=>variables.values.some(v=>v.id===shape.variable_bindings?.[path]);
 if(!bound('control.states.required.parts.input.border_color'))delete states.required?.parts?.input?.border_color;
 if(!bound('control.states.required.border_color'))delete states.required?.border_color;
 const collection=variables.collections.find(c=>c.id===control.base_collection&&['input_base','checkbox_base','switch_base','button_base','segmented_base','radio_base'].includes(c.preset));
 if(!collection)return result;
 const resolve=(id,activeModes,seen=new Set())=>{
  if(seen.has(id))return undefined;seen.add(id);
  const v=variables.values.find(v=>v.id===id),c=variables.collections.find(c=>c.id===v?.collection_id);
  if(!v||!c)return undefined;
  const value=v.values[activeModes[c.id]??c.default_mode];
  return value&&typeof value==='object'?resolve(value.alias,activeModes,seen):value;
 };
 const names={hover:'hover',focus:'focus',active:'active',disabled:'disabled','read only':'readonly',checked:'selected',indeterminate:'indeterminate',selected:'selected',required:'required',validation:'invalid'};
 for(const mode of collection.modes){
  const state=names[mode.name.toLowerCase()];if(!state)continue;
  if(state==='readonly'&&!['text','password','email','number','tel','url','search','date','datetime-local','month','week','time','textarea'].includes(control.kind))continue;
  if(state==='selected'&&!['segmented','checkbox','switch','radio','select','button'].includes(control.kind))continue;
  for(const [path,id] of Object.entries(shape.variable_bindings??{})){
   const match=path.match(/^control\.states\.default\.parts\.([^.]+)\.([^.]+)$/);if(!match)continue;
   const variable=variables.values.find(v=>v.id===id);if(variable?.collection_id!==collection.id)continue;
   const [,part,key]=match,target=`control.states.${state}.parts.${part}.${key}`;
   // Required is additive: its border inherits Default until a dedicated
   // required-border binding (or an explicit appearance override) is supplied.
   // Copied values in the Required mode must not freeze the default border.
   if(state==='required'&&part==='input'&&key==='border_color')continue;
   if(shape.variable_bindings[target]||control.states?.[state]?.parts?.[part]?.[key]!=null)continue;
   const value=resolve(id,{...modes,[collection.id]:mode.id});if(value===undefined)continue;
   if(['required','invalid'].includes(state)&&value===resolve(id,{...modes,[collection.id]:collection.default_mode}))continue;
   const style=states[state]??={};const parts=style.parts??={};(parts[part]??={})[key]=value;
  }
 }
 return result;
}
