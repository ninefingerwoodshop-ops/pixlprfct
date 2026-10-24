export function defaultGradient(color,kind='linear') {
 return {kind,start:kind==='radial'?[.5,.5]:[0,.5],end:[1,.5],stops:[{position:0,color,opacity:1},{position:1,color:'#7c3aed',opacity:1}]};
}
export function gradientGeometry(s,g) {
 return {start:[s.x+g.start[0]*s.width,s.y+g.start[1]*s.height],end:[s.x+g.end[0]*s.width,s.y+g.end[1]*s.height],radius:Math.hypot(g.end[0]-g.start[0],g.end[1]-g.start[1])};
}
const radialSurfaces=new Map();let radialPixels=0;
export function canvasFill(ctx,s) {
 const g=s.appearance?.gradient;if(!g)return s.fill;
 const p=gradientGeometry(s,g);let paint;
 if(g.kind==='radial') {
  // CanvasGradient has no independent transform. Paint the ellipse into a
  // device-resolution tile, then map that tile back to the shape's coordinates.
  // This also lets the same fill work for text and arbitrary vector paths.
  const t=ctx.getTransform(),wantedW=Math.max(1,Math.ceil(s.width*Math.hypot(t.a,t.b))),wantedH=Math.max(1,Math.ceil(s.height*Math.hypot(t.c,t.d)));
  const ratio=Math.min(1,8192/wantedW,8192/wantedH,Math.sqrt(16_777_216/(wantedW*wantedH))),w=Math.max(1,Math.ceil(wantedW*ratio)),h=Math.max(1,Math.ceil(wantedH*ratio));
  const key=JSON.stringify([g,w,h]);let surface=radialSurfaces.get(key);
  if(!surface){surface=new OffscreenCanvas(w,h);const c=surface.getContext('2d');c.scale(w,h);const gradient=c.createRadialGradient(...g.start,0,...g.start,p.radius);addStops(gradient,g);c.fillStyle=gradient;c.fillRect(0,0,1,1);
   while(radialPixels+w*h>16_777_216&&radialSurfaces.size){const first=radialSurfaces.keys().next().value,old=radialSurfaces.get(first);radialPixels-=old.width*old.height;radialSurfaces.delete(first);}radialSurfaces.set(key,surface);radialPixels+=w*h;
  }
  paint=ctx.createPattern(surface,'no-repeat');paint.setTransform(new DOMMatrix([s.width/w,0,0,s.height/h,s.x,s.y]));return paint;
 }
 paint=ctx.createLinearGradient(...p.start,...p.end);
 addStops(paint,g);return paint;
}
function addStops(paint,g){
 for(const stop of g.stops){const rgb=[1,3,5].map(i=>parseInt(stop.color.slice(i,i+2),16));paint.addColorStop(stop.position,`rgba(${rgb.join(',')},${stop.opacity})`);}
}
export function gradientSvg(s) {
 const g=s.appearance?.gradient;if(!g||!s.appearance.fill_enabled)return '';
 const p=gradientGeometry(s,g),stops=g.stops.map(t=>`<stop offset="${t.position}" stop-color="${t.color}" stop-opacity="${t.opacity}"/>`).join('');
 const common=`id="gradient-${s.id}" gradientUnits="userSpaceOnUse" color-interpolation="sRGB"`;
 return g.kind==='radial'?`<radialGradient ${common} cx="${g.start[0]}" cy="${g.start[1]}" r="${p.radius}" gradientTransform="translate(${s.x} ${s.y}) scale(${s.width} ${s.height})">${stops}</radialGradient>`:`<linearGradient ${common} x1="${p.start[0]}" y1="${p.start[1]}" x2="${p.end[0]}" y2="${p.end[1]}">${stops}</linearGradient>`;
}
export function insertGradientStop(g) {
 if(g.stops.length>=16)return g;
 let slot=0;for(let i=1;i<g.stops.length-1;i++)if(g.stops[i+1].position-g.stops[i].position>g.stops[slot+1].position-g.stops[slot].position)slot=i;
 const a=g.stops[slot],b=g.stops[slot+1],opacity=(a.opacity+b.opacity)/2;
 // Interpolate premultiplied colors so adding a stop preserves transparency.
 const color='#'+[1,3,5].map(i=>Math.round(opacity?((parseInt(a.color.slice(i,i+2),16)*a.opacity+parseInt(b.color.slice(i,i+2),16)*b.opacity)/2/opacity):0).toString(16).padStart(2,'0')).join('');
 return {...g,stops:[...g.stops.slice(0,slot+1),{position:(a.position+b.position)/2,color,opacity},...g.stops.slice(slot+1)]};
}
