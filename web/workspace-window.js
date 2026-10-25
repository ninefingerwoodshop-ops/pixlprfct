import {floatingWindow} from './floating-window.js';
import {icon} from './icons.js';

export function workspaceWindow(title,content,defaults={}){
 const dialog=document.createElement('dialog');dialog.className='variables-workspace workspace-window';dialog.setAttribute('aria-label',title);
 const header=document.createElement('header');header.className='variable-window-header';
 const heading=document.createElement('div');heading.className='variable-window-heading';const label=document.createElement('h2');label.textContent=title;heading.append(label);
 const spacer=document.createElement('span');spacer.className='variable-header-spacer';
 const button=(name,glyph)=>{const b=document.createElement('button');b.type='button';b.className='variable-icon-button';b.setAttribute('aria-label',name);b.title=name;b.innerHTML=icon(glyph);return b;};
 const toggle=button('Minimize','window-restore'),close=button('Close '+title.toLowerCase(),'close');close.onclick=()=>dialog.close();header.append(heading,spacer,toggle,close);
 const body=document.createElement('div');body.className='workspace-window-body';body.append(content);dialog.append(header,body);document.body.append(dialog);
 dialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();dialog.close();}});
 let opener;
 dialog.addEventListener('close',()=>{dialog.querySelectorAll('.window-resize').forEach(el=>el.remove());opener?.focus?.();});
 return {dialog,open(){if(dialog.open){header.focus();return;}opener=document.activeElement;floatingWindow(dialog,header,toggle,title,defaults);dialog.show();header.focus();},close(){dialog.close();}};
}
