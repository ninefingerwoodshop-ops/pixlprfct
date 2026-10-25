import {appearance} from './appearance.js';

export function glassPreset(shape){
 const style=appearance(shape);
 return {...shape,fill:'#ffffff',stroke_width:1,appearance:{...style,gradient:null,stroke_gradient:null,fill_enabled:true,fill_opacity:.18,opacity:1,corner_radius:20,corner_radii:null,stroke_enabled:true,stroke_color:'#ffffff',stroke_opacity:.35,stroke_alignment:'inside',backdrop_blur:20,shadows:[{kind:'drop',x:0,y:8,blur:24,spread:0,color:'#000000',opacity:.12,visible:true}]}};
}

export function renderGlassControls(host,shape,change){
 if(!['frame','rectangle','ellipse','polygon','star'].includes(shape.kind))return;
 const style=appearance(shape),active=style.backdrop_blur>0;
 const section=document.createElement('div');section.className='glass-material';
 const button=document.createElement('button');button.type='button';button.className='glass-material-button';button.textContent=active?'Reset glassmorphism':'Apply glassmorphism';button.onclick=()=>change(glassPreset(shape));section.append(button);
 if(active){
  const heading=document.createElement('h4');heading.textContent='Glassmorphism';section.append(heading);
  const fields=document.createElement('div');fields.className='glass-material-fields';section.append(fields);
  for(const [key,label,type,value,max] of [['backdrop_blur','Blur','number',style.backdrop_blur,200],['fill','Tint','color',shape.fill],['fill_opacity','Tint opacity (%)','number',style.fill_opacity*100,100],['stroke_width','Border width','number',shape.stroke_width,1000],['stroke_color','Border color','color',style.stroke_color],['stroke_opacity','Border opacity (%)','number',style.stroke_opacity*100,100],['corner_radius','Corner radius','number',style.corner_radius,1000000]]){
   const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type=type;input.value=value;input.setAttribute('aria-label','Glass '+label.toLowerCase());if(type==='number'){input.min=0;input.max=max;input.step=1;}row.append(input);fields.append(row);
   input.onchange=()=>{if(!input.checkValidity())return;const v=type==='number'?Number(input.value):input.value;const next={...shape,appearance:{...style}};if(key==='fill'||key==='stroke_width')next[key]=v;else next.appearance[key]=key.endsWith('_opacity')?v/100:v;if(key==='fill')next.appearance.gradient=null;if(key==='stroke_color')next.appearance.stroke_gradient=null;if(key==='corner_radius')next.appearance.corner_radii=null;change(next);};
  }
  const hint=document.createElement('p');hint.textContent='Place over artwork to see the background blur. Export as HTML/CSS to keep the live glass effect.';section.append(hint);
 }
 const effects=document.createElement('div');effects.className='glass-other-effects';effects.append(...host.childNodes);host.append(section,effects);
}
