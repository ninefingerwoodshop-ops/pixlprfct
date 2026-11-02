import {icon,iconPaths} from './icons.js';
import {element as el,colorField,numberField,settingRow,syncInput} from './inspector-settings.js';
import {morphPath,morphData} from './svg-animation-morph.js';
import {installMorphNodes} from './svg-animation-nodes.js';
import {checkedPath,editAnchor,continuePath,pencilPath,splitPath,joinEndpoints,isEndpoint} from './svg-animation-drawing-model.js';

const NS='http://www.w3.org/2000/svg';
const anchorIcons={'vector-smooth':'M3 17C3 5 21 5 21 17M5 8h14M12 8v4M10 12h4v4h-4Z','vector-corner':'M3 18 12 7l9 11M10 5h4v4h-4Z'};
const button=(name,glyph,run)=>{const b=el('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.innerHTML=anchorIcons[glyph]?`<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${anchorIcons[glyph]}"/></svg>`:icon(glyph);b.onclick=run;return b;};
export function installSvgDrawing({host,workspace,toolbar,read,select,change,start,refresh,paint,remove,report,restorePanel=()=>{}}){
 let mode='select',draft=null,gesture=null,selection=[0,0],position=null,paintSync=[],activeDocument=null,suppressClick=false,smoothing=50,joinFrom=null,hover=null,hiddenSource=null;
 const attempt=fn=>(...args)=>{try{return fn(...args);}catch(error){report(error.message);}};
 const overlay=document.createElementNS(NS,'svg');overlay.classList.add('svg-drawing-preview');overlay.setAttribute('aria-hidden','true');host.append(overlay);host.tabIndex=-1;
 const palette=el('div','svg-pen-palette');palette.dataset.detachablePanel='pen';palette.dataset.panelLabel='Pen tools';palette.setAttribute('role','toolbar');palette.setAttribute('aria-label','Pen tools');palette.hidden=true;
 let docked=false;try{docked=localStorage.getItem('pixlprfct.svg.pen-dock')==='right';}catch{}
 const saveDock=()=>{try{localStorage.setItem('pixlprfct.svg.pen-dock',docked?'right':'float');}catch{}};
 const heading=el('div','svg-pen-heading'),grip=button('Move Pen toolbar (arrow keys; Home resets)','grip-horizontal',()=>{}),close=button('Close Pen toolbar','close',()=>{restorePanel();docked=false;saveDock();workspace.append(palette);syncDock();setMode('select');});
 const dockButton=button('Dock Pen tools on right','panel-left',()=>{const next=palette.ownerDocument!==document||!docked;restorePanel();docked=next;saveDock();if(docked)document.querySelector('.right-panel').insertBefore(palette,document.getElementById('svg-inspector-panel'));else workspace.append(palette);syncDock();update();});
 function syncDock(){palette.dataset.panelSide=docked?'right':'bottom';palette.classList.toggle('svg-pen-docked',docked);grip.hidden=docked;const label=docked&&palette.ownerDocument===document?'Float Pen tools over stage':'Dock Pen tools on right';dockButton.setAttribute('aria-label',label);dockButton.title=label;dockButton.setAttribute('aria-pressed',String(docked));}
 dockButton.className='svg-pen-dock';grip.className='svg-pen-grip';heading.append(grip,el('strong','','Pen tools'),dockButton,close);palette.append(heading);
 const tools=el('div','svg-pen-tools'),pen=button('Pen (P)','pen',()=>setMode('pen')),pencil=button('Pencil (Shift+P)','pencil',()=>setMode('pencil')),direct=button('Direct Selection (A)','select',()=>setMode('direct'));
 const actions=[['Add midpoint after anchor','plus','insert'],['Delete anchor','minus','delete'],['Smooth anchor','vector-smooth','smooth'],['Corner anchor','vector-corner','corner']].map(([name,glyph,op])=>{
  const b=button(name,glyph,attempt(()=>{const state=nodeState();if(!state?.enabled)return;const value=editAnchor(state.value,...selection,op);if(op==='insert')selection[1]++;else if(op==='delete')selection[1]=Math.min(selection[1],value[selection[0]].points.length-1);savePath(value); }));tools.append(b);return b;
 });
 tools.prepend(pen,pencil,direct);const resume=button('Continue selected endpoint','pen',attempt(()=>{
  const state=nodeState();if(!state?.enabled)return;const value=continuePath(state.value,...selection);nodes.cancel();start();mode='pen';draft={value,path:selection[0],id:read().selected};update();refresh();
 }));tools.append(resume);palette.append(tools);
 const finish=button('Finish open path (Enter)','check',attempt(()=>finishPath(false)));finish.className='svg-pen-finish';finish.append(el('span','','Finish path'));tools.append(finish);
 const split=button('Split path at anchor','cut',attempt(()=>{const state=nodeState();if(!state?.enabled||joinFrom)return;const next=splitPath(state.value,...selection);selection=next.selection;savePath(next.value);}));
 const join=button('Join endpoints','link',()=>{const state=nodeState();if(!state?.enabled)return;joinFrom=joinFrom?null:[...selection];update();});tools.append(split,join);
 const joinHint=el('p','svg-drawing-caption svg-join-hint','Choose another endpoint in this path. Escape cancels.');joinHint.setAttribute('role','status');palette.append(joinHint);
 const penHint=el('p','svg-drawing-caption svg-join-hint','Esc, Enter or Finish path ends an open path. Click the first anchor to close it.');palette.append(penHint);
 const discard=button('Discard unfinished path','close',()=>{cancel();update();});tools.append(discard);
 const deletePath=button('Delete selected path','trash',attempt(()=>{if(!draft&&pathSource()&&read().enabled)remove();}));tools.append(deletePath);
 const pencilOptions=el('div','svg-drawing-paints svg-pencil-options'),smoothingField=numberField('Pencil smoothing (%)',smoothing,v=>{smoothing=v;syncInput(smoothingField.querySelector('input'),v);},{min:0,max:100,step:5});pencilOptions.append(settingRow('Smoothing %',smoothingField),el('p','svg-drawing-caption','Hold Shift to draw straight lines'));palette.append(pencilOptions);
 const paints=el('div','svg-drawing-paints');palette.append(paints);if(docked){document.querySelector('.right-panel').insertBefore(palette,document.getElementById('svg-inspector-panel'));palette.hidden=false;syncDock();}else workspace.append(palette);
 const penTool=button('Pen (P)','pen',()=>setMode('pen')),pencilTool=button('Pencil (Shift+P)','pencil',()=>setMode('pencil')),directTool=button('Direct Selection (A)','select',()=>setMode('direct'));toolbar.append(penTool,pencilTool,directTool);
 // The canvas cursor uses exactly the toolbar's nib, with its tip as hotspot.
 const cursor=`<svg xmlns="${NS}" width="24" height="24" viewBox="0 0 24 24"><path d="${iconPaths.pen}" fill="#2c2c2c" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 host.style.setProperty('--svg-pen-cursor',`url("data:image/svg+xml,${encodeURIComponent(cursor)}") 4 20, crosshair`);
 host.style.setProperty('--svg-pencil-cursor',`url("data:image/svg+xml,${encodeURIComponent(cursor.replace(iconPaths.pen,iconPaths.pencil))}") 4 20, crosshair`);
 function pathSource(){const s=read(),source=s.source?.querySelector('#'+s.selected);return source?.localName==='path'?source:null;}
 function nodeState(){
  const s=read(),source=pathSource();if(mode!=='direct'||!source||draft||s.running||s.animation.tracks.some(t=>t.element===s.selected&&t.property==='morph'))return null;
  try{const value=morphPath(source.getAttribute('d'));if(!value[selection[0]]?.points[selection[1]])selection=[0,0];return {node:s.root.querySelector('#'+s.selected),value,selection,enabled:s.enabled,dragEnabled:!joinFrom};}catch{return null;}
 }
 function savePath(value){
  checkedPath(value);const s=read();if(!s.enabled)return;const root=s.source.cloneNode(true),node=root.querySelector('#'+s.selected);node.setAttribute('d',morphData(value));change(root,s.selected);
 }
 const nodes=installMorphNodes({host,label:'Path anchors',nodeLabel:'Anchor',anchorShape:'circle',overlayClass:'svg-path-nodes',read:nodeState,select:(path,index)=>{selection=[path,index];updateActions();},activate:(path,index,kind)=>{
  if(!joinFrom)return false;const state=nodeState();if(!state?.enabled)return true;
  try{if(kind!=='anchor')throw new Error('Choose an anchor endpoint, not a handle.');const next=joinEndpoints(state.value,joinFrom,[path,index]);joinFrom=null;selection=next.selection;savePath(next.value);}catch(error){report(error.message);}return true;
 },change:attempt(savePath),preview:value=>{const s=read();s.root.querySelector('#'+s.selected)?.setAttribute('d',morphData(value));},report});
 function setMode(next){if(draft&&!draft.pencil&&!gesture&&draft.value[draft.path].points.length>=2)finishPath(false);cancel();start();mode=next;selection=[0,0];if(next==='pen'||next==='pencil')select(null);palette.hidden=next==='select'&&!docked;update();refresh();}
 function restoreSource(){if(hiddenSource){hiddenSource.node.style.visibility=hiddenSource.visibility;hiddenSource=null;}}
 function cancel(){gesture?.cancel();nodes.cancel();draft=null;joinFrom=null;hover=null;restoreSource();overlay.replaceChildren();}
 function suspend(){cancel();mode='select';palette.hidden=!docked;update();}
 function finishPath(closed){
  if(!draft)return;const s=read();if(!s.enabled){cancel();return;}
  const value=structuredClone(draft.value);value[draft.path].closed=closed;checkedPath(value);
  const root=s.source.cloneNode(true);let node=draft.id?root.querySelector('#'+draft.id):document.createElementNS(NS,'path');
  if(!node)throw new Error('The path is no longer available.');
  if(!draft.id){let index=1;while(root.id==='pxv'+index||root.querySelector('#pxv'+index))index++;node.id='pxv'+index;node.setAttribute('data-layer-name',draft.pencil?'Pencil':'Path');for(const [name,p] of Object.entries(s.defaults)){if(name==='strokeWidth')node.setAttribute('stroke-width',p);else{node.setAttribute(name,p.none?'none':p.color);node.setAttribute(name+'-opacity',p.opacity);}}if(draft.pencil){node.setAttribute('stroke-linecap','round');node.setAttribute('stroke-linejoin','round');}root.append(node);}
  node.setAttribute('d',morphData(value));mode=draft.pencil?'pencil':'direct';draft=null;hover=null;restoreSource();overlay.replaceChildren();selection=[0,0];change(root,node.id);update();
 }
 function drawDraft(){
  overlay.replaceChildren();if(!draft||!draft.value[0]?.points.length)return;const s=read(),matrix=(draft.id?s.root.querySelector('#'+draft.id):s.root)?.getScreenCTM();if(!matrix)return;
  const box=host.getBoundingClientRect(),value=draft.value,group=document.createElementNS(NS,'g');group.setAttribute('transform',`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e-box.left} ${matrix.f-box.top})`);
  const path=document.createElementNS(NS,'path');path.setAttribute('d',morphData(value));path.setAttribute('class','svg-draft-stroke');group.append(path);overlay.append(group);
  if(draft.id){const source=s.root.querySelector('#'+draft.id),style=getComputedStyle(source);for(const name of ['fill','stroke','fill-opacity','stroke-opacity','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','opacity','fill-rule','vector-effect'])path.setAttribute(name,style.getPropertyValue(name));if(!hiddenSource){hiddenSource={node:source,visibility:source.style.visibility};source.style.visibility='hidden';}}
  else for(const [name,p] of Object.entries(s.defaults)){if(name==='strokeWidth')path.setAttribute('stroke-width',p);else{path.setAttribute(name,p.none?'none':p.color);path.setAttribute(name+'-opacity',p.opacity);}}
  if(draft.pencil){path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');return;}
  if(hover&&!gesture){const next=path.cloneNode(false),last=value[draft.path].points.at(-1);next.setAttribute('class','svg-draft-next');next.setAttribute('fill','none');next.setAttribute('d',morphData([{closed:false,points:[last,[hover.x,hover.y,hover.x,hover.y,hover.x,hover.y]]}]));group.append(next);}
  const outline=document.createElementNS(NS,'path');outline.setAttribute('d',morphData(value));outline.setAttribute('class','svg-morph-outline');outline.setAttribute('vector-effect','non-scaling-stroke');group.append(outline);
  const point=(x,y)=>new DOMPoint(x,y).matrixTransform(matrix);
  value.forEach(part=>part.points.forEach(p=>{
   const a=point(p[0],p[1]);for(const offset of [2,4]){if(p[offset]===p[0]&&p[offset+1]===p[1])continue;const b=point(p[offset],p[offset+1]),line=document.createElementNS(NS,'path');line.setAttribute('d',`M${a.x-box.left} ${a.y-box.top}L${b.x-box.left} ${b.y-box.top}`);line.setAttribute('class','svg-morph-tangent');overlay.append(line);dot(b,2.5);}
   dot(a,3);
  }));
  function dot(p,r){const n=document.createElementNS(NS,'circle');n.setAttribute('cx',p.x-box.left);n.setAttribute('cy',p.y-box.top);n.setAttribute('r',r);n.setAttribute('class','svg-morph-glyph');overlay.append(n);}
 }
 function updateActions(){const state=nodeState(),endpoint=state&&isEndpoint(state.value[selection[0]],selection[1]);actions.forEach(b=>b.disabled=!state?.enabled||!!joinFrom);resume.disabled=!state?.enabled||!endpoint||!!joinFrom;finish.disabled=!draft||draft.pencil||draft.value[draft.path].points.length<2||!read().enabled;
  split.disabled=!state?.enabled||!!joinFrom||endpoint;join.disabled=!state?.enabled||!endpoint;join.setAttribute('aria-pressed',String(!!joinFrom));joinHint.hidden=!joinFrom;
  penHint.hidden=mode!=='pen';discard.disabled=!draft;deletePath.disabled=!read().enabled||!pathSource()||!!draft;
 }
 function clamp(){if(docked||palette.ownerDocument!==document)return;const w=workspace.clientWidth,h=workspace.clientHeight;position??={x:w-palette.offsetWidth-16,y:56};position.x=Math.max(8,Math.min(position.x,Math.max(8,w-palette.offsetWidth-8)));position.y=Math.max(8,Math.min(position.y,Math.max(8,h-palette.offsetHeight-72)));palette.style.left=position.x+'px';palette.style.top=position.y+'px';}
 function update(){
  syncDock();const s=read();if(activeDocument!==s.animation){cancel();activeDocument=s.animation;}if(!s.enabled)cancel();
  host.dataset.drawingTool=mode;workspace.dataset.drawingTool=mode;
  toolbar.querySelector('#svg-select-tool')?.setAttribute('aria-pressed',String(mode==='select'));
  for(const b of [pen,penTool])b.setAttribute('aria-pressed',String(mode==='pen'));for(const b of [direct,directTool])b.setAttribute('aria-pressed',String(mode==='direct'));
  for(const b of [pencil,pencilTool])b.setAttribute('aria-pressed',String(mode==='pencil'));pencilOptions.hidden=mode!=='pencil';const input=smoothingField.querySelector('input');input.disabled=!s.enabled;syncInput(input,smoothing);
  nodes.update();drawDraft();updateActions();paintSync=paintSync.filter(({host})=>host.isConnected);paintSync.forEach(({sync})=>sync());if(!palette.hidden)clamp();
 }
 function paintControls(container,prefix=''){
  const group=el('div','svg-drawing-paints');container.append(group);
  const caption=el('p','svg-drawing-caption');group.append(caption);
  const syncs=[()=>{caption.textContent=read().selected?'Selected artwork':'New path defaults';}];
  for(const name of ['fill','stroke']){
   const label=prefix+(name==='fill'?'Fill':'Stroke'),row=el('div','svg-drawing-paint-row'),field=colorField(group,label,()=>read().paints[name],attempt(value=>paint(name,value))),none=button(label+' none','minus',attempt(()=>paint(name,{none:!read().paints[name].none})));
   row.append(el('span','svg-paint-label',name==='fill'?'Fill':'Stroke'),field,none);group.append(row);syncs.push(()=>{field.sync();none.setAttribute('aria-pressed',String(read().paints[name].none));row.querySelectorAll('input,button').forEach(n=>n.disabled=!read().enabled);});
  }
  const width=numberField(prefix+'Stroke width',read().paints.strokeWidth,attempt(v=>paint('strokeWidth',v)),{min:0,max:10000});group.append(settingRow('Weight',width));syncs.push(()=>{const input=width.querySelector('input');if(input.ownerDocument.activeElement!==input)input.value=read().paints.strokeWidth;input.disabled=!read().enabled;});
  const sync=()=>syncs.forEach(fn=>fn());paintSync.push({host:group,sync});sync();return group;
 }
 paintControls(paints,'Pen ');
 function beginPencil(e){
  start();select(null);const matrix=read().root?.getScreenCTM();if(!matrix)return;
  const inverse=matrix.inverse(),samples=[{x:e.clientX,y:e.clientY}];let straight=false,travel=0;
  const toSvg=value=>value.map(part=>({...part,points:part.points.map(p=>{const result=[];for(let i=0;i<6;i+=2){const q=new DOMPoint(p[i],p[i+1]).matrixTransform(inverse);result.push(q.x,q.y);}return result;})}));
  draft={value:[{closed:false,points:[]}],path:0,id:null,pencil:true};host.setPointerCapture(e.pointerId);
  const raw=()=>{if(!straight)return samples;const first=samples[0],last=samples.at(-1),r=Math.hypot(last.x-first.x,last.y-first.y),a=Math.round(Math.atan2(last.y-first.y,last.x-first.x)/(Math.PI/4))*Math.PI/4;return [first,{x:first.x+r*Math.cos(a),y:first.y+r*Math.sin(a)}];};
  const sample=event=>{
   straight=event.shiftKey;const p={x:event.clientX,y:event.clientY},last=samples.at(-1);travel=Math.max(travel,Math.hypot(p.x-samples[0].x,p.y-samples[0].y));
   if(p.x!==last.x||p.y!==last.y){if(samples.length===4096)throw new Error('Pencil strokes support up to 4,096 samples. Draw a shorter stroke.');samples.push(p);}
  };
  const move=event=>{if(event.pointerId!==e.pointerId)return;try{if(!read().enabled){abort();return;}sample(event);draft.value=toSvg([{closed:false,points:raw().map(p=>[p.x,p.y,p.x,p.y,p.x,p.y])}]);drawDraft();}catch(error){abort();report(error.message);}};
  const clear=()=>{host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',done);host.removeEventListener('pointercancel',abort);host.removeEventListener('lostpointercapture',abort);window.removeEventListener('blur',abort);gesture=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);};
  const abort=()=>{clear();draft=null;drawDraft();updateActions();};
  const done=event=>{if(event.pointerId!==e.pointerId)return;try{sample(event);clear();if(!read().enabled||travel<2){abort();return;}const value=pencilPath(raw(),smoothing);if(!value){abort();return;}draft.value=checkedPath(toSvg(value));finishPath(false);}catch(error){abort();report(error.message);}};
  gesture={cancel:abort};host.addEventListener('pointermove',move);host.addEventListener('pointerup',done);host.addEventListener('pointercancel',abort);host.addEventListener('lostpointercapture',abort);window.addEventListener('blur',abort);drawDraft();updateActions();
 }
 host.addEventListener('pointerdown',attempt(e=>{
  if(!['pen','pencil'].includes(mode)||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();suppressClick=true;if(!read().enabled||gesture)return;host.focus({preventScroll:true});
  if(mode==='pencil'){beginPencil(e);return;}
  hover=null;start();const s=read(),node=draft?.id?s.root.querySelector('#'+draft.id):s.root,matrix=node?.getScreenCTM();if(!matrix)return;
  const inverse=matrix.inverse(),point=new DOMPoint(e.clientX,e.clientY).matrixTransform(inverse);if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
  const before=draft?structuredClone(draft):null;
  if(!draft)draft={value:[{closed:false,points:[]}],path:0,id:null};
  const points=draft.value[draft.path].points;
  if(points.length>=2){const first=new DOMPoint(points[0][0],points[0][1]).matrixTransform(matrix);if(Math.hypot(e.clientX-first.x,e.clientY-first.y)<=8){finishPath(true);return;}}
  if(draft.value.reduce((n,p)=>n+p.points.length,0)>=512)throw new Error('Paths support up to 512 anchors.');
  if(e.shiftKey&&points.length){const last=points.at(-1),length=Math.hypot(point.x-last[0],point.y-last[1]),angle=Math.round(Math.atan2(point.y-last[1],point.x-last[0])/(Math.PI/4))*Math.PI/4;point.x=last[0]+Math.cos(angle)*length;point.y=last[1]+Math.sin(angle)*length;}
  if(Math.abs(point.x)>100000||Math.abs(point.y)>100000){draft=before;throw new Error('Path coordinates must stay within ±100,000.');}
  const p=[point.x,point.y,point.x,point.y,point.x,point.y];points.push(p);host.setPointerCapture(e.pointerId);
  const move=event=>{if(event.pointerId!==e.pointerId)return;const at=new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse);if(Math.hypot(event.clientX-e.clientX,event.clientY-e.clientY)<2)return;let dx=at.x-point.x,dy=at.y-point.y;if(event.shiftKey){const r=Math.hypot(dx,dy),a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;dx=Math.cos(a)*r;dy=Math.sin(a)*r;}if([point.x-dx,point.y-dy,point.x+dx,point.y+dy].some(v=>!Number.isFinite(v)||Math.abs(v)>100000))return;p.splice(2,4,point.x-dx,point.y-dy,point.x+dx,point.y+dy);drawDraft();};
  const clear=()=>{host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',done);host.removeEventListener('pointercancel',abort);host.removeEventListener('lostpointercapture',abort);gesture=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);};
  const abort=()=>{clear();draft=before;drawDraft();updateActions();},done=event=>{if(event.pointerId!==e.pointerId)return;clear();drawDraft();updateActions();};
  gesture={cancel:abort};host.addEventListener('pointermove',move);host.addEventListener('pointerup',done);host.addEventListener('pointercancel',abort);host.addEventListener('lostpointercapture',abort);drawDraft();updateActions();
 }),true);
 host.addEventListener('pointermove',e=>{
  if(mode!=='pen'||!draft||gesture||!read().enabled)return;const s=read(),node=draft.id?s.root.querySelector('#'+draft.id):s.root,matrix=node?.getScreenCTM();if(!matrix)return;
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>100000||Math.abs(p.y)>100000)return;
  if(e.shiftKey){const last=draft.value[draft.path].points.at(-1),r=Math.hypot(p.x-last[0],p.y-last[1]),a=Math.round(Math.atan2(p.y-last[1],p.x-last[0])/(Math.PI/4))*Math.PI/4;p.x=last[0]+Math.cos(a)*r;p.y=last[1]+Math.sin(a)*r;}
  hover=p;drawDraft();
 });
 host.addEventListener('pointerleave',()=>{hover=null;if(draft&&!gesture)drawDraft();});
 host.addEventListener('click',e=>{if(mode==='pen'||mode==='pencil'||suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 grip.onkeydown=e=>{if(e.key==='Home'){e.preventDefault();position=null;clamp();}else if(e.key.startsWith('Arrow')){e.preventDefault();e.stopPropagation();const d=e.shiftKey?10:1;position.x+=(e.key==='ArrowRight'?d:e.key==='ArrowLeft'?-d:0);position.y+=(e.key==='ArrowDown'?d:e.key==='ArrowUp'?-d:0);clamp();}};
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();clamp();const before={...position};grip.setPointerCapture(e.pointerId);
  const move=event=>{position={x:before.x+event.clientX-e.clientX,y:before.y+event.clientY-e.clientY};clamp();};
  const done=()=>{grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',done);grip.removeEventListener('pointercancel',abort);grip.removeEventListener('lostpointercapture',abort);window.removeEventListener('keydown',escape,true);if(grip.hasPointerCapture(e.pointerId))grip.releasePointerCapture(e.pointerId);};
  const abort=()=>{position=before;done();clamp();},escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();abort();}};
  grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',done);grip.addEventListener('pointercancel',abort);grip.addEventListener('lostpointercapture',abort);window.addEventListener('keydown',escape,true);
 };
 const keydown=attempt(e=>{
  if(document.documentElement.dataset.panelDragging)return;
  if(e.target.closest('input,textarea,select,[role=listbox],[role=menu],[popover],dialog,[contenteditable=true]')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Escape'&&nodes.dragging)return;
  if(e.key==='Escape'&&mode!=='select'){e.preventDefault();e.stopImmediatePropagation();if(gesture){gesture.cancel();update();}else if(draft&&!draft.pencil&&draft.value[draft.path].points.length>=2){finishPath(false);setMode('select');}else if(draft||joinFrom){cancel();update();}else setMode('select');}
  else if(e.key==='Enter'&&draft&&!draft.pencil){e.preventDefault();e.stopImmediatePropagation();gesture?.cancel();finishPath(false);}
  else if(['p','a','v'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();setMode(e.key.toLowerCase()==='p'&&e.shiftKey?'pencil':({p:'pen',a:'direct',v:'select'})[e.key.toLowerCase()]);}
 });
 window.addEventListener('keydown',keydown,true);
 new ResizeObserver(()=>{if(!palette.hidden)clamp();}).observe(workspace);
 return {update,cancel,suspend,setMode,paintControls,keydown,get active(){return mode!=='select';},get drafting(){return !!draft;},get mode(){return mode;}};
}
