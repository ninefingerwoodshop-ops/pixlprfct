import {interactions,withInteractions} from './prototype-interactions.js';
import {roundedContains} from './appearance.js';
import {visibleInTree} from './selection.js';
import {clippingFrames} from './scene.js';
export function connectionHandle(s,zoom){return{x:s.x+s.width+12/zoom,y:s.y+s.height/2};}
export function connectionHit(s,p,zoom){const h=connectionHandle(s,zoom);return Math.hypot(h.x-p.x,h.y-p.y)<=9/zoom;}
export function connectionTarget(shapes,source,p){return [...shapes].reverse().find(s=>s.id!==source&&s.kind==='frame'&&visibleInTree(s,shapes)&&[s,...clippingFrames(s,shapes)].every(f=>roundedContains(f,p)))?.id??0;}
export function connectedShape(source,target,index=0){
 const list=interactions(source);index=Math.max(0,Math.min(index,Math.max(0,list.length-1)));const p=list[index];
 list[index]={...p,action:['overlay','swap'].includes(p?.action)?p.action:'navigate',target};
 return withInteractions(source,list);
}
// Drawing and hit testing share the same curve, including the separation between
// multiple interactions from one layer to the same destination.
export function connectionCurve(source,target,zoom,index=0,count=1){
 const a=connectionHandle(source,zoom),b={x:target.x,y:target.y+target.height/2};
 const bend=Math.max(24/zoom,Math.abs(b.x-a.x)/2),offset=(index-(count-1)/2)*32/zoom;
 return [a,{x:a.x+bend,y:a.y+offset},{x:b.x-bend,y:b.y+offset},b];
}
function connections(shapes,zoom){
 const visible=shapes.filter(s=>visibleInTree(s,shapes)),byId=new Map(visible.map(s=>[s.id,s]));
 return visible.flatMap(source=>{const list=interactions(source);return list.flatMap((p,index)=>{
  const target=byId.get(p.target);
  return target&&['navigate','overlay','swap'].includes(p.action)?[{source:source.id,index,curve:connectionCurve(source,target,zoom,index,list.length)}]:[];
 });});
}
export function connectionAt(shapes,point,zoom){
 let hit=null,nearest=7/zoom;
 for(const connection of connections(shapes,zoom)){
  const [a,b,c,d]=connection.curve;let previous=a;
  for(let i=1;i<=64;i++){
   const t=i/64,u=1-t,next={x:u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*d.x,y:u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*d.y};
   const dx=next.x-previous.x,dy=next.y-previous.y,along=Math.max(0,Math.min(1,((point.x-previous.x)*dx+(point.y-previous.y)*dy)/(dx*dx+dy*dy||1)));
   const distance=Math.hypot(point.x-previous.x-along*dx,point.y-previous.y-along*dy);
   if(distance<nearest){nearest=distance;hit={source:connection.source,index:connection.index};}
   previous=next;
  }
 }
 return hit;
}
export function drawConnections(ctx,shapes,selected,zoom,gesture,editable,activeIndex=0){
 ctx.save();ctx.lineWidth=2/zoom;ctx.strokeStyle='#2563eb';ctx.fillStyle='#2563eb';ctx.font=12/zoom+'px Inter,sans-serif';ctx.textBaseline='bottom';
 for(const f of shapes.filter(s=>s.flow_name&&visibleInTree(s,shapes)))ctx.fillText('▶ '+f.flow_name,f.x,f.y-28/zoom);
 const wire=([a,b,c,d])=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(b.x,b.y,c.x,c.y,d.x,d.y);ctx.stroke();ctx.beginPath();ctx.moveTo(d.x-6/zoom,d.y-4/zoom);ctx.lineTo(d.x,d.y);ctx.lineTo(d.x-6/zoom,d.y+4/zoom);ctx.stroke();};
 for(const link of connections(shapes,zoom)){const active=link.source===selected?.id&&link.index===activeIndex;ctx.globalAlpha=active?1:.45;ctx.lineWidth=(active?3:2)/zoom;wire(link.curve);}
 ctx.lineWidth=2/zoom;ctx.globalAlpha=1;if(gesture?.type==='prototype-link'){const t=shapes.find(s=>s.id===gesture.target),source=shapes.find(s=>s.id===gesture.source.id)??gesture.source;wire(connectionCurve(source,t??{...gesture.end,height:0},zoom));if(t){ctx.setLineDash([4/zoom,4/zoom]);ctx.strokeRect(t.x,t.y,t.width,t.height);ctx.setLineDash([]);}}
 if(selected&&editable&&visibleInTree(selected,shapes)){const h=connectionHandle(selected,zoom);ctx.beginPath();ctx.arc(h.x,h.y,5/zoom,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1/zoom;ctx.stroke();}ctx.restore();
}
