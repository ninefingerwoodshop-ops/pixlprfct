import {icon} from './icons.js';
import {properties,resizeDuration} from './svg-animation-model.js';
import {keyframeId,keyframeMoveDelta,moveKeyframes,retimeKeyframes,reverseKeyframes,deleteKeyframes,copyKeyframes,pasteKeyframes,pasteKeyframesToElement} from './svg-animation-keyframes.js';
import {showContextMenu} from './context-menu.js';

export function installSvgTimeline({read,layers,change,selectKey,seek,time,play,playing,report,addKey,destination=()=>null,editable=()=>true}){
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls??'';if(text)n.textContent=text;return n;};
 const button=(name,glyph,run)=>{const n=el('button');n.type='button';n.title=name;n.setAttribute('aria-label',name);n.innerHTML=icon(glyph);n.onclick=run;return n;};
 const panel=el('section');panel.id='motion-timeline';panel.setAttribute('aria-label','SVG animation timeline');
 const grip=el('div','motion-resize');grip.setAttribute('role','separator');grip.tabIndex=0;grip.setAttribute('aria-label','Resize Motion timeline');grip.setAttribute('aria-orientation','horizontal');
 const controls=el('div','timeline-controls'),toggle=button('Play','play',play),reset=button('Go to start','skip-back',()=>seek(0)),box=el('div','timeline-time'),clock=el('input'),duration=el('input'),unit=el('span','','ms');
 for(const [input,name] of [[clock,'Current time'],[duration,'Duration']]){input.type='number';input.min='0';input.max='60000';input.setAttribute('aria-label',name);}
 box.append(clock,duration,unit);const loop=button('Loop','repeat',()=>change({...read(),loop:!read().loop})),collapse=button('Collapse Motion timeline','timeline-collapse',()=>{collapsed=!collapsed;layout();});controls.append(toggle,reset,box,loop);
 const labels=el('div','timeline-labels'),viewport=el('div','timeline-viewport'),content=el('div','timeline-content'),ruler=el('div','timeline-ruler'),tracks=el('div','timeline-tracks'),head=el('div','timeline-playhead');head.append(el('div','timeline-playhead-cap'));
 viewport.tabIndex=0;viewport.setAttribute('aria-label','Keyframes timeline');
 viewport.title='Shift/Cmd/Ctrl-click or drag to select keyframes. Cmd/Ctrl+C copies; Cmd/Ctrl+V pastes on the original tracks; Cmd/Ctrl+Shift+V pastes to the selected element. Arrow keys move the selection. Right-click for actions.';
 const status=el('span','svg-timeline-status');status.id='svg-timeline-status';status.setAttribute('role','status');viewport.setAttribute('aria-describedby',status.id);
 ruler.tabIndex=0;ruler.setAttribute('role','slider');ruler.setAttribute('aria-label','Timeline scrubber');ruler.setAttribute('aria-valuemin','0');content.append(ruler,tracks,head);viewport.append(content);
 const zooms=el('div','timeline-zoom');zooms.append(button('Zoom out on timeline','minus',()=>zoom(1/1.5)),button('Zoom in on timeline','plus',()=>zoom(1.5)));
 panel.append(grip,controls,collapse,labels,viewport,zooms,status);document.body.append(panel);
 let height=200,collapsed=false,magnification=1,selection=[],active=null,dragging=false,clipboard=null,sourceSvg=read().svg;
 const safe=fn=>{try{fn();}catch(e){report(e.message);render();}};
 const scale=()=>Math.max(.001,(viewport.clientWidth-32)/read().duration)*magnification;
 const point=e=>Math.round(Math.max(0,Math.min(read().duration,(e.clientX-viewport.getBoundingClientRect().left+viewport.scrollLeft-16)/scale())));
 const modified=e=>e.shiftKey||e.ctrlKey||e.metaKey;
 const ref=(track,key)=>({element:track.element,property:track.property,time:key.time});
 const allKeys=()=>read().tracks.flatMap(track=>track.keys.map(key=>ref(track,key)));
 const unique=keys=>[...new Map(keys.map(key=>[keyframeId(key),key])).values()];
 const has=key=>selection.some(value=>keyframeId(value)===keyframeId(key));
 const focus=()=>viewport.focus({preventScroll:true});
 function announce(text=`${selection.length} keyframe${selection.length===1?'':'s'} selected.`){status.textContent=text;}
 function paintSelection(){const ids=new Set(selection.map(keyframeId));for(const button of tracks.querySelectorAll('[data-keyframe]')){const selected=ids.has(button.dataset.keyframe);button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}announce();}
 function notify(){if(!active||!has(active))active=selection.at(-1)??null;selectKey(active,structuredClone(selection));paintSelection();}
 function setSelection(keys,primary=keys.at(-1)??null){selection=unique(keys);active=primary;notify();}
 function canChange(){if(editable())return true;report('This timeline is read-only. Start editing before changing keyframes.');return false;}
 function apply(result,primary=result.selection.at(-1)??null){if(!canChange()){render();return;}selection=result.selection;active=primary;change(result.animation);notify();render();focus();}
 function move(delta){const index=active?selection.findIndex(key=>keyframeId(key)===keyframeId(active)):-1,result=moveKeyframes(read(),selection,delta);apply(result,result.selection[index]);if(active)seek(active.time);}
 function remove(){if(!selection.length||!canChange())return;const next=deleteKeyframes(read(),selection);selection=[];active=null;change(next);notify();focus();}
 function copy(){clipboard=copyKeyframes(read(),selection);announce(`${selection.length} keyframes copied. Paste on the original tracks, or select another element and use Paste to selected element.`);}
 function paste(){apply(pasteKeyframes(read(),clipboard,time()));}
 function pasteToElement(){if(!canChange())return;const target=destination();apply(pasteKeyframesToElement(read(),clipboard,time(),target?.element,target?.origin));}
 function reverse(){if(!canChange())return;const index=selection.findIndex(key=>active&&keyframeId(key)===keyframeId(active)),result=reverseKeyframes(read(),selection);apply(result,result.selection[index]);if(active)seek(active.time);}
 function selectAll(){setSelection(allKeys());focus();}
 function menu(event){
  const target=event.target.closest('[data-keyframe]');
  if(target){const key=JSON.parse(target.dataset.keyframe),value={element:key[0],property:key[1],time:key[2]};if(!has(value))setSelection([value]);}
  showContextMenu(event,[
   {label:'Copy keyframes',shortcut:'⌘/Ctrl C',enabled:selection.length>0,run:()=>safe(copy)},
   {label:'Paste keyframes',shortcut:'⌘/Ctrl V',enabled:!!clipboard&&editable(),run:()=>safe(paste)},
   {label:'Paste to selected element',shortcut:'⇧⌘/Ctrl V',enabled:!!clipboard&&!!destination()&&editable(),run:()=>safe(pasteToElement)},
   {separator:true},
   {label:'Reverse keyframes',enabled:editable()&&new Set(selection.map(key=>key.time)).size>1,run:()=>safe(reverse)},
   {label:'Delete keyframes',shortcut:'Delete',enabled:selection.length>0&&editable(),run:()=>safe(remove)},
   {label:'Select all keyframes',shortcut:'⌘/Ctrl A',enabled:read().tracks.length>0,run:selectAll},
  ],viewport,{label:'Keyframe actions',heading:`${selection.length} keyframe${selection.length===1?'':'s'} selected`,anchor:event.type==='keydown'?document.activeElement:null});
 }
 function layout(){document.body.style.setProperty('--timeline-height',(collapsed?48:height)+'px');panel.classList.toggle('timeline-collapsed',collapsed);grip.setAttribute('aria-valuenow',String(height));collapse.setAttribute('aria-label',collapsed?'Expand Motion timeline':'Collapse Motion timeline');render();}
 function zoom(factor){magnification=Math.max(1,Math.min(32,magnification*factor));render();}
 clock.onchange=()=>seek(Number(clock.value));duration.onchange=()=>safe(()=>change(resizeDuration(read(),Number(duration.value))));
 viewport.onscroll=()=>{labels.scrollTop=viewport.scrollTop;};viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15);}},{passive:false});
 function pointerDrag(target,event,onMove,onDone=()=>{},onCancel=()=>{}){
  target.setPointerCapture(event.pointerId);dragging=true;
  const move=ev=>{if(ev.pointerId===event.pointerId)onMove(ev);},finish=ev=>{if(ev.pointerId!==event.pointerId)return;cleanup();onDone();},cancel=()=>{cleanup();onCancel();},escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();}};
  const cleanup=()=>{dragging=false;target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',cancel);target.removeEventListener('lostpointercapture',cancel);window.removeEventListener('keydown',escape,true);if(target.hasPointerCapture(event.pointerId))target.releasePointerCapture(event.pointerId);};
  target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',cancel);target.addEventListener('lostpointercapture',cancel);window.addEventListener('keydown',escape,true);
 }
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const start=height,y=e.clientY;pointerDrag(grip,e,ev=>{height=Math.round(Math.max(120,Math.min(innerHeight*.7,start+y-ev.clientY)));layout();},layout,()=>{height=start;layout();});};
 grip.onkeydown=e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();height=Math.max(120,Math.min(innerHeight*.7,height+(e.key==='ArrowUp'?10:-10)));layout();}};
 ruler.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const before=time();seek(point(e));pointerDrag(ruler,e,ev=>seek(point(ev)),()=>{},()=>seek(before));};
 ruler.onkeydown=e=>{if(['Home','End','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();seek(e.key==='Home'?0:e.key==='End'?read().duration:time()+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?100:10));}};
 function choose(track,key,event){
  const value=ref(track,key);
  if(modified(event))setSelection(has(value)?selection.filter(item=>keyframeId(item)!==keyframeId(value)):[...selection,value]);
  else if(has(value)){active=value;notify();}else setSelection([value]);
  seek(key.time);
 }
 function keyDrag(e,track,key){
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();const target=e.currentTarget,x=e.clientX,original=read(),px=scale();let delta=0,moved=false;
  // Keep the captured key mounted, including when choosing another element.
  dragging=true;choose(track,key,e);dragging=false;target.focus();if(!has(ref(track,key)))return;
  const before=structuredClone(selection),buttons=[...tracks.querySelectorAll('[data-keyframe]')].filter(button=>button.getAttribute('aria-pressed')==='true');
  pointerDrag(target,e,ev=>{
   if(!moved&&Math.abs(ev.clientX-x)<3)return;moved=true;
   let offset=(ev.clientX-x)/px;if(ev.shiftKey)offset=Math.round((key.time+offset)/100)*100-key.time;
   delta=keyframeMoveDelta(original,before,offset);
   for(const button of buttons)button.style.left=12+(JSON.parse(button.dataset.keyframe)[2]+delta)*px+'px';
  },()=>safe(()=>{if(moved&&delta){if(read()!==original)throw new Error('The animation changed during the drag. Select the keyframes again.');const result=moveKeyframes(original,before,delta);apply(result,result.selection.find(value=>value.element===track.element&&value.property===track.property&&value.time===key.time+delta));if(active)seek(active.time);}else render();focus();}),()=>{render();focus();});
 }
 const coordinates=e=>{const bounds=viewport.getBoundingClientRect();return {x:e.clientX-bounds.left+viewport.scrollLeft,y:e.clientY-bounds.top+viewport.scrollTop};};
 content.onpointerdown=e=>{
  if(e.button!==0||e.target.closest('.timeline-ruler,[data-keyframe]'))return;
  e.preventDefault();focus();const start=coordinates(e),before=structuredClone(selection),beforeActive=active,additive=modified(e),marquee=el('div','svg-keyframe-marquee');let moved=false;
  content.append(marquee);
  pointerDrag(e.target.closest('.timeline-track')??content,e,ev=>{
   const end=coordinates(ev);if(!moved&&Math.hypot(end.x-start.x,end.y-start.y)<3)return;moved=true;
   const left=Math.min(start.x,end.x),right=Math.max(start.x,end.x),top=Math.min(start.y,end.y),bottom=Math.max(start.y,end.y);
   Object.assign(marquee.style,{left:left+'px',top:top+'px',width:right-left+'px',height:bottom-top+'px'});
   const found=[];
   for(const button of tracks.querySelectorAll('[data-keyframe]')){const bounds=button.getBoundingClientRect(),p=coordinates({clientX:bounds.x+bounds.width/2,clientY:bounds.y+bounds.height/2});if(p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom){const [element,property,time]=JSON.parse(button.dataset.keyframe);found.push({element,property,time});}}
   selection=unique([...(additive?before:[]),...found]);active=selection.at(-1)??null;paintSelection();
  },()=>{marquee.remove();if(!moved&&!additive)selection=[];notify();},()=>{marquee.remove();selection=before;active=beforeActive;notify();});
 };
 viewport.oncontextmenu=menu;
 panel.addEventListener('keydown',e=>{
  if(e.target.closest('input')||e.target===ruler||e.target===grip)return;
  if(e.target.closest('.timeline-controls,.timeline-zoom')||e.target===collapse)return;
  const command=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
  if(command&&['a','c','v'].includes(key)){e.preventDefault();e.stopPropagation();safe(key==='a'?selectAll:key==='c'?copy:e.shiftKey?pasteToElement:paste);return;}
  if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();e.stopPropagation();menu(e);return;}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setSelection([]);return;}
  if(e.key===' '){e.preventDefault();e.stopPropagation();play();return;}
  if(selection.length&&['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();safe(remove);}
  if(selection.length&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();safe(()=>move((e.key==='ArrowLeft'?-1:1)*(e.shiftKey?100:10)));}
 });
 function update(){const a=read();if(document.activeElement!==clock)clock.value=Math.round(time());if(document.activeElement!==duration)duration.value=a.duration;head.style.left=16+time()*scale()+'px';ruler.setAttribute('aria-valuenow',String(Math.round(time())));ruler.setAttribute('aria-valuemax',String(a.duration));toggle.setAttribute('aria-label',playing()?'Pause':'Play');toggle.innerHTML=icon(playing()?'pause':'play');toggle.disabled=!a.tracks.length;loop.setAttribute('aria-pressed',String(a.loop));}
 function render(){
  update();if(dragging)return;const a=read(),px=scale();
  if(sourceSvg!==a.svg){clipboard=null;selection=[];active=null;sourceSvg=a.svg;}
  const existing=new Set(allKeys().map(keyframeId));selection=selection.filter(key=>existing.has(keyframeId(key)));if(active&&!has(active))active=selection.at(-1)??null;
  content.style.width=Math.max(viewport.clientWidth,32+a.duration*px)+'px';labels.replaceChildren();tracks.replaceChildren();ruler.replaceChildren();
  const step=[10,20,50,100,200,500,1000,2000,5000,10000].find(v=>v*px>=70)??10000;
  for(let t=0;t<=a.duration;t+=step/5){const tick=el('span','timeline-tick'+(t%step===0?' major':''));tick.style.left=16+t*px+'px';if(t%step===0)tick.append(el('span','',Number((t/1000).toFixed(2))+'s'));ruler.append(tick);}
  const chooseRow=(event,rows)=>{const keys=rows.flatMap(track=>track.keys.map(key=>ref(track,key)));setSelection(modified(event)?unique([...selection,...keys]):keys);focus();};
  for(const layer of layers()){
   const rows=a.tracks.filter(t=>t.element===layer.id);if(!rows.length)continue;
   const label=el('button','timeline-track-label timeline-layer-row',layer.name);label.onclick=e=>chooseRow(e,rows);labels.append(label);tracks.append(el('div','timeline-track timeline-layer-row'));
   for(const track of rows){
    const caption=el('button','timeline-track-label',properties[track.property].label);caption.onclick=e=>chooseRow(e,[track]);labels.append(caption);const row=el('div','timeline-track');row.ondblclick=e=>{if(!e.target.closest('[data-keyframe]'))addKey(track,point(e));};
    for(const key of track.keys){const b=el('button','timeline-keyframe');b.dataset.keyframe=keyframeId(ref(track,key));b.setAttribute('aria-label',`${layer.name} ${properties[track.property].label} keyframe at ${key.time} ms`);b.style.left=12+key.time*px+'px';b.onpointerdown=e=>keyDrag(e,track,key);b.onclick=e=>{if(e.detail===0){choose(track,key,e);render();focus();}};row.append(b);}tracks.append(row);
   }
  }
  if(!a.tracks.length)tracks.append(el('p','svg-timeline-empty','Select an element and add an animator to start.'));
  paintSelection();
 }
 const observer=new ResizeObserver(()=>render());observer.observe(viewport);layout();return {render,update,
  retime(keys,start,duration,primary){
   if(!canChange())return;
   const index=keys.findIndex(key=>keyframeId(key)===keyframeId(primary)),result=retimeKeyframes(read(),keys,start,duration);
   apply(result,result.selection[index]);if(active)seek(active.time);
  },
  clearSelection(){selection=[];active=null;paintSelection();}};
}
