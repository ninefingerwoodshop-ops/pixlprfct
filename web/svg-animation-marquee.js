import {lassoSelection} from './svg-animation-lasso.js';

// Base-path selection is transient UI state. Never write artwork or timed Morph keys.
export function installPathMarquee({host,workspace,read,select,report=()=>{}}){
 const box=document.createElement('div');box.className='svg-anchor-marquee';box.hidden=true;box.setAttribute('aria-hidden','true');workspace.append(box);
 const outline=document.createElementNS('http://www.w3.org/2000/svg','svg'),trace=document.createElementNS(outline.namespaceURI,'path');outline.classList.add('svg-anchor-lasso');outline.setAttribute('hidden','');outline.setAttribute('aria-hidden','true');trace.setAttribute('fill-rule','evenodd');outline.append(trace);workspace.append(outline);
 let drag=null,suppressPointer=null;
 const focus=()=>{const last=read()?.selections.at(-1);(last?host.querySelector(`[data-morph-point="${last[0]}-${last[1]}-anchor"]`):host)?.focus({preventScroll:true});};
 window.addEventListener('pointerdown',()=>{suppressPointer=null;},true);
 window.addEventListener('click',e=>{if(suppressPointer!==null&&e.detail!==0&&e.pointerId===suppressPointer){suppressPointer=null;e.preventDefault();e.stopImmediatePropagation();}},true);
 workspace.addEventListener('pointerdown',e=>{
  if(drag||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('.svg-morph-point')||e.target!==workspace&&!host.contains(e.target))return;
  const state=read(),matrix=state?.node?.getScreenCTM();if(!state?.enabled||state.dragEnabled===false||!matrix)return;
  const before=state.selections.map(pair=>[...pair]),points=[],lasso=state.selectionShape==='lasso',samples=[{x:e.clientX,y:e.clientY}];
  state.value.forEach((part,path)=>part.points.forEach((p,index)=>{const at=new DOMPoint(p[0],p[1]).matrixTransform(matrix);points.push({path,index,x:at.x,y:at.y});}));
  let started=false;
  const move=(event,final=false)=>{
   if(event.pointerId!==e.pointerId)return;
   if(!started&&Math.hypot(event.clientX-e.clientX,event.clientY-e.clientY)<3)return;
   if(!started){started=true;host.focus({preventScroll:true});workspace.setPointerCapture(e.pointerId);if(lasso)outline.removeAttribute('hidden');else box.hidden=false;}
   event.preventDefault();
   const left=Math.min(e.clientX,event.clientX),top=Math.min(e.clientY,event.clientY),right=Math.max(e.clientX,event.clientX),bottom=Math.max(e.clientY,event.clientY),bounds=workspace.getBoundingClientRect();
   let inside;
   if(lasso){
    const at={x:event.clientX,y:event.clientY},last=samples.at(-1);
    if(Math.hypot(at.x-last.x,at.y-last.y)>=(final?1e-6:2)){
     if(samples.length===4096){cancel();report('This lasso is too long. Draw a shorter selection.');return;}samples.push(at);
    }
    const region=[...samples,at];trace.setAttribute('d',region.map((p,i)=>`${i?'L':'M'}${p.x-bounds.left} ${p.y-bounds.top}`).join('')+'Z');inside=lassoSelection(points,region);
   }else{
    Object.assign(box.style,{left:left-bounds.left+'px',top:top-bounds.top+'px',width:right-left+'px',height:bottom-top+'px'});
    inside=points.filter(p=>p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom).map(p=>[p.path,p.index]);
   }
   select(e.shiftKey?[...before,...inside.filter(pair=>!before.some(p=>p[0]===pair[0]&&p[1]===pair[1]))]:inside);
  };
  const clear=()=>{
   window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',done,true);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);workspace.removeEventListener('lostpointercapture',cancel);
   drag=null;box.hidden=true;outline.setAttribute('hidden','');if(started)suppressPointer=e.pointerId;if(workspace.hasPointerCapture(e.pointerId))workspace.releasePointerCapture(e.pointerId);
  };
  const cancel=()=>{clear();if(started){select(before);focus();}};
  const done=event=>{if(event.pointerId!==e.pointerId)return;move(event,true);if(!drag)return;clear();if(lasso&&!started){suppressPointer=e.pointerId;select(e.shiftKey?before:[]);}if(started||lasso)focus();};
  drag={cancel};window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',done,true);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);workspace.addEventListener('lostpointercapture',cancel);
 },true);
 window.addEventListener('keydown',e=>{
  if(!drag)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();drag.cancel();}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace','Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 return {cancel(){drag?.cancel();}};
}
