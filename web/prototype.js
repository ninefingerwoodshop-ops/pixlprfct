import {descendants,visibleInTree} from './selection.js';
import {drawScene,radii} from './appearance.js';
export function prototypeFrames(doc){return doc.shapes.filter(s=>s.kind==='frame'&&visibleInTree(s,doc.shapes));}
export function prototypeScene(doc,root){return descendants(doc.shapes,[root]).map(s=>s.id===root?{...s,parent_id:0,clip_content:true}:s);}
export function prototypeState(doc,start){
 const frames=new Set(prototypeFrames(doc).map(s=>s.id));if(!frames.has(start))throw new Error('Choose a visible frame to present');
 const history=[start];return{get current(){return history.at(-1);},get canBack(){return history.length>1;},navigate(id){if(!frames.has(id))return false;history.push(id);return true;},back(){if(history.length>1)history.pop();},restart(){history.splice(1);}};
}
export function renderPrototypeControls(host,shape,doc,change,present){
 host.replaceChildren();host.hidden=!shape;if(!shape)return;
 const heading=document.createElement('h3');heading.textContent='Prototype';host.append(heading);
 const field=(name,select)=>{const label=document.createElement('label');label.append(document.createTextNode(name),select);select.setAttribute('aria-label',name);host.append(label);};
 const action=document.createElement('select');for(const [value,text] of [['none','None'],['navigate','Navigate to frame'],['back','Go back']]){const o=document.createElement('option');o.value=value;o.textContent=text;action.append(o);}action.value=shape.prototype?.action??'none';field('On click',action);
 const frames=prototypeFrames(doc),target=document.createElement('select');for(const f of frames){const o=document.createElement('option');o.value=f.id;o.textContent=`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;target.append(o);}target.value=shape.prototype?.target??frames[0]?.id??'';
 const save=()=>{if(action.value==='navigate'&&!target.value)return;change({...shape,prototype:action.value==='none'?null:{action:action.value,target:action.value==='navigate'?Number(target.value):0}});};action.onchange=save;target.onchange=save;if(action.value==='navigate')field('Destination frame',target);
 const play=document.createElement('button');play.className='wide-button';play.textContent='Present prototype';play.disabled=!frames.length;play.onclick=present;host.append(play);
}
export function presentPrototype(doc,start,editor,paint,prepare=async()=>{}){
 const state=prototypeState(doc,start),dialog=document.createElement('dialog');dialog.className='prototype-player';dialog.setAttribute('aria-label','Prototype presentation');
 const toolbar=document.createElement('div');toolbar.className='prototype-toolbar';const back=document.createElement('button'),restart=document.createElement('button'),close=document.createElement('button'),chooser=document.createElement('select'),hotspots=document.createElement('input');back.textContent='Back';restart.textContent='Restart';close.textContent='Close presentation';chooser.setAttribute('aria-label','Presented frame');
 for(const f of prototypeFrames(doc)){const o=document.createElement('option');o.value=f.id;o.textContent=`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;chooser.append(o);}
 hotspots.type='checkbox';const label=document.createElement('label');label.append(hotspots,document.createTextNode('Show hotspots'));toolbar.append(back,restart,chooser,label,close);
 const area=document.createElement('div');area.className='prototype-stage';const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Prototype screen');area.append(canvas);
 const status=document.createElement('p');status.setAttribute('role','status');const links=document.createElement('details'),summary=document.createElement('summary'),buttons=document.createElement('div');summary.textContent='Screen interactions (keyboard accessible)';links.append(summary,buttons);dialog.append(toolbar,area,status,links);document.body.append(dialog);dialog.showModal();
 let transform=null,version=0;
 const activate=s=>{if(s.prototype?.action==='back'){state.back();render();}else if(s.prototype?.action==='navigate'){if(state.navigate(s.prototype.target))render();else status.textContent='Destination frame is hidden or unavailable.';}};
 const render=async()=>{
  const ticket=++version,scene=prototypeScene(doc,state.current),frame=scene[0];chooser.value=state.current;back.disabled=!state.canBack;buttons.replaceChildren();
  for(const s of scene.filter(s=>s.prototype&&visibleInTree(s,scene))){const b=document.createElement('button');b.textContent=`${s.name} → ${s.prototype.action==='back'?'Back':doc.shapes.find(f=>f.id===s.prototype.target)?.name??'Unavailable'}`;b.onclick=()=>activate(s);buttons.append(b);}
  status.textContent=`${frame.name} · Click a linked layer to continue.`;await prepare(scene);if(ticket!==version||!dialog.open)return;
  const width=Math.max(1,area.clientWidth),height=Math.max(1,area.clientHeight),scale=Math.min(Math.max(1,width-32)/frame.width,Math.max(1,height-32)/frame.height),dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';
  const x=(width-frame.width*scale)/2,y=(height-frame.height*scale)/2;transform={x,y,scale,frame};const ctx=canvas.getContext('2d');ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*(x-frame.x*scale),dpr*(y-frame.y*scale));ctx.save();ctx.beginPath();ctx.roundRect(frame.x,frame.y,frame.width,frame.height,radii(frame));ctx.clip();drawScene(scene,ctx,paint);ctx.restore();
  if(hotspots.checked){ctx.save();ctx.beginPath();ctx.roundRect(frame.x,frame.y,frame.width,frame.height,radii(frame));ctx.clip();ctx.strokeStyle='#0284c7';ctx.lineWidth=2/scale;ctx.setLineDash([5/scale,4/scale]);for(const s of scene.filter(s=>s.prototype&&visibleInTree(s,scene)))ctx.strokeRect(s.x,s.y,s.width,s.height);ctx.restore();}
 };
 canvas.onclick=event=>{if(!transform)return;const r=canvas.getBoundingClientRect(),t=transform,id=editor.prototype_hit_test(state.current,(event.clientX-r.left-t.x)/t.scale+t.frame.x,(event.clientY-r.top-t.y)/t.scale+t.frame.y);const s=doc.shapes.find(s=>s.id===id);if(s)activate(s);};
 back.onclick=()=>{state.back();render();};restart.onclick=()=>{state.restart();render();};chooser.onchange=()=>{state.navigate(Number(chooser.value));render();};hotspots.onchange=render;close.onclick=()=>dialog.close();
 const observer=new ResizeObserver(render);observer.observe(area);dialog.onclose=()=>{version++;observer.disconnect();dialog.remove();};render();return dialog;
}
