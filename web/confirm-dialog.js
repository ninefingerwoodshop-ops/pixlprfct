// Asks before an action that cannot be undone. Resolves true only when the
// confirm button is chosen; Escape, Cancel and closing all resolve false.
// Focus starts on Cancel so Enter never confirms by accident.
export function confirmDestructive({title,message,confirm,cancel='Cancel'},document=globalThis.document){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog'),heading=document.createElement('h2'),text=document.createElement('p'),actions=document.createElement('div'),no=document.createElement('button'),yes=document.createElement('button');
  dialog.className='confirm-dialog';dialog.setAttribute('role','alertdialog');
  heading.id='confirm-dialog-title';heading.textContent=title;text.id='confirm-dialog-message';text.textContent=message;
  dialog.setAttribute('aria-labelledby',heading.id);dialog.setAttribute('aria-describedby',text.id);
  actions.className='confirm-dialog-actions';no.type='button';no.textContent=cancel;yes.type='button';yes.className='danger';yes.textContent=confirm;
  no.onclick=()=>dialog.close('cancel');yes.onclick=()=>dialog.close('confirm');
  dialog.addEventListener('close',()=>{dialog.remove();resolve(dialog.returnValue==='confirm');});
  actions.append(no,yes);dialog.append(heading,text,actions);document.body.append(dialog);dialog.showModal();no.focus();
 });
}
