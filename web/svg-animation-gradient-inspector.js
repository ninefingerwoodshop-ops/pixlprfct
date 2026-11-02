import {element as el,numberField,choose,colorField,syncInput} from './inspector-settings.js';
import {trackPopover,dragPopover} from './popover-position.js';
import {paintPickerIcon} from './paint-picker-icons.js';
import {icon} from './icons.js';
import {mixGradientStops} from './svg-animation-gradient-model.js';

export function installSvgGradientInspector({read,edit,key,animate,editable,dropdowns,report}){
 let channel='fill',anchor=null,identity=null,signature='',sync=[],activeStop=0;
 const safe=fn=>(...args)=>{try{fn(...args);}catch(e){report(e.message);update();}};
 const button=(label,glyph,fn)=>{const b=el('button','inspector-icon');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=paintPickerIcon(glyph)||icon(glyph);b.onclick=safe(fn);return b;};
 const panel=el('div','paint-popover figma-paint-picker inspector-settings-popover svg-gradient-picker');panel.setAttribute('popover','auto');panel.setAttribute('role','dialog');panel.tabIndex=-1;
 const heading=el('header','paint-popover-heading'),title=el('div','paint-popover-tabs'),close=button('Close gradient paint','close',()=>panel.hidePopover());const custom=el('span','svg-paint-custom-tab','Custom');title.append(custom);heading.append(title,close);panel.append(heading);document.body.append(panel);
 const body=el('div','paint-custom');panel.append(body);
 const position=trackPopover(panel,()=>anchor,{width:240,gap:8,margin:16,fitHeight:true});dragPopover(panel,heading,position);
 const paint=()=>read(channel),stops=()=>paint().stops;
 const updateStops=next=>edit(channel,{stops:next});
 const changeStop=(i,patch)=>{const next=stops().map((s,j)=>i===j?{...s,...patch}:s);if(patch.offset!==undefined){next[i].offset=Math.max(next[i-1]?.offset??0,Math.min(next[i+1]?.offset??1,next[i].offset));}updateStops(next);};
 function update(){
  const p=paint();if(!p||identity!==p.id){if(panel.matches(':popover-open'))panel.hidePopover();return;}if(!panel.matches(':popover-open'))return;
  panel.setAttribute('aria-label',(channel==='fill'?'Fill':'Stroke')+' paint');
  const next=[p.id,channel,p.kind,p.stops?.length,!!p.animated,editable()].join(':');
  if(signature!==next){signature=next;for(const popup of panel.querySelectorAll('.setting-color-picker'))popup.remove();body.replaceChildren();sync=[];activeStop=Math.min(activeStop,(p.stops?.length??1)-1);
   const modes=el('div','paint-mode-toolbar');modes.setAttribute('role','radiogroup');modes.setAttribute('aria-label','Paint type');
   for(const [name,glyph] of [['Solid','solid'],['Gradient','gradient']]){const b=button(name,glyph,()=>edit(channel,{kind:name==='Solid'?'solid':'linear'}));b.setAttribute('role','radio');b.setAttribute('aria-checked',String((name==='Gradient')===!!p.kind));modes.append(b);}body.append(modes);
   if(!p.kind){body.append(el('p','svg-hint','Choose Gradient to add a linear or radial paint.'));}
   else{
    const tools=el('div','paint-gradient-tools'),row=el('div','paint-gradient-heading'),type=choose('Gradient type',[['linear','Linear'],['radial','Radial']],p.kind,safe(kind=>edit(channel,{kind})));
    row.append(type,button('Flip gradient','flip',()=>updateStops(stops().map(s=>({...s,offset:1-s.offset})).reverse())),button('Rotate gradient 90°','rotate',()=>key(channel+'GradientRotation',paint().rotation+90)));tools.append(row);
    const bar=el('div','paint-gradient-bar');tools.append(bar);sync.push(()=>{bar.style.background=ramp(stops());});
    p.stops.forEach((_,i)=>{const handle=button('Color stop '+(i+1),'',()=>{activeStop=i;update();});handle.className='paint-gradient-handle';handle.onkeydown=safe(e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();changeStop(i,{offset:stops()[i].offset+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?.1:.01)});}});
     handle.onpointerdown=e=>{if(e.button!==0||!editable())return;e.preventDefault();activeStop=i;const original=stops()[i].offset;let offset=original;handle.setPointerCapture(e.pointerId);const win=handle.ownerDocument.defaultView,move=ev=>{const r=bar.getBoundingClientRect();offset=Math.max(stops()[i-1]?.offset??0,Math.min(stops()[i+1]?.offset??1,(ev.clientX-r.left)/r.width));handle.style.left=offset*100+'%';},cleanup=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',done);handle.removeEventListener('pointercancel',cancel);win.removeEventListener('keydown',escape,true);if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);},done=safe(()=>{cleanup();if(offset!==original)changeStop(i,{offset});else update();}),cancel=()=>{cleanup();update();},escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();}};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',cancel);win.addEventListener('keydown',escape,true);};
     bar.append(handle);sync.push(()=>{handle.style.left=stops()[i].offset*100+'%';handle.style.setProperty('--stop-color',stops()[i].color);handle.setAttribute('aria-pressed',String(activeStop===i));});
    });
    const stopsHeading=el('div','paint-stops-heading'),add=button('Add gradient stop','plus',()=>{const source=stops(),left=source[activeStop],right=source[activeStop+1]??source[activeStop],stop=mixGradientStops([left],[right],.5)[0];updateStops([...source.slice(0,activeStop+1),stop,...source.slice(activeStop+1)]);});add.disabled=p.animated||p.stops.length>=128;stopsHeading.append(el('span','','Stops'),add);tools.append(stopsHeading);
    p.stops.forEach((_,i)=>{const row=el('div','svg-gradient-stop'),offset=numberField('Color stop '+(i+1)+' position (%)',p.stops[i].offset*100,safe(value=>changeStop(i,{offset:value/100})),{min:0,max:100}),color=colorField(panel,'Color stop '+(i+1),()=>stops()[i],safe(patch=>changeStop(i,patch))),remove=button('Delete color stop '+(i+1),'minus',()=>updateStops(stops().filter((_,j)=>j!==i)));remove.disabled=p.animated||p.stops.length<=2;row.append(offset,color,remove);tools.append(row);sync.push(()=>{syncInput(offset.querySelector('input'),Number((stops()[i].offset*100).toFixed(2)));color.sync();});});
    const animateStops=el('button','svg-node-edit',p.animated?'Add gradient stops keyframe':'Animate gradient stops');animateStops.type='button';animateStops.onclick=safe(()=>p.animated?key(channel+'Gradient',stops()):animate(channel+'Gradient'));tools.append(animateStops);
    if(p.animated)tools.append(el('p','svg-hint','Stop colors, opacity and positions are keyed at the playhead. Remove the stop animator to add or delete stops.'));
    body.append(tools);
   }
   for(const field of body.querySelectorAll('button,input,select'))if(!editable())field.disabled=true;
   dropdowns();
  }
  for(const run of sync)run();position.schedule();
 }
 function row(host,c){
  const p=read(c);if(!p)return;const b=el('button','svg-paint-trigger');b.type='button';b.setAttribute('aria-label','Edit '+(c==='fill'?'Fill':'Stroke')+' paint');b.setAttribute('aria-haspopup','dialog');
  const swatch=el('span','svg-paint-swatch');swatch.style.background=p.kind?ramp(p.stops):p.color;b.append(swatch,el('span','',p.kind==='radial'?'Radial':p.kind?'Linear':'Solid'));b.onclick=()=>{channel=c;anchor=b;identity=p.id;signature='';position.prepare();panel.showPopover();update();};host.append(b);
  if(channel===c&&identity===p.id){anchor=b;update();}
 }
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();panel.hidePopover();anchor?.focus();}if(!e.metaKey&&!e.ctrlKey)e.stopPropagation();});
 panel.addEventListener('toggle',()=>{if(!panel.matches(':popover-open')){signature='';for(const nested of panel.querySelectorAll('[popover]'))if(nested.matches(':popover-open'))nested.hidePopover();}});
 return {row,update,close(){panel.hidePopover();}};
}
const ramp=stops=>`linear-gradient(90deg,${stops.map(s=>s.color+Math.round(s.opacity*255).toString(16).padStart(2,'0')+' '+s.offset*100+'%').join(',')})`;
