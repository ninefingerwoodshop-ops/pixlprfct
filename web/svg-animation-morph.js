import {parsePath} from './svg-path.js';

// Fixed topology keeps both preview interpolation and native SVG export exact.
// A node stores its anchor, incoming handle, and outgoing handle in local units.
export function validMorph(value){
 if(!Array.isArray(value)||!value.length||value.length>64)return false;
 let total=0;
 return value.every(path=>path&&typeof path.closed==='boolean'&&Array.isArray(path.points)&&path.points.length>=2&&(total+=path.points.length)<=512&&path.points.every(p=>Array.isArray(p)&&p.length===6&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<=100000)));
}
export function morphPath(data){
 const value=parsePath(data).map(path=>({closed:path.closed,points:path.points.map(p=>[p.x,p.y,p.in?.x??p.x,p.in?.y??p.y,p.out?.x??p.x,p.out?.y??p.y])}));
 if(!validMorph(value))throw new Error('Morphing supports up to 512 nodes in 64 paths, with coordinates between −100,000 and 100,000.');
 return value;
}
export function sameMorphTopology(a,b){return a.length===b.length&&a.every((path,i)=>path.closed===b[i].closed&&path.points.length===b[i].points.length);}
export function interpolateMorph(a,b,t){return a.map((path,i)=>({closed:path.closed,points:path.points.map((point,j)=>point.map((n,k)=>n+(b[i].points[j][k]-n)*t))}));}
export function morphData(value){
 const n=value=>String(Number(value.toFixed(6)));
 return value.map(path=>{const points=path.points;let d=`M${n(points[0][0])} ${n(points[0][1])}`;
  for(let i=1;i<points.length+(path.closed?1:0);i++){const a=points[i-1],b=points[i%points.length];d+=`C${n(a[4])} ${n(a[5])} ${n(b[2])} ${n(b[3])} ${n(b[0])} ${n(b[1])}`;}
  return d+(path.closed?'Z':'');
 }).join('');
}
export function moveMorphPoint(value,path,index,kind,x,y){
 const next=structuredClone(value),point=next[path]?.points[index],offset={anchor:0,in:2,out:4}[kind];
 if(!point||offset===undefined)throw new Error('Select a morph node.');
 if(kind==='anchor'){const dx=x-point[0],dy=y-point[1];for(const at of [2,4]){point[at]+=dx;point[at+1]+=dy;}}
 point[offset]=x;point[offset+1]=y;if(!validMorph(next))throw new Error('Morph node coordinates are out of range.');return next;
}
