import {Editor} from './pkg/pixlprfct_core.js';
import {chromeInsets,deviceChromeSvg,orientFrame,deviceScreenRadius} from './device-chrome.js';
import {interactions,withInteractions,interactionFor,triggerLabels} from './prototype-interactions.js';
import {prototypeTimers,timedInteractions} from './prototype-timers.js';
import {prototypePress} from './prototype-press.js';
import {prototypeHover} from './prototype-hover.js';
import {canvasTransitions} from './prototype-transition.js';
import {descendants,visibleInTree} from './selection.js';
import {drawScene,radii,roundedContains} from './appearance.js';
export function prototypeFrames(doc){return doc.shapes.filter(s=>s.kind==='frame'&&!(doc.libraries??[]).some(l=>l.page_id===s.page_id)&&visibleInTree(s,doc.shapes));}
export function prototypeScene(doc,root){return descendants(doc.shapes,[root]).map(s=>s.id===root?{...s,parent_id:0,clip_content:true}:s);}
export function prototypeState(doc,start){
 const frames=new Set(prototypeFrames(doc).map(s=>s.id));if(!frames.has(start))throw new Error('Choose a visible frame to present');
 let initial=start;const history=[start],overlays=[];return{get current(){return history.at(-1);},start(id){if(!frames.has(id))return false;initial=id;overlays.length=0;history.splice(0,history.length,id);return true;},get active(){return overlays.at(-1)?.target??history.at(-1);},get overlays(){return overlays.map(o=>({...o}));},get canBack(){return overlays.length>0||history.length>1;},navigate(id){if(!frames.has(id))return false;overlays.length=0;history.push(id);return true;},open(action){if(!frames.has(action.target)||overlays.length>=16)return false;overlays.push({...action});return true;},swap(target){if(!overlays.length||!frames.has(target))return false;overlays[overlays.length-1]={...overlays.at(-1),target};return true;},close(){overlays.pop();},back(){if(overlays.length)overlays.pop();else if(history.length>1)history.pop();},restart(){overlays.length=0;history.splice(0,history.length,initial);}};
}
export function overlayPlacement(base,frame,position='center',x=0,y=0){
 if(position==='manual')return{x,y};
 return{x:position.endsWith('left')?0:position.endsWith('right')?base.width-frame.width:(base.width-frame.width)/2,y:position.startsWith('top')?0:position.startsWith('bottom')?base.height-frame.height:(base.height-frame.height)/2};
}
export function renderPrototypeControls(host,shape,doc,change,present,{activeIndex=0,select=()=>{}}={}){
 host.replaceChildren();host.hidden=!shape;if(!shape)return;
 const heading=document.createElement('h3');heading.textContent='Interactions';host.append(heading);
 const field=(name,input)=>{const label=document.createElement('label');label.append(document.createTextNode(name),input);input.setAttribute('aria-label',name);host.append(label);};
 const frames=prototypeFrames(doc),list=interactions(shape),items=list.length?list:[null];
 const intro=document.createElement('p');intro.className='prototype-layer-caption';intro.textContent=list.length?`Interactions for ${shape.name}`:'No interactions yet. Choose an action below to get started.';host.append(intro);
 items.forEach((p,index)=>{
  const group=document.createElement('fieldset');group.className='prototype-interaction';group.id=`prototype-interaction-${index}`;group.tabIndex=-1;group.classList.toggle('active',!!p&&index===activeIndex);const legend=document.createElement('legend');legend.textContent='Interaction '+(index+1);group.append(legend);host.append(group);
  const activate=()=>{for(const card of host.querySelectorAll('.prototype-interaction'))card.classList.toggle('active',!!p&&card===group);select(index);};group.onpointerdown=activate;group.onfocusin=activate;
  if(p){const summary=document.createElement('p');summary.className='prototype-connection-summary';summary.textContent=(triggerLabels[p.trigger??'click']??'On click')+' → '+(frames.find(f=>f.id===p.target)?.name??({back:'Go back',close:'Close overlay'}[p.action]??'Choose a destination'));group.append(summary);}
  const body=document.createElement('div');group.append(body);
  renderInteractionControls(body,{...shape,prototype:p},doc,updated=>{const next=[...list];if(updated.prototype)next[index]=updated.prototype;else next.splice(index,1);change(withInteractions(shape,next));},list.filter((_,i)=>i!==index).map(p=>p.trigger??'click'));
  for(const field of body.querySelectorAll('[aria-label]'))field.id=`prototype-${shape.id}-${index}-${field.getAttribute('aria-label').replace(/[^a-z0-9]/gi,'-')}`;
  if(p){const remove=document.createElement('button');remove.type='button';remove.className='delete-interaction';remove.textContent='Delete interaction';remove.setAttribute('aria-label','Delete interaction '+(index+1));remove.onclick=()=>{select(Math.max(0,index-1));change(withInteractions(shape,list.filter((_,i)=>i!==index)));};group.append(remove);}
 });
 const unused=Object.keys(triggerLabels).find(t=>(shape.kind==='frame'||t!=='afterdelay')&&!list.some(p=>(p.trigger??'click')===t));
 const add=document.createElement('button');add.textContent='Add interaction';add.className='wide-button';add.disabled=!unused;add.onclick=()=>{const target=frames.find(f=>f.id!==shape.id);select(list.length);change(withInteractions(shape,[...list,{trigger:unused,action:target?'navigate':'back',target:target?.id??0}]));};host.append(add);
 if(shape.kind==='frame'){const flow=document.createElement('input');flow.type='text';flow.maxLength=128;flow.placeholder='Not a flow start';flow.value=shape.flow_name??'';flow.onchange=()=>change({...shape,flow_name:flow.value.trim()});field('Flow starting point',flow);}
 const play=document.createElement('button');play.className='wide-button';play.textContent='Present prototype';play.disabled=!frames.length;play.onclick=present;host.append(play);
}
function renderInteractionControls(host,shape,doc,change,usedTriggers=[]){
 host.replaceChildren();host.hidden=!shape;if(!shape)return;
 const field=(name,select)=>{const label=document.createElement('label');label.append(document.createTextNode(name),select);select.setAttribute('aria-label',name);host.append(label);};
 const action=document.createElement('select');for(const [value,text] of [['none','None'],['navigate','Navigate to frame'],['back','Go back'],['overlay','Open overlay'],['swap','Swap overlay'],['close','Close overlay']]){const o=document.createElement('option');o.value=value;o.textContent=text;action.append(o);}action.value=shape.prototype?.action??'none';field('Action',action);
 const trigger=document.createElement('select');for(const [value,text] of Object.entries(triggerLabels).filter(([value])=>shape.kind==='frame'||value!=='afterdelay')){const o=document.createElement('option');o.value=value;o.textContent=text;o.disabled=usedTriggers.includes(value);trigger.append(o);}trigger.value=shape.prototype?.trigger??'click';if(action.value!=='none')field('Trigger',trigger);
 const frames=prototypeFrames(doc),target=document.createElement('select');for(const f of frames){const o=document.createElement('option');o.value=f.id;o.textContent=`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;target.append(o);}target.value=shape.prototype?.target??frames[0]?.id??'';if(!target.value&&frames.length)target.value=frames[0].id;
 const position=document.createElement('select');for(const value of ['center','top-left','top-right','bottom-left','bottom-right','manual']){const o=document.createElement('option');o.value=value;o.textContent=value.replaceAll('-',' ');position.append(o);}position.value=shape.prototype?.overlay_position??'center';const outside=document.createElement('input');outside.type='checkbox';outside.checked=!!shape.prototype?.close_on_outside;
 const number=(value,min,max)=>{const n=document.createElement('input');n.type='number';n.min=min;n.max=max;n.value=value;return n;};
 const delay=number(shape.prototype?.delay??800,1,600000);if(action.value!=='none'&&trigger.value==='afterdelay')field('Delay (ms)',delay);
 const offsetX=number(shape.prototype?.overlay_x??0,-1000000,1000000),offsetY=number(shape.prototype?.overlay_y??0,-1000000,1000000),backdropOpacity=number((shape.prototype?.backdrop_opacity??.4)*100,0,100),backdropColor=document.createElement('input');backdropColor.type='color';backdropColor.value=shape.prototype?.backdrop_color??'#000000';
 const transition=document.createElement('select');const kinds=[['instant','Instant'],['dissolve','Dissolve'],...(['overlay','close','swap'].includes(action.value)?[]:[['slide-left','Slide left'],['slide-right','Slide right'],['slide-up','Slide up'],['slide-down','Slide down']])];for(const [value,text] of kinds){const o=document.createElement('option');o.value=value;o.textContent=text;transition.append(o);}transition.value=shape.prototype?.transition??'instant';if(!transition.value)transition.value='dissolve';const duration=document.createElement('input');duration.type='number';duration.min=0;duration.max=10000;duration.value=shape.prototype?.duration??300;const easing=document.createElement('select');for(const value of ['linear','ease-in','ease-out','ease-in-out']){const o=document.createElement('option');o.value=value;o.textContent=value;easing.append(o);}easing.value=shape.prototype?.easing??'ease-in-out';
 const save=()=>{const targets=['navigate','overlay','swap'].includes(action.value);if(targets&&!target.value)return;change({...shape,prototype:action.value==='none'?null:{trigger:trigger.value,delay:Number(delay.value),action:action.value,target:targets?Number(target.value):0,overlay_position:position.value,overlay_x:Number(offsetX.value),overlay_y:Number(offsetY.value),backdrop_color:backdropColor.value,backdrop_opacity:Number(backdropOpacity.value)/100,close_on_outside:outside.checked,transition:['overlay','close','swap'].includes(action.value)&&transition.value.startsWith('slide-')?'dissolve':transition.value,duration:Number(duration.value),easing:easing.value}});};action.onchange=save;trigger.onchange=save;delay.onchange=save;target.onchange=save;position.onchange=save;outside.onchange=save;if(['navigate','overlay','swap'].includes(action.value))field('Destination frame',target);if(action.value==='overlay'){field('Overlay position',position);if(position.value==='manual'){field('Overlay X',offsetX);field('Overlay Y',offsetY);}field('Backdrop color',backdropColor);field('Backdrop opacity (%)',backdropOpacity);field('Close when clicking outside',outside);}
 for(const input of [offsetX,offsetY,backdropColor,backdropOpacity])input.onchange=save;
 if(action.value==='swap'){const note=document.createElement('p');note.textContent='Replaces the top overlay, keeping its placement, backdrop and dismissal settings. Requires an open overlay.';host.append(note);}
 transition.onchange=save;duration.onchange=save;easing.onchange=save;if(action.value!=='none'){field('Animation',transition);if(transition.value!=='instant'){field('Duration (ms)',duration);field('Easing',easing);}}

}
// Fit the complete device, while hit testing continues to use the content viewport.
export function prototypeViewport(frame,width,height,chromeVisible){
 const savedType=frame.device_chrome&&frame.device_chrome!=='none'?frame.device_chrome:null;
 const visible=chromeVisible??(!!savedType&&!frame.device_chrome_hidden);
 const type=visible?(savedType??'auto'):'none';
 const [top,right,bottom,left]=chromeInsets(type,frame.width,frame.height,frame.device_chrome_breakpoints);
 const outerWidth=frame.width+left+right,outerHeight=frame.height+top+bottom;
 const scale=Math.min(Math.max(1,width-32)/outerWidth,Math.max(1,height-32)/outerHeight);
 const chromeX=(width-outerWidth*scale)/2,chromeY=(height-outerHeight*scale)/2;
 return {x:chromeX+left*scale,y:chromeY+top*scale,scale,chromeX,chromeY,outerWidth,outerHeight,screenRadius:deviceScreenRadius(type,frame.width,frame.height,frame.device_chrome_breakpoints),svg:deviceChromeSvg(type,frame.width,frame.height,frame.device_chrome_breakpoints)};
}
export function prototypeOrientationDocument(previewEditor,doc,id,orientation){
 previewEditor.load(JSON.stringify(doc));
 const frame=doc.shapes.find(s=>s.id===id);
 if(frame&&orientation){const next=orientFrame(frame,orientation);if(next.width!==frame.width||next.height!==frame.height)previewEditor.update(JSON.stringify(next));}
 return JSON.parse(previewEditor.snapshot());
}
export function presentPrototype(doc,start,editor,paint,prepare=async()=>{}){
 const previewEditor=new Editor(),orientations=new Map(),chromeVisibility=new Map();let previewDoc=doc,previewKey='';
 previewEditor.load(JSON.stringify(doc));
 const state=prototypeState(doc,start),dialog=document.createElement('dialog');dialog.className='prototype-player';dialog.setAttribute('aria-label','Prototype presentation');
 const toolbar=document.createElement('div');toolbar.className='prototype-toolbar';const back=document.createElement('button'),restart=document.createElement('button'),close=document.createElement('button'),chooser=document.createElement('select'),hotspots=document.createElement('input');back.textContent='Back';restart.textContent='Restart';close.textContent='Close presentation';chooser.setAttribute('aria-label','Presented frame');
 for(const f of prototypeFrames(doc)){const o=document.createElement('option');o.value=f.id;o.textContent=`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;chooser.append(o);}
 const flows=document.createElement('select');flows.setAttribute('aria-label','Flow starting point');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a flow';flows.append(placeholder);for(const f of prototypeFrames(doc).filter(s=>s.flow_name)){const o=document.createElement('option');o.value=f.id;o.textContent=f.flow_name+' / '+f.name;flows.append(o);}flows.hidden=flows.options.length===1;flows.value=doc.shapes.find(s=>s.id===start)?.flow_name?start:'';flows.onchange=()=>{if(flows.value){state.start(Number(flows.value));visit++;render();}};toolbar.append(flows);
 hotspots.type='checkbox';const label=document.createElement('label');label.append(hotspots,document.createTextNode('Show hotspots'));toolbar.append(back,restart,chooser);
 const orientationControls=document.createElement('div');orientationControls.className='device-orientation';orientationControls.setAttribute('role','group');orientationControls.setAttribute('aria-label','Preview orientation');
 const orientationButtons=new Map();for(const value of ['portrait','landscape']){const button=document.createElement('button');button.type='button';button.textContent=value[0].toUpperCase()+value.slice(1);button.setAttribute('aria-pressed','false');button.title='Rotate preview only';button.onclick=()=>{orientations.set(state.current,value);press.reset();hover.reset();pointer=null;render();};orientationButtons.set(value,button);orientationControls.append(button);}const chromeToggle=document.createElement('input');chromeToggle.type='checkbox';
 const chromeLabel=document.createElement('label');chromeLabel.append(document.createTextNode('Show device chrome'),chromeToggle);chromeToggle.title='Show or hide chrome in this preview only';
 chromeToggle.onchange=()=>{chromeVisibility.set(state.current,chromeToggle.checked);press.reset();hover.reset();pointer=null;render();};toolbar.append(orientationControls,chromeLabel,label,close);
 const area=document.createElement('div');area.className='prototype-stage';const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Prototype screen');canvas.style.touchAction='none';area.append(canvas);
 const status=document.createElement('p');status.setAttribute('role','status');const links=document.createElement('details'),summary=document.createElement('summary'),buttons=document.createElement('div');summary.textContent='Screen interactions (keyboard accessible)';links.append(summary,buttons);dialog.append(toolbar,area,status,links);document.body.append(dialog);dialog.showModal();
 const animator=canvasTransitions(canvas,area);
 const chromeImages=new Map();
 const chromeImage=svg=>{
  if(!svg)return Promise.resolve(null);
  if(!chromeImages.has(svg))chromeImages.set(svg,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}));
  return chromeImages.get(svg);
 };
 let transform=null,version=0,visit=0,pointerFrame=0,pointer=null;const hover=prototypeHover(),press=prototypePress(),timers=prototypeTimers(id=>activateId(id,'afterdelay'));
 const activate=s=>{const p=s.prototype;if(!p||!dialog.open||animator.running)return;const playback={...p,transition:state.overlays.length&&p.action==='back'&&p.transition?.startsWith('slide-')?'dissolve':p.transition},snapshot=animator.capture(playback);let ok=true;if(p.action==='back'){if(!state.canBack)return;state.back();}else if(p.action==='close'){if(!state.overlays.length)return;state.close();}else if(p.action==='overlay')ok=state.open(p);else if(p.action==='swap')ok=state.swap(p.target);else if(p.action==='navigate')ok=state.navigate(p.target);if(ok){visit++;render(playback,snapshot);}else status.textContent='Destination unavailable, no overlay to swap, or the overlay limit was reached.';};
 const render=async(config={},snapshot=null)=>{
  timers.pause();animator.cancel();hover.scope(state.active);
  transform=null;const ticket=++version,key=state.current+':'+(orientations.get(state.current)??'saved');
  if(key!==previewKey){previewDoc=prototypeOrientationDocument(previewEditor,doc,state.current,orientations.get(state.current));previewKey=key;}
  const baseScene=prototypeScene(previewDoc,state.current),base=baseScene[0],stack=state.overlays;
  const layers=[{scene:baseScene,offset:{x:0,y:0}},...stack.map(o=>{const scene=prototypeScene(previewDoc,o.target);return{scene,overlay:o,offset:overlayPlacement(base,scene[0],o.overlay_position,o.overlay_x??0,o.overlay_y??0)};})],active=layers.at(-1),frame=active.scene[0];
  for(const [value,button] of orientationButtons)button.setAttribute('aria-pressed',String(value==='portrait'?base.height>=base.width:base.width>base.height));
  timers.scope(visit,timedInteractions(active.scene));
  chooser.value=state.current;back.disabled=!state.canBack;buttons.replaceChildren();
  for(const s of active.scene.filter(s=>s.prototype&&visibleInTree(s,active.scene)))for(const p of interactions(s)){const b=document.createElement('button');b.textContent=s.name+' ['+({click:'Click',mouseenter:'Mouse enter',mouseleave:'Mouse leave',afterdelay:`After ${p.delay??800} ms`,mousedown:'Mouse down / Touch press',mouseup:'Mouse up / Touch release'}[p.trigger??'click'])+'] → '+(p.action==='back'?'Back':p.action==='close'?'Close overlay':(p.action==='overlay'?'Open overlay: ':p.action==='swap'?'Swap overlay: ':'')+(doc.shapes.find(f=>f.id===p.target)?.name??'Unavailable'));b.onclick=()=>activate({...s,prototype:p});buttons.append(b);}
  status.textContent=base.name+' · '+(base.width>base.height?'Landscape':'Portrait')+(stack.length?' · Overlay: '+frame.name:'')+' · Click or hover linked layers. All interactions are available below.';await prepare(layers.flatMap(l=>l.scene));if(ticket!==version||!dialog.open)return;
  const width=Math.max(1,area.clientWidth),height=Math.max(1,area.clientHeight),viewport=prototypeViewport(base,width,height,chromeVisibility.get(state.current)),{x,y,scale}=viewport,dpr=window.devicePixelRatio||1;
  chromeToggle.checked=!!viewport.svg;
  const shell=await chromeImage(viewport.svg);if(ticket!==version||!dialog.open)return;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';
  const ctx=canvas.getContext('2d');ctx.save();ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*x,dpr*y);ctx.beginPath();ctx.roundRect(0,0,base.width,base.height,viewport.screenRadius||radii(base));ctx.clip();
  for(let i=0;i<layers.length;i++){const l=layers[i],f=l.scene[0];if(i){ctx.save();ctx.globalAlpha=l.overlay.backdrop_opacity??.4;ctx.fillStyle=l.overlay.backdrop_color??'#000000';ctx.fillRect(0,0,base.width,base.height);ctx.restore();}ctx.save();ctx.translate(l.offset.x-f.x,l.offset.y-f.y);ctx.beginPath();ctx.roundRect(f.x,f.y,f.width,f.height,radii(f));ctx.clip();drawScene(l.scene,ctx,paint);
   if(hotspots.checked&&i===layers.length-1){ctx.strokeStyle='#0284c7';ctx.lineWidth=2/scale;ctx.setLineDash([5/scale,4/scale]);for(const s of l.scene.filter(s=>s.prototype&&visibleInTree(s,l.scene)))ctx.strokeRect(s.x,s.y,s.width,s.height);}ctx.restore();
  }
  ctx.restore();
  if(shell){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.drawImage(shell,viewport.chromeX,viewport.chromeY,viewport.outerWidth*scale,viewport.outerHeight*scale);ctx.restore();}
  transform={x:x+active.offset.x*scale,y:y+active.offset.y*scale,scale,frame,base,xBase:x,yBase:y,outside:stack.at(-1)?.close_on_outside??false,overlay:stack.length>0};await animator.play(snapshot,config);if(ticket===version&&dialog.open)timers.resume();
 };
 const locate=(clientX,clientY)=>{
  if(!transform||animator.running)return null;const r=canvas.getBoundingClientRect(),t=transform,px=clientX-r.left,py=clientY-r.top,p={x:(px-t.x)/t.scale+t.frame.x,y:(py-t.y)/t.scale+t.frame.y};
  const inside=roundedContains(t.base,{x:(px-t.xBase)/t.scale+t.base.x,y:(py-t.yBase)/t.scale+t.base.y})&&roundedContains(t.frame,p);
  return{inside,hits:inside?JSON.parse(previewEditor.prototype_pointer_hits(t.frame.id,p.x,p.y)):{}};
 };
 const activateId=(id,trigger)=>{const s=previewDoc.shapes.find(s=>s.id===id),p=s&&interactionFor(s,trigger);if(p)activate({...s,prototype:p});};
 canvas.onclick=event=>{if(!press.click()){event.preventDefault();return;}const hit=locate(event.clientX,event.clientY);if(!hit)return;if(!hit.inside){if(transform.overlay&&transform.outside){state.close();visit++;render();}return;}activateId(hit.hits.click,'click');};
  canvas.onpointerdown=event=>{const hit=locate(event.clientX,event.clientY);activateId(press.down(event,hit?.hits),'mousedown');};
  canvas.onpointerup=event=>{const hit=locate(event.clientX,event.clientY);activateId(press.up(event,hit?.hits),'mouseup');};
  const releaseOutside=event=>{if(event.target!==canvas)press.cancel(event);};document.addEventListener('pointerup',releaseOutside);
  canvas.onpointermove=event=>{
  if(event.pointerType==='touch'||event.buttons)return;pointer={x:event.clientX,y:event.clientY};if(pointerFrame)return;
  pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;if(!pointer)return;const hit=locate(pointer.x,pointer.y);if(!hit)return;canvas.style.cursor=(hit.hits.click||hit.hits.mousedown||hit.hits.mouseup||hit.hits.mouseenter?.length||hit.hits.mouseleave?.length)?'pointer':'default';activateId(hover.move(hit.hits),hover.trigger);});
 };
 canvas.onpointerleave=()=>{pointer=null;if(pointerFrame)cancelAnimationFrame(pointerFrame);pointerFrame=0;canvas.style.cursor='default';const id=hover.exit();if(transform&&!animator.running)activateId(id,hover.trigger);};
 canvas.onpointercancel=event=>{press.cancel(event);pointer=null;hover.reset();};
 back.onclick=()=>{state.back();visit++;render();};restart.onclick=()=>{state.restart();visit++;render();};chooser.onchange=()=>{state.navigate(Number(chooser.value));visit++;render();};hotspots.onchange=()=>render();close.onclick=()=>dialog.close();
 const observer=new ResizeObserver(()=>render());observer.observe(area);dialog.onclose=()=>{document.removeEventListener('pointerup',releaseOutside);press.reset();timers.reset();if(pointerFrame)cancelAnimationFrame(pointerFrame);pointer=null;hover.reset();animator.cancel();version++;observer.disconnect();previewEditor.free();dialog.remove();};render();return dialog;
}
