import {descendants,visibleInTree} from './selection.js';
import {drawScene,radii,roundedContains} from './appearance.js';
export function prototypeFrames(doc){return doc.shapes.filter(s=>s.kind==='frame'&&visibleInTree(s,doc.shapes));}
export function prototypeScene(doc,root){return descendants(doc.shapes,[root]).map(s=>s.id===root?{...s,parent_id:0,clip_content:true}:s);}
export function prototypeState(doc,start){
 const frames=new Set(prototypeFrames(doc).map(s=>s.id));if(!frames.has(start))throw new Error('Choose a visible frame to present');
 let initial=start;const history=[start],overlays=[];return{get current(){return history.at(-1);},start(id){if(!frames.has(id))return false;initial=id;overlays.length=0;history.splice(0,history.length,id);return true;},get active(){return overlays.at(-1)?.target??history.at(-1);},get overlays(){return overlays.map(o=>({...o}));},get canBack(){return overlays.length>0||history.length>1;},navigate(id){if(!frames.has(id))return false;overlays.length=0;history.push(id);return true;},open(action){if(!frames.has(action.target)||overlays.length>=16)return false;overlays.push({...action});return true;},close(){overlays.pop();},back(){if(overlays.length)overlays.pop();else if(history.length>1)history.pop();},restart(){overlays.length=0;history.splice(0,history.length,initial);}};
}
export function overlayPlacement(base,frame,position='center'){
 return{x:position.endsWith('left')?0:position.endsWith('right')?base.width-frame.width:(base.width-frame.width)/2,y:position.startsWith('top')?0:position.startsWith('bottom')?base.height-frame.height:(base.height-frame.height)/2};
}
export function renderPrototypeControls(host,shape,doc,change,present){
 host.replaceChildren();host.hidden=!shape;if(!shape)return;
 const heading=document.createElement('h3');heading.textContent='Prototype';host.append(heading);
 const field=(name,select)=>{const label=document.createElement('label');label.append(document.createTextNode(name),select);select.setAttribute('aria-label',name);host.append(label);};
 const action=document.createElement('select');for(const [value,text] of [['none','None'],['navigate','Navigate to frame'],['back','Go back'],['overlay','Open overlay'],['close','Close overlay']]){const o=document.createElement('option');o.value=value;o.textContent=text;action.append(o);}action.value=shape.prototype?.action??'none';field('On click',action);
 const frames=prototypeFrames(doc),target=document.createElement('select');for(const f of frames){const o=document.createElement('option');o.value=f.id;o.textContent=`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;target.append(o);}target.value=shape.prototype?.target??frames[0]?.id??'';
 const position=document.createElement('select');for(const value of ['center','top-left','top-right','bottom-left','bottom-right']){const o=document.createElement('option');o.value=value;o.textContent=value.replaceAll('-',' ');position.append(o);}position.value=shape.prototype?.overlay_position??'center';const outside=document.createElement('input');outside.type='checkbox';outside.checked=!!shape.prototype?.close_on_outside;
 const save=()=>{const targets=['navigate','overlay'].includes(action.value);if(targets&&!target.value)return;change({...shape,prototype:action.value==='none'?null:{action:action.value,target:targets?Number(target.value):0,overlay_position:position.value,close_on_outside:outside.checked}});};action.onchange=save;target.onchange=save;position.onchange=save;outside.onchange=save;if(['navigate','overlay'].includes(action.value))field('Destination frame',target);if(action.value==='overlay'){field('Overlay position',position);field('Close when clicking outside',outside);}
 if(shape.kind==='frame'){const flow=document.createElement('input');flow.type='text';flow.maxLength=128;flow.placeholder='Not a flow start';flow.value=shape.flow_name??'';flow.onchange=()=>change({...shape,flow_name:flow.value.trim()});field('Flow starting point',flow);}
 const play=document.createElement('button');play.className='wide-button';play.textContent='Present prototype';play.disabled=!frames.length;play.onclick=present;host.append(play);
}
export function presentPrototype(doc,start,editor,paint,prepare=async()=>{}){
 const state=prototypeState(doc,start),dialog=document.createElement('dialog');dialog.className='prototype-player';dialog.setAttribute('aria-label','Prototype presentation');
 const toolbar=document.createElement('div');toolbar.className='prototype-toolbar';const back=document.createElement('button'),restart=document.createElement('button'),close=document.createElement('button'),chooser=document.createElement('select'),hotspots=document.createElement('input');back.textContent='Back';restart.textContent='Restart';close.textContent='Close presentation';chooser.setAttribute('aria-label','Presented frame');
 for(const f of prototypeFrames(doc)){const o=document.createElement('option');o.value=f.id;o.textContent=`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;chooser.append(o);}
 const flows=document.createElement('select');flows.setAttribute('aria-label','Flow starting point');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a flow';flows.append(placeholder);for(const f of prototypeFrames(doc).filter(s=>s.flow_name)){const o=document.createElement('option');o.value=f.id;o.textContent=f.flow_name+' / '+f.name;flows.append(o);}flows.hidden=flows.options.length===1;flows.value=doc.shapes.find(s=>s.id===start)?.flow_name?start:'';flows.onchange=()=>{if(flows.value){state.start(Number(flows.value));render();}};toolbar.append(flows);
 hotspots.type='checkbox';const label=document.createElement('label');label.append(hotspots,document.createTextNode('Show hotspots'));toolbar.append(back,restart,chooser,label,close);
 const area=document.createElement('div');area.className='prototype-stage';const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Prototype screen');area.append(canvas);
 const status=document.createElement('p');status.setAttribute('role','status');const links=document.createElement('details'),summary=document.createElement('summary'),buttons=document.createElement('div');summary.textContent='Screen interactions (keyboard accessible)';links.append(summary,buttons);dialog.append(toolbar,area,status,links);document.body.append(dialog);dialog.showModal();
 let transform=null,version=0;
 const activate=s=>{const p=s.prototype;if(!p)return;let ok=true;if(p.action==='back')state.back();else if(p.action==='close')state.close();else if(p.action==='overlay')ok=state.open(p);else if(p.action==='navigate')ok=state.navigate(p.target);if(ok)render();else status.textContent='Destination unavailable, or the overlay limit was reached.';};
 const render=async()=>{
  transform=null;const ticket=++version,baseScene=prototypeScene(doc,state.current),base=baseScene[0],stack=state.overlays;
  const layers=[{scene:baseScene,offset:{x:0,y:0}},...stack.map(o=>{const scene=prototypeScene(doc,o.target);return{scene,offset:overlayPlacement(base,scene[0],o.overlay_position)};})],active=layers.at(-1),frame=active.scene[0];
  chooser.value=state.current;back.disabled=!state.canBack;buttons.replaceChildren();
  for(const s of active.scene.filter(s=>s.prototype&&visibleInTree(s,active.scene))){const b=document.createElement('button');const p=s.prototype;b.textContent=s.name+' → '+(p.action==='back'?'Back':p.action==='close'?'Close overlay':(p.action==='overlay'?'Open overlay: ':'')+(doc.shapes.find(f=>f.id===p.target)?.name??'Unavailable'));b.onclick=()=>activate(s);buttons.append(b);}
  status.textContent=base.name+(stack.length?' · Overlay: '+frame.name:'')+' · Click a linked layer to continue.';await prepare(layers.flatMap(l=>l.scene));if(ticket!==version||!dialog.open)return;
  const width=Math.max(1,area.clientWidth),height=Math.max(1,area.clientHeight),scale=Math.min(Math.max(1,width-32)/base.width,Math.max(1,height-32)/base.height),dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';
  const x=(width-base.width*scale)/2,y=(height-base.height*scale)/2,ctx=canvas.getContext('2d');ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*x,dpr*y);ctx.beginPath();ctx.roundRect(0,0,base.width,base.height,radii(base));ctx.clip();
  for(let i=0;i<layers.length;i++){const l=layers[i],f=l.scene[0];if(i){ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(0,0,base.width,base.height);}ctx.save();ctx.translate(l.offset.x-f.x,l.offset.y-f.y);ctx.beginPath();ctx.roundRect(f.x,f.y,f.width,f.height,radii(f));ctx.clip();drawScene(l.scene,ctx,paint);
   if(hotspots.checked&&i===layers.length-1){ctx.strokeStyle='#0284c7';ctx.lineWidth=2/scale;ctx.setLineDash([5/scale,4/scale]);for(const s of l.scene.filter(s=>s.prototype&&visibleInTree(s,l.scene)))ctx.strokeRect(s.x,s.y,s.width,s.height);}ctx.restore();
  }
  transform={x:x+active.offset.x*scale,y:y+active.offset.y*scale,scale,frame,base,xBase:x,yBase:y,outside:stack.at(-1)?.close_on_outside??false,overlay:stack.length>0};
 };
 canvas.onclick=event=>{if(!transform)return;const r=canvas.getBoundingClientRect(),t=transform,px=event.clientX-r.left,py=event.clientY-r.top,p={x:(px-t.x)/t.scale+t.frame.x,y:(py-t.y)/t.scale+t.frame.y},inBase=roundedContains(t.base,{x:(px-t.xBase)/t.scale+t.base.x,y:(py-t.yBase)/t.scale+t.base.y});
  if(!inBase||!roundedContains(t.frame,p)){if(t.overlay&&t.outside){state.close();render();}return;}const id=editor.prototype_hit_test(t.frame.id,p.x,p.y),s=doc.shapes.find(s=>s.id===id);if(s)activate(s);
 };
 back.onclick=()=>{state.back();render();};restart.onclick=()=>{state.restart();render();};chooser.onchange=()=>{state.navigate(Number(chooser.value));render();};hotspots.onchange=render;close.onclick=()=>dialog.close();
 const observer=new ResizeObserver(render);observer.observe(area);dialog.onclose=()=>{version++;observer.disconnect();dialog.remove();};render();return dialog;
}
