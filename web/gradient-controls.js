import {appearance} from './appearance.js';
import {defaultGradient,insertGradientStop,moveGradientPoint} from './gradients.js';
export function renderGradientControls(container,shape,update,options={}) {
 container.replaceChildren();const a=appearance(shape),field=options.channel==='stroke'?'stroke_gradient':'gradient',g=a[field],prefix=options.channel==='stroke'?'Stroke ':'';
 const label=(name,input)=>{const l=document.createElement('label');l.append(document.createTextNode(name),input);return l;};
 const select=document.createElement('select');select.id=prefix?'stroke-type':'fill-type';select.setAttribute('aria-label',prefix?'Stroke type':'Fill type');
 for(const [value,name] of [['solid','Solid'],['linear','Linear gradient'],['radial','Radial gradient']]){const o=document.createElement('option');o.value=value;o.textContent=name;select.append(o);}select.value=g?.kind??'solid';
 select.onchange=()=>update({...shape,appearance:{...a,[field]:select.value==='solid'?null:g?{...g,kind:select.value}:defaultGradient(prefix?a.stroke_color:shape.fill,select.value)}});
 container.append(label(prefix?'Stroke type':'Fill type',select));if(!g)return;
 const editCanvas=document.createElement('button');editCanvas.id=prefix?'edit-stroke-gradient':'edit-gradient';editCanvas.className='wide-button';editCanvas.textContent=options.editing?`Done editing ${prefix.toLowerCase()}gradient`:`Edit ${prefix.toLowerCase()}gradient on canvas`;editCanvas.setAttribute('aria-pressed',String(!!options.editing));editCanvas.onclick=options.toggle;container.append(editCanvas);
 if(options.editing){const help=document.createElement('p');help.textContent='Drag square endpoints or circular color stops. Double-click the line to add a stop. Shift snaps direction or stop position. Enter finishes; Escape cancels a drag.';container.append(help);}
 const change=gradient=>update({...shape,appearance:{...a,[field]:gradient}});
 const number=(name,value,min,max,step,onchange)=>{const input=document.createElement('input');input.type='number';input.value=value;input.min=min;input.max=max;input.step=step;input.setAttribute('aria-label',prefix+name);input.onchange=()=>onchange(Number(input.value));return label(name,input);};
 const geometry=document.createElement('div');geometry.className='gradient-geometry';
 for(const [key,name] of [['start','Start'],['end','End']])for(let axis=0;axis<2;axis++)geometry.append(number(`${name} ${axis?'Y':'X'} (%)`,Math.round(g[key][axis]*10000)/100,-1000,1000,1,value=>{const point=[...g[key]];point[axis]=value/100;change(moveGradientPoint(g,key,point));}));
 if(g.kind==='radial'){
  for(let axis=0;axis<2;axis++)geometry.append(number(`Focal ${axis?'Y':'X'} (%)`,(g.focal??[0,0])[axis]*100,-1000,1000,1,value=>{const focal=[...(g.focal??[0,0])];focal[axis]=value/100;change({...g,focal});}));
  geometry.append(number('Focal radius (%)',(g.focal_radius??0)*100,0,100,1,value=>change({...g,focal_radius:value/100})));
 }
 container.append(geometry);
 const stops=document.createElement('div');stops.className='gradient-stops';
 g.stops.forEach((stop,index)=>{
  const row=document.createElement('div');row.className='gradient-stop';if(options.active?.part==='stop'&&options.active.index===index)row.classList.add('active');
  const edit=patch=>change({...g,stops:g.stops.map((s,i)=>i===index?{...s,...patch}:s).sort((a,b)=>a.position-b.position)});
  const color=document.createElement('input');color.type='color';color.value=stop.color;color.setAttribute('aria-label',`${prefix}Stop ${index+1} color`);color.onchange=()=>edit({color:color.value});
  const hex=document.createElement('input');hex.type='text';hex.value=stop.color;hex.maxLength=7;hex.setAttribute('aria-label',`${prefix}Stop ${index+1} hex`);hex.onchange=()=>edit({color:hex.value.startsWith('#')?hex.value:'#'+hex.value});
  const colors=document.createElement('div');colors.className='gradient-colors';colors.append(color,hex);row.append(colors);
  row.append(number(`Stop ${index+1} position (%)`,Math.round(stop.position*10000)/100,0,100,1,v=>edit({position:v/100})),number(`Stop ${index+1} opacity (%)`,Math.round(stop.opacity*10000)/100,0,100,1,v=>edit({opacity:v/100})));
  const remove=document.createElement('button');remove.textContent='Remove stop';remove.setAttribute('aria-label',`${prefix}Remove stop ${index+1}`);remove.disabled=g.stops.length<=2;remove.onclick=()=>change({...g,stops:g.stops.filter((_,i)=>i!==index)});row.append(remove);stops.append(row);
 });container.append(stops);
 const add=document.createElement('button');add.className='wide-button';add.textContent='Add color stop';add.setAttribute('aria-label',prefix+'Add color stop');add.disabled=g.stops.length>=16;add.onclick=()=>change(insertGradientStop(g));container.append(add);
 const reverse=document.createElement('button');reverse.className='wide-button';reverse.textContent='Reverse colors';reverse.setAttribute('aria-label',prefix+'Reverse colors');reverse.onclick=()=>change({...g,stops:g.stops.map(s=>({...s,position:1-s.position})).reverse()});container.append(reverse);
}
