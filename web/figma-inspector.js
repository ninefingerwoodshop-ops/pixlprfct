import {textStyle} from './typography.js';
import {icon} from './icons.js';
import {showContextMenu} from './context-menu.js';
import {trackPopover} from './popover-position.js';

// Reuse the existing controls and their handlers. The standard inspector follows
// the measured Figma chrome; product-specific settings remain available below it.
export function installFigmaInspector({current,change}){
 const $=id=>document.getElementById(id),make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const button=(title,glyph,click)=>{const b=make('button','inspector-icon');b.type='button';b.title=title;b.setAttribute('aria-label',title);b.innerHTML=icon(glyph);b.onclick=click;return b;};
 const panel=document.querySelector('.right-panel');panel.classList.add('figma-inspector');
 const position=$('x').closest('section'),dimensions=$('dimensions-section'),appearance=$('appearance-section'),text=$('text-section');
 for(const section of [position,dimensions,appearance,text,$('grid-layout-section'),$('shadow-section'),$('layout-guides-panel'),$('prototype-panel')])section.classList.add('figma-core-section');
 position.id='position-section';
 const rotation=$('rotation').closest('label'),transforms=position.querySelector('.rectangle-transforms'),tools=transforms.querySelector('.rectangle-transform-tools');
 const rotationRow=make('div','rotation-row');rotation.firstChild.textContent='';rotation.classList.add('inline-number');
 const rotationMark=make('span','field-prefix');rotationMark.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M3 3v10h10M3 8a5 5 0 0 1 5 5"/></svg>';rotation.prepend(rotationMark);
 rotationRow.append(rotation,tools);transforms.replaceChildren(make('div','inspector-field-caption','Rotation'),rotationRow);
 const header=document.querySelector('.inspector-selection'),caption=$('selection-caption');
 const placeCaption=mode=>{caption.hidden=mode==='prototype'||mode==='motion';caption.classList.toggle('development-caption',mode!=='design');if(mode==='design')header.prepend(caption);else panel.querySelector('.inspector-tabs').after(caption);};placeCaption('design');window.addEventListener('inspector-mode-change',e=>placeCaption(e.detail));
 const zoom=panel.querySelector('.zoom-control');panel.querySelector('.inspector-tabs').append(zoom);
 const zoomMenu=button('Zoom and view options','chevron-down',event=>{const r=zoomMenu.getBoundingClientRect();showContextMenu({preventDefault:()=>event.preventDefault(),clientX:r.right,clientY:r.bottom},[['zoom-in','Zoom in'],['zoom-out','Zoom out'],['zoom-fit','Fit document']].map(([id,label])=>({label,run:()=>$(id).click()})),zoomMenu,{label:'Zoom and view options'});});zoomMenu.classList.add('zoom-menu');zoom.append(zoomMenu);
 const more=button('More layer actions','more-horizontal',event=>{
  const rect=more.getBoundingClientRect();showContextMenu({preventDefault:()=>event.preventDefault(),clientX:rect.right,clientY:rect.bottom},[
   ...[['duplicate','Duplicate'],['create-component','Create component'],['toggle-lock','Lock / unlock'],['delete','Delete']].map(([id,label])=>({label,enabled:!$(id).disabled,run:()=>$(id).click()})),
   {label:'More layer settings…',run:()=>{const details=$('inspector-layer-actions');const toggle=details.querySelector(':scope > summary button');if(!details.open)toggle?.click();details.scrollIntoView({block:'start'});}}
  ],more,{label:'Layer actions'});
 });header.append(more);
 // Keep the shared prototype action accessible without an extra header row.
 const prototype=$('prototype-connections');$('prototype-inspector').prepend(prototype);
 const flex=$('flex-layout-section'),flow=flex.querySelector('.layout-flow'),flowCaption=flex.querySelector('.flow-caption'),auto=$('auto-layout-panel'),grid=$('grid-layout-section');
 dimensions.querySelector('h3').after(flowCaption,flow);dimensions.append(auto);flex.classList.add('layout-legacy');
 // Grid and Flexbox share the Layout disclosure; neither owns a second heading.
 grid.querySelector('h3').hidden=true;grid.querySelector('.grid-layout-heading').hidden=true;
 grid.prepend(make('div','inspector-field-caption','CSS Grid'));
 dimensions.append(grid);
 for(const control of flow.querySelectorAll('[data-flow=none],[data-flow=grid]'))control.hidden=true;
 flowCaption.textContent='Flexbox';
 const sizeCaption=dimensions.querySelector('.dimension-caption'),textSizing=dimensions.querySelector('.text-sizing-tools'),textSizingCaption=make('div','inspector-field-caption','Resizing');sizeCaption.before(textSizingCaption,textSizing);
 const frame=$('frame-section');frame.classList.add('figma-core-section');frame.querySelector('h3').hidden=true;frame.querySelector('p').hidden=true;
 dimensions.append(frame);
 const layoutSettings=$('layout-settings'),padding=layoutSettings.querySelector('.layout-padding-pair'),individual=layoutSettings.querySelector('.layout-individual-padding');
 const padCaption=make('div','inspector-field-caption','Padding');padding.before(padCaption);
 const advanced=layoutSettings.querySelector('.layout-advanced');advanced.append(layoutSettings.querySelector('.layout-variable-picker'),layoutSettings.querySelector('.layout-gap-variables'));
 const wrap=$('layout-wrap').closest('label');wrap.classList.add('layout-legacy');
 const wrapButton=button('Wrap','text-wrap',()=>$('layout-wrap').click());wrapButton.classList.add('layout-wrap-action');flow.after(wrapButton);
 const individualButton=button('Individual padding','padding-horizontal',()=>{const toggle=individual.querySelector(':scope > summary button');if(toggle)toggle.click();else individual.open=!individual.open;});individualButton.classList.add('individual-padding-action');padding.append(individualButton);individual.classList.add('individual-padding-fields');individual.addEventListener('toggle',()=>individualButton.setAttribute('aria-pressed',String(individual.open)));
 const arrangement=layoutSettings.querySelector('.layout-arrangement'),alignment=arrangement.querySelector('.layout-alignment');alignment.before(make('div','inspector-field-caption alignment-caption','Alignment'));
 const gap=$('layout-gap').closest('label');gap.classList.add('figma-gap');
 const advancedButton=button('Auto layout settings','settings-sliders',()=>{const toggle=advanced.querySelector(':scope > summary button');if(toggle)toggle.click();else advanced.open=!advanced.open;});advancedButton.classList.add('layout-advanced-action');arrangement.append(advancedButton);
 const chooseLayout=button('Choose layout type','plus',event=>{
  const s=current();if(s?.kind!=='frame')return;
  const setLayout=value=>{const direction=$('layout-direction');if(direction.value!==value){direction.value=value;direction.onchange();}};
  const rect=chooseLayout.getBoundingClientRect();chooseLayout.setAttribute('aria-expanded','true');
  showContextMenu({preventDefault:()=>event.preventDefault(),clientX:rect.right,clientY:rect.bottom},[
   {label:'Flexbox',run:()=>setLayout(s.auto_layout?.direction==='horizontal'?'horizontal':'vertical')},
   {label:'CSS Grid',run:()=>setLayout('grid')},
   ...(s.auto_layout?[{separator:true},{label:'Remove layout',run:()=>setLayout('none')}]:[]),
  ],chooseLayout,{label:'Layout type',anchor:chooseLayout,onClose:()=>chooseLayout.setAttribute('aria-expanded','false')});
 });chooseLayout.id='choose-layout-type';chooseLayout.classList.add('section-add');chooseLayout.setAttribute('aria-haspopup','menu');chooseLayout.setAttribute('aria-expanded','false');dimensions.append(chooseLayout);
 $('add-auto-layout').setAttribute('aria-label','Add auto layout');$('add-auto-layout').title='Add auto layout (Shift A)';
 // Frame-specific extensions do not displace standard Figma fields.
 const extensions=make('details','inspector-details inspector-extensions');extensions.id='inspector-extensions';extensions.append(make('summary','','Additional tools'));
 for(const id of ['device-chrome-section','layout-child-panel'])extensions.append($(id));extensions.querySelector('summary').after(dimensions.querySelector('.layout-margin'));
 const modes=make('div','variable-mode-popover'),modesSummary=make('button','inspector-icon');modesSummary.type='button';modesSummary.setAttribute('aria-label','Apply variable mode');modesSummary.setAttribute('aria-haspopup','dialog');modesSummary.innerHTML=icon('variables');const modesBody=make('div','variable-mode-popover-body');$('variable-modes-section').classList.add('figma-core-section');modesBody.append($('variable-modes-section'));modes.append(modesSummary,modesBody);appearance.append(modes);
 const canvasTools=panel.querySelector('.canvas-tool-inspector');if(canvasTools)extensions.append(canvasTools);$('design-inspector').append(extensions);
 const corners=$('independent-corners').closest('label');corners.classList.add('corner-toggle');
 // Native top-layer popovers escape drawer clipping, dismiss on Escape/outside
 // click, and remain in the viewport while scrolling or resizing the drawer.
 modesBody.setAttribute('popover','auto');modesBody.setAttribute('role','dialog');modesBody.setAttribute('aria-label','Apply variable mode');modesBody.id='variable-mode-menu';modes.after(modesBody);modesSummary.setAttribute('aria-controls',modesBody.id);modesSummary.setAttribute('aria-expanded','false');
 const positionModes=trackPopover(modesBody,()=>modesSummary,{placement:'left',width:224});
 modesSummary.onclick=e=>{e.preventDefault();if(modesBody.matches(':popover-open'))modesBody.hidePopover();else{modesBody.showPopover();positionModes();}};
 modesBody.addEventListener('toggle',()=>modesSummary.setAttribute('aria-expanded',String(modesBody.matches(':popover-open'))));
 $('opacity').setAttribute('aria-label','Opacity');$('corner-radius').setAttribute('aria-label','Corner radius');
 // Typography uses the same order as the reference. Extra text editing controls
// are still available, but don't dominate the common formatting controls.
 text.querySelector('.type-label').hidden=true;
 const fontGrid=$('font-size').closest('.type-grid');fontGrid.prepend($('font-weight').closest('label'));fontGrid.classList.add('font-style-row');
 $('font-size').setAttribute('aria-label','Font size');$('font-weight').setAttribute('aria-label','Font style');$('font-family').setAttribute('aria-label','Font family');
 const lineLabel=$('line-height').closest('label');lineLabel.firstChild.textContent='Line height';$('line-height').setAttribute('aria-label','Line height (%)');$('line-height').min=50;$('line-height').max=400;$('line-height').step=10;$('line-height').onchange=()=>{const s=current();if(s)change({...s,typography:{...textStyle(s),line_height:Number($('line-height').value)/100}});};
 const textMore=make('details','inspector-details typography-details');textMore.append(make('summary','','Text settings'));
 for(const node of [text.querySelector('.wrap-label'),text.querySelector('label[for=text]'),$('text'),$('fit-text'),text.querySelector('.type-help')])textMore.append(node);
 extensions.append(textMore);text.querySelector('.text-align-tools').before(make('div','inspector-field-caption text-alignment-caption','Alignment'));
 return shape=>{
  header.hidden=!shape;
  const frameShape=shape?.kind==='frame',enabled=frameShape&&!!shape.auto_layout;
  textSizingCaption.hidden=textMore.hidden=shape?.kind!=='text';
  dimensions.querySelector('h3').textContent='Layout';
  flex.hidden=true;flow.hidden=flowCaption.hidden=!enabled||shape.auto_layout.direction==='grid';wrapButton.hidden=!enabled||shape.auto_layout.direction==='grid';wrapButton.setAttribute('aria-pressed',String(!!shape?.auto_layout?.wrap));
  chooseLayout.hidden=!frameShape;chooseLayout.title=enabled?`Layout type: ${shape.auto_layout.direction==='grid'?'CSS Grid':'Flexbox'}`:'Add layout';
  $('add-auto-layout').hidden=!shape||frameShape||enabled;
  grid.hidden=!enabled||shape.auto_layout.direction!=='grid';
  individualButton.setAttribute('aria-pressed',String(individual.open));
  extensions.hidden=!shape;more.hidden=!shape;
  for(const [id,owner] of [['edit-layout-spacing',extensions],['edit-layout-css',dimensions]]){const node=$(id);if(node&&node.parentElement!==owner)owner.append(node);}
  const gridEnable=$('grid-layout-section').querySelector('.inspector-feature-check');if(gridEnable)gridEnable.hidden=true;
  if(shape?.kind==='text')$('line-height').value=Math.round(textStyle(shape).line_height*100);
  const crossGap=panel.querySelector('.inspector-cross-gap');if(crossGap&&crossGap.parentElement!==advanced)advanced.append(crossGap);
  const radiusAvailable=['rectangle','frame','image'].includes(shape?.kind);$('radius-row').hidden=false;$('corner-radius').disabled=!radiusAvailable||!!shape?.appearance?.corner_radii;corners.hidden=!radiusAvailable;
  position.querySelector('.align-tools').setAttribute('aria-label','Align to parent frame');
  sizeCaption.textContent=enabled||shape?.kind==='text'?'Resizing':'Dimensions';
 };
}
