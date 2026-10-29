import {textStyle} from './typography.js';
import {hasHugControlHeight} from './control-sizing.js';
import {disclosureButton,setDisclosureExpanded} from './inspector-disclosure.js';
export const mixedValue=values=>values.every(v=>v===values[0])?values[0]:null;
export function sizingOptions(shapes,all){
 return {hug:shapes.length>0&&shapes.every(s=>!!s.auto_layout||!!s.control||s.kind==='text'),fill:shapes.length>0&&shapes.every(s=>!!s.control||!s.layout_item?.absolute&&all.some(p=>p.id===s.parent_id&&(p.auto_layout||s.control))),limits:shapes.length>0&&shapes.every(s=>s.control||s.component?.type==='instance'||s.auto_layout||(!s.layout_item?.absolute&&all.some(p=>p.id===s.parent_id&&p.auto_layout)))};
}
export function sizingMode(s,axis){if(s.kind==='text'&&!s.layout_item?.['fill_'+axis]){const mode=textStyle(s).sizing;if(mode==='width'||axis==='height'&&mode==='height')return 'hug';}if(axis==='height'&&hasHugControlHeight(s))return 'hug';return axis==='width'&&s.control?.width_sizing?s.control.width_sizing:s.layout_item?.['fill_'+axis]?'fill':s.auto_layout?.['hug_'+axis]?'hug':'fixed';}
export function sizingPatch(s,axis,mode){if(s.kind==='text'){const style=textStyle(s),sizing=mode==='hug'?(axis==='width'?'width':style.sizing==='width'?'width':'height'):(axis==='height'?'fixed':style.sizing==='width'?'height':style.sizing);return {...s,typography:{...style,sizing,wrap:sizing==='height'||sizing==='fixed'&&style.wrap},layout_item:{...s.layout_item,['fill_'+axis]:mode==='fill',...(sizing==='width'?{fill_width:false,fill_height:false}:{})}};}if(axis==='height'&&hasHugControlHeight(s))return {...s,layout_item:{...s.layout_item,fill_height:false,min_height:null,max_height:null},...(s.auto_layout?{auto_layout:{...s.auto_layout,hug_height:true}}:{})};return {...s,...(axis==='width'&&s.control?{control:{...s.control,width_sizing:mode}}:{}),layout_item:{...s.layout_item,['fill_'+axis]:mode==='fill'},...(s.auto_layout?{auto_layout:{...s.auto_layout,['hug_'+axis]:mode==='hug'}}:{})};}
export function limitPatch(s,axis,bound,value){
 if(axis==='height'&&hasHugControlHeight(s))return sizingPatch(s,axis,'hug');
 const item={...s.layout_item,[bound+'_'+axis]:value};
 if(value!==null&&(!Number.isFinite(value)||value<1||value>1000000))throw new Error('Enter a size between 1 and 1,000,000.');
 if(item['min_'+axis]!=null&&item['max_'+axis]!=null&&item['min_'+axis]>item['max_'+axis])throw new Error('Minimum must not exceed maximum.');
 return {...s,layout_item:item};
}
export function installLayoutSizing({selection,all,change}){
 const $=id=>document.getElementById(id),make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 const host=make('div','layout-sizing-controls'),axes={},expanded={width:false,height:false},previousLimits={};let selectionKey='';
 const multi=make('section','property-section');multi.append(make('h3','','Layout'));$('multi-properties').children[0].after(multi);
 const legacy=$('limit-min_width').closest('details');legacy.hidden=true;
 for(const axis of ['width','height']){
  const column=make('div','sizing-axis'),top=make('div','sizing-axis-top'),toggle=disclosureButton(`${axis==='width'?'Width':'Height'} limits`,value=>{expanded[axis]=value;render();});toggle.classList.add('size-limit-disclosure');
  const select=make('select','');select.id='layout-size-'+axis;select.setAttribute('aria-label',axis==='width'?'Width sizing':'Height sizing');
  select.onchange=()=>{const action=select.value,shapes=selection();if(action==='variable'){render();$(axis).closest('label').querySelector('.input-variable-trigger')?.click();return;}if(action.startsWith('add-')){const bound=action.slice(4);expanded[axis]=true;change(shapes.map(s=>limitPatch(s,axis,bound,s.layout_item?.[bound+'_'+axis]??Math.max(1,Math.min(1000000,s[axis])))));}else if(action==='remove'){change(shapes.map(s=>({...s,layout_item:{...s.layout_item,['min_'+axis]:null,['max_'+axis]:null}})));expanded[axis]=false;}else change(shapes.map(s=>sizingPatch(s,axis,action)));render();};
  top.append(make('span','',axis==='width'?'W':'H'),select);column.append(top,toggle);const fields=make('div','size-limit-fields');fields.id=`${axis}-limit-fields`;toggle.setAttribute('aria-controls',fields.id);
  for(const bound of ['min','max']){const row=make('label','size-limit-field'),caption=make('span','',bound==='min'?'Min':'Max'),input=make('input','');input.type='number';input.min=1;input.max=1000000;input.id=`sizing-${bound}-${axis}`;input.setAttribute('aria-label',`${bound==='min'?'Minimum':'Maximum'} ${axis}`);input.oninput=()=>input.setCustomValidity('');input.onchange=()=>{try{const value=input.value===''?null:Number(input.value);const shapes=selection(),changes=shapes.map(s=>limitPatch(s,axis,bound,value));input.setCustomValidity('');if(shapes.some(s=>(s.layout_item?.[bound+'_'+axis]??null)!==value))change(changes);}catch(e){input.setCustomValidity(e.message);input.reportValidity();}};input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();input.onchange();}};row.append(caption,input);fields.append(row);}
  column.append(fields);host.append(column);axes[axis]={select,toggle,fields,top};
  $(axis).addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='ArrowDown'){event.preventDefault();event.stopPropagation();$(axis).closest('label').querySelector('.inspector-select-trigger')?.click();}});
  $('layout-item-fill_'+axis).closest('label').classList.add('layout-legacy');
 }
 function render(){
  const shapes=selection(),key=shapes.map(s=>s.id).sort().join(','),options=sizingOptions(shapes,all());if(key!==selectionKey){for(const axis of ['width','height']){expanded[axis]=shapes.some(s=>s.layout_item?.['min_'+axis]!=null||s.layout_item?.['max_'+axis]!=null);previousLimits[axis]=expanded[axis];}selectionKey=key;}
  const target=shapes.length>1?multi:$('dimensions-section');if(host.parentElement!==target){if(shapes.length>1)target.append(host);else target.querySelector('.property-grid').after(host);}host.hidden=!shapes.length;multi.hidden=shapes.length<2;
  for(const axis of ['width','height']){
   const {select,toggle,fields,top}=axes[axis],mode=mixedValue(shapes.map(s=>sizingMode(s,axis))),hasLimits=shapes.some(s=>s.layout_item?.['min_'+axis]!=null||s.layout_item?.['max_'+axis]!=null);
   const option=(value,label)=>{const o=make('option','',label);o.value=value;if(['fixed','fill','hug'].includes(value))o.dataset.shortLabel={fixed:'Fixed',fill:'Fill',hug:'Hug'}[value];return o;};
   select.replaceChildren(...(mode===null?[option('mixed','Mixed')]:[]),option('fixed','Fixed '+axis+(shapes.length===1?' ('+Math.round(shapes[0][axis]*100)/100+')':'')),...(options.hug?[option('hug','Hug contents')]:[]),...(options.fill?[option('fill','Full width · fill container')]:[]));if(mode===null)select.options[0].disabled=true;
   const lockedHeight=axis==='height'&&shapes.some(s=>hasHugControlHeight(s));
   if(lockedHeight){select.replaceChildren(option('hug','Hug contents'));select.disabled=true;}else select.disabled=false;
   if(!lockedHeight&&(options.limits||hasLimits)){const group=make('optgroup','');group.label='Size limits';for(const bound of ['min','max']){const exists=shapes.every(s=>s.layout_item?.[bound+'_'+axis]!=null);if(!exists)group.append(option('add-'+bound,`Add ${bound} ${axis}`));}if(hasLimits)group.append(option('remove','Remove min and max'));select.append(group);}
   if(!lockedHeight&&shapes.length===1&&shapes[0].component?.type!=='instance')select.append(option('variable','Apply variable…'));
   const field=$(axis).closest('label'),destination=shapes.length===1?field:top;field.classList.add('dimension-field');field.dataset.sizing=mode??'mixed';
   const trigger=select.nextElementSibling?.classList.contains('inspector-select-trigger')?select.nextElementSibling:null;
   if(select.parentElement!==destination){destination.append(select);if(trigger)destination.append(trigger);}
   top.hidden=shapes.length===1;
   if(hasLimits&&!previousLimits[axis])expanded[axis]=true;previousLimits[axis]=hasLimits;
   select.value=mode??'mixed';toggle.hidden=lockedHeight||!options.limits&&!hasLimits;setDisclosureExpanded(toggle,expanded[axis]);
   fields.hidden=toggle.hidden||!expanded[axis];
   host.hidden=shapes.length===1&&!options.limits&&!['width','height'].some(a=>shapes.some(s=>s.layout_item?.['min_'+a]!=null||s.layout_item?.['max_'+a]!=null));
   const caption=$('dimensions-section').querySelector('.dimension-caption');if(caption?.classList.contains('inspector-field-caption'))caption.textContent=shapes.some(s=>s.auto_layout)?'Resizing':'Dimensions';
   for(const bound of ['min','max']){const input=$(`sizing-${bound}-${axis}`),values=shapes.map(s=>s.layout_item?.[bound+'_'+axis]??null);input.value=mixedValue(values)??'';input.placeholder=values.every(v=>v===null)?'None':'Mixed';}
  }
 }
 return render;
}
