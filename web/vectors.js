export const vectorTools = ['line','arrow','polygon','star','pen','pencil'];
export function fromPoints(kind, points, closed = false) {
  const all=points.flatMap(p=>[p,p.in??p,p.out??p]);
  const x = Math.min(...all.map(p=>p.x)), y = Math.min(...all.map(p=>p.y));
  const width = Math.max(1,Math.max(...all.map(p=>p.x))-x), height = Math.max(1,Math.max(...all.map(p=>p.y))-y);
  const normalize=p=>[(p.x-x)/width,(p.y-y)/height];
  return {id:0,kind,name:kind[0].toUpperCase()+kind.slice(1),x,y,width,height,fill:'#1e1e1e',text:'',hidden:false,closed,stroke_width:2,points:points.map(normalize),handles:points.some(p=>p.in||p.out)?points.map(p=>[normalize(p.in??p),normalize(p.out??p)]):[]};
}
export function anchors(shape) {
  const world=p=>({x:shape.x+p[0]*shape.width,y:shape.y+p[1]*shape.height});
  return shape.points.map((p,i)=>({...world(p),in:world(shape.handles?.[i]?.[0]??p),out:world(shape.handles?.[i]?.[1]??p)}));
}
export function reshape(shape, points) {
  const geometry=fromPoints(shape.kind,points,shape.closed);
  return {...shape,x:geometry.x,y:geometry.y,width:geometry.width,height:geometry.height,points:geometry.points,handles:geometry.handles};
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
  let d=`M${points[0][0]} ${points[0][1]}`;
  const nodes=anchors(shape);
  for(let i=1;i<points.length+(shape.closed?1:0);i++) {
    const a=nodes[i-1],b=nodes[i%nodes.length];
    d+=shape.handles?.length ? ` C${a.out.x} ${a.out.y} ${b.in.x} ${b.in.y} ${b.x} ${b.y}` : ` L${b.x} ${b.y}`;
  }
  if(shape.closed) d+=' Z';
  if(shape.kind==='arrow'&&points.length>1) {
    const a=points.at(-2),b=points.at(-1),angle=Math.atan2(b[1]-a[1],b[0]-a[0]),size=Math.min(Math.hypot(b[0]-a[0],b[1]-a[1])*.4,Math.max(10,shape.stroke_width*4));
    d+=` M${b[0]-Math.cos(angle-.5)*size} ${b[1]-Math.sin(angle-.5)*size} L${b[0]} ${b[1]} L${b[0]-Math.cos(angle+.5)*size} ${b[1]-Math.sin(angle+.5)*size}`;
  }
  return d;
}
export function vectorSvg(shape) { return `<path d="${vectorPath(shape)}" ${paintAttributes(shape)}/>`; }
import {paintAttributes} from './appearance.js';
