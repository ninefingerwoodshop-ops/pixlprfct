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
 const fieldset=el('fieldset','design-starters');fieldset.append(el('legend',null,'Start with'));
 for(const preset of designStarters){const option=el('label','design-starter'),radio=el('input');radio.type='radio';radio.name='starter';radio.value=preset.id;radio.defaultChecked=preset.id==='blank';
  const drawing=el('span','starter-drawing starter-'+preset.id);drawing.setAttribute('aria-hidden','true');drawing.append(el('span'));
  option.append(radio,drawing,el('strong',null,preset.name),el('small',null,preset.description));fieldset.append(option);
 }
 const error=el('p','design-error');error.setAttribute('role','alert');error.hidden=true;body.append(label,fieldset,error);
 const footer=el('footer'),note=el('span',null,'Saved in your projects on this device'),actions=el('div','drafts-actions'),submit=el('button','primary','Create design');submit.type='submit';
 actions.append(button('Cancel',()=>creator.close()),submit);footer.append(note,actions);form.append(header,body,footer);creator.append(form);document.body.append(creator);
 let busy=false;
 creator.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;error.hidden=true;creator.setAttribute('aria-busy','true');creator.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await create(newDesign(name.value,new FormData(form).get('starter')));creator.close();}
  catch(problem){error.textContent=problem.message??String(problem);error.hidden=false;}
  finally{busy=false;creator.removeAttribute('aria-busy');creator.querySelectorAll('button').forEach(b=>b.disabled=false);}
 };
 return {destroy:()=>creator.remove(),showNew(){note.textContent=saveLocation();form.reset();error.hidden=true;creator.showModal();name.focus();}};
}
