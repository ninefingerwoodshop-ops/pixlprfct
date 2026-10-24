export const vectorTools = ['line','arrow','polygon','star','pen','pencil'];
export function fromPoints(kind, points, closed = false) {
  const x = Math.min(...points.map(p=>p.x)), y = Math.min(...points.map(p=>p.y));
  const width = Math.max(1,Math.max(...points.map(p=>p.x))-x), height = Math.max(1,Math.max(...points.map(p=>p.y))-y);
  return {id:0,kind,name:kind[0].toUpperCase()+kind.slice(1),x,y,width,height,fill:'#1e1e1e',text:'',hidden:false,closed,stroke_width:2,points:points.map(p=>[(p.x-x)/width,(p.y-y)/height])};
}
export function drawnShape(kind, start, end, {shiftKey=false,altKey=false}={}) {
  let dx=end.x-start.x,dy=end.y-start.y;
  if (shiftKey) {
    if (kind==='line'||kind==='arrow') { const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4, length=Math.hypot(dx,dy); dx=Math.cos(angle)*length; dy=Math.sin(angle)*length; }
    else { const size=Math.max(Math.abs(dx),Math.abs(dy)); dx=(Math.sign(dx)||1)*size; dy=(Math.sign(dy)||1)*size; }
  }
  const a=altKey?{x:start.x-dx,y:start.y-dy}:start,b={x:start.x+dx,y:start.y+dy};
  if (kind==='line'||kind==='arrow') return fromPoints(kind,[a,b]);
  const shape={id:0,kind,name:kind[0].toUpperCase()+kind.slice(1),x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(1,Math.abs(b.x-a.x)),height:Math.max(1,Math.abs(b.y-a.y)),fill:kind==='frame'?'#ffffff':'#d9d9d9',text:'',hidden:false};
  if (kind==='polygon'||kind==='star') {
    const count=kind==='star'?10:3;
    shape.closed=true; shape.points=Array.from({length:count},(_,i)=>{const angle=-Math.PI/2+i*Math.PI*2/count,r=kind==='star'&&i%2?.22:.5;return [.5+Math.cos(angle)*r,.5+Math.sin(angle)*r];});
  }
  return shape;
}
export function vectorPath(shape) {
  const points=shape.points.map(p=>[shape.x+p[0]*shape.width,shape.y+p[1]*shape.height]);
  let d=points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')+(shape.closed?' Z':'');
  if(shape.kind==='arrow'&&points.length>1) {
    const a=points.at(-2),b=points.at(-1),angle=Math.atan2(b[1]-a[1],b[0]-a[0]),size=Math.min(Math.hypot(b[0]-a[0],b[1]-a[1])*.4,Math.max(10,shape.stroke_width*4));
    d+=` M${b[0]-Math.cos(angle-.5)*size} ${b[1]-Math.sin(angle-.5)*size} L${b[0]} ${b[1]} L${b[0]-Math.cos(angle+.5)*size} ${b[1]-Math.sin(angle+.5)*size}`;
  }
  return d;
}
export function vectorSvg(shape) { return `<path d="${vectorPath(shape)}" fill="${shape.closed?shape.fill:'none'}" stroke="${shape.fill}" stroke-width="${shape.stroke_width??2}" stroke-linecap="round" stroke-linejoin="round"/>`; }
