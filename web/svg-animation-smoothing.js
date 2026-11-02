import {smoothPencil} from './pencil.js';
import {checkedPath} from './svg-animation-drawing-model.js';

const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);};

// Sample actual cubics, not just anchors. Reduction/handle fitting uses the
// same visible-pixel tolerance and corner policy as new Pencil strokes.
export function smoothExistingPath(value,amount,matrix){
 checkedPath(value);
 if(!Number.isFinite(amount)||amount<0||amount>100)throw new Error('Choose a smoothing amount from 0 to 100.');
 if(!amount)return structuredClone(value);
 if(!matrix||!['a','b','c','d','e','f'].every(k=>Number.isFinite(matrix[k])))throw new Error('This path needs an invertible transform to smooth.');
 const {a,b,c,d,e,f}=matrix,det=a*d-b*c;
 if(!Number.isFinite(det)||Math.abs(det)<1e-12)throw new Error('This path needs an invertible transform to smooth.');
 const screen=(x,y)=>({x:a*x+c*y+e,y:b*x+d*y+f}),local=p=>[(d*(p.x-e)-c*(p.y-f))/det,(a*(p.y-f)-b*(p.x-e))/det];
 let samples=0;
 const result=value.map(part=>{
  const points=part.points.map(p=>[screen(p[0],p[1]),screen(p[2],p[3]),screen(p[4],p[5])]);
  if(points.some(p=>p.some(q=>!Number.isFinite(q.x)||!Number.isFinite(q.y))))throw new Error('The transformed path is out of range.');
  const polyline=[points[0][0]],tolerance=Math.min(.25,amount*.003);
  for(let i=0;i<points.length-(part.closed?0:1);i++){
   const left=points[i],right=points[(i+1)%points.length],pending=[[left[0],left[2],right[1],right[0],0]];
   while(pending.length){
    const [p0,p1,p2,p3,depth]=pending.pop();
    if(Math.max(distance(p1,p0,p3),distance(p2,p0,p3))<=tolerance){polyline.push(p3);if(++samples>4096)throw new Error('This path is too detailed to smooth at this zoom. Zoom out and try again.');continue;}
    if(depth>=20)throw new Error('This path is too detailed to smooth at this zoom. Zoom out and try again.');
    const p01=midpoint(p0,p1),p12=midpoint(p1,p2),p23=midpoint(p2,p3),p012=midpoint(p01,p12),p123=midpoint(p12,p23),center=midpoint(p012,p123);
    pending.push([center,p123,p23,p3,depth+1],[p0,p01,p012,center,depth+1]);
   }
  }
  const fitted=smoothPencil(polyline,amount,1,part.closed);
  // Already compact curves and degenerate contours retain their exact data.
  // Never add anchors merely to smooth a path that is already economical.
  if(fitted.length<2||fitted.length>=part.points.length)return structuredClone(part);
  const next={...part,points:fitted.map(p=>[...local(p),...local(p.in??p),...local(p.out??p)]),mirroring:fitted.map(p=>p.in&&p.out?'a':'n')};
  next.points[0].splice(0,2,...part.points[0].slice(0,2));
  if(!part.closed)next.points.at(-1).splice(0,2,...part.points.at(-1).slice(0,2));
  return next;
 });
 return checkedPath(result);
}
