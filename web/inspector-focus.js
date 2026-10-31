// Let the browser finish a blur/click/Tab sequence before rebuilding dynamic fields.
// Restore the field that actually gained focus, rather than the field that committed.
export function inspectorRenderer(render,root,selectionKey){
 let pending=false;const dirty=new WeakSet();
 root()?.addEventListener('input',event=>dirty.add(event.target),true);
 root()?.addEventListener('change',event=>dirty.delete(event.target),true);
 return()=>{
  if(pending)return;pending=true;
  requestAnimationFrame(()=>{
   pending=false;const panel=root(),active=document.activeElement,key=selectionKey();
   const eligible=panel?.contains(active)&&active.matches('input,textarea,select,button');
   const state=eligible?{id:active.id,label:active.getAttribute('aria-label'),tag:active.tagName,type:active.type,text:active.tagName==='BUTTON'?active.textContent:null,value:active.value,dirty:dirty.has(active),start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection}:null;
   render();
   // Adding an effect/guide intentionally opens and focuses its settings. Do
   // not pull focus back to the Add button after that new popup has opened.
   if(document.activeElement!==active&&document.activeElement?.closest('.inspector-settings-popover:popover-open'))return;
   if(!state||key!==selectionKey())return;
   // A retained, still-focused field needs no DOM search or layout measurement.
   // Replaced fields still need the visibility check before restoring focus.
   let next=active;
   if(!active.isConnected||document.activeElement!==active){
    const candidates=[...panel.querySelectorAll(state.tag.toLowerCase())].filter(el=>state.id?el.id===state.id:state.label?el.getAttribute('aria-label')===state.label:state.text?el.textContent===state.text:false);
    if(candidates.length!==1)return;next=candidates[0];if(next.disabled||!next.getClientRects().length||next.closest('[hidden]'))return;
   }
   // Preserve any uncommitted typing in a newly focused text/number field.
   if(state.dirty&&['INPUT','TEXTAREA'].includes(state.tag)&&!['checkbox','radio','color','file','button','submit'].includes(state.type)){if(next.value!==state.value)next.value=state.value;dirty.add(next);}
   if(document.activeElement!==next)next.focus({preventScroll:true});
   if(state.start!==null&&state.start!==undefined&&typeof next.setSelectionRange==='function')try{next.setSelectionRange(state.start,state.end,state.direction);}catch{}
  });
 };
}
