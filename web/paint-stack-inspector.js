import {editorDOM} from './editor-dom.js';
import {paintMode,paints,paintEdit,paintBinding,addPaint,updatePaint,removePaint,movePaint} from './paints.js';
import {icon} from './icons.js';
const selection=new Map();
export function selectPaint(shape,channel,id){selection.set(shape.id+':'+channel,id);}
export function selectedPaint(shape,channel){if(!shape)return null;const stack=paints(shape,channel);return stack.find(p=>p.id===selection.get(shape.id+':'+channel))??stack[0];}
export function editingPaint(shape,channel){return shape?paintEdit(shape,channel,selectedPaint(shape,channel)?.id):shape;}
const el=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
const button=(label,glyph,click)=>{const b=el('button','inspector-icon');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(glyph);b.onclick=click;return b;};
export function installPaintStacks(current,change,{document:read,bind,hosts=null,idPrefix=''}){
 const sync=[],$=id=>editorDOM.getElementById(id);
 for(const channel of hosts?Object.keys(hosts):['fill','stroke']){
  const fill=channel==='fill',title=fill?'Fill':'Stroke',host=hosts?.[channel]??(fill?$('paint-label').closest('section'):$('stroke-section')),heading=host.querySelector('h3'),header=el('div','paint-section-heading'),list=el('div','paint-stack');host.classList.add('paint-section');list.setAttribute('aria-label',title+' paints');
  const add=button('Add '+channel,'plus',()=>{const s=addPaint(current(),channel);selectPaint(s,channel,paints(s,channel)[0].id);change(s);});add.classList.add('paint-add');heading.before(header);header.append(heading,add);header.after(list);
  if(!hosts){const legacy=el('div','paint-legacy');legacy.hidden=true;legacy.append($(channel+'-enabled'),$(fill?'fill':'stroke-color'),$(channel+'-opacity'));host.append(legacy);
  const settings=el('details','paint-settings');settings.hidden=true;settings.append($(fill?'gradient-controls':'stroke-gradient-controls'));list.after(settings);
  if(fill){$('solid-fill-controls').hidden=true;$('fill-value').classList.add('compact-hidden');$('fill-opacity-value').classList.add('compact-hidden');}
  else{const dims=el('div','stroke-dimensions');dims.append($('stroke-alignment-row'),$('stroke-width').closest('label'));settings.after(dims);}
  for(const label of [...host.querySelectorAll(':scope > label')])if(!label.querySelector('input,select'))label.remove();
  }
  let previous=0,dragged=null;const rows=new Map();
  sync.push(shape=>{
   const stack=paints(shape,channel);if(previous!==shape.id){list.replaceChildren();rows.clear();previous=shape.id;}
   for(const [id,row] of rows)if(!stack.some(p=>p.id===id)){row.remove();rows.delete(id);}
   stack.forEach((paint,index)=>{
    let row=rows.get(paint.id);
    if(!row){
     row=el('div','compact-paint-row');row.dataset.paintId=paint.id;row.setAttribute('role','group');
     const edit=patch=>change(updatePaint(current(),channel,paint.id,patch));
     const grip=button('Reorder '+channel,'grip-vertical');grip.classList.add('paint-grip');grip.draggable=true;grip.onkeydown=e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();const s=current(),i=paints(s,channel).findIndex(p=>p.id===paint.id);change(movePaint(s,channel,paint.id,i+(e.key==='ArrowUp'?-1:1)));rows.get(paint.id)?.querySelector('.paint-grip').focus();}};
     grip.ondragstart=e=>{dragged=paint.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(paint.id));row.classList.add('paint-dragging');};grip.ondragend=()=>{dragged=null;row.classList.remove('paint-dragging');list.querySelectorAll('.paint-drop').forEach(n=>n.classList.remove('paint-drop'));};
     row.ondragover=e=>{if(dragged!==null){e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('paint-drop');}};row.ondragleave=()=>row.classList.remove('paint-drop');row.ondrop=e=>{e.preventDefault();row.classList.remove('paint-drop');if(dragged!==null){const s=current();change(movePaint(s,channel,dragged,paints(s,channel).findIndex(p=>p.id===paint.id)));dragged=null;}};
     const values=el('div','paint-value-fields'),color=el('div','paint-color-field'),swatch=el('span','paint-swatch'),picker=el('button','paint-picker-trigger');picker.type='button';picker.setAttribute('aria-haspopup','dialog');picker.setAttribute('aria-controls',idPrefix+channel+'-paint-popover');picker.onclick=()=>{selectPaint(current(),channel,paint.id);host.dispatchEvent(new CustomEvent('paint-open',{detail:{id:paint.id}}));};swatch.append(picker);
     const variableName=el('button','paint-variable-name');variableName.type='button';variableName.onclick=()=>{selectPaint(current(),channel,paint.id);host.dispatchEvent(new CustomEvent('paint-open',{detail:{variables:true}}));};
     const detach=button('Detach variable','unlink',()=>{const s=current(),binding=paintBinding(s,channel,paint.id);if(binding.variable)bind(s.id,binding.path,0);});detach.classList.add('paint-variable-detach');
     const hex=el('input','paint-hex');hex.maxLength=7;hex.spellcheck=false;hex.onchange=()=>{const value='#'+hex.value.replace(/^#/,'');if(!/^#[\da-f]{6}$/i.test(value)){hex.setCustomValidity('Enter six hexadecimal digits');hex.reportValidity();return;}hex.setCustomValidity('');edit({color:value});};hex.oninput=()=>hex.setCustomValidity('');
     const alpha=el('label','paint-alpha'),opacity=el('input',''),suffix=el('span','');opacity.type='number';opacity.min=0;opacity.max=100;opacity.step=.1;suffix.textContent='%';opacity.onchange=()=>{const v=Number(opacity.value);if(opacity.value!==''&&Number.isFinite(v)&&v>=0&&v<=100)edit({opacity:v/100});};alpha.append(opacity,suffix);color.append(swatch,hex,variableName);values.append(color,alpha,detach);
     const eye=button('', 'eye',()=>{const p=paints(current(),channel).find(p=>p.id===paint.id);edit({visible:!p.visible});});eye.classList.add('paint-visibility');const remove=button('', 'minus',()=>change(removePaint(current(),channel,paint.id)));remove.classList.add('paint-remove');row.append(grip,values,eye,remove);rows.set(paint.id,row);
    }
    row.setAttribute('aria-label',title+' '+(index+1));row.classList.toggle('paint-hidden',!paint.visible);
    const binding=paintBinding(shape,channel,paint.id),variable=read().variables?.values.find(v=>v.id===binding.variable),name=row.querySelector('.paint-variable-name'),detach=row.querySelector('.paint-variable-detach');
    row.classList.toggle('paint-bound',!!binding.variable);name.hidden=detach.hidden=!binding.variable;name.textContent=variable?.name??'Missing variable';name.title=(variable?.name??'Missing variable')+' · '+paint.color.toUpperCase();name.setAttribute('aria-label',title+' '+(index+1)+' variable: '+(variable?.name??'Missing variable'));detach.title='Detach '+channel+' '+(index+1)+' variable';detach.setAttribute('aria-label',detach.title);
    const hex=row.querySelector('.paint-hex'),opacity=row.querySelector('.paint-alpha input'),picker=row.querySelector('.paint-picker-trigger'),eye=row.querySelector('.paint-visibility');
    const mode=paintMode(paint);hex.value=mode==='solid'?paint.color.slice(1).toUpperCase():mode[0].toUpperCase()+mode.slice(1);hex.hidden=!!binding.variable;row.querySelector('.paint-alpha').hidden=!!binding.variable;hex.disabled=mode!=='solid';hex.setAttribute('aria-label',title+' '+(index+1)+' hex');opacity.value=Number((paint.opacity*100).toFixed(2));opacity.setAttribute('aria-label',title+' '+(index+1)+' opacity (%)');picker.setAttribute('aria-label',title+' '+(index+1)+' color picker');picker.style.background=paint.media?.data_url?`center/cover url("${paint.media.kind==='video'?paint.media.poster:paint.media.data_url}")`:paint.shader?.snapshot?`center/cover url("${paint.shader.snapshot}")`:paint.pattern?'repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0/8px 8px':paint.gradient?`linear-gradient(90deg,${paint.gradient.stops.map(s=>s.color+' '+s.position*100+'%').join(',')})`:paint.color;
    for(const [b,label] of [[eye,(paint.visible?'Hide ':'Show ')+channel+' '+(index+1)],[row.querySelector('.paint-remove'),'Remove '+channel+' '+(index+1)],[row.querySelector('.paint-grip'),'Reorder '+channel+' '+(index+1)+' (Arrow Up or Down)']]){b.title=label;b.setAttribute('aria-label',label);}eye.innerHTML=icon(paint.visible?'eye':'eye-off');eye.setAttribute('aria-pressed',String(paint.visible));
    if(list.children[index]!==row)list.insertBefore(row,list.children[index]??null);
   });host.classList.toggle('paint-empty',!stack.length);add.disabled=stack.length>=64;
  });
 }
 return shape=>{if(shape)sync.forEach(fn=>fn(shape));};
}
