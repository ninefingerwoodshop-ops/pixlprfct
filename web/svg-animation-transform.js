// Canvas controls edit the existing animation properties in their parent space.
// Imported transforms and ancestors stay intact; no SVG geometry is rewritten.
import {properties} from './svg-animation-model.js';
const NS='http://www.w3.org/2000/svg';
const corners=[['nw',0,0,'top left'],['ne',1,0,'top right'],['se',1,1,'bottom right'],['sw',0,1,'bottom left']];
const edges=[['n',.5,0,'top'],['e',1,.5,'right'],['s',.5,1,'bottom'],['w',0,.5,'left']];
const point=(x,y,m)=>new DOMPoint(x,y).matrixTransform(m);
const finite=m=>['a','b','c','d','e','f'].every(k=>Number.isFinite(m[k]));
const clamp=(value,property)=>Math.max(properties[property].min,Math.min(properties[property].max,value));
const clean=value=>Number(value.toFixed(6));
function matrix(values,origin){return new DOMMatrix().translate(values.x+origin[0],values.y+origin[1]).rotate(values.rotation).scale(values.scaleX,values.scaleY).translate(-origin[0],-origin[1]);}
function geometry(state){
 const {node,frame,values,origin}=state,raw=frame.getScreenCTM();if(!raw)return null;const screen=DOMMatrix.fromMatrix(raw);if(!finite(screen.inverse()))return null;
 const pose=matrix(values,origin),own=pose.inverse().multiply(screen.inverse()).multiply(node.getScreenCTM()),b=node.getBBox();
 const pts=corners.map(([,x,y])=>point(b.x+x*b.width,b.y+y*b.height,own));
 const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y)),width=Math.max(...pts.map(p=>p.x))-x,height=Math.max(...pts.map(p=>p.y))-y;
 if(![x,y,width,height].every(Number.isFinite))return null;
 return {bounds:{x,y,width,height},screen,pose};
}
function anchored(values,next,anchor,origin){
 const old=point(...anchor,matrix(values,origin)),now=point(...anchor,matrix(next,origin));
 return {...next,x:clamp(next.x+old.x-now.x,'x'),y:clamp(next.y+old.y-now.y,'y')};
}
export function resizedValues(values,bounds,origin,handle,delta,{center=false,uniform=false}={}){
 const [,hx,hy]=handle,activeX=hx!==.5&&bounds.width>1e-8,activeY=hy!==.5&&bounds.height>1e-8;
 const anchor=[bounds.x+bounds.width*(center?.5:1-hx),bounds.y+bounds.height*(center?.5:1-hy)],factor=center?2:1;
 let fx=activeX?1+delta.x*(hx?1:-1)*factor/(bounds.width*values.scaleX):1,fy=activeY?1+delta.y*(hy?1:-1)*factor/(bounds.height*values.scaleY):1;
 if(uniform){const f=activeX&&activeY?(Math.abs(fx-1)>Math.abs(fy-1)?fx:fy):activeX?fx:fy;fx=fy=Math.max(Math.max(properties.scaleX.min/values.scaleX,properties.scaleY.min/values.scaleY),Math.min(Math.min(properties.scaleX.max/values.scaleX,properties.scaleY.max/values.scaleY),f));}
 const next={...values,scaleX:clamp(values.scaleX*fx,'scaleX'),scaleY:clamp(values.scaleY*fy,'scaleY')};
 return anchored(values,next,anchor,origin);
}
export function installTransformHandles({host,read,start,preview,restore,change,report}){
 const overlay=document.createElementNS(NS,'svg');overlay.classList.add('svg-transform-handles');overlay.id='svg-selection';overlay.setAttribute('aria-label','Object transform handles');host.append(overlay);
 const make=(tag,attrs,parent=overlay)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 const outline=make('path',{class:'svg-transform-outline'}),records=[];
 // Rotation targets sit outside the four corners, as in Figma. Edges remain
 // visually quiet, with full-edge hit areas for stretching one dimension.
 for(const handle of corners){const [name,,,label]=handle;const hit=make('circle',{r:10,class:'svg-transform-rotate','data-transform-handle':'rotate-'+name,role:'button','aria-label':'Rotate from '+label});records.push({hit,handle,rotate:true});}
 for(const handle of edges){const [name,,,label]=handle;const hit=make('path',{class:'svg-transform-edge','data-transform-handle':name,role:'button','aria-label':'Resize '+label});records.push({hit,handle,edge:true});}
 for(const handle of corners){const [name,,,label]=handle,hit=make('g',{class:'svg-transform-corner','data-transform-handle':name,role:'button','aria-label':'Resize '+label});make('rect',{x:-6,y:-6,width:12,height:12,class:'svg-transform-hit'},hit);make('rect',{x:-3.5,y:-3.5,width:7,height:7,class:'svg-transform-glyph'},hit);records.push({hit,handle});}
 const label=document.createElement('span');label.className='svg-transform-size';label.setAttribute('aria-hidden','true');host.append(label);
 let drag=null,last=null;
 function draw(state,g,values=state.values){
  const box=host.getBoundingClientRect(),m=g.screen.multiply(matrix(values,state.origin)),b=g.bounds;
  const at=(x,y)=>{const p=point(b.x+x*b.width,b.y+y*b.height,m);return {x:p.x-box.left,y:p.y-box.top};},points=corners.map(([,x,y])=>at(x,y));
  outline.setAttribute('d',points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')+'Z');
  const center=at(.5,.5),rotation=Math.atan2(m.b,m.a)*180/Math.PI;
  for(const r of records){const [,hx,hy]=r.handle,p=at(hx,hy);r.hit.setAttribute('tabindex',state.enabled?'0':'-1');r.hit.setAttribute('aria-disabled',String(!state.enabled));
   if(r.edge){const i=edges.findIndex(h=>h[0]===r.handle[0]),a=points[i],z=points[(i+1)%4];r.hit.setAttribute('d',`M${a.x} ${a.y}L${z.x} ${z.y}`);}
   else if(r.rotate){let dx=p.x-center.x,dy=p.y-center.y,d=Math.hypot(dx,dy);if(d<1){dx=hx?1:-1;dy=hy?1:-1;d=Math.SQRT2;}r.hit.setAttribute('cx',p.x+dx/d*15);r.hit.setAttribute('cy',p.y+dy/d*15);}
   else r.hit.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${rotation})`);
   if(!r.rotate){const angle=rotation+(hx===.5?90:hy===.5?0:hx===hy?45:-45),index=((Math.round(angle/45)%4)+4)%4;r.hit.style.cursor=['ew-resize','nwse-resize','ns-resize','nesw-resize'][index];}
   r.hit.style.pointerEvents=state.enabled?'':'none';
  }
  label.textContent=`${Number((b.width*values.scaleX).toFixed(2))} × ${Number((b.height*values.scaleY).toFixed(2))}`;
  label.style.left=(points[2].x+points[3].x)/2+'px';label.style.top=Math.max(...points.map(p=>p.y))+8+'px';
 }
 function update(){
  if(drag)return;const state=read();let g=null;try{g=state&&geometry(state);}catch{/* Hidden or singular SVG geometry has no usable handles. */}
  overlay.toggleAttribute('hidden',!g);label.hidden=!g;last=g?{state,g}:null;if(g)draw(state,g);
 }
 function valid(state){const now=read();return now?.enabled&&now.document===state.document&&now.element===state.element&&now.time===state.time;}
 function focus(record){record.hit.focus({preventScroll:true});}
 for(const record of records){
  const {hit,handle,rotate}=record;make('title',{},hit).textContent=rotate?'Drag to rotate. Shift snaps to 15°. Arrow keys rotate 1°; Shift rotates 15°.':'Drag to resize. Shift keeps proportions; Alt/Option resizes from center. Arrow keys resize; Shift uses 10 units.';hit.onclick=e=>e.stopPropagation();
  hit.onpointerdown=e=>{
   if(e.button!==0||drag||!last?.state.enabled)return;e.preventDefault();e.stopPropagation();start();update();if(!last?.state.enabled)return;
   const {state,g}=last,values={...state.values},rotationFrame=g.screen.multiply(new DOMMatrix().rotate(values.rotation)),inverse=rotationFrame.inverse();if(!finite(inverse))return;
   const initial=point(e.clientX,e.clientY,inverse),center=[g.bounds.x+g.bounds.width/2,g.bounds.y+g.bounds.height/2],pivot=point(...center,g.pose),frameInverse=g.screen.inverse();
   const pointer=point(e.clientX,e.clientY,frameInverse);let previousAngle=Math.atan2(pointer.y-pivot.y,pointer.x-pivot.x),angleDelta=0,next=values,moved=false;
   focus(record);hit.setPointerCapture(e.pointerId);
   const move=event=>{
    if(!valid(state)){cancel();return;}if(!moved&&Math.hypot(event.clientX-e.clientX,event.clientY-e.clientY)<2)return;moved=true;
    try{
     if(rotate){const p=point(event.clientX,event.clientY,frameInverse),angle=Math.atan2(p.y-pivot.y,p.x-pivot.x);angleDelta+=Math.atan2(Math.sin(angle-previousAngle),Math.cos(angle-previousAngle));previousAngle=angle;let rotation=values.rotation+angleDelta*180/Math.PI;if(event.shiftKey)rotation=Math.round(rotation/15)*15;next=anchored(values,{...values,rotation:clamp(rotation,'rotation')},center,state.origin);}
     else{const p=point(event.clientX,event.clientY,inverse);next=resizedValues(values,g.bounds,state.origin,handle,{x:p.x-initial.x,y:p.y-initial.y},{center:event.altKey,uniform:event.shiftKey});}
     preview(next);draw(state,g,next);
    }catch(error){cancel();report(error.message);}
   };
   const clear=()=>{drag=null;hit.removeEventListener('pointermove',move);hit.removeEventListener('pointerup',done);hit.removeEventListener('pointercancel',cancel);hit.removeEventListener('lostpointercapture',cancel);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',cancel);if(hit.hasPointerCapture(e.pointerId))hit.releasePointerCapture(e.pointerId);};
   const cancel=()=>{clear();restore();update();focus(record);};
   const done=event=>{if(event.pointerId!==e.pointerId)return;const allowed=valid(state);clear();restore();try{if(allowed&&moved)change(Object.fromEntries(Object.entries(next).map(([k,v])=>[k,clean(v)])));}catch(error){report(error.message);}update();focus(record);};
   const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}};
   drag={cancel};hit.addEventListener('pointermove',move);hit.addEventListener('pointerup',done);hit.addEventListener('pointercancel',cancel);hit.addEventListener('lostpointercapture',cancel);window.addEventListener('keydown',escape,true);window.addEventListener('blur',cancel);
  };
  hit.onkeydown=e=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||!last?.state.enabled)return;e.preventDefault();e.stopPropagation();start();update();if(!last?.state.enabled)return;
   const {state,g}=last,step=e.shiftKey?10:1,direction=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;let next;
   if(rotate){const center=[g.bounds.x+g.bounds.width/2,g.bounds.y+g.bounds.height/2];next=anchored(state.values,{...state.values,rotation:clamp(state.values.rotation+direction*(e.shiftKey?15:1),'rotation')},center,state.origin);}
   else next=resizedValues(state.values,g.bounds,state.origin,handle,{x:['ArrowLeft','ArrowRight'].includes(e.key)?direction*step:0,y:['ArrowUp','ArrowDown'].includes(e.key)?direction*step:0},{center:e.altKey});
   try{change(Object.fromEntries(Object.entries(next).map(([k,v])=>[k,clean(v)])));}catch(error){report(error.message);}update();focus(record);
  };
 }
 return {update,cancel(){drag?.cancel();}};
}
