import {appearance} from './appearance.js';
import {compactEffects} from './compact-inspector.js';
import {renderGlassControls} from './glass-controls.js';
export function renderShadowControls(host,shape,change){
 const openEffects=host.dataset.shape===String(shape?.id)?[...host.querySelectorAll('details.effect-entry[open]')].map(d=>d.dataset.effect):[];host.dataset.shape=shape?.id??'';
 host.replaceChildren();host.hidden=!shape;if(!shape)return;
 const heading=document.createElement('h3');heading.textContent='Effects';host.append(heading);const style=appearance(shape),shadows=style.shadows??[];
 const blurLabel=document.createElement('label'),blur=document.createElement('input');blur.type='number';blur.min=0;blur.max=100000;blur.step='any';blur.value=style.layer_blur??0;blur.id=`layer-blur-${shape.id}`;blur.setAttribute('aria-label','Layer blur');blurLabel.append(document.createTextNode('Layer blur'),blur);host.append(blurLabel);blur.onchange=()=>change({...shape,appearance:{...style,layer_blur:Number(blur.value)}});
 const glassLabel=document.createElement('label'),glass=document.createElement('input');glass.type='number';glass.min=0;glass.max=200;glass.step=1;glass.value=style.backdrop_blur??0;glass.setAttribute('aria-label','Background blur');glassLabel.append(document.createTextNode('Background blur (CSS)'),glass);host.append(glassLabel);glass.onchange=()=>change({...shape,appearance:{...style,backdrop_blur:Number(glass.value)}});
 const preset=document.createElement('button');preset.className='wide-button';preset.textContent='Apply glass material';preset.onclick=()=>change({...shape,fill:'#ffffff',stroke_width:1,appearance:{...style,gradient:null,stroke_gradient:null,fill_enabled:true,fill_opacity:.18,opacity:1,corner_radius:20,corner_radii:null,stroke_enabled:true,stroke_color:'#ffffff',stroke_opacity:.35,stroke_alignment:'inside',backdrop_blur:20,shadows:[{kind:'drop',x:0,y:8,blur:24,spread:0,color:'#000000',opacity:.12,visible:true}]}});host.append(preset);const help=document.createElement('p');help.textContent='Glass blurs the content behind a translucent fill. It renders in CSS canvas and HTML/CSS export.';host.append(help);
 const save=next=>change({...shape,appearance:{...style,shadows:next}});
 shadows.forEach((shadow,index)=>{
  const group=document.createElement('fieldset');group.className='shadow-controls';const legend=document.createElement('legend');legend.textContent=`${shadow.kind==='inner'?'Inner':'Drop'} shadow ${index+1}`;group.append(legend);host.append(group);
  const kindLabel=document.createElement('label'),kind=document.createElement('select');kind.setAttribute('aria-label',`Shadow ${index+1} Type`);kind.id=`shadow-${shape.id}-${index}-kind`;for(const [value,text] of [['drop','Drop shadow'],['inner','Inner shadow']]){const o=document.createElement('option');o.value=value;o.textContent=text;kind.append(o);}kind.value=shadow.kind??'drop';kind.onchange=()=>save(shadows.map((s,i)=>i===index?{...s,kind:kind.value}:s));kindLabel.append(document.createTextNode('Type'),kind);group.append(kindLabel);
  for(const [key,name,type,min,max] of [['visible','Visible','checkbox'],['x','X','number',-100000,100000],['y','Y','number',-100000,100000],['blur','Blur','number',0,100000],['spread','Spread','number',-100000,100000],['color','Color','color'],['opacity','Opacity (%)','number',0,100]]){
   const label=document.createElement('label'),input=document.createElement('input');input.type=type;input.id=`shadow-${shape.id}-${index}-${key}`;input.setAttribute('aria-label',`Shadow ${index+1} ${name}`);if(type==='checkbox')input.checked=shadow.visible!==false;else input.value=key==='opacity'?shadow.opacity*100:shadow[key]??0;if(type==='number'){input.min=min;input.max=max;input.step='any';}label.append(document.createTextNode(name),input);group.append(label);input.onchange=()=>{const value=type==='checkbox'?input.checked:type==='color'?input.value:Number(input.value)/(key==='opacity'?100:1);save(shadows.map((s,i)=>i===index?{...s,[key]:value}:s));};
  }
  const button=(text,disabled,action)=>{const b=document.createElement('button');b.textContent=text;b.disabled=disabled;b.onclick=action;group.append(b);};
  button(`Move shadow ${index+1} up`,index===0,()=>{const next=[...shadows];[next[index-1],next[index]]=[next[index],next[index-1]];save(next);});
  button(`Move shadow ${index+1} down`,index===shadows.length-1,()=>{const next=[...shadows];[next[index+1],next[index]]=[next[index],next[index+1]];save(next);});
  button(`Remove shadow ${index+1}`,false,()=>save(shadows.filter((_,i)=>i!==index)));
 });
 const add=document.createElement('button');add.textContent='Add drop shadow';add.className='wide-button';add.disabled=shadows.length>=8;add.onclick=()=>save([...shadows,{kind:'drop',x:0,y:4,blur:8,spread:0,color:'#000000',opacity:.25,visible:true}]);host.append(add);
 compactEffects(host,shape,change,openEffects);
 renderGlassControls(host,shape,change);
}
