const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));
export function popoverBounds(anchor,size,viewport,{placement='left',margin=8,gap=8}={}){
 const left=(viewport.left??0)+margin,top=(viewport.top??0)+margin,maxWidth=Math.max(0,viewport.width-2*margin),maxHeight=Math.max(0,viewport.height-2*margin);
 const width=Math.min(size.width,maxWidth),height=Math.min(size.height,maxHeight),right=left+maxWidth,bottom=top+maxHeight;
 let x=anchor.left-width-gap,y=anchor.top;
 if(placement==='below'){
  x=anchor.left;const below=bottom-anchor.bottom-gap,above=anchor.top-top-gap;
  y=below>=height||below>=above?anchor.bottom+gap:anchor.top-height-gap;
 }else if(x<left&&anchor.right+gap+width<=right)x=anchor.right+gap;
 return {left:clamp(x,left,right-width),top:clamp(y,top,bottom-height),maxWidth,maxHeight};
}
export function positionPopover(panel,anchor,options={}){
 const visual=window.visualViewport,viewport={left:visual?.offsetLeft??0,top:visual?.offsetTop??0,width:visual?.width??innerWidth,height:visual?.height??innerHeight};
 const limits=popoverBounds(anchor,{width:0,height:0},viewport,options);
 // Reset a previous small opening before measuring the new content. A picker
 // can grow when switching tabs or turning a solid paint into a gradient.
 panel.style.maxWidth=limits.maxWidth+'px';panel.style.maxHeight=Math.min(options.maxHeight??Infinity,limits.maxHeight)+'px';
 if(options.width)panel.style.width=Math.min(options.width,limits.maxWidth)+'px';
 const bounds=popoverBounds(anchor,panel.getBoundingClientRect(),viewport,options);
 panel.style.left=bounds.left+'px';panel.style.top=bounds.top+'px';
}
export function trackPopover(panel,anchor,options={}){
 let pending=0;
 let pinned=null;
 const position=()=>{if(panel.matches(':popover-open')){const node=anchor();if(!node?.isConnected)return;
  if(!pinned){positionPopover(panel,node.getBoundingClientRect(),options);if(options.pinTop){const r=panel.getBoundingClientRect();pinned={left:r.left,top:r.top};}}
  if(pinned){const visual=window.visualViewport,margin=options.margin??8,left=(visual?.offsetLeft??0)+margin,top=(visual?.offsetTop??0)+margin,right=left+(visual?.width??innerWidth)-2*margin,bottom=top+(visual?.height??innerHeight)-2*margin;
   if(options.fitHeight)panel.style.maxHeight=Math.max(40,bottom-top)+'px';
   pinned.left=Math.max(left,Math.min(pinned.left,right-panel.offsetWidth));pinned.top=Math.max(top,Math.min(pinned.top,bottom-(options.fitHeight?panel.offsetHeight:40)));panel.style.left=pinned.left+'px';panel.style.top=pinned.top+'px';panel.style.maxHeight=Math.max(40,bottom-pinned.top)+'px';panel.style.maxWidth=Math.max(0,right-left)+'px';
  }
 }};
 const schedule=()=>{if(!pending&&panel.matches(':popover-open'))pending=requestAnimationFrame(()=>{pending=0;position();});};
 const observer=new ResizeObserver(schedule);observer.observe(panel);
 const node=anchor();if(node)observer.observe(node);
 panel.addEventListener('toggle',()=>{if(!panel.matches(':popover-open'))pinned=null;else schedule();});window.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
 document.addEventListener('scroll',event=>{if(!panel.contains(event.target))schedule();},true);
 position.move=(left,top)=>{const visual=window.visualViewport,margin=options.margin??8,minTop=(visual?.offsetTop??0)+margin,bottom=minTop+(visual?.height??innerHeight)-2*margin;pinned={left,top:Math.max(minTop,Math.min(top,bottom-panel.offsetHeight))};position();};
 position.schedule=schedule;return position;
}

export function dragPopover(panel,header,position){
 let drag=null;
 header.classList.add('popover-drag-handle');header.tabIndex=0;header.setAttribute('aria-label','Move color picker');header.title='Drag to move · Arrow keys to move · Escape cancels a drag';
 header.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button,input,select'))return;const r=panel.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};header.setPointerCapture(event.pointerId);header.focus({preventScroll:true});event.preventDefault();event.stopPropagation();});
 header.addEventListener('pointermove',event=>{if(!drag)return;position.move(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);event.stopPropagation();});
 const finish=cancel=>{if(!drag)return;const previous=drag;drag=null;if(cancel)position.move(previous.left,previous.top);if(header.hasPointerCapture(previous.id))header.releasePointerCapture(previous.id);};
 header.addEventListener('pointerup',()=>finish(false));header.addEventListener('pointercancel',()=>finish(true));
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){event.preventDefault();event.stopPropagation();finish(true);}else if(event.target===header&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();const r=panel.getBoundingClientRect(),step=event.shiftKey?20:5;position.move(r.left+({'ArrowLeft':-step,'ArrowRight':step}[event.key]??0),r.top+({'ArrowUp':-step,'ArrowDown':step}[event.key]??0));}});
}
