import {choose} from './inspector-settings.js';
import {icon} from './icons.js';
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
export function chooseSvgImport(name,dropdowns){
 return new Promise(resolve=>{
  const dialog=el('dialog','svg-import-dialog'),header=el('header'),title=el('h2','','Import SVG'),close=el('button'),body=el('div','svg-import-body'),file=el('p','svg-import-filename',name),hint=el('p'),actions=el('footer','svg-dialog-actions'),cancel=el('button','','Cancel'),confirm=el('button','primary','Add to canvas');
  dialog.setAttribute('aria-label','Import SVG');dialog.id='svg-import-dialog';close.setAttribute('aria-label','Close import');close.innerHTML=icon('close');
  let mode='add',settled=false;const select=choose('Import behavior',[['add','Add to canvas'],['replace','Replace artwork']],mode,value=>{mode=value;update();});
  function update(){hint.textContent=mode==='add'?'Keep the current artwork and animation. Add this SVG as a group at the center of the canvas.':'Replace all artwork and remove its animation tracks. Use the imported SVG’s canvas size. You can undo this change.';confirm.textContent=mode==='add'?'Add to canvas':'Replace artwork';}
  function finish(result=null){if(settled)return;settled=true;dialog.close();dialog.remove();dropdowns();document.getElementById('svg-import')?.focus({preventScroll:true});resolve(result);}
  for(const button of [close,cancel,confirm])button.type='button';close.onclick=cancel.onclick=()=>finish();confirm.onclick=()=>finish(mode);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});dialog.addEventListener('close',()=>finish(),{once:true});
  header.append(title,close);body.append(file,select,hint);actions.append(cancel,confirm);dialog.append(header,body,actions);document.body.append(dialog);update();dropdowns();dialog.showModal();body.querySelector('.inspector-select-trigger')?.focus();
 });
}
