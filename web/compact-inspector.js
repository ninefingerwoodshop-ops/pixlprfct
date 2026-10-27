import {appearance} from './appearance.js';
import {icon} from './icons.js';
const el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
const button=(label,glyph,action)=>{const b=el('button','inspector-icon');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(glyph);b.onclick=action;return b;};
export function installCompactInspector(current,change){
 const $=id=>document.getElementById(id),sync=[];
 const header=document.querySelector('.inspector-selection');header.append(button('Create component','component',()=>$('create-component').click()));
 const name=$('shape-name').closest('section'),kind=$('shape-kind');const rename=el('details','inspector-rename');rename.append(el('summary','','Layer name'),$('shape-name'));kind.hidden=true;name.replaceChildren(rename,kind);$('inspector-layer-actions').append(name);
 for(const id of ['x','y','width','height']){const input=$(id),label=input.closest('label');label.classList.add('inline-number');input.setAttribute('aria-label',({x:'X-position',y:'Y-position',width:'Width',height:'Height'})[id]);}
 const position=$('x').closest('section'),alignment=position.querySelector('.align-tools');alignment.before(el('div','inspector-field-caption','Alignment'));alignment.after(el('div','inspector-field-caption','Position'));
 const dims=$('dimensions-section'),flow=document.querySelector('#flex-layout-section .layout-flow');flow.before(el('div','inspector-field-caption flow-caption','Flow'));dims.querySelector('.property-grid').before(el('div','inspector-field-caption dimension-caption','Dimensions'));
 const addLayout=$('add-auto-layout');addLayout.innerHTML=icon('plus');addLayout.setAttribute('aria-label','Add Flex Layout');addLayout.title='Add Flex Layout (Shift A)';addLayout.classList.add('inspector-icon','section-add');
 const appearanceGrid=el('div','appearance-pair');appearanceGrid.append($('opacity').closest('label'),$('radius-row'));$('appearance-section').querySelector('h3').after(appearanceGrid);
 const corners=$('independent-corners').closest('label');corners.replaceChildren($('independent-corners'));corners.classList.add('corner-toggle');corners.title='Individual corners';$('independent-corners').setAttribute('aria-label','Individual corners');
 const visible=$('visible').closest('label');visible.replaceChildren($('visible'));$('visible').setAttribute('aria-label','Layer visible');visible.classList.add('eye-toggle');visible.title='Layer visibility';
 for(const channel of ['fill','stroke']){
  const isFill=channel==='fill',host=isFill?$('paint-label').closest('section'):$('stroke-section'),paint=$(isFill?'fill':'stroke-color'),enabled=$(channel+'-enabled'),opacity=$(channel+'-opacity');
  const row=el('div','compact-paint-row'),hex=el('input','paint-hex');hex.setAttribute('aria-label',isFill?'Fill hex':'Stroke hex');hex.maxLength=7;hex.spellcheck=false;
  let dirty=false;hex.oninput=()=>{dirty=true;hex.setCustomValidity('');};const commit=()=>{if(!dirty)return;const value='#'+hex.value.replace(/^#/,'');if(!/^#[\da-f]{6}$/i.test(value)){hex.setCustomValidity('Enter six hexadecimal digits');hex.reportValidity();return;}dirty=false;hex.setCustomValidity('');const s=current();if(s)change(isFill?{...s,fill:value}:{...s,appearance:{...appearance(s),stroke_color:value}});};hex.onchange=commit;hex.onblur=commit;hex.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit();}};
  const swatch=el('span','paint-swatch');swatch.append(paint);opacity.setAttribute('aria-label',isFill?'Fill opacity (%)':'Stroke opacity (%)');const alpha=el('label','paint-alpha');alpha.append(opacity,el('span','','%'));const eye=el('label','eye-toggle');eye.title='Toggle '+channel+' visibility';eye.append(enabled);row.append(swatch,hex,alpha,eye);
  const advanced=el('details','paint-settings');advanced.append(el('summary','','Paint settings'),$(isFill?'gradient-controls':'stroke-gradient-controls'));
  // Preserve all existing inputs and handlers, hiding only their old wrappers.
  const oldEnabled=host.querySelector('label:empty');if(oldEnabled)oldEnabled.remove();
  for(const label of [...host.querySelectorAll(':scope > label')])if(!label.querySelector('input,select'))label.remove();
  host.querySelector('h3').after(row,advanced);
  const add=button('Add '+channel,'plus',()=>{enabled.checked=true;enabled.onchange();});host.append(add);add.classList.add('section-add');
  const remove=button('Remove '+channel,'minus',()=>{enabled.checked=false;enabled.onchange();});row.append(remove);
  if(isFill){$('solid-fill-controls').hidden=true;const value=$('fill-value');value.classList.add('compact-hidden');$('fill-opacity-value').classList.add('compact-hidden');}
  else {const strokeDimensions=el('div','stroke-dimensions');strokeDimensions.append($('stroke-alignment-row'),$('stroke-width').closest('label'));advanced.after(strokeDimensions);}
  sync.push(shape=>{const a=appearance(shape),on=a[channel+'_enabled'],gradient=a[isFill?'gradient':'stroke_gradient'];hex.value=gradient?'Gradient':(isFill?shape.fill:a.stroke_color??'#000000').replace('#','').toUpperCase();hex.disabled=!!gradient;add.hidden=on;row.hidden=!on;advanced.hidden=!on;if(!on)advanced.open=false;host.classList.toggle('paint-off',!on);});
 }
 const variables=$('variable-inspector'),details=el('details','inspector-variable-details');details.append(el('summary','','Variables'),variables);$('appearance-section').after(details);
 return shape=>{header.querySelector('button').hidden=!shape;document.querySelector('.flow-caption').hidden=shape?.kind!=='frame';details.hidden=!shape;if(shape)sync.forEach(fn=>fn(shape));};
}

export function compactEffects(host,shape,change,openEffects=[]){
 const a=appearance(shape),heading=host.querySelector('h3'),labels=[...host.children].filter(n=>n.tagName==='LABEL'),preset=[...host.querySelectorAll('button')].find(b=>b.textContent==='Apply glass material'),help=[...host.children].find(n=>n.tagName==='P'),add=[...host.children].find(n=>n.tagName==='BUTTON'&&n.textContent==='Add drop shadow');
 const menu=el('details','effect-add-menu');menu.append(el('summary','inspector-icon','+'));menu.firstChild.innerHTML=icon('plus');menu.firstChild.setAttribute('aria-label','Add effect');menu.firstChild.title='Add effect';const choices=el('div','effect-choices');menu.append(choices);heading.after(menu);
 const choose=(label,action)=>{const b=el('button','',label);b.type='button';b.onclick=action;choices.append(b);};choose('Drop shadow',()=>add.click());choose('Layer blur',()=>change({...shape,appearance:{...a,layer_blur:4}}));choose('Background blur',()=>change({...shape,appearance:{...a,backdrop_blur:20}}));choices.append(preset);add.hidden=true;if(help)help.hidden=true;
 const wrap=(key,title,content,remove,toggle)=>{const d=el('details','effect-entry');d.dataset.effect=key;d.open=openEffects.includes(key);const summary=el('summary','');const symbol=el('span','effect-symbol');symbol.innerHTML=icon('effect');summary.append(symbol,el('span','effect-title',title));if(toggle)summary.append(button(toggle.label,'eye',e=>{e.preventDefault();e.stopPropagation();toggle.action();}));summary.append(button('Remove '+title.toLowerCase(),'minus',e=>{e.preventDefault();e.stopPropagation();remove();}));d.append(summary,content);return d;};
 for(const [index,key,title] of [[0,'layer_blur','Layer blur'],[1,'backdrop_blur','Background blur']]){const label=labels[index];if(!label)continue;if(a[key]>0){const d=wrap(key,title,label,()=>change({...shape,appearance:{...a,[key]:0}}));host.append(d);}else label.hidden=true;}
 for(const [index,group] of [...host.querySelectorAll('fieldset')].entries()){const shadow=a.shadows[index],title=shadow.kind==='inner'?'Inner shadow':'Drop shadow',d=wrap('shadow-'+index,title,group,()=>change({...shape,appearance:{...a,shadows:a.shadows.filter((_,i)=>i!==index)}}),{label:shadow.visible===false?'Show shadow':'Hide shadow',action:()=>change({...shape,appearance:{...a,shadows:a.shadows.map((s,i)=>i===index?{...s,visible:s.visible===false}:s)}})});host.append(d);}
}

export function compactGuides(host){
 const heading=host.querySelector('h3');if(!heading)return;
 const content=[...host.children].filter(n=>n!==heading),add=content.find(n=>n.tagName==='BUTTON'&&n.textContent==='Add layout guide');
 const details=el('details','guide-settings');details.open=host.dataset.settingsOpen==='true';details.ontoggle=()=>{host.dataset.settingsOpen=String(details.open);};details.append(el('summary','','Guide settings'));for(const n of content)if(n!==add)details.append(n);host.append(details);
 if(add){add.className='inspector-icon section-add';add.setAttribute('aria-label','Add layout guide');add.title='Add layout guide';add.innerHTML=icon('plus');}
}
