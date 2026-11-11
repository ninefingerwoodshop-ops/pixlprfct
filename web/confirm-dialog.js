// Asks before an action that needs a second look. Resolves true only when the
// confirm button is chosen; Escape, Cancel, the close button and closing all
// resolve false. Focus starts on Cancel so Enter never confirms by accident.
// Layout follows Figma's file dialogs: title bar with a close button, a
// message, and right-aligned Cancel and confirm buttons. `message` may be a
// string or a list of strings and {strong} parts so a name can be emphasized.
export function confirmDestructive({title,message,confirm,cancel='Cancel',tone='danger'},document=globalThis.document){
 return new Promise(resolve=>{
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
  const dialog=el('dialog','confirm-dialog'),header=el('header'),heading=el('h2',null,title),close=el('button','confirm-dialog-close','×'),body=el('div','confirm-dialog-body'),actions=el('div','confirm-dialog-actions'),no=el('button',null,cancel),yes=el('button',tone==='danger'?'danger':'primary',confirm);
  // The id lets these rules outrank the shared control styles, which use id-level selectors.
  dialog.id='confirm-dialog';dialog.setAttribute('role','alertdialog');heading.id='confirm-dialog-title';body.id='confirm-dialog-message';
  dialog.setAttribute('aria-labelledby',heading.id);dialog.setAttribute('aria-describedby',body.id);
  for(const paragraph of Array.isArray(message)&&Array.isArray(message[0])?message:[message]){
   const p=el('p');for(const part of Array.isArray(paragraph)?paragraph:[paragraph])p.append(typeof part==='string'?part:el('strong',null,part.strong));body.append(p);
  }
  close.type=no.type=yes.type='button';close.setAttribute('aria-label','Close');
  close.onclick=no.onclick=()=>dialog.close('cancel');yes.onclick=()=>dialog.close('confirm');
  dialog.addEventListener('close',()=>{dialog.remove();resolve(dialog.returnValue==='confirm');});
  header.append(heading,close);actions.append(no,yes);dialog.append(header,body,actions);document.body.append(dialog);dialog.showModal();no.focus();
 });
}
