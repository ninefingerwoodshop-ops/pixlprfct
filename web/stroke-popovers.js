import {trackPopover} from './popover-position.js';
import {icon} from './icons.js';
import {hasPaint} from './paint-state.js';

export function installStrokePopovers(current){
 const $=id=>document.getElementById(id),host=$('stroke-section'),dimensions=host.querySelector('.stroke-dimensions'),advanced=$('stroke-dash').closest('details'),border=$('border-width-values'),borderLabel=border.closest('label');
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 const popover=(title,glyph)=>{
  const panel=make('div','paint-popover stroke-popover');panel.setAttribute('popover','auto');panel.setAttribute('role','dialog');panel.setAttribute('aria-label',title);
  const header=make('header','paint-popover-heading');header.append(make('strong','',title));
  const close=make('button','inspector-icon');close.type='button';close.setAttribute('aria-label','Close '+title.toLowerCase());close.innerHTML=icon('close');close.onclick=()=>panel.hidePopover();header.append(close);
  const body=make('div','stroke-popover-body');panel.append(header,body);document.body.append(panel);
  const button=make('button','inspector-icon');button.type='button';button.title=title;button.setAttribute('aria-label',title);button.setAttribute('aria-haspopup','dialog');button.innerHTML=icon(glyph);dimensions.append(button);
  const position=trackPopover(panel,()=>button);button.onclick=()=>{panel.showPopover();position();};
  return {panel,body,button};
 };
 const settings=popover('Advanced stroke settings','settings-sliders');advanced.open=true;advanced.querySelector('summary').hidden=true;settings.body.append(advanced);
 const sides=popover('Individual strokes','rectangle'),fields=make('div','stroke-side-fields');sides.body.append(fields);borderLabel.classList.add('stroke-side-legacy');
 const inputs=['Top','Right','Bottom','Left'].map((side,index)=>{
  const label=make('label','',side),input=make('input','');input.type='number';input.min='0';input.max='1000000';input.step='any';input.setAttribute('aria-label',side+' stroke weight');label.append(input);fields.append(label);
  input.onchange=()=>{if(!input.checkValidity()||!current())return;const shape=current(),values=[...(shape.border_widths??Array(4).fill(shape.stroke_width??2))];values[index]=Number(input.value);border.value=values.join(' ');border.onchange();};return input;
 });
 const weight=$('stroke-width').closest('label');weight.classList.add('stroke-weight-field');
 const weightIcon=make('span','stroke-weight-icon');weightIcon.setAttribute('aria-hidden','true');weightIcon.innerHTML='<svg class="app-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M2 3h12M2 7h12v2H2zM2 12h12v3H2z"/></svg>';weight.append(weightIcon);
 let previous;
 return shape=>{
  const present=!!shape&&hasPaint(shape,'stroke');
  for(const {panel} of [settings,sides])if(panel.matches(':popover-open')&&(shape?.id!==previous||!present))panel.hidePopover();previous=shape?.id;
  sides.button.hidden=!shape||!['rectangle','frame','image'].includes(shape.kind);
  inputs.forEach((input,i)=>{input.value=shape?.border_widths?.[i]??shape?.stroke_width??2;});
 };
}
