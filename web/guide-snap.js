import {guideGeometry} from './layout-guides.js';
import {visibleInTree} from './selection.js';
import {clippingFrames} from './scene.js';
import {roundedContains} from './appearance.js';
export function snapGuides(shapes,box,excluded,zoom,axes={x:true,y:true}){
 const center={x:box.x+box.width/2,y:box.y+box.height/2},limit=6/zoom,best={x:null,y:null};
 for(const frame of shapes){
  if(frame.kind!=='frame'||excluded.has(frame.id)||!visibleInTree(frame,shapes)||!roundedContains(frame,center))continue;
  const clips=clippingFrames(frame,shapes);if(clips.some(f=>!roundedContains(f,center)))continue;
  const left=Math.max(frame.x,...clips.map(f=>f.x)),right=Math.min(frame.x+frame.width,...clips.map(f=>f.x+f.width)),top=Math.max(frame.y,...clips.map(f=>f.y)),bottom=Math.min(frame.y+frame.height,...clips.map(f=>f.y+f.height));
  const candidate=(axis,value)=>{if(!axes[axis]||(axis==='x'?(value<left||value>right):(value<top||value>bottom)))return;for(const anchor of axis==='x'?[box.x,center.x,box.x+box.width]:[box.y,center.y,box.y+box.height]){const delta=value-anchor;if(Math.abs(delta)<=limit&&(!best[axis]||Math.abs(delta)<Math.abs(best[axis].delta)))best[axis]={axis,value,delta,start:axis==='x'?top:left,end:axis==='x'?bottom:right};}};
  for(const g of frame.layout_grids??[])for(const r of guideGeometry(frame,g,zoom)){
   if(g.kind==='grid'){candidate(r.width===0?'x':'y',r.width===0?r.x:r.y);}
   else if(g.kind==='columns'){candidate('x',r.x);candidate('x',r.x+r.width);}
   else{candidate('y',r.y);candidate('y',r.y+r.height);}
  }
 }
 return{dx:best.x?.delta??0,dy:best.y?.delta??0,lines:Object.values(best).filter(Boolean)};
}
export function drawSnapGuides(ctx,lines,zoom){ctx.save();ctx.strokeStyle='#ec4899';ctx.lineWidth=1/zoom;ctx.setLineDash([4/zoom,3/zoom]);for(const l of lines??[]){ctx.beginPath();if(l.axis==='x'){ctx.moveTo(l.value,l.start);ctx.lineTo(l.value,l.end);}else{ctx.moveTo(l.start,l.value);ctx.lineTo(l.end,l.value);}ctx.stroke();}ctx.restore();}
