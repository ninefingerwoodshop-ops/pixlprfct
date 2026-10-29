const scope='.navigation-rail,.left-panel,.right-panel,.toolbox,dialog,.paint-popover,.selection-menu,.inspector-select-menu,.frame-labels,#grid-area-status';
export function tooltipText(value,mac=false){
 return value.replace(/Ctrl\s*\/\s*(?:Cmd|Command|⌘)|Cmd\s*\/\s*Ctrl|⌘\s*\/\s*Ctrl/g,mac?'⌘':'Ctrl').replace(/Ctrl\s*\+\s*\/\s*Cmd/g,mac?'⌘':'Ctrl').replace(/Ctrl(?=[ +])/g,mac?'⌘':'Ctrl').replace(/\bCmd\b/g,mac?'⌘':'Ctrl').replace(/\bShift\b/g,mac?'⇧':'Shift').replace(/\bAlt\b/g,mac?'⌥':'Alt');
}
export function tooltipScrollStep(current,delta,scrollHeight,clientHeight){
 return Math.max(0,Math.min(Math.max(0,scrollHeight-clientHeight),current+delta));
}
export function tooltipPageStep(visibleHeight,lineHeight=16){
 return Math.max(1,visibleHeight-Math.min(lineHeight,visibleHeight/2));
}
export function tooltipPosition(anchor, size, viewport) {
 const left=(viewport.left??0)+8,top=(viewport.top??0)+8;
 const right=(viewport.left??0)+viewport.width-8,bottom=(viewport.top??0)+viewport.height-8;
 const preferredY=anchor.top-size.height-8>=top?anchor.top-size.height-8:anchor.bottom+8;
 return {x:Math.max(left,Math.min(right-size.width,anchor.left+(anchor.width-size.width)/2)),
  y:Math.max(top,Math.min(bottom-size.height,preferredY))};
}
export function tooltipTargetVisible(el) {
 if(!el?.isConnected||el.closest('[hidden]'))return false;
 for(let parent=el.parentElement;parent;parent=parent.parentElement){
  if(parent.matches('details:not([open])')){
   const summary=parent.querySelector(':scope > summary');
   if(!summary?.contains(el))return false;
  }
 }
 return el.getClientRects().length>0;
}
export function installTooltips(){
 const labels=new WeakMap(),mac=/Mac|iPhone|iPad/.test(navigator.platform);
 const tooltip=document.createElement('div');tooltip.id='editor-tooltip';tooltip.className='editor-tooltip';tooltip.setAttribute('role','tooltip');tooltip.setAttribute('popover','manual');tooltip.tabIndex=-1;document.body.append(tooltip);
 let target=null,timer=null,keyboardRequest=0,returnFocus=null;
 const hide=()=>{const restore=document.activeElement===tooltip?returnFocus:null;returnFocus=null;keyboardRequest++;clearTimeout(timer);if(target){const ids=(target.getAttribute('aria-describedby')??'').split(/\s+/).filter(id=>id&&id!==tooltip.id);if(ids.length)target.setAttribute('aria-describedby',ids.join(' '));else target.removeAttribute('aria-describedby');}if(tooltip.matches(':popover-open'))tooltip.hidePopover();target=null;if(restore?.isConnected)restore.focus({preventScroll:true});};
 const readTitle=el=>{if(el.hasAttribute('title')){labels.set(el,el.getAttribute('title'));el.removeAttribute('title');}};
 const scan=node=>{if(!(node instanceof Element))return;if(node.closest(scope))readTitle(node);for(const el of node.querySelectorAll('[title]'))if(el.closest(scope))readTitle(el);};
 scan(document.body);
 new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'){if(r.target.closest(scope))readTitle(r.target);}else for(const node of r.addedNodes)scan(node);}if(target&&(!tooltipTargetVisible(target)||(target.hasAttribute('data-tooltip-overflow')&&records.some(r=>r.type==='childList'&&target.contains(r.target)))))hide();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['title','hidden','open']});
 const find=node=>{for(let el=node instanceof Element?node:null;el&&el!==document.body;el=el.parentElement){if(!el.closest(scope))continue;if(el.hasAttribute('data-tooltip-overflow')){const label=el.firstElementChild;return label&&label.scrollWidth>label.clientWidth?{el,text:label.textContent,literal:true}:null;}readTitle(el);const named=el.matches('button,summary')&&el.hasAttribute('aria-label')&&!el.querySelector('input');const text=labels.get(el)||(named?el.getAttribute('aria-label'):null);if(text)return {el,text};}return null;};
 const show=entry=>{entry=find(entry.el);if(!entry){hide();return;}if(document.hidden||!document.hasFocus()||!tooltipTargetVisible(entry.el)){hide();return;}target=entry.el;tooltip.textContent=entry.literal?entry.text:tooltipText(entry.text,mac);tooltip.classList.toggle('area-name-tooltip',entry.el.id==='grid-area-status');if(entry.el.id==='grid-area-status'){const content=document.createElement('div');content.className='tooltip-name-content';content.textContent=entry.text;const hint=document.createElement('div');hint.className='tooltip-keyboard-hint';hint.textContent='F6 to focus · ↑↓ to scroll';tooltip.replaceChildren(hint,content);}const ids=new Set((target.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean));ids.add(tooltip.id);target.setAttribute('aria-describedby',[...ids].join(' '));tooltip.showPopover();tooltip.scrollTop=0;tooltip.scrollLeft=0;position();};
 const position=()=>{
  if(!target)return;
  if(!tooltipTargetVisible(target)||(target.hasAttribute('data-tooltip-overflow')&&!find(target))){hide();return;}
  if(!tooltip.matches(':popover-open'))return;
  const visual=window.visualViewport,viewport={left:visual?.offsetLeft??0,top:visual?.offsetTop??0,width:visual?.width??innerWidth,height:visual?.height??innerHeight};
  tooltip.style.maxWidth=Math.max(0,Math.min(280,viewport.width-16))+'px';
  tooltip.style.maxHeight=Math.max(0,viewport.height-16)+'px';
  const p=tooltipPosition(target.getBoundingClientRect(),tooltip.getBoundingClientRect(),viewport);
  tooltip.style.left=p.x+'px';tooltip.style.top=p.y+'px';
 };
 const areaBadge=document.getElementById('grid-area-status');
 if(areaBadge){const observer=new ResizeObserver(position);observer.observe(areaBadge);if(areaBadge.firstElementChild)observer.observe(areaBadge.firstElementChild);const workspace=areaBadge.closest('#workspace');if(workspace)observer.observe(workspace);}
 document.addEventListener('pointerover',event=>{if(tooltip.contains(event.target)){clearTimeout(timer);return;}const entry=find(event.target);if(entry?.el===target)return;hide();if(entry){target=entry.el;const request=keyboardRequest;timer=setTimeout(()=>{if(request===keyboardRequest)show(entry);},500);}});
 document.addEventListener('pointerout',event=>{if(target&&!target.contains(event.relatedTarget)&&!tooltip.contains(event.relatedTarget)){clearTimeout(timer);timer=setTimeout(hide,120);}});
 tooltip.addEventListener('pointerenter',()=>clearTimeout(timer));
 tooltip.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
 document.addEventListener('focusin',event=>{if(tooltip.contains(event.target)){const hint=tooltip.querySelector('.tooltip-keyboard-hint');if(hint){hint.textContent='↑↓ · Page Up/Down · Home/End to scroll. Esc, F6 or Tab to return to canvas.';position();}return;}hide();if(event.target.matches(':focus-visible')){const entry=find(event.target);
  // Area tooltips reopen through an explicit hover or keyboard selection, not restored focus.
  // A popover can move focus synchronously while it is opening. Wait until that
  // operation finishes before showing another top-layer element, and discard a
  // request if focus moved again in the meantime.
  if(entry&&entry.el.id!=='grid-area-status'){const request=keyboardRequest;requestAnimationFrame(()=>{if(request===keyboardRequest&&entry.el.contains(document.activeElement))show(entry);});}
 }});
 document.addEventListener('dragstart',hide,true);document.addEventListener('focusout',event=>{if(!tooltip.contains(event.relatedTarget))hide();});document.addEventListener('pointerdown',event=>{if(!tooltip.contains(event.target))hide();},true);
 document.addEventListener('keydown',event=>{
  const areaOpen=target?.id==='grid-area-status'&&tooltip.matches(':popover-open');
  if(areaOpen&&event.key==='F6'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopImmediatePropagation();if(document.activeElement===tooltip){hide();}else{returnFocus=document.activeElement;tooltip.focus({preventScroll:true});}return;}
  if(areaOpen&&document.activeElement===tooltip){
   if(['ArrowLeft','ArrowRight','Delete','Backspace'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();return;}
   const scroller=tooltip.querySelector('.tooltip-name-content')??tooltip;
   const style=getComputedStyle(scroller),visibleHeight=Math.max(1,scroller.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0)),pageStep=tooltipPageStep(visibleHeight,parseFloat(style.lineHeight)||16);
   const lineStep=parseFloat(style.lineHeight)||16;
   const amounts={ArrowUp:-lineStep,ArrowDown:lineStep,PageUp:-pageStep,PageDown:pageStep,Home:-scroller.scrollHeight,End:scroller.scrollHeight};
   if(event.key in amounts){event.preventDefault();event.stopImmediatePropagation();if(event.key==='End')scroller.scrollTop=Math.max(0,scroller.scrollHeight-scroller.clientHeight);else if(event.key==='Home')scroller.scrollTop=0;else scroller.scrollTop=tooltipScrollStep(scroller.scrollTop,amounts[event.key],scroller.scrollHeight,scroller.clientHeight);return;}
   if(event.key==='Tab'){event.preventDefault();event.stopImmediatePropagation();hide();return;}
   if(event.key!=='Escape'){event.stopImmediatePropagation();return;}
  }
  if(event.key!=='Escape')return;
  const areaTooltip=target?.id==='grid-area-status'&&tooltip.matches(':popover-open');
  hide();
  if(areaTooltip){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 document.addEventListener('blur',event=>{if(!tooltip.contains(event.relatedTarget))hide();},true);window.addEventListener('blur',hide);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
 document.addEventListener('scroll',event=>{if(event.target===tooltip||tooltip.contains(event.target))return;hide();},true);window.addEventListener('resize',position);
 window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
 return {hideFor(el){if(!target||target===el)hide();},showFor(el){hide();if(!find(el))return;const request=keyboardRequest;requestAnimationFrame(()=>{if(request!==keyboardRequest)return;const entry=find(el);if(entry)show(entry);});}};

}
