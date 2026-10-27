import {layoutClass,validateLayoutClass,renameLayoutSelector} from './layout-class.js';
import {workspaceWindow} from './workspace-window.js';
import {formatLayoutCss,parseLayoutCss} from './layout-css.js';
export function createLayoutCssEditor({current,preview,apply,shapes=()=>[]}){
 const content=document.createElement('div');content.className='layout-css-editor';
 const description=document.createElement('p');
 const classLabel=document.createElement('label');classLabel.textContent='CSS class';const classInput=document.createElement('input');classInput.type='text';classInput.spellcheck=false;classInput.setAttribute('aria-label','CSS class');classLabel.append(classInput);
 let activeClass; 
 const help=document.createElement('p');help.textContent='Edit the generated class using Grid, Flex, gap and padding. Media queries support min-width and max-width in px. Canvas breakpoints use the outer frame width; exports use the browser viewport. Unsupported CSS shows an error.';
 const input=document.createElement('textarea');input.className='layout-css-source';input.spellcheck=false;input.setAttribute('aria-label','Layout CSS');input.setAttribute('aria-describedby','layout-css-status');
 const status=document.createElement('p');status.id='layout-css-status';status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='dialog-actions';
 const button=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=fn;actions.append(b);return b;};
 let original,draft,timer,dirty=false;
 const check=()=>{clearTimeout(timer);if(!win.dialog.open)return false;try{const name=validateLayoutClass(classInput.value.trim(),original,shapes());if(name!==activeClass){input.value=renameLayoutSelector(input.value,activeClass,name);activeClass=name;}draft=parseLayoutCss(input.value,{...original,layout_class:name,layout_class_generated:name===layoutClass(original)?original.layout_class_generated:false});preview(draft);status.textContent='Live preview · not saved until Apply';input.removeAttribute('aria-invalid');save.disabled=false;return true;}catch(error){draft=null;status.textContent=error.message;input.setAttribute('aria-invalid','true');save.disabled=true;return false;}};
 const format=()=>{if(check()){input.value=formatLayoutCss(draft);dirty=false;}};
 button('Format CSS',format);
 button('Add breakpoint',()=>{input.value+=`\n\n@media (max-width: 768px) {\n  .${activeClass} {\n    gap: 12px;\n  }\n}`;dirty=true;check();input.focus();});
 button('Cancel',()=>win.close());const save=button('Apply',()=>{if(!check())return;const next=draft;win.close();apply(next);});save.className='primary';
 content.append(description,classLabel,help,input,status,actions);
 classInput.addEventListener('input',()=>{dirty=true;check();});
 const win=workspaceWindow('Layout CSS',content,{width:640,height:650,page:false});win.dialog.classList.add('layout-css-window');
 input.addEventListener('input',()=>{dirty=true;clearTimeout(timer);timer=setTimeout(check,150);});
 input.addEventListener('blur',()=>{if(dirty)format();});
 input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();win.close();}if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();save.click();}});
 win.dialog.addEventListener('close',()=>{clearTimeout(timer);preview(null);draft=null;dirty=false;});
 return {isOpen:()=>win.dialog.open,open(){const shape=current();if(!shape?.auto_layout||shape.component?.type==='instance')return;original=structuredClone(shape);activeClass=layoutClass(original);classInput.value=activeClass;draft=original;dirty=false;description.textContent=`${shape.name} · ${shape.component?.type==='master'?'Main component':'Layout frame'}`;input.value=formatLayoutCss(original);status.textContent='Changes preview live. Apply updates visual layout controls. Format on blur · Cmd/Ctrl Enter to apply.';save.disabled=false;input.removeAttribute('aria-invalid');win.open();input.focus();}};
}
