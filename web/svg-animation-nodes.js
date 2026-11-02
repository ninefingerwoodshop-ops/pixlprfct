import {moveMorphPoint,morphData} from './svg-animation-morph.js';

const NS='http://www.w3.org/2000/svg';
export function installMorphNodes({host,read,select,change,preview,report,activate=()=>false,label='Morph nodes',nodeLabel='Morph node',anchorShape='rect',overlayClass='svg-morph-nodes'}){
 const overlay=document.createElementNS(NS,'svg');overlay.classList.add(overlayClass);overlay.setAttribute('aria-label',label);host.append(overlay);
 let drag=null,records=[],outline=null;
 const make=(tag,attrs)=>{const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);overlay.append(node);return node;};
 const focus=key=>overlay.querySelector(`[data-morph-point="${key}"]`)?.focus({preventScroll:true});
 function draw(value,node){
  const box=host.getBoundingClientRect(),matrix=node.getScreenCTM();if(!matrix)return;
  const point=(p,offset)=>new DOMPoint(p[offset],p[offset+1]).matrixTransform(matrix);
  outline.setAttribute('d',morphData(value));outline.setAttribute('transform',`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e-box.left} ${matrix.f-box.top})`);
  for(const record of records){const p=value[record.path].points[record.index],offset={anchor:0,in:2,out:4}[record.kind],at=point(p,offset),anchor=point(p,0),x=at.x-box.left,y=at.y-box.top;
   record.hit.setAttribute('transform',`translate(${x} ${y})`);
   record.hit.setAttribute('aria-label',`${record.label}, X ${Number(p[offset].toFixed(2))}, Y ${Number(p[offset+1].toFixed(2))}`);
   record.hit.setAttribute('aria-pressed',String(read()?.selection?.[0]===record.path&&read()?.selection?.[1]===record.index));
   if(record.line)record.line.setAttribute('d',`M${anchor.x-box.left} ${anchor.y-box.top}L${x} ${y}`);
  }
 }
 function update(){
  if(drag)return;const state=read();overlay.replaceChildren();records=[];overlay.toggleAttribute('hidden',!state);if(!state)return;
  outline=make('path',{class:'svg-morph-outline','vector-effect':'non-scaling-stroke'});
  state.value.forEach((path,pathIndex)=>path.points.forEach((point,index)=>{
   for(const kind of ['in','out','anchor']){
    const offset={anchor:0,in:2,out:4}[kind];if(kind!=='anchor'&&(point[offset]===point[0]&&point[offset+1]===point[1]||!path.closed&&(kind==='in'&&index===0||kind==='out'&&index===path.points.length-1)))continue;
    const label=`${kind==='anchor'?nodeLabel:kind==='in'?'Incoming handle':'Outgoing handle'} ${pathIndex+1}.${index+1}`,key=`${pathIndex}-${index}-${kind}`;
    const line=kind==='anchor'?null:make('path',{class:'svg-morph-tangent'}),hit=make('g',{role:'button',tabindex:state.enabled?0:-1,'aria-disabled':String(!state.enabled),'data-morph-point':key,class:'svg-morph-point '+(kind==='anchor'?'anchor':'handle')});
    const area=document.createElementNS(NS,'circle');area.setAttribute('r','8');area.classList.add('svg-morph-hit');hit.append(area);
    const glyph=document.createElementNS(NS,kind==='anchor'?anchorShape:'circle');if(kind==='anchor'&&anchorShape==='rect')for(const [k,v] of Object.entries({x:-3,y:-3,width:6,height:6}))glyph.setAttribute(k,v);else glyph.setAttribute('r','3');glyph.classList.add('svg-morph-glyph');hit.append(glyph);
    records.push({path:pathIndex,index,kind,label,hit,line});
    hit.onclick=e=>{e.stopPropagation();if(activate(pathIndex,index,kind))return;select(pathIndex,index);draw(read().value,state.node);};
    hit.onkeydown=e=>{
     if(!state.enabled)return;if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(activate(pathIndex,index,kind))return;select(pathIndex,index);draw(read().value,state.node);return;}
     if(state.dragEnabled===false)return;
     if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();select(pathIndex,index);
     const value=read().value,p=value[pathIndex].points[index],step=e.shiftKey?10:1,x=p[offset]+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y=p[offset+1]+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0);
     try{change(moveMorphPoint(value,pathIndex,index,kind,x,y));focus(key);}catch(error){report(error.message);}
    };
    hit.onpointerdown=e=>{
     if(e.button!==0||!state.enabled)return;e.preventDefault();e.stopPropagation();if(state.dragEnabled===false){hit.focus({preventScroll:true});return;}select(pathIndex,index);hit.focus({preventScroll:true});
     const before=read().value,inverse=state.node.getScreenCTM()?.inverse();if(!inverse)return;const start=new DOMPoint(e.clientX,e.clientY).matrixTransform(inverse),p=before[pathIndex].points[index];let value=before;
     hit.setPointerCapture(e.pointerId);
     const move=event=>{const at=new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse);try{value=moveMorphPoint(before,pathIndex,index,kind,p[offset]+at.x-start.x,p[offset+1]+at.y-start.y);preview(value);draw(value,state.node);}catch(error){report(error.message);}};
     const clear=()=>{hit.removeEventListener('pointermove',move);hit.removeEventListener('pointerup',done);hit.removeEventListener('pointercancel',cancel);hit.removeEventListener('lostpointercapture',cancel);window.removeEventListener('keydown',escape,true);drag=null;};
     const cancel=()=>{clear();preview(before);update();focus(key);},done=()=>{clear();try{if(JSON.stringify(value)!==JSON.stringify(before))change(value);else update();focus(key);}catch(error){preview(before);update();report(error.message);}},escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}};
     drag={cancel};hit.addEventListener('pointermove',move);hit.addEventListener('pointerup',done);hit.addEventListener('pointercancel',cancel);hit.addEventListener('lostpointercapture',cancel);window.addEventListener('keydown',escape,true);
    };
   }
  }));draw(state.value,state.node);
 }
 return {update,get dragging(){return !!drag;},cancel(){drag?.cancel();}};
}
