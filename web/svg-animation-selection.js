import {normalizeElementSelection,toggleElementSelection,intersectsSelection} from './svg-animation-selection-model.js';

export function installElementSelection({host,workspace,read,select,pick}){
 const ns='http://www.w3.org/2000/svg',overlay=document.createElementNS(ns,'svg');overlay.classList.add('svg-element-selection');overlay.setAttribute('role','img');overlay.setAttribute('aria-label','Selected elements');host.append(overlay);
 const marquee=document.createElement('div');marquee.className='svg-element-marquee';marquee.hidden=true;marquee.setAttribute('aria-hidden','true');workspace.append(marquee);
 let drag=null,suppressPointer=null;
 function corners(node){
  if(!node?.getBBox)return null;
  try{
   for(let parent=node;parent instanceof SVGElement;parent=parent.parentElement){const style=getComputedStyle(parent);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return null;}
   const box=node.getBBox(),matrix=node.getScreenCTM();if(!matrix)return null;
   const points=[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>new DOMPoint(box.x+x*box.width,box.y+y*box.height).matrixTransform(matrix));
   return points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))?points:null;
  }catch{return null;}
 }
 function candidates(state){
  const view=state.root.getBoundingClientRect();
  return state.layers.flatMap(layer=>{const points=corners(state.root.querySelector('#'+layer.id));return points&&intersectsSelection(points,{x:view.left,y:view.top},{x:view.right,y:view.bottom})?[{...layer,points}]:[];});
 }
 function update(){
  const state=read();if(drag&&(!state.active||state.document!==drag.document||state.time!==drag.time)){drag.cancel();return;}
  overlay.replaceChildren();overlay.toggleAttribute('hidden',state.ids.length<2);if(state.ids.length<2)return;
  const box=host.getBoundingClientRect(),all=[];
  for(const id of state.ids){const points=corners(state.root.querySelector('#'+id));if(!points)continue;all.push(...points);const outline=document.createElementNS(ns,'path');outline.dataset.selectedElement=id;outline.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${p.x-box.left} ${p.y-box.top}`).join('')+'Z');overlay.append(outline);}
  if(all.length){const bounds=document.createElementNS(ns,'rect'),x=Math.min(...all.map(p=>p.x)),y=Math.min(...all.map(p=>p.y));bounds.setAttribute('x',x-box.left);bounds.setAttribute('y',y-box.top);bounds.setAttribute('width',Math.max(...all.map(p=>p.x))-x);bounds.setAttribute('height',Math.max(...all.map(p=>p.y))-y);bounds.dataset.selectionBounds='';overlay.append(bounds);}
  overlay.setAttribute('aria-label',`${state.ids.length} selected elements`);
 }
 window.addEventListener('pointerdown',()=>{suppressPointer=null;},true);
 window.addEventListener('click',e=>{if(suppressPointer!==null&&e.detail!==0&&e.pointerId===suppressPointer){suppressPointer=null;e.preventDefault();e.stopImmediatePropagation();}},true);
 workspace.addEventListener('pointerdown',e=>{
  const state=read();if(!state.active||drag||e.button!==0||e.altKey||e.target!==workspace&&!host.contains(e.target)||e.target.closest('[data-transform-handle],.svg-morph-point'))return;
  const hit=pick(e.target,e);
  if(hit){
   if(!e.shiftKey&&state.ids.length<2)return;
   // A selected object's Shift-drag still constrains movement. Its transform
   // controller defers the Shift-click deselection until a no-movement release.
   if(e.shiftKey&&!e.ctrlKey&&!e.metaKey&&state.editable&&state.ids.length===1&&state.ids[0]===hit)return;
   e.preventDefault();e.stopPropagation();suppressPointer=e.pointerId;select(e.shiftKey?toggleElementSelection(state.layers,state.ids,hit):[hit]);host.focus({preventScroll:true});return;
  }
  e.preventDefault();e.stopPropagation();
  const before=[...state.ids],items=candidates(state),deep=e.ctrlKey||e.metaKey,top=normalizeElementSelection(state.layers,state.layers.map(layer=>layer.id));let started=false;
  const apply=ids=>select(ids,{gesture:true});
  const move=event=>{
   if(event.pointerId!==e.pointerId)return;
   const now=read();if(!now.active||now.document!==state.document||now.time!==state.time){cancel();return;}
   if(!started&&Math.hypot(event.clientX-e.clientX,event.clientY-e.clientY)<3)return;
   if(!started){started=true;workspace.setPointerCapture(e.pointerId);host.focus({preventScroll:true});marquee.hidden=false;}
   event.preventDefault();const start={x:e.clientX,y:e.clientY},end={x:event.clientX,y:event.clientY},box=workspace.getBoundingClientRect();
   Object.assign(marquee.style,{left:Math.min(start.x,end.x)-box.left+'px',top:Math.min(start.y,end.y)-box.top+'px',width:Math.abs(end.x-start.x)+'px',height:Math.abs(end.y-start.y)+'px'});
   const hits=items.filter(item=>(deep?item.kind!=='g':top.includes(item.id))&&intersectsSelection(item.points,start,end)).map(item=>item.id);
   apply(normalizeElementSelection(state.layers,e.shiftKey?[...before,...hits]:hits));
  };
  const clear=()=>{drag=null;marquee.hidden=true;suppressPointer=e.pointerId;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',done,true);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);workspace.removeEventListener('lostpointercapture',cancel);if(workspace.hasPointerCapture(e.pointerId))workspace.releasePointerCapture(e.pointerId);};
  const cancel=()=>{clear();if(started)apply(before);};
  const done=event=>{if(event.pointerId!==e.pointerId)return;move(event);if(!drag)return;clear();if(!started)apply(e.shiftKey?before:[]);host.focus({preventScroll:true});};
  drag={cancel,document:state.document,time:state.time};window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',done,true);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);workspace.addEventListener('lostpointercapture',cancel);
 },true);
 window.addEventListener('keydown',e=>{if(!drag)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();drag.cancel();}else if(!['Shift','Control','Meta','Alt'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}},true);
 return {update,cancel(){drag?.cancel();},get dragging(){return !!drag;},all(){const state=read();return normalizeElementSelection(state.layers,candidates(state).map(item=>item.id));}};
}
