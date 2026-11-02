import {editorDOM} from './editor-dom.js';
import {rotateQuarterTurn} from './rotation.js';
import {appearance} from './appearance.js';
import {transformRectangle,rectangleToVector} from './rectangle-actions.js';

export function installRectangleInspector({current,change}){
 const $=id=>editorDOM.getElementById(id),make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const button=(label,path,action)=>{const b=make('button','inspector-icon');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=`<svg class="app-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">${path}</svg>`;b.onclick=action;return b;};
 const position=$('x').closest('section'),transforms=make('div','rectangle-transforms');transforms.append(make('div','inspector-field-caption','Rotation and flip'));const tools=make('div','rectangle-transform-tools');transforms.append(tools);position.append(transforms);
 for(const [action,label,path] of [['rotate','Rotate 90° right','<path d="M3 6a5 5 0 1 1 0 5M3 2v4h4"/>'],['horizontal','Flip horizontal','<path d="M8 1v14M5 4 1 8l4 4ZM11 4l4 4-4 4Z"/>'],['vertical','Flip vertical','<path d="M1 8h14M4 5l4-4 4 4ZM4 11l4 4 4-4Z"/>']])tools.append(button(label,path,()=>{const s=current();if(s)change(action==='rotate'?rotateQuarterTurn(s):transformRectangle(s,action));}));
 const edit=button('Edit object','<path d="M3 3h10v10H3Z"/><path d="M1 1h4v4H1ZM11 1h4v4h-4ZM1 11h4v4H1ZM11 11h4v4h-4Z" fill="white"/>',()=>{const s=current();if(!s)return;change(rectangleToVector(s));$('edit-path').click();});editorDOM.querySelector('.inspector-selection').append(edit);
 const dimensions=$('dimensions-section').querySelector('.property-grid');dimensions.classList.add('dimensions-with-lock');dimensions.append($('aspect-ratio-lock'));
 const blend=$('appearance-section').querySelector('.blend-mode-select'),menu=make('div','blend-popover');blend.dataset.triggerIcon='blend-mode';blend.dataset.menuWidth='144';blend.dataset.menuHeight='560';menu.append(blend);$('appearance-section').append(menu);
 const opacity=$('opacity').closest('label');opacity.firstChild.textContent='Opacity';
 const variables=editorDOM.querySelector('.inspector-variable-details');$('inspector-layer-actions').append(variables);
 return shape=>{const rectangle=shape?.kind==='rectangle';transforms.hidden=!shape;for(const b of tools.children){b.disabled=!rectangle&&b!==tools.firstElementChild;if(b.disabled)b.title=b.getAttribute('aria-label')+' (rectangle geometry only)';else b.title=b.getAttribute('aria-label');}edit.hidden=!rectangle;menu.title='Blend mode: '+(appearance(shape??{}).blend_mode??'pass-through');};
}
