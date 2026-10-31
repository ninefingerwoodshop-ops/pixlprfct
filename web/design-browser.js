import {designStarters,newDesign} from './local-drafts.js';
import {icon} from './icons.js';

// The creation dialog belongs to the project home, never to an open editor.
export function installDesignCreator({create,saveLocation=()=>'Saved in your projects on this device'}){
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 const creator=el('dialog','new-design-dialog');creator.setAttribute('aria-labelledby','new-design-title');
 const button=(text,action,className)=>{const node=el('button',className,text);node.type='button';node.onclick=action;return node;};
 const form=el('form'),header=el('header','design-dialog-header'),titles=el('div'),title=el('h2',null,'New design');title.id='new-design-title';
 const close=button('',()=>creator.close(),'design-close dialog-icon');close.innerHTML=icon('close');close.setAttribute('aria-label','Close new design');close.title='Close';
 titles.append(title,el('p',null,'Give your idea a name and a starting point.'));header.append(titles,close);
 const body=el('div','new-design-body'),label=el('label',null,'Design name'),name=el('input');name.name='name';name.maxLength=256;name.placeholder='Untitled design';label.append(name);
 const types=el('fieldset','design-types');types.append(el('legend',null,'Design type'));
 for(const [value,title,description] of [['design','Design','Layouts, interfaces, and prototypes'],['svg-animation','SVG Animation','Animate vector artwork and export SVG']]){const option=el('label','design-type'),radio=el('input');radio.type='radio';radio.name='design-type';radio.value=value;radio.defaultChecked=value==='design';option.append(radio,el('strong',null,title),el('small',null,description));types.append(option);}
 const fieldset=el('fieldset','design-starters');fieldset.append(el('legend',null,'Start with'));
 for(const preset of designStarters){const option=el('label','design-starter'),radio=el('input');radio.type='radio';radio.name='starter';radio.value=preset.id;radio.defaultChecked=preset.id==='blank';
  const drawing=el('span','starter-drawing starter-'+preset.id);drawing.setAttribute('aria-hidden','true');drawing.append(el('span'));
  option.append(radio,drawing,el('strong',null,preset.name),el('small',null,preset.description));fieldset.append(option);
 }
 const animationNote=el('p','design-animation-note','A 512 × 512 SVG canvas with its own elements, property tracks, and animation timeline. Import your artwork after creating the project.');animationNote.hidden=true;
 types.onchange=()=>{const animated=new FormData(form).get('design-type')==='svg-animation';fieldset.hidden=animated;animationNote.hidden=!animated;name.placeholder=animated?'Untitled animation':'Untitled design';};
 const error=el('p','design-error');error.setAttribute('role','alert');error.hidden=true;body.append(label,types,fieldset,animationNote,error);
 const footer=el('footer'),note=el('span',null,'Saved in your projects on this device'),actions=el('div','drafts-actions'),submit=el('button','primary','Create design');submit.type='submit';
 actions.append(button('Cancel',()=>creator.close()),submit);footer.append(note,actions);form.append(header,body,footer);creator.append(form);document.body.append(creator);
 let busy=false;
 creator.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;error.hidden=true;creator.setAttribute('aria-busy','true');creator.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const values=new FormData(form);await create(newDesign(name.value,values.get('starter'),values.get('design-type')));creator.close();}
  catch(problem){error.textContent=problem.message??String(problem);error.hidden=false;}
  finally{busy=false;creator.removeAttribute('aria-busy');creator.querySelectorAll('button').forEach(b=>b.disabled=false);}
 };
 return {destroy:()=>creator.remove(),showNew(){note.textContent=saveLocation();form.reset();types.onchange();error.hidden=true;creator.showModal();name.focus();}};
}
