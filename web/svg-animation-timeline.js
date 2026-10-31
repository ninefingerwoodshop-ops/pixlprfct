import {icon} from './icons.js';
import {properties,moveKey,deleteKey,resizeDuration} from './svg-animation-model.js';
export function installSvgTimeline({read,layers,change,selectKey,seek,time,play,playing,report,addKey}){
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls??'';if(text)n.textContent=text;return n;};
 const button=(name,glyph,run)=>{const n=el('button');n.type='button';n.title=name;n.setAttribute('aria-label',name);n.innerHTML=icon(glyph);n.onclick=run;return n;};
 const panel=el('section');panel.id='motion-timeline';panel.setAttribute('aria-label','SVG animation timeline');
 const grip=el('div','motion-resize');grip.setAttribute('role','separator');grip.tabIndex=0;grip.setAttribute('aria-label','Resize Motion timeline');grip.setAttribute('aria-orientation','horizontal');
 const controls=el('div','timeline-controls'),toggle=button('Play','play',play),reset=button('Go to start','skip-back',()=>seek(0)),box=el('div','timeline-time'),clock=el('input'),duration=el('input'),unit=el('span','','ms');
 for(const [input,name] of [[clock,'Current time'],[duration,'Duration']]){input.type='number';input.min='0';input.max='60000';input.setAttribute('aria-label',name);}
 box.append(clock,duration,unit);const loop=button('Loop','repeat',()=>change({...read(),loop:!read().loop})),collapse=button('Collapse Motion timeline','timeline-collapse',()=>{collapsed=!collapsed;layout();});controls.append(toggle,reset,box,loop);
 const labels=el('div','timeline-labels'),viewport=el('div','timeline-viewport'),content=el('div','timeline-content'),ruler=el('div','timeline-ruler'),tracks=el('div','timeline-tracks'),head=el('div','timeline-playhead');head.append(el('div','timeline-playhead-cap'));
 viewport.tabIndex=0;viewport.setAttribute('aria-label','Keyframes timeline');ruler.tabIndex=0;ruler.setAttribute('role','slider');ruler.setAttribute('aria-label','Timeline scrubber');ruler.setAttribute('aria-valuemin','0');content.append(ruler,tracks,head);viewport.append(content);
 const zooms=el('div','timeline-zoom');zooms.append(button('Zoom out on timeline','minus',()=>zoom(1/1.5)),button('Zoom in on timeline','plus',()=>zoom(1.5)));
 panel.append(grip,controls,collapse,labels,viewport,zooms);document.body.append(panel);let height=200,collapsed=false,magnification=1,selection=null,dragging=false;
 const safe=fn=>{try{fn();}catch(e){report(e.message);render();}};
 const scale=()=>Math.max(.001,(viewport.clientWidth-32)/read().duration)*magnification;
 const point=e=>Math.round(Math.max(0,Math.min(read().duration,(e.clientX-viewport.getBoundingClientRect().left+viewport.scrollLeft-16)/scale())));
 function layout(){document.body.style.setProperty('--timeline-height',(collapsed?48:height)+'px');panel.classList.toggle('timeline-collapsed',collapsed);grip.setAttribute('aria-valuenow',String(height));collapse.setAttribute('aria-label',collapsed?'Expand Motion timeline':'Collapse Motion timeline');render();}
 function zoom(factor){magnification=Math.max(1,Math.min(32,magnification*factor));render();}
 clock.onchange=()=>seek(Number(clock.value));duration.onchange=()=>safe(()=>change(resizeDuration(read(),Number(duration.value))));
 viewport.onscroll=()=>{labels.scrollTop=viewport.scrollTop;};viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15);}},{passive:false});
 function pointerDrag(target,event,onMove,onDone=()=>{},onCancel=()=>{}){
  target.setPointerCapture(event.pointerId);dragging=true;
  const finish=()=>{cleanup();onDone();},cancel=()=>{cleanup();onCancel();},escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();}},cleanup=()=>{dragging=false;target.removeEventListener('pointermove',onMove);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);};
  target.addEventListener('pointermove',onMove);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);
 }
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const start=height,y=e.clientY;pointerDrag(grip,e,ev=>{height=Math.round(Math.max(120,Math.min(innerHeight*.7,start+y-ev.clientY)));layout();},layout,()=>{height=start;layout();});};
 grip.onkeydown=e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();height=Math.max(120,Math.min(innerHeight*.7,height+(e.key==='ArrowUp'?10:-10)));layout();}};
 ruler.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const before=time();seek(point(e));pointerDrag(ruler,e,ev=>seek(point(ev)),()=>{},()=>seek(before));};
 ruler.onkeydown=e=>{if(['Home','End','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();seek(e.key==='Home'?0:e.key==='End'?read().duration:time()+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?100:10));}};
 function choose(track,key){selection={element:track.element,property:track.property,time:key.time};selectKey(selection);seek(key.time);}
 function keyDrag(e,track,key){
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();const target=e.currentTarget,x=e.clientX,original=read(),px=scale();let next=key.time;
  // Keep the captured button mounted until pointerup.
  dragging=true;choose(track,key);dragging=false;target.classList.add('selected');target.focus();
  pointerDrag(target,e,ev=>{next=Math.round(Math.max(0,Math.min(original.duration,key.time+(ev.clientX-x)/px)));if(ev.shiftKey)next=Math.round(next/100)*100;target.style.left=12+next*px+'px';},()=>safe(()=>{change(moveKey(original,track.element,track.property,key.time,next));selection={element:track.element,property:track.property,time:next};selectKey(selection);seek(next);render();viewport.focus();}),render);
 }
 panel.addEventListener('keydown',e=>{
  if(e.target.closest('input')||e.target===ruler)return;
  if(e.key===' '){e.preventDefault();e.stopPropagation();play();}
  if(selection&&['Delete','Backspace'].includes(e.key)){e.preventDefault();const s=selection;selection=null;selectKey(null);change(deleteKey(read(),s.element,s.property,s.time));viewport.focus({preventScroll:true});}
  if(selection&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();safe(()=>{const s=selection,next=Math.max(0,Math.min(read().duration,s.time+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?100:10)));change(moveKey(read(),s.element,s.property,s.time,next));selection={...s,time:next};selectKey(selection);seek(next);viewport.focus({preventScroll:true});});}
 });
 function update(){const a=read();if(document.activeElement!==clock)clock.value=Math.round(time());if(document.activeElement!==duration)duration.value=a.duration;head.style.left=16+time()*scale()+'px';ruler.setAttribute('aria-valuenow',String(Math.round(time())));ruler.setAttribute('aria-valuemax',String(a.duration));toggle.setAttribute('aria-label',playing()?'Pause':'Play');toggle.innerHTML=icon(playing()?'pause':'play');toggle.disabled=!a.tracks.length;loop.setAttribute('aria-pressed',String(a.loop));}
 function render(){update();if(dragging)return;const a=read(),px=scale();content.style.width=Math.max(viewport.clientWidth,32+a.duration*px)+'px';labels.replaceChildren();tracks.replaceChildren();ruler.replaceChildren();
  const step=[10,20,50,100,200,500,1000,2000,5000,10000].find(v=>v*px>=70)??10000;
  for(let t=0;t<=a.duration;t+=step/5){const tick=el('span','timeline-tick'+(t%step===0?' major':''));tick.style.left=16+t*px+'px';if(t%step===0)tick.append(el('span','',Number((t/1000).toFixed(2))+'s'));ruler.append(tick);}
  for(const layer of layers()){
   const rows=a.tracks.filter(t=>t.element===layer.id);if(!rows.length)continue;
   const label=el('button','timeline-track-label timeline-layer-row',layer.name);label.onclick=()=>{selection=null;selectKey({element:layer.id});render();};labels.append(label);tracks.append(el('div','timeline-track timeline-layer-row'));
   for(const track of rows){const caption=el('button','timeline-track-label',properties[track.property].label);caption.onclick=()=>{selection=null;selectKey({element:track.element,property:track.property});render();};labels.append(caption);const row=el('div','timeline-track');row.ondblclick=e=>addKey(track,point(e));
    for(const key of track.keys){const b=el('button','timeline-keyframe'+(selection?.element===track.element&&selection?.property===track.property&&selection?.time===key.time?' selected':''));b.setAttribute('aria-label',`${layer.name} ${properties[track.property].label} keyframe at ${key.time} ms`);b.style.left=12+key.time*px+'px';b.onpointerdown=e=>keyDrag(e,track,key);b.onclick=e=>{if(e.detail===0){choose(track,key);render();viewport.focus({preventScroll:true});}};row.append(b);}tracks.append(row);
   }
  }
  if(!a.tracks.length){const hint=el('p','svg-timeline-empty','Select an element and add an animator to start.');tracks.append(hint);}
 }
 const observer=new ResizeObserver(()=>render());observer.observe(viewport);layout();return {render,update,clearSelection(){selection=null;}};
}
