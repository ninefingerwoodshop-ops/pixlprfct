import {strokeAlignment,strokePadding} from './stroke-tips.js';
import {canvasFill} from './gradients.js';
import {effectSurfaceSize} from './shadows.js';
export function drawAlignedStroke(ctx,s,geometry){
 const alignment=strokeAlignment(s);if(alignment==='center'){geometry.stroke(ctx);return;}
 const a=s.appearance??{},pad=strokePadding(s)+1,box={x:s.x-pad,y:s.y-pad,width:s.width+2*pad,height:s.height+2*pad},t=ctx.getTransform(),size=effectSurfaceSize(box,Math.max(Math.hypot(t.a,t.b),Math.hypot(t.c,t.d)));
 const surface=new OffscreenCanvas(size.width,size.height),fill=new OffscreenCanvas(size.width,size.height),c=surface.getContext('2d'),f=fill.getContext('2d');
 for(const target of [c,f])target.setTransform(size.scale,0,0,size.scale,-box.x*size.scale,-box.y*size.scale);
 c.lineWidth=(s.stroke_width??2)*2;c.lineCap=a.stroke_cap??'round';c.lineJoin=a.stroke_join??'round';c.miterLimit=a.stroke_miter_limit??10;c.setLineDash(a.stroke_dash??[]);c.lineDashOffset=a.stroke_dash_offset??0;
 geometry.stroke(c);geometry.fill(f);
 c.save();c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation=alignment==='inside'?'destination-in':'destination-out';c.drawImage(fill,0,0);c.restore();
 c.globalCompositeOperation='source-in';c.fillStyle=canvasFill(c,s,'stroke');c.fillRect(box.x,box.y,size.width/size.scale,size.height/size.scale);
 ctx.drawImage(surface,box.x,box.y,size.width/size.scale,size.height/size.scale);
}
export function alignedStrokeSvg(s,paint,outline){
 const a=s.appearance??{},alignment=strokeAlignment(s);if(!a.stroke_enabled||alignment==='center')return paint(s);
 const pad=strokePadding(s)+1,box=`x="${s.x-pad}" y="${s.y-pad}" width="${s.width+pad*2}" height="${s.height+pad*2}"`;
 const maskShape=(suffix,fill,stroke,color)=>({...s,id:`${s.id}-${suffix}`,stroke_width:(s.stroke_width??2)*2,fill:color,appearance:{...a,gradient:null,stroke_gradient:null,fill_enabled:fill,stroke_enabled:stroke,fill_opacity:1,stroke_opacity:1,stroke_color:color,stroke_alignment:'center'}});
 const stroke=outline(maskShape('alignment-stroke',false,true,'#ffffff'));
 const fill=outline(maskShape('alignment-fill',true,false,alignment==='inside'?'#ffffff':'#000000'));
 const definitions=alignment==='inside'?`<mask id="stroke-interior-${s.id}" maskUnits="userSpaceOnUse" ${box}>${fill}</mask><mask id="stroke-position-${s.id}" maskUnits="userSpaceOnUse" ${box}><g mask="url(#stroke-interior-${s.id})">${stroke}</g></mask>`:`<mask id="stroke-position-${s.id}" maskUnits="userSpaceOnUse" ${box}>${stroke}${fill}</mask>`;
 return `${paint({...s,appearance:{...a,stroke_enabled:false}})}<defs>${definitions}</defs><rect ${box} mask="url(#stroke-position-${s.id})" fill="${a.stroke_gradient?`url(#stroke-gradient-${s.id})`:a.stroke_color}" opacity="${a.stroke_opacity??1}"/>`;
}
