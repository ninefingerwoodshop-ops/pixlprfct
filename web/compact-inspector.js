import {icon} from './icons.js';
import {installPaintStacks} from './paint-stack-inspector.js';
const el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
const button=(label,glyph,action)=>{const b=el('button','inspector-icon');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(glyph);b.onclick=action;return b;};
export function installCompactInspector(current,change,paintOptions){
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
 sync.push(installPaintStacks(current,change,paintOptions));
 const variables=$('variable-inspector'),details=el('details','inspector-variable-details');details.append(el('summary','','Variables'),variables);$('appearance-section').after(details);
 return shape=>{header.querySelector('button').hidden=!shape;document.querySelector('.flow-caption').hidden=shape?.kind!=='frame';details.hidden=!shape;if(shape)sync.forEach(fn=>fn(shape));};
}
