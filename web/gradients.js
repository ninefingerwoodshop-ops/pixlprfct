import {canvasTexture,canvasSvgPaint} from './paint-textures.js';
import {strokePadding} from './stroke-tips.js';
export function defaultGradient(color,kind='linear') {
 return {kind,start:kind==='radial'?[.5,.5]:[0,.5],end:[1,.5],stops:[{position:0,color,opacity:1},{position:1,color:'#7c3aed',opacity:1}]};
}
export function gradientGeometry(s,g) {
 return {start:[s.x+g.start[0]*s.width,s.y+g.start[1]*s.height],end:[s.x+g.end[0]*s.width,s.y+g.end[1]*s.height],radius:Math.hypot(g.end[0]-g.start[0],g.end[1]-g.start[1])};
}
export function radialGeometry(g){
 const radius=Math.hypot(g.end[0]-g.start[0],g.end[1]-g.start[1]),m=g.radial_transform??[1,0,0,1];
 const focal=[...(g.focal??[0,0])],focalRadius=g.focal_radius??0,distance=Math.hypot(...focal),limit=1-focalRadius;
 if(distance>limit&&distance){focal[0]*=limit/distance;focal[1]*=limit/distance;}
 return {matrix:[m[0]*radius,m[1]*radius,m[2]*radius,m[3]*radius,...g.start],focal,focalRadius};
}
export function moveGradientPoint(g,key,point){
 const next={...g,[key]:point};
 if(g.kind==='radial'&&g.radial_transform){
  const old=[g.end[0]-g.start[0],g.end[1]-g.start[1]],v=[next.end[0]-next.start[0],next.end[1]-next.start[1]],angle=Math.atan2(v[1],v[0])-Math.atan2(old[1],old[0]),c=Math.cos(angle),s=Math.sin(angle),m=g.radial_transform;
  next.radial_transform=[c*m[0]-s*m[1],s*m[0]+c*m[1],c*m[2]-s*m[3],s*m[2]+c*m[3]];
 }
 return next;
}
const radialSurfaces=new Map();let radialPixels=0;
export function canvasFill(ctx,s,channel='fill') {
 if(s.appearance?.[channel+'_texture'])return canvasTexture(ctx,s,channel);
 const g=channel==='stroke'?s.appearance?.stroke_gradient:s.appearance?.gradient;if(!g)return channel==='stroke'?(s.appearance?.stroke_color??(s.points?.length?s.fill:'#000000')):s.fill;
 if(['angular','diamond'].includes(g.kind))return canvasSvgPaint(ctx,s,gradientSvg(s,channel),`${channel==='stroke'?'stroke-gradient':'gradient'}-${s.id}`);
 const p=gradientGeometry(s,g);let paint;
 if(g.kind==='radial') {
  // CanvasGradient has no independent transform. Paint the ellipse into a
  // device-resolution tile, then map that tile back to the shape's coordinates.
  // This also lets the same fill work for text and arbitrary vector paths.
  const pad=channel==='stroke'?strokePadding(s):0,tile={x:s.x-pad,y:s.y-pad,width:s.width+2*pad,height:s.height+2*pad};
  const t=ctx.getTransform(),wantedW=Math.max(1,Math.ceil(tile.width*Math.hypot(t.a,t.b))),wantedH=Math.max(1,Math.ceil(tile.height*Math.hypot(t.c,t.d)));
  const ratio=Math.min(1,8192/wantedW,8192/wantedH,Math.sqrt(16_777_216/(wantedW*wantedH))),w=Math.max(1,Math.ceil(wantedW*ratio)),h=Math.max(1,Math.ceil(wantedH*ratio));
  const key=JSON.stringify([g,w,h,pad/s.width,pad/s.height]);let surface=radialSurfaces.get(key);
  if(!surface){surface=new OffscreenCanvas(w,h);const c=surface.getContext('2d');c.scale(w/tile.width,h/tile.height);c.translate(pad,pad);c.scale(s.width,s.height);const radial=radialGeometry(g);c.transform(...radial.matrix);const gradient=c.createRadialGradient(...radial.focal,radial.focalRadius,0,0,1);addStops(gradient,g);c.fillStyle=gradient;
   // Keep the paint transform while covering the tile in inverse coordinates.
   const [a,b,cc,d,e,f]=radial.matrix,det=a*d-b*cc;c.beginPath();for(const [i,[x,y]] of [[-pad/s.width,-pad/s.height],[1+pad/s.width,-pad/s.height],[1+pad/s.width,1+pad/s.height],[-pad/s.width,1+pad/s.height]].entries()){const px=(d*(x-e)-cc*(y-f))/det,py=(-b*(x-e)+a*(y-f))/det;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();c.fill();
   while(radialPixels+w*h>16_777_216&&radialSurfaces.size){const first=radialSurfaces.keys().next().value,old=radialSurfaces.get(first);radialPixels-=old.width*old.height;radialSurfaces.delete(first);}radialSurfaces.set(key,surface);radialPixels+=w*h;
  }
  paint=ctx.createPattern(surface,'no-repeat');paint.setTransform(new DOMMatrix([tile.width/w,0,0,tile.height/h,tile.x,tile.y]));return paint;
 }
 paint=ctx.createLinearGradient(...p.start,...p.end);
 addStops(paint,g);return paint;
}
function addStops(paint,g){
 for(const stop of g.stops){const rgb=[1,3,5].map(i=>parseInt(stop.color.slice(i,i+2),16));paint.addColorStop(stop.position,`rgba(${rgb.join(',')},${stop.opacity})`);}
}
export function gradientSvg(s,channel='fill') {
 const g=channel==='stroke'?s.appearance?.stroke_gradient:s.appearance?.gradient;if(!g||!s.appearance[channel+'_enabled'])return '';
 if(['angular','diamond'].includes(g.kind))return extendedGradientSvg(s,g,channel);
 const p=gradientGeometry(s,g),stops=g.stops.map(t=>`<stop offset="${t.position}" stop-color="${t.color}" stop-opacity="${t.opacity}"/>`).join('');
 const radial=radialGeometry(g);
 const common=`id="${channel==='stroke'?'stroke-gradient':'gradient'}-${s.id}" gradientUnits="userSpaceOnUse" color-interpolation="sRGB"`;
 return g.kind==='radial'?`<radialGradient ${common} cx="0" cy="0" r="1" fx="${radial.focal[0]}" fy="${radial.focal[1]}" fr="${radial.focalRadius}" gradientTransform="translate(${s.x} ${s.y}) scale(${s.width} ${s.height}) matrix(${radial.matrix.join(' ')})">${stops}</radialGradient>`:`<linearGradient ${common} x1="${p.start[0]}" y1="${p.start[1]}" x2="${p.end[0]}" y2="${p.end[1]}">${stops}</linearGradient>`;
}
export function insertGradientStop(g) {
 if(g.stops.length>=16)return g;
 let slot=0;for(let i=1;i<g.stops.length-1;i++)if(g.stops[i+1].position-g.stops[i].position>g.stops[slot+1].position-g.stops[slot].position)slot=i;
 const a=g.stops[slot],b=g.stops[slot+1],opacity=(a.opacity+b.opacity)/2;
 // Interpolate premultiplied colors so adding a stop preserves transparency.
 const color='#'+[1,3,5].map(i=>Math.round(opacity?((parseInt(a.color.slice(i,i+2),16)*a.opacity+parseInt(b.color.slice(i,i+2),16)*b.opacity)/2/opacity):0).toString(16).padStart(2,'0')).join('');
 return {...g,stops:[...g.stops.slice(0,slot+1),{position:(a.position+b.position)/2,color,opacity},...g.stops.slice(slot+1)]};
}

export function sampleGradient(g,t){
 const upper=g.stops.findIndex(s=>s.position>=t),b=upper<0?g.stops.at(-1):g.stops[upper],a=upper<=0?b:g.stops[upper-1],mix=b.position===a.position?0:Math.max(0,Math.min(1,(t-a.position)/(b.position-a.position))),opacity=a.opacity*(1-mix)+b.opacity*mix;
 return {color:'#'+[1,3,5].map(i=>Math.round(opacity?(parseInt(a.color.slice(i,i+2),16)*a.opacity*(1-mix)+parseInt(b.color.slice(i,i+2),16)*b.opacity*mix)/opacity:0).toString(16).padStart(2,'0')).join(''),opacity};
}
function extendedGradientSvg(s,g,channel){
 const cx=g.start[0],cy=g.start[1],angle=Math.atan2(g.end[1]-cy,g.end[0]-cx),radius=Math.hypot(g.end[0]-cx,g.end[1]-cy),reach=Math.max(...[[0,0],[0,1],[1,0],[1,1]].map(([x,y])=>Math.hypot(x-cx,y-cy)))*2;
 let content='';const point=(x,y)=>`${(cx+x)*s.width},${(cy+y)*s.height}`,paint=t=>{const c=sampleGradient(g,t);return `fill="${c.color}" fill-opacity="${c.opacity}"`;};
 if(g.kind==='angular'){for(let i=0;i<512;i++){const a=angle+i/512*Math.PI*2,b=angle+(i+1.05)/512*Math.PI*2;content+=`<path d="M ${point(0,0)} L ${point(Math.cos(a)*reach,Math.sin(a)*reach)} ${point(Math.cos(b)*reach,Math.sin(b)*reach)} Z" ${paint(i/512)}/>`;}}
 else{for(let i=256;i>=0;i--){const r=reach*i/256,c=Math.cos(angle),n=Math.sin(angle);content+=`<polygon points="${[[r,0],[0,r],[-r,0],[0,-r]].map(([x,y])=>point(c*x-n*y,n*x+c*y)).join(' ')}" ${paint(Math.min(1,r/radius))}/>`;}}
 return `<pattern id="${channel==='stroke'?'stroke-gradient':'gradient'}-${s.id}" patternUnits="userSpaceOnUse" x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}">${content}</pattern>`;
}
