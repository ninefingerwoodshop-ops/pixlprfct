// The sidebar "Grid" panel shown while grid tracks are selected, following
// Figma (inspected 2026-11-11): a title with a close button, then Columns and
// Rows lists. Each row has the track number, a sizing menu and a value; the
// selected rows are highlighted and carry a remove button.
import {icon} from './icons.js';
const SIZING=[['fixed','Fixed'],['hug','Hug'],['fr','Fill']];
const OTHER={percent:'Percent',em:'Em',auto:'Auto','min-content':'Min content','max-content':'Max content',minmax:'Min / max'};
const names={columns:['Columns','column'],rows:['Rows','row']};
// What the value field shows, and whether it can be typed into.
export function trackValueText(track){
 const n=value=>String(Math.round((value??0)*100)/100);
 if(track.mode==='fr')return {text:n(track.value??1)+'fr',editable:true};
 if(track.mode==='fixed')return {text:n(track.value),editable:true};
 if(track.mode==='percent')return {text:n(track.value)+'%',editable:true};
 if(track.mode==='em')return {text:n(track.value)+'em',editable:true};
 return {text:track.mode==='hug'?'Hug':OTHER[track.mode]??'Auto',editable:false};
}
// A typed value keeps the track's unit; anything that is not a usable number is ignored.
export function parseTrackValue(track,text){
 const value=Number.parseFloat(String(text).replace(',','.'));
 if(!Number.isFinite(value)||value<0||(track.mode==='fr'&&value<.001)||value>1000000)return null;
 return {...track,value};
}
export function renderGridTrackPanel(host,frame,plan,selection,{close,select,change,add,remove,sizeOf=()=>100}){
 const document=host.ownerDocument,el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
 const button=(className,label,glyph,run)=>{const b=el('button',className);b.type='button';b.setAttribute('aria-label',label);b.innerHTML=icon(glyph);b.onclick=run;return b;};
 host.replaceChildren();
 const head=el('header','grid-track-panel-head');head.append(el('h2',null,'Grid'),button('grid-track-panel-close','Close','close',close));host.append(head);
 const grid=frame.auto_layout.grid??{columns:[],rows:[]};
 for(const axis of ['columns','rows']){
  const [title,one]=names[axis],tracks=grid[axis]??[],section=el('section','grid-track-panel-section'),top=el('div','grid-track-panel-title');
  const more=button('grid-track-panel-add','Add '+one,'plus',()=>add(axis));more.disabled=tracks.length>=128;
  top.append(el('h3',null,title),more);section.append(top);
  if(!tracks.length)section.append(el('p','grid-track-panel-note',(plan?.[axis]?.length??0)?`${plan[axis].length} automatic ${plan[axis].length===1?one:axis}. Add a ${one} to size it yourself.`:`No ${axis} yet.`));
  tracks.forEach((track,index)=>{
   const chosen=selection?.axis===axis&&selection.indices.includes(index),row=el('div','grid-track-panel-row'),position=`${one} ${index+1} of ${tracks.length}`;
   row.classList.toggle('selected',chosen);
   const number=el('button','grid-track-panel-index',String(index+1));number.type='button';number.setAttribute('aria-label',`Grid ${position}`);number.setAttribute('aria-pressed',String(chosen));number.onclick=event=>select(axis,index,event);
   const mode=el('select');mode.setAttribute('aria-label',`Sizing for ${position}`);
   for(const [value,text] of [...SIZING,...(OTHER[track.mode]?[[track.mode,OTHER[track.mode]]]:[])]){const option=el('option',null,text);option.value=value;mode.append(option);}
   mode.value=track.mode;mode.onchange=()=>{const size=sizeOf(axis,index);change(axis,index,{...track,mode:mode.value,value:mode.value==='fr'?1:mode.value==='fixed'?(Number.isFinite(size)&&size>0?size:100):track.value,min:null,max:null});};
   const shown=trackValueText(track),value=el('input');value.type='text';value.value=shown.text;value.disabled=!shown.editable;value.setAttribute('aria-label',`Size of ${position}`);
   value.onfocus=()=>value.select();value.onchange=()=>{const next=parseTrackValue(track,value.value);if(next)change(axis,index,next);else value.value=shown.text;};
   value.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();value.blur();}};
   const minus=button('grid-track-panel-remove',`Remove ${position}`,'minus',()=>remove(axis,index));minus.disabled=axis==='columns'&&tracks.length<=1;
   row.append(number,mode,value,minus);section.append(row);
  });
  host.append(section);
 }
}
