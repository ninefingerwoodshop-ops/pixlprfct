export function appearance(s) {
  return s.appearance??{opacity:1,corner_radius:0,fill_enabled:!s.points?.length||!!s.closed,stroke_enabled:!!s.points?.length,stroke_color:s.points?.length?s.fill:'#000000'};
}
export function radius(s){return Math.min(appearance(s).corner_radius,s.width/2,s.height/2);}
export function roundedContains(s,p){if(p.x<s.x||p.x>s.x+s.width||p.y<s.y||p.y>s.y+s.height)return false;const r=radius(s),x=Math.max(s.x+r,Math.min(s.x+s.width-r,p.x)),y=Math.max(s.y+r,Math.min(s.y+s.height-r,p.y));return Math.hypot(p.x-x,p.y-y)<=r;}
export function paintAttributes(s){const a=appearance(s);return `fill="${a.fill_enabled?s.fill:'none'}" stroke="${a.stroke_enabled?a.stroke_color:'none'}" stroke-width="${s.stroke_width??2}" stroke-linecap="round" stroke-linejoin="round"`;}
// Composite each layer with its descendants before applying opacity. This avoids
// dark overlaps when a translucent frame contains overlapping children.
export function drawScene(shapes,context,paint) {
 const children=new Map();for(const s of shapes){const list=children.get(s.parent_id||0)??[];list.push(s);children.set(s.parent_id||0,list);}
 const visit=(s,target)=>{
  if(s.hidden)return;const a=appearance(s);if(a.opacity===0)return;
  const content=c=>{paint(s,c);c.save();if(s.kind==='frame'&&s.clip_content){c.beginPath();c.roundRect(s.x,s.y,s.width,s.height,radius(s));c.clip();}for(const child of children.get(s.id)??[])visit(child,c);c.restore();};
  if(a.opacity===1){content(target);return;}
  const surface=new OffscreenCanvas(target.canvas.width,target.canvas.height),layer=surface.getContext('2d');layer.setTransform(target.getTransform());content(layer);
  target.save();target.setTransform(1,0,0,1,0,0);target.globalAlpha=a.opacity;target.drawImage(surface,0,0);target.restore();
 };
 for(const root of children.get(0)??[])visit(root,context);
}
export function sceneSvg(shapes,paint){
 const visit=s=>{if(s.hidden)return '';const a=appearance(s);let children=shapes.filter(c=>c.parent_id===s.id).map(visit).join('');if(s.kind==='frame'&&s.clip_content)children=`<g clip-path="url(#frame-clip-${s.id})">${children}</g>`;return `<g opacity="${a.opacity}">${paint(s)}${children}</g>`;};
 return shapes.filter(s=>!s.parent_id).map(visit).join('');
}
