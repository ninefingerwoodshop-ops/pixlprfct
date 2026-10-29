import {radii} from './appearance.js';
import {clippingFrames} from './scene.js';
import {visibleInTree} from './selection.js';
export {renderGuideControls} from './guide-controls.js';
export const defaultGuide=()=>({kind:'columns',size:64,count:4,gutter:16,margin:16,alignment:'stretch',color:'#ff3366',opacity:.12,visible:true});
// Geometry is independent of canvas so resized guides and export exclusion can
// be checked without a browser. Dense square grids are omitted at low zoom.
export function guideGeometry(frame,g,zoom=1){
 if(!g.visible||g.opacity===0)return [];
 if(g.kind==='grid'){
  if(g.size*zoom<4)return [];
  const nx=Math.floor(frame.width/g.size),ny=Math.floor(frame.height/g.size);if(nx+ny>4096)return [];
  return [...Array.from({length:nx+1},(_,i)=>({x:frame.x+i*g.size,y:frame.y,width:0,height:frame.height})),...Array.from({length:ny+1},(_,i)=>({x:frame.x,y:frame.y+i*g.size,width:frame.width,height:0}))];
 }
 const columns=g.kind==='columns',length=columns?frame.width:frame.height;
 const size=g.alignment==='stretch'?(length-2*g.margin-(g.count-1)*g.gutter)/g.count:g.size;
 if(size<=0)return [];
 const occupied=size*g.count+(g.count-1)*g.gutter;
 const start=g.alignment==='center'?(length-occupied)/2:g.alignment==='end'?length-g.margin-occupied:g.margin;
 return Array.from({length:g.count},(_,i)=>columns?{x:frame.x+start+i*(size+g.gutter),y:frame.y,width:size,height:frame.height}:{x:frame.x,y:frame.y+start+i*(size+g.gutter),width:frame.width,height:size});
}
export function drawLayoutGuides(ctx,shapes,zoom){
 for(const frame of shapes){if(frame.kind!=='frame'||!frame.layout_grids?.length||!visibleInTree(frame,shapes))continue;
  ctx.save();for(const clip of [frame,...clippingFrames(frame,shapes)]){ctx.beginPath();ctx.roundRect(clip.x,clip.y,clip.width,clip.height,radii(clip));ctx.clip();}
  for(const g of frame.layout_grids){ctx.fillStyle=g.color;ctx.strokeStyle=g.color;ctx.globalAlpha=g.opacity;ctx.lineWidth=1/zoom;ctx.setLineDash([]);ctx.beginPath();
   for(const r of guideGeometry(frame,g,zoom)){if(g.kind==='grid'){ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+r.width,r.y+r.height);}else ctx.fillRect(r.x,r.y,r.width,r.height);}if(g.kind==='grid')ctx.stroke();
  }ctx.restore();
 }
}
