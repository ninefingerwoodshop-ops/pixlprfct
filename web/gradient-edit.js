import {gradientGeometry} from './gradients.js';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function gradientHandles(s,zoom=1){
 const g=s.appearance.gradient,p=gradientGeometry(s,g),dx=p.end[0]-p.start[0],dy=p.end[1]-p.start[1],length=Math.hypot(dx,dy),nx=-dy/length*18/zoom,ny=dx/length*18/zoom;
 return [{part:'start',x:p.start[0],y:p.start[1]},{part:'end',x:p.end[0],y:p.end[1]},...g.stops.map((stop,index)=>({part:'stop',index,x:p.start[0]+dx*stop.position+nx,y:p.start[1]+dy*stop.position+ny,color:stop.color}))];
}
export function gradientHit(s,p,zoom){return gradientHandles(s,zoom).map(h=>({...h,distance:Math.hypot(h.x-p.x,h.y-p.y)})).filter(h=>h.distance<=9/zoom).sort((a,b)=>a.distance-b.distance)[0]??null;}
export function gradientPosition(s,p){const {start,end}=gradientGeometry(s,s.appearance.gradient),dx=end[0]-start[0],dy=end[1]-start[1],t=clamp(((p.x-start[0])*dx+(p.y-start[1])*dy)/(dx*dx+dy*dy),0,1);return {t,distance:Math.hypot(p.x-start[0]-dx*t,p.y-start[1]-dy*t)};}
export function moveGradientHandle(s,handle,p,shift=false){
 const g=structuredClone(s.appearance.gradient);let active={...handle};
 if(handle.part==='stop'){
  const t=gradientPosition(s,p).t;g.stops[handle.index].position=shift?Math.round(t*10)/10:t;
  const tagged=g.stops.map((stop,index)=>({stop,index})).sort((a,b)=>a.stop.position-b.stop.position);active.index=tagged.findIndex(t=>t.index===handle.index);g.stops=tagged.map(t=>t.stop);
 }else{
  const other=handle.part==='start'?'end':'start';let q={...p};
  if(shift){const ox=s.x+g[other][0]*s.width,oy=s.y+g[other][1]*s.height,dx=p.x-ox,dy=p.y-oy,d=Math.hypot(dx,dy),angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;q={x:ox+Math.cos(angle)*d,y:oy+Math.sin(angle)*d};}
  const next=[clamp((q.x-s.x)/s.width,-10,10),clamp((q.y-s.y)/s.height,-10,10)];
  if(Math.hypot(next[0]-g[other][0],next[1]-g[other][1])>=.0001)g[handle.part]=next;
 }
 return {shape:{...s,appearance:{...s.appearance,gradient:g}},active};
}
export function addGradientStopAt(s,t){
 const g=s.appearance.gradient;if(g.stops.length>=16)return null;
 t=clamp(t,0,1);let right=g.stops.findIndex(stop=>stop.position>t);if(right<0)right=g.stops.length;
 const a=g.stops[Math.max(0,right-1)],b=g.stops[Math.min(g.stops.length-1,right)],mix=a===b?0:(t-a.position)/(b.position-a.position),opacity=a.opacity*(1-mix)+b.opacity*mix;
 const color='#'+[1,3,5].map(i=>Math.round(opacity?(parseInt(a.color.slice(i,i+2),16)*a.opacity*(1-mix)+parseInt(b.color.slice(i,i+2),16)*b.opacity*mix)/opacity:0).toString(16).padStart(2,'0')).join('');
 const stops=[...g.stops];stops.splice(right,0,{position:t,color,opacity});return{shape:{...s,appearance:{...s.appearance,gradient:{...g,stops}}},active:{part:'stop',index:right}};
}
export function drawGradientHandles(ctx,s,zoom,active){
 const g=s.appearance.gradient,p=gradientGeometry(s,g),handles=gradientHandles(s,zoom);ctx.save();
 ctx.lineWidth=1/zoom;ctx.strokeStyle='#0d99ff';ctx.setLineDash([4/zoom,4/zoom]);ctx.strokeRect(s.x,s.y,s.width,s.height);
 if(g.kind==='radial'){ctx.beginPath();ctx.ellipse(...p.start,p.radius*s.width,p.radius*s.height,0,0,Math.PI*2);ctx.stroke();}ctx.setLineDash([]);
 ctx.beginPath();ctx.moveTo(...p.start);ctx.lineTo(...p.end);ctx.lineWidth=3/zoom;ctx.strokeStyle='#fff';ctx.stroke();ctx.lineWidth=1/zoom;ctx.strokeStyle='#0d99ff';ctx.stroke();
 for(const h of handles){const selected=active?.part===h.part&&(h.part!=='stop'||active.index===h.index);ctx.lineWidth=(selected?3:1)/zoom;ctx.fillStyle=h.color??'#fff';ctx.strokeStyle=selected?'#111':'#0d99ff';ctx.beginPath();if(h.part==='stop')ctx.arc(h.x,h.y,5/zoom,0,Math.PI*2);else ctx.rect(h.x-5/zoom,h.y-5/zoom,10/zoom,10/zoom);ctx.fill();ctx.stroke();}
 ctx.restore();
}
