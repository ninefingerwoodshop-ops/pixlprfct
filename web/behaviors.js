import {mountMasonry} from './masonry.js';
import {mountPasswords,passwordAssessment} from './password-control.js';
import {mountNumbers,formatNumber} from './number-control.js';
import {mountFiles,fileRejection,fileSelection} from './file-control.js';
import {mountTextareas} from './textarea-control.js';
import {mountCalendars,calendarDays} from './calendar-control.js';
import {mountDropdowns} from './dropdown-control.js';
// Portable JavaScript behaviors shared by preview and all web exports.
export const snippets = [
 {id:'fade',name:'Fade in',category:'Animation',trigger:'load',code:`api.animate([{opacity: 0}, {opacity: 1}]);`},
 {id:'slide',name:'Slide in',category:'Animation',trigger:'load',code:`api.animate([{opacity: 0, translate: '0 ' + api.distance + 'px'}, {opacity: 1, translate: '0 0'}]);`},
 {id:'stagger',name:'Stagger children',category:'Animation',trigger:'load',code:`api.children().forEach((child, i) => {\n  api.animate([{opacity: 0, translate: '0 16px'}, {opacity: 1, translate: '0 0'}], {delay: i * 80}, child);\n});`},
 {id:'hover',name:'Hover lift',category:'Pointer',trigger:'load',code:`api.on(element, 'pointerenter', () => api.animate([{translate: '0 0'}, {translate: '0 -' + api.distance + 'px'}]));\napi.on(element, 'pointerleave', () => api.animate([{translate: '0 -' + api.distance + 'px'}, {translate: '0 0'}]));`},
 {id:'pulse',name:'Pulse',category:'Animation',trigger:'click',code:`api.animate([{scale: '1'}, {scale: '1.08'}, {scale: '1'}]);`},
 {id:'reveal',name:'Reveal on scroll',category:'Scrolling',trigger:'view',code:`api.animate([{opacity: 0, translate: '0 24px'}, {opacity: 1, translate: '0 0'}]);`},
 {id:'toggle',name:'Toggle children',category:'Interaction',trigger:'click',code:`// Click this item to show or hide its children.\napi.children().forEach(child => api.style(child, {visibility: child.style.visibility === 'hidden' ? 'visible' : 'hidden'}));`},
 {id:'accordion',name:'Accordion',category:'Interaction',trigger:'load',code:`// First child is the heading; remaining children are the content.\nconst [heading, ...content] = api.children();\nlet open = true;\nif (heading) api.on(heading, 'click', () => {\n  open = !open;\n  content.forEach(child => api.style(child, {display: open ? '' : 'none'}));\n});`},
 {id:'tabs',name:'Tabs',category:'Interaction',trigger:'load',code:`// Two child frames: tab buttons first, panels second.\nconst [buttons, panels] = api.children();\nif (buttons && panels) {\n  const tabs = api.children(buttons), views = api.children(panels);\n  const activate = index => views.forEach((view, i) => api.style(view, {display: i === index ? '' : 'none'}));\n  tabs.forEach((tab, i) => api.on(tab, 'click', () => activate(i)));\n  activate(0);\n}`},
 {id:'modal',name:'Modal',category:'Interaction',trigger:'load',code:`// First child opens the second child (the modal). Click modal to close.\nconst [button, modal] = api.children();\nif (button && modal) {\n  api.style(modal, {display: 'none'});\n  api.on(button, 'click', () => api.style(modal, {display: ''}));\n  api.on(modal, 'click', () => api.style(modal, {display: 'none'}));\n}`},
 {id:'custom',name:'Custom JavaScript',category:'Custom',trigger:'load',code:`// element is this layer's DOM element.\n// api.on, api.animate, api.style and api.cleanup are cleaned up on unmount.\napi.on(element, 'click', () => {\n  api.animate([{opacity: 0.5}, {opacity: 1}]);\n});`},
];
export function createBehavior(snippet) {
 return {id:crypto.randomUUID(),name:snippet.name,code:snippet.code,trigger:snippet.trigger,enabled:true,duration:400,distance:16};
}
export function validateBehavior(code) {
 try { new Function('element','api',code); return ''; } catch(error) { return error.message; }
}
// Self-contained: serialized into the isolated preview and exported runtime.
export function mountBehaviors(root, entries, report = console.error) {
 const masonryCleanup=mountMasonry(root);
 const cleanups=[mountDropdowns(root),mountCalendars(root),mountTextareas(root),mountFiles(root),mountNumbers(root),mountPasswords(root)];
 for(const field of root.querySelectorAll?.('input[data-indeterminate]')??[]){
  field.indeterminate=true;
  const change=()=>{field.removeAttribute('data-indeterminate');field.removeAttribute('aria-checked');};
  field.addEventListener('change',change);cleanups.push(()=>field.removeEventListener('change',change));
 }

 // Native constraint validation shared by HTML, React, Vue, Angular, and preview.
 for(const field of root.querySelectorAll?.('.px-control[data-validate],.px-dropdown-native[data-validate]')??[]){
  const trigger=field.getAttribute('data-validate');if(trigger==='none')continue;
  const error=field.parentElement.querySelector('.px-control-error');if(!error)continue;
  let disposed=false,touched=field.getAttribute('aria-invalid')==='true';
  const initial={invalid:field.getAttribute('aria-invalid'),described:field.getAttribute('aria-describedby'),text:error.textContent,hidden:error.hidden};
  const show=()=>{
   const valid=!field.willValidate||field.validity.valid;
   field.setAttribute('aria-invalid',String(!valid));const trigger=field.parentElement.querySelector('.px-dropdown-trigger');trigger?.setAttribute('aria-invalid',String(!valid));error.hidden=valid;
   error.textContent=valid?'':field.getAttribute('data-error-message')||field.validationMessage||'Please check this value.';
   const ids=new Set((field.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));
   if(valid)ids.delete(error.id);else ids.add(error.id);
   if(ids.size)field.setAttribute('aria-describedby',[...ids].join(' '));else field.removeAttribute('aria-describedby');
   if(trigger){if(ids.size)trigger.setAttribute('aria-describedby',[...ids].join(' '));else trigger.removeAttribute('aria-describedby');}
   return valid;
  };
  const input=()=>{if(trigger==='input'||touched){touched=true;show();}};
  const blur=()=>{if(trigger==='blur'||trigger==='input'){touched=true;show();}};
  const invalid=event=>{event.preventDefault();touched=true;show();if(!field.form||field.form.querySelector('.px-control:invalid')===field)(field.parentElement.querySelector('.px-dropdown-trigger')||field).focus();};
  const submit=event=>{touched=true;if(!show()){event.preventDefault();(field.parentElement.querySelector('.px-dropdown-trigger')||field).focus();}};
  const reset=()=>queueMicrotask(()=>{if(disposed)return;touched=false;field.setAttribute('aria-invalid','false');error.hidden=true;error.textContent='';const ids=(initial.described||'').split(/\s+/).filter(id=>id&&id!==error.id);if(ids.length)field.setAttribute('aria-describedby',ids.join(' '));else field.removeAttribute('aria-describedby');});
  for(const [name,handler] of [['input',input],['change',input],['blur',blur],['invalid',invalid]]){field.addEventListener(name,handler);cleanups.push(()=>field.removeEventListener(name,handler));}
  if(field.form){const form=field.form;form.addEventListener('submit',submit);form.addEventListener('reset',reset);cleanups.push(()=>{form.removeEventListener('submit',submit);form.removeEventListener('reset',reset);});}
  cleanups.push(()=>{disposed=true;if(initial.invalid===null)field.removeAttribute('aria-invalid');else field.setAttribute('aria-invalid',initial.invalid);if(initial.described===null)field.removeAttribute('aria-describedby');else field.setAttribute('aria-describedby',initial.described);error.textContent=initial.text;error.hidden=initial.hidden;});
 }
 for(const button of root.querySelectorAll?.('.px-control[data-toggle="true"]')??[]){
  const toggle=()=>{if(!button.disabled)button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));};
  button.addEventListener('click',toggle);cleanups.push(()=>button.removeEventListener('click',toggle));
 }
 for(const entry of entries){
  const element=root.querySelector(`[data-px-id="${entry.layer}"]`);
  if(!element||!entry.enabled)continue;
  const own=[],styles=new Map();
  const runSafe=fn=>(...args)=>{try{return fn(...args);}catch(e){report(entry.name+': '+e.message);}};
  const api={
   duration:Math.max(0,Math.min(60000,Number(entry.duration)||0)),distance:Number(entry.distance)||0,
   children:(el=element)=>Array.from(el.children).filter(child=>child.hasAttribute('data-px-id')),
   find:selector=>element.querySelector(selector),
   cleanup:fn=>{if(typeof fn==='function')own.push(fn);},
   on:(el,event,fn)=>{if(!el)return;const handler=runSafe(fn);el.addEventListener(event,handler);own.push(()=>el.removeEventListener(event,handler));},
   style:(el,values)=>{if(!styles.has(el))styles.set(el,el.getAttribute('style'));Object.assign(el.style,values);},
   animate:(frames,options={},el=element)=>{
    const animation=el.animate(frames,{duration:api.duration,easing:'ease-out',fill:'both',...options,...(matchMedia('(prefers-reduced-motion: reduce)').matches?{duration:0,delay:0,iterations:1}:{})});
    own.push(()=>animation.cancel());return animation;
   }
  };
  const run=runSafe(()=>{const cleanup=entry.run(element,api);if(typeof cleanup==='function')own.push(cleanup);});
  if(entry.trigger==='click')api.on(element,'click',run);
  else if(entry.trigger==='hover')api.on(element,'pointerenter',run);
  else if(entry.trigger==='view'){
   const observer=new IntersectionObserver(list=>{if(list.some(e=>e.isIntersecting)){observer.disconnect();run();}});observer.observe(element);own.push(()=>observer.disconnect());
  }else run();
  cleanups.push(()=>{for(const cleanup of own.reverse())runSafe(cleanup)();for(const [el,style] of styles){if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);}});
 }
 return ()=>{masonryCleanup();for(const cleanup of cleanups.reverse())cleanup();};
}
export function behaviorSource(shapes,{module=true}={}) {
 const entries=[];
 for(const shape of shapes)for(const b of shape.behaviors??[]){
  if(!b.enabled)continue;
  const error=validateBehavior(b.code);if(error)throw new Error(`${shape.name} / ${b.name}: ${error}`);
  entries.push(`{...${JSON.stringify({...b,code:undefined,layer:shape.id})},run:function(element,api){\n${b.code}\n}}`);
 }
 return `${mountMasonry.toString()}\n${passwordAssessment.toString()}\n${mountPasswords.toString()}\n${formatNumber.toString()}\n${mountNumbers.toString()}\n${fileRejection.toString()}\n${fileSelection.toString()}\n${mountFiles.toString()}\n${mountTextareas.toString()}\n${calendarDays.toString()}\n${mountCalendars.toString()}\n${mountDropdowns.toString()}\n${module?'export ':''}${mountBehaviors.toString()}\n${module?'export ':''}const behaviors=[${entries.join(',\n')}];\n`;
}
