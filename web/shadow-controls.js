import {appearance} from './appearance.js';
export function renderShadowControls(host,shape,change){
 host.replaceChildren();host.hidden=!shape;if(!shape)return;
 const heading=document.createElement('h3');heading.textContent='Effects';host.append(heading);const style=appearance(shape),shadows=style.shadows??[];
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
}
