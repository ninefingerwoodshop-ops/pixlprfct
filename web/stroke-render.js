import {strokeTips,strokePadding} from './stroke-tips.js';
import {canvasFill} from './gradients.js';
import {effectSurfaceSize} from './shadows.js';
// Paint the union once: translucent strokes and gradients must not darken where
// an arrowhead overlaps its shaft. A mask also keeps dash gaps off solid tips.
export function drawVectorStroke(ctx,s,path){
 const tips=strokeTips(s);if(!tips.length){ctx.stroke(path);return;}
 const a=s.appearance??{};
 const pad=strokePadding(s),box={x:s.x-pad,y:s.y-pad,width:s.width+2*pad,height:s.height+2*pad};
 const t=ctx.getTransform(),size=effectSurfaceSize(box,Math.max(Math.hypot(t.a,t.b),Math.hypot(t.c,t.d))),surface=new OffscreenCanvas(size.width,size.height),c=surface.getContext('2d');
 c.setTransform(size.scale,0,0,size.scale,-box.x*size.scale,-box.y*size.scale);c.lineWidth=s.stroke_width??2;c.lineCap='butt';c.lineJoin=a.stroke_join??'round';c.miterLimit=a.stroke_miter_limit??10;c.setLineDash(a.stroke_dash??[]);c.lineDashOffset=a.stroke_dash_offset??0;c.stroke(path);
 c.globalCompositeOperation='destination-out';for(const tip of tips)if(tip.cut)c.fill(new Path2D(tip.cut));c.globalCompositeOperation='source-over';
 c.setLineDash([]);c.lineCap=a.stroke_cap??'round';c.lineJoin='round';for(const tip of tips){const p=new Path2D(tip.d);if(tip.closed)c.fill(p);else c.stroke(p);}
 c.globalCompositeOperation='source-in';c.fillStyle=canvasFill(c,s,'stroke')??s.fill;c.fillRect(box.x,box.y,size.width/size.scale,size.height/size.scale);
 ctx.drawImage(surface,box.x,box.y,size.width/size.scale,size.height/size.scale);
}
