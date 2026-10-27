import {inputBaseControl} from './input-base.js';
import {fontInput,validFontFamily} from './google-fonts.js';
import {parseBoxValues} from './css-shorthand.js';
import {icon} from './icons.js';
import {showContextMenu} from './context-menu.js';

const textProps=[['font_family','Font','string'],['font_size','Font size','number'],['font_weight','Weight','number'],['line_height','Line height','number'],['letter_spacing','Letter spacing','number'],['color','Text color','color'],['text_align','Alignment',['left','center','right']],['font_style','Font style',['normal','italic']],['text_decoration','Decoration',['none','underline','line-through']]];
const boxProps=[['background','Background','color'],['padding','Padding','padding'],['margin','Margin','margin'],['border_color','Border color','color'],['border_width','Border width','border_width'],['border_style','Border style',['solid','dashed','dotted','none']],['radius','Corner radii','border_radius'],['width','Width','number'],['height','Height','number'],['min_height','Minimum height','number'],['opacity','Opacity (0–1)','number']];
export const partNames={calendar:'Calendar panel',calendar_day:'Calendar day',calendar_selected:'Selected date',calendar_header:'Calendar header',dot:'Radio dot',thumb:'Switch thumb',input:'Input / value',label:'Label',placeholder:'Placeholder',helper:'Helper message',validation:'Validation message',search:'Dropdown search',actions_hover:'Bulk actions hover',bulk_indicator:'Bulk toggle indicator',menu:'Dropdown menu',option:'Dropdown item',option_hover:'Item hover / focus',option_selected:'Selected item',category:'Category heading',pill:'Selected pill',more:'More count',actions:'Select all / Deselect all',checkbox:'Item checkbox',checkbox_selected:'Checked checkbox'};
export function partProperties(part){
 if(part==='dot')return [['size','Size','number'],['background','Color','color']];
 if(part==='thumb')return [['size','Size','number'],['gap','Inset','number'],['background','Color','color'],['radius','Corner radius','border_radius']];
 if(part==='container')return [...boxProps,['gap','Gap','number'],['direction','Direction',['column','row','column-reverse','row-reverse']],['align_items','Align items',['stretch','flex-start','center','flex-end']]];
 if(part==='placeholder')return textProps;
 if(['checkbox','checkbox_selected'].includes(part))return [...textProps,['size','Size','number'],...boxProps.filter(([key])=>!['width','height','min_height'].includes(key))];
 return [...textProps,...boxProps.filter(([key])=>part!=='menu'||!['width','height','min_height'].includes(key)),...(part==='input'?[['halo_color','Halo color','color'],['halo_width','Halo thickness','number'],['halo_offset','Halo offset','number']]:[['visibility','Visibility',['visible','hidden']]])];
}
const choices={text_align:['left','center','right'],font_style:['normal','italic'],text_decoration:['none','underline','line-through'],border_style:['solid','dashed','dotted','none'],direction:['column','row','column-reverse','row-reverse'],align_items:['stretch','flex-start','center','flex-end'],visibility:['visible','hidden']};
const color=v=>/^(#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8}|transparent|currentColor)$/i.test(v??'');
export function partDeclarations(style={}){
 const result=[];
 for(const [key,value] of Object.entries(style)){
  if(value===null||value===undefined||value==='')continue;
  if(key==='halo_color'&&color(value))result.push('--px-halo-color:'+value);
  else if(['halo_width','halo_offset'].includes(key)&&Number.isFinite(value)&&value>=0)result.push('--px-'+key.replaceAll('_','-')+':'+value+'px');
  else if(['color','background','border_color'].includes(key)&&color(value))result.push(key.replaceAll('_','-')+':'+value);
  else if(key==='font_family'&&validFontFamily(value))result.push('font-family:"'+value+'",sans-serif');
  else if(choices[key]?.includes(value))result.push((key==='direction'?'flex-direction':key.replaceAll('_','-'))+':'+value);
  else if(['padding','margin','radius','border_width'].includes(key)){
   try{const vals=parseBoxValues(String(value),{negative:key==='margin'});result.push((key==='radius'?'border-radius':key.replaceAll('_','-'))+':'+vals.map(v=>v+'px').join(' '));}catch{}
  }else if(['font_size','font_weight','line_height','letter_spacing','gap','height','min_height','width','opacity'].includes(key)&&Number.isFinite(value)){
   const unit=['font_weight','line_height','opacity'].includes(key)?'':'px';result.push(key.replaceAll('_','-')+':'+value+unit);
   if(key==='height')result.push('flex-grow:0;flex-shrink:0');
  }
 }
 if(['halo_color','halo_width','halo_offset'].some(key=>style[key]!=null&&style[key]!==''))result.push('outline:var(--px-halo-width,0px) solid var(--px-halo-color,currentColor);outline-offset:var(--px-halo-offset,0px)');
 return result.join(';');
}
export function controlPartsCss(parts,selector){
 const targets={calendar:'>.px-calendar',calendar_day:' .px-calendar-days button',calendar_selected:' .px-calendar-days button[aria-pressed="true"]',calendar_header:' .px-calendar-header',dot:'>.px-control::after',thumb:'>.px-control::after',container:'',input:'>.px-control',label:'>.px-control-label',placeholder:'>.px-control::placeholder',helper:'>.px-control-messages>.px-control-help',validation:'>.px-control-messages>.px-control-error',search:' .px-dropdown-search',actions_hover:' .px-dropdown-actions button:hover',bulk_indicator:' .px-dropdown-bulk-indicator',menu:'>.px-dropdown-menu',option:' .px-dropdown-option',option_hover:' .px-dropdown-option:is(:hover,:focus)',option_selected:' .px-dropdown-option[aria-selected="true"]',category:' .px-dropdown-category',pill:' .px-dropdown-pill',more:' .px-dropdown-more',actions:' .px-dropdown-actions button',checkbox:' .px-dropdown-checkbox',checkbox_selected:' [aria-selected="true"]>.px-dropdown-checkbox'};
 return Object.entries(parts??{}).filter(([part])=>part in targets).map(([part,style])=>selector+targets[part]+'{'+partDeclarations(style)+(['checkbox','checkbox_selected'].includes(part)&&Number.isFinite(style.size??style.width??style.height)?';width:'+(style.size??style.width??style.height)+'px;height:'+(style.size??style.width??style.height)+'px':'')+'}'+(part==='placeholder'?selector+' .px-dropdown-placeholder{'+partDeclarations(style)+(['checkbox','checkbox_selected'].includes(part)&&Number.isFinite(style.size??style.width??style.height)?';width:'+(style.size??style.width??style.height)+'px;height:'+(style.size??style.width??style.height)+'px':'')+'}':'')).join('');
}

// One part at a time keeps the inspector usable while exposing all native parts.
export function renderControlParts({host,shape,state,part,onPart,read,change}){
 const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const select=make('select');select.setAttribute('aria-label','Control part');
 for(const [key,label] of Object.entries(partNames).filter(([key])=>(shape.control?.kind==='date'&&key.startsWith('calendar'))||(shape.control?.kind==='select'&&!key.startsWith('calendar')&&!['thumb','dot'].includes(key))||(shape.control?.kind==='radio'&&['input','label','dot'].includes(key))||(shape.control?.kind==='switch'&&['input','label','thumb'].includes(key))||!['switch','radio'].includes(shape.control?.kind)&&(shape.control?.kind==='button'?key==='input':['input','label','placeholder','helper','validation'].includes(key)))){const o=make('option',label);o.value=key;select.append(o);}select.value=part;select.onchange=()=>onPart(select.value);
 host.append(select,make('p','Blank values inherit. Spacing accepts 1–4 CSS shorthand values.'));
 const style=inputBaseControl(shape,read(true).variables).states?.[state]?.parts?.[part]??{};
 const save=(key,value,variable=0)=>{
  const fresh=read(),path='control.states.'+state+'.parts.'+part+'.'+key,bindings={...fresh.variable_bindings};
  if(variable)bindings[path]=variable;else delete bindings[path];
  const old=fresh.control.states?.[state]??{},parts={...old.parts,[part]:{...old.parts?.[part],[key]:value}};
  change({...fresh,variable_bindings:bindings,control:{...fresh.control,states:{...fresh.control.states,[state]:{...old,parts}}}});
 };
 for(const [key,title,type] of (['checkbox','radio'].includes(shape.control?.kind)&&part==='input'?partProperties(part).filter(([key])=>!['width','min_height','padding','margin',...(shape.control?.kind==='radio'?['radius']:[])].includes(key)).map(([key,label,kind])=>[key,key==='height'?'Size':label,kind]):partProperties(part))){
  const label=make('label');label.className='control-field';label.append(make('span',title));
  const row=make('div');row.className='control-source-row';let input;
  const value=style[key],path='control.states.'+state+'.parts.'+part+'.'+key,bound=shape.variable_bindings?.[path];
  const validate=raw=>{
   if(raw==='')return null;
   if(type==='number'){const n=Number(raw);if(!Number.isFinite(n)||Math.abs(n)>100000||(key!=='letter_spacing'&&n<0)||(key==='opacity'&&n>1))throw Error('Enter a valid number.');return n;}
   if(type==='color'&&!color(raw))throw Error('Enter a hex color, transparent, or currentColor.');
   if(['padding','margin','border_width','border_radius'].includes(type))parseBoxValues(raw,{negative:type==='margin'});
   return raw;
  };
  if(key==='font_family'){input=fontInput(value??'',v=>save(key,v));const commit=input.onchange;input.onchange=()=>input.value.trim()?commit():save(key,null);}
  else if(Array.isArray(type)){input=make('select');const inherit=make('option','Inherit');inherit.value='';input.append(inherit);for(const v of type){const o=make('option',v);o.value=v;input.append(o);}input.value=value??'';input.onchange=()=>save(key,input.value||null);}
  else{input=make('input');input.type=type==='number'?'number':'text';if(type==='number')input.step='any';input.value=value??'';input.placeholder='Inherit';input.oninput=()=>input.setCustomValidity('');input.onchange=()=>{try{const v=validate(input.value.trim());input.setCustomValidity('');save(key,v);}catch(e){input.setCustomValidity(e.message);input.reportValidity();}};}
  input.setAttribute('aria-label',partNames[part]+' '+title);input.disabled=!!bound;row.append(input);
  if(type==='color'){
   const picker=make('input');picker.type='color';picker.value=/^#[\da-f]{6}$/i.test(value??'')?value:'#000000';picker.setAttribute('aria-label',partNames[part]+' '+title+' picker');picker.disabled=!!bound;picker.onchange=()=>save(key,picker.value);row.append(picker);
  }
  const button=make('button');button.type='button';button.className='input-variable-trigger control-variable-trigger';button.innerHTML=icon('variables');button.setAttribute('aria-label','Apply variable to '+partNames[part]+' '+title);
  button.onclick=e=>{
   e.preventDefault();const variables=read(true).variables,kind=Array.isArray(type)?'string':type;
   const actions=variables.values.filter(v=>v.kind===kind||(key==='radius'&&v.kind==='number')).map(v=>({label:v.name,run:()=>save(key,value??null,v.id)}));
   if(!actions.length)actions.push({label:'No compatible variables',enabled:false});
   if(bound)actions.push({label:'Detach variable',run:()=>save(key,value)});
   actions.push({label:'Reset to inherit',run:()=>save(key,null)});
   const r=button.getBoundingClientRect();showContextMenu({preventDefault(){},clientX:r.left,clientY:r.bottom},actions,button);
  };
  row.append(button);label.append(row);host.append(label);
 }
 const reset=make('button','Reset this part');reset.type='button';reset.onclick=()=>{
  const fresh=read(),states=structuredClone(fresh.control.states),bindings={...fresh.variable_bindings};
  if(states[state]?.parts)delete states[state].parts[part];
  for(const path of Object.keys(bindings))if(path.startsWith('control.states.'+state+'.parts.'+part+'.'))delete bindings[path];
  change({...fresh,variable_bindings:bindings,control:{...fresh.control,states}});
 };host.append(reset);
}
