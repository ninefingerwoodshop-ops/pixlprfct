import {roundedContains} from './appearance.js';
import {visibleInTree} from './selection.js';
import {clippingFrames} from './scene.js';
export function connectionHandle(s,zoom){return{x:s.x+s.width+12/zoom,y:s.y+s.height/2};}
export function connectionHit(s,p,zoom){const h=connectionHandle(s,zoom);return Math.hypot(h.x-p.x,h.y-p.y)<=9/zoom;}
export function connectionTarget(shapes,source,p){return [...shapes].reverse().find(s=>s.id!==source&&s.kind==='frame'&&visibleInTree(s,shapes)&&[s,...clippingFrames(s,shapes)].every(f=>roundedContains(f,p)))?.id??0;}
export function connectedShape(source,target){return{...source,prototype:{...source.prototype,action:['overlay','swap'].includes(source.prototype?.action)?source.prototype.action:'navigate',target}};}
export function drawConnections(ctx,shapes,selected,zoom,gesture,editable){
 ctx.save();ctx.lineWidth=2/zoom;ctx.strokeStyle='#2563eb';ctx.fillStyle='#2563eb';ctx.font=12/zoom+'px Inter,sans-serif';ctx.textBaseline='bottom';
 for(const f of shapes.filter(s=>s.flow_name&&visibleInTree(s,shapes)))ctx.fillText('▶ '+f.flow_name,f.x,f.y-8/zoom);
 const wire=(a,b)=>{const bend=Math.max(40/zoom,Math.abs(b.x-a.x)/2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+bend,a.y,b.x-bend,b.y,b.x,b.y);ctx.stroke();ctx.beginPath();ctx.moveTo(b.x-6/zoom,b.y-4/zoom);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-6/zoom,b.y+4/zoom);ctx.stroke();};
 for(const s of shapes.filter(s=>s.prototype&&visibleInTree(s,shapes))){const target=shapes.find(t=>t.id===s.prototype.target&&visibleInTree(t,shapes));if(!target)continue;ctx.globalAlpha=s.id===selected?.id?1:.4;wire(connectionHandle(s,zoom),{x:target.x,y:target.y+target.height/2});}
 ctx.globalAlpha=1;if(gesture?.type==='prototype-link'){const t=shapes.find(s=>s.id===gesture.target);wire(connectionHandle(gesture.source,zoom),t?{x:t.x,y:t.y+t.height/2}:gesture.end);if(t){ctx.setLineDash([4/zoom,4/zoom]);ctx.strokeRect(t.x,t.y,t.width,t.height);ctx.setLineDash([]);}}
 if(selected&&editable&&visibleInTree(selected,shapes)){const h=connectionHandle(selected,zoom);ctx.beginPath();ctx.arc(h.x,h.y,5/zoom,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1/zoom;ctx.stroke();}ctx.restore();
}
