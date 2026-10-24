import {visibleShadows,compositeGeometry,effectSurfaceSize,drawShadow,shadowFilter,layerBlurFilter} from './shadows.js';
export function appearance(s) {
  return s.appearance??{opacity:1,corner_radius:0,fill_enabled:!s.points?.length||!!s.closed,stroke_enabled:!!s.points?.length,stroke_color:s.points?.length?s.fill:'#000000'};
}
export function radius(s){return Math.min(appearance(s).corner_radius,s.width/2,s.height/2);}
export function radii(s){const a=appearance(s),r=a.corner_radii??Array(4).fill(a.corner_radius);const scale=Math.min(1,s.width/(r[0]+r[1]),s.width/(r[3]+r[2]),s.height/(r[0]+r[3]),s.height/(r[1]+r[2]));return r.map(v=>v*scale);}
export function roundedContains(s,p){
 if(p.x<s.x||p.x>s.x+s.width||p.y<s.y||p.y>s.y+s.height)return false;
 const [tl,tr,br,bl]=radii(s),right=s.x+s.width,bottom=s.y+s.height;
 for(const [r,x,y,left,top] of [[tl,s.x+tl,s.y+tl,true,true],[tr,right-tr,s.y+tr,false,true],[br,right-br,bottom-br,false,false],[bl,s.x+bl,bottom-bl,true,false]])if((left?p.x<x:p.x>x)&&(top?p.y<y:p.y>y)&&Math.hypot(p.x-x,p.y-y)>r)return false;
 return true;
}
export function roundedSvg(s,attributes=''){
 const [tl,tr,br,bl]=radii(s),x=s.x,y=s.y,right=x+s.width,bottom=y+s.height;
 if(tl===tr&&tr===br&&br===bl)return `<rect x="${x}" y="${y}" width="${s.width}" height="${s.height}" rx="${tl}" ${attributes}/>`;
 const arc=(r,ex,ey)=>r?`A ${r} ${r} 0 0 1 ${ex} ${ey}`:`L ${ex} ${ey}`;
 return `<path d="M ${x+tl} ${y} H ${right-tr} ${arc(tr,right,y+tr)} V ${bottom-br} ${arc(br,right-br,bottom)} H ${x+bl} ${arc(bl,x,bottom-bl)} V ${y+tl} ${arc(tl,x+tl,y)} Z" ${attributes}/>`;
}
export function paintAttributes(s){const a=appearance(s);return `fill="${a.fill_enabled?(a.gradient?`url(#gradient-${s.id})`:s.fill):'none'}" stroke="${a.stroke_enabled?(a.stroke_gradient?`url(#stroke-gradient-${s.id})`:a.stroke_color):'none'}" fill-opacity="${a.fill_opacity??1}" stroke-opacity="${a.stroke_opacity??1}" stroke-width="${s.stroke_width??2}" stroke-linecap="${a.stroke_cap??'round'}" stroke-linejoin="${a.stroke_join??'round'}" stroke-miterlimit="${a.stroke_miter_limit??10}"${a.stroke_dash?.length?` stroke-dasharray="${a.stroke_dash.join(' ')}" stroke-dashoffset="${a.stroke_dash_offset??0}"`:''}`;}
// Composite each layer with its descendants before applying opacity. This avoids
// dark overlaps when a translucent frame contains overlapping children.
export function drawScene(shapes,context,paint) {
 const {children,geometry}=compositeGeometry(shapes,appearance);
 const visit=(s,target)=>{
  if(s.hidden)return;const a=appearance(s);if(a.opacity===0)return;
  const content=c=>{paint(s,c);c.save();if(s.kind==='frame'&&s.clip_content){c.beginPath();c.roundRect(s.x,s.y,s.width,s.height,radii(s));c.clip();}for(const child of children.get(s.id)??[])visit(child,c);c.restore();};
  const shadows=visibleShadows(a);if(a.opacity===1&&!shadows.length&&!a.layer_blur){content(target);return;}
  const box=geometry.get(s.id)?.content;if(!box)return;const density=Math.hypot(target.getTransform().a,target.getTransform().b),size=effectSurfaceSize(box,density),surface=new OffscreenCanvas(size.width,size.height),layer=surface.getContext('2d');layer.setTransform(size.scale,0,0,size.scale,-box.x*size.scale,-box.y*size.scale);content(layer);
  const sourceBox={...box,width:size.width/size.scale,height:size.height/size.scale};
  for(const shadow of [...shadows].reverse().filter(s=>s.kind==='inner'))drawShadow(layer,surface,sourceBox,shadow);
  const compose=c=>{for(const shadow of [...shadows].reverse().filter(s=>s.kind!=='inner'))drawShadow(c,surface,sourceBox,shadow);c.drawImage(surface,sourceBox.x,sourceBox.y,sourceBox.width,sourceBox.height);};
  target.save();target.globalAlpha*=a.opacity;
  if(a.layer_blur||(shadows.length&&a.opacity<1)){const output=geometry.get(s.id).output,outSize=effectSurfaceSize(output,density),combined=new OffscreenCanvas(outSize.width,outSize.height),c=combined.getContext('2d');c.setTransform(outSize.scale,0,0,outSize.scale,-output.x*outSize.scale,-output.y*outSize.scale);compose(c);if(a.layer_blur)target.filter=`blur(${a.layer_blur*density/2}px)`;target.drawImage(combined,output.x,output.y,outSize.width/outSize.scale,outSize.height/outSize.scale);}else compose(target);
  target.restore();
 };
 for(const root of children.get(0)??[])visit(root,context);
}
export function sceneSvg(shapes,paint){
 const {geometry}=compositeGeometry(shapes,appearance);
 const visit=s=>{if(s.hidden)return '';const a=appearance(s);let children=shapes.filter(c=>c.parent_id===s.id).map(visit).join('');if(s.kind==='frame'&&s.clip_content)children=`<g clip-path="url(#frame-clip-${s.id})">${children}</g>`;const filter=shadowFilter(`shadows-${s.id}`,geometry.get(s.id)?.content,a.shadows),blur=layerBlurFilter(`blur-${s.id}`,geometry.get(s.id)?.output,a.layer_blur);return `<g opacity="${a.opacity}">${blur?`<defs>${blur}</defs><g filter="url(#blur-${s.id})">`:""}${filter?`<defs>${filter}</defs><g filter="url(#shadows-${s.id})">`:""}${paint(s)}${children}${filter?"</g>":""}${blur?"</g>":""}</g>`;};
 return shapes.filter(s=>!s.parent_id).map(visit).join('');
}

export function withPaintOpacity(ctx,style,kind,paint){const alpha=ctx.globalAlpha;ctx.globalAlpha=alpha*(style[kind+'_opacity']??1);try{paint();}finally{ctx.globalAlpha=alpha;}}
