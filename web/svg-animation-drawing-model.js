import {validMorph} from './svg-animation-morph.js';
import {smoothPencil} from './pencil.js';
import {nearestSegment} from './vector-edit.js';

// Sample and smooth in screen space so zoom and nonuniform SVG scaling do not
// change the visible smoothing tolerance. The caller maps handles to SVG space.
export function pencilPath(input,amount=50){
 if(input.length>4096)throw new Error('Pencil strokes support up to 4,096 samples. Draw a shorter stroke.');
 if(input.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Pencil coordinates must be finite.');
 const points=smoothPencil(input,amount);
 if(points.length<2)return null;
 if(points.length>512)throw new Error('This stroke needs more than 512 anchors. Increase smoothing or draw a shorter stroke.');
 return [{closed:false,points:points.map(p=>[p.x,p.y,p.in?.x??p.x,p.in?.y??p.y,p.out?.x??p.x,p.out?.y??p.y])}];
}

// Base paths use the same cubic representation as morphs, without creating tracks.
export function checkedPath(value){
 if(!validMorph(value))throw new Error('Paths need 2–512 anchors, up to 64 subpaths, and coordinates within ±100,000.');
 return value;
}
// Move a selection atomically, carrying each anchor's handles and metadata.
export function movePathAnchors(value,selection,dx,dy){
 const next=structuredClone(value),seen=new Set();
 if(!selection.length||!Number.isFinite(dx)||!Number.isFinite(dy))throw new Error('Select anchors and a finite offset.');
 for(const [path,index] of selection){
  const point=next[path]?.points[index],key=`${path}:${index}`;
  if(!point)throw new Error('The selected anchor is no longer available.');
  if(seen.has(key))continue;seen.add(key);
  for(let offset=0;offset<6;offset+=2){point[offset]+=dx;point[offset+1]+=dy;}
 }
 return checkedPath(next);
}
// Measure hit tolerance in screen pixels, including nonuniform/rotated SVGs.
export function nearestPathSegment(value,point,matrix,tolerance=8){
 const transform=p=>[matrix.a*p[0]+matrix.c*p[1]+matrix.e,matrix.b*p[0]+matrix.d*p[1]+matrix.f];
 const paths=value.map(path=>({...path,points:path.points.map(p=>[...transform(p),...transform(p.slice(2,4)),...transform(p.slice(4))])}));
 if(paths.some(path=>path.points.some(p=>Math.hypot(p[0]-point.x,p[1]-point.y)<=8)))return null;
 let best=null;
 paths.forEach((path,pathIndex)=>{
  const hit=nearestSegment({x:0,y:0,width:1,height:1,closed:path.closed,points:path.points.map(p=>p.slice(0,2)),handles:path.points.map(p=>[p.slice(2,4),p.slice(4)])},point);
  if(hit&&hit.distance<=tolerance&&hit.t>0&&hit.t<1&&(!best||hit.distance<best.distance))best={...hit,path:pathIndex};
 });
 return best;
}
export function editAnchor(value,pathIndex,index,operation,t=.5){
 const next=structuredClone(value);changeAnchor(next[pathIndex],index,operation,t);return checkedPath(next);
}
function changeAnchor(path,index,operation,t=.5){
 const point=path?.points[index];
 if(!point)throw new Error('Select an anchor first.');
 const points=path.points,previous=points[(index+points.length-1)%points.length],following=points[(index+1)%points.length];
 if(operation==='insert'){
  if(!path.closed&&index===points.length-1)throw new Error('Select an anchor with a following segment.');
  if(!Number.isFinite(t)||t<=0||t>=1)throw new Error('Choose a point inside a path segment.');
  const mix=(a,b)=>a.map((n,i)=>n+(b[i]-n)*t),a=point.slice(0,2),b=point.slice(4),c=following.slice(2,4),d=following.slice(0,2);
  const ab=mix(a,b),bc=mix(b,c),cd=mix(c,d),abc=mix(ab,bc),bcd=mix(bc,cd),mid=mix(abc,bcd);
  point.splice(4,2,...ab);following.splice(2,2,...cd);points.splice(index+1,0,[...mid,...abc,...bcd]);
  path.mirroring?.splice(index+1,0,'a');
 }else if(operation==='delete'){
  if(points.length<=2)throw new Error('Keep at least two anchors, or delete the element.');
  points.splice(index,1);
  path.mirroring?.splice(index,1);
 }else if(operation==='corner')point.splice(2,4,...point.slice(0,2),...point.slice(0,2));
 else if(operation==='smooth'){
  const first=!path.closed&&index===0,last=!path.closed&&index===points.length-1;
  const a=first?point:previous,b=last?point:following,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
  const incoming=first?0:Math.hypot(point[0]-previous[0],point[1]-previous[1])/3,outgoing=last?0:Math.hypot(following[0]-point[0],following[1]-point[1])/3;
  point.splice(2,4,point[0]-dx/length*incoming,point[1]-dy/length*incoming,point[0]+dx/length*outgoing,point[1]+dy/length*outgoing);
 }else throw new Error('Unknown anchor operation.');
 if(path.mirroring&&['corner','smooth'].includes(operation))path.mirroring[index]=operation==='corner'?'n':'a';
}
// Validate the entire selection before editing; indexes always refer to the
// original path. Deleting one subpath must not partially edit another on failure.
export function editPathAnchors(value,selection,operation){
 if(!['delete','smooth','corner'].includes(operation))throw new Error('Choose Delete, Smooth or Corner for selected anchors.');
 if(!selection.length)throw new Error('Select anchors first.');
 const groups=new Map(),unique=[];
 for(const [path,index] of selection){
  if(!Number.isInteger(path)||!Number.isInteger(index)||!value[path]?.points[index])throw new Error('The selected anchor is no longer available.');
  if(!groups.has(path))groups.set(path,new Set());
  if(groups.get(path).has(index))continue;groups.get(path).add(index);unique.push([path,index]);
 }
 if(operation==='delete')for(const [path,indexes] of groups)if(value[path].points.length-indexes.size<2)throw new Error('Keep at least two anchors in each subpath, or delete the whole path.');
 const next=structuredClone(value),selected=[];
 for(const [path,indexes] of groups){
  if(operation==='delete'){
   const part=next[path],first=Math.min(...indexes);part.points=part.points.filter((_,i)=>!indexes.has(i));
   if(part.mirroring)part.mirroring=part.mirroring.filter((_,i)=>!indexes.has(i));
   selected.push([path,Math.min(first,part.points.length-1)]);
  }else for(const index of indexes)changeAnchor(next[path],index,operation);
 }
 return {value:checkedPath(next),selections:operation==='delete'?selected:unique};
}
export function continuePath(value,pathIndex,index){
 const next=structuredClone(value),path=next[pathIndex];
 if(!path||path.closed||!([0,path.points.length-1].includes(index)))throw new Error('Select the first or last anchor of an open path.');
 if(index===0){path.points.reverse().forEach(p=>{const incoming=p.slice(2,4);p.splice(2,4,...p.slice(4),...incoming);});path.mirroring?.reverse();}
 return checkedPath(next);
}

export function isEndpoint(path,index){return !!path&&!path.closed&&(index===0||index===path.points.length-1);}
const collapse=(point,offset)=>point.splice(offset,2,...point.slice(0,2));
const reverse=points=>points.reverse().forEach(p=>{const incoming=p.slice(2,4);p.splice(2,4,...p.slice(4),...incoming);});
const coincident=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-9;

// Keep topology changes inside the same SVG element: its paints, transforms,
// animation tracks and references continue to address that element's identity.
export function splitPath(value,pathIndex,index){
 const next=structuredClone(value),path=next[pathIndex],points=path?.points;
 if(!points?.[index]||!path.closed&&isEndpoint(path,index))throw new Error('Select an interior anchor, or any anchor on a closed path.');
 const sections=path.closed?[Array.from({length:points.length+1},(_,i)=>structuredClone(points[(index+i)%points.length]))]:[points.slice(0,index+1),structuredClone(points.slice(index))];
 for(const part of sections){collapse(part[0],2);collapse(part.at(-1),4);}
 const modes=path.mirroring?(path.closed?[Array.from({length:points.length+1},(_,i)=>path.mirroring[(index+i)%points.length])]:[path.mirroring.slice(0,index+1),path.mirroring.slice(index)]):null;
 next.splice(pathIndex,1,...sections.map((points,i)=>({closed:false,points,...(modes?{mirroring:modes[i]}:{})})));
 return {value:checkedPath(next),selection:[pathIndex,path.closed?0:index]};
}

export function joinEndpoints(value,from,to){
 const next=structuredClone(value),[a,ai]=from,[b,bi]=to,left=next[a],right=next[b];
 if(!isEndpoint(left,ai)||!isEndpoint(right,bi))throw new Error('Choose two open endpoints in this path.');
 if(a===b){
  if(ai===bi)throw new Error('Choose a different endpoint to join.');
  const points=left.points;
  // Opening a closed path duplicates its cut anchor. Reclosing restores the
  // original cubic seam; distinct ends get a straight closing segment.
  if(points.length>2&&coincident(points[0],points.at(-1))){points[0].splice(2,2,...points.at(-1).slice(2,4));points.pop();left.mirroring?.pop();}
  else{collapse(points[0],2);collapse(points.at(-1),4);}
  if(left.mirroring)left.mirroring[0]='n';
  left.closed=true;return {value:checkedPath(next),selection:[a,0]};
 }
 if(ai===0){reverse(left.points);left.mirroring?.reverse();}if(bi===right.points.length-1){reverse(right.points);right.mirroring?.reverse();}
 const end=left.points.at(-1),start=right.points[0],seam=left.points.length-1;
 const modes=left.mirroring||right.mirroring?[...(left.mirroring??left.points.map(()=>'n')),...(right.mirroring??right.points.map(()=>'n')).slice(coincident(end,start)?1:0)]:null;
 if(coincident(end,start)){end.splice(4,2,...start.slice(4));left.points.push(...right.points.slice(1));}
 else{collapse(end,4);collapse(start,2);left.points.push(...right.points);}
 collapse(left.points[0],2);collapse(left.points.at(-1),4);next.splice(b,1);
 if(modes){modes[seam]='n';left.mirroring=modes;}
 return {value:checkedPath(next),selection:[a-(b<a?1:0),seam]};
}

// Transfer every subpath into the retained element's local coordinate system,
// then use the same seam/orientation rules as an ordinary endpoint join.
export function joinTransformedPaths(left,from,right,to,matrix){
 if(!matrix||!['a','b','c','d','e','f'].every(key=>Number.isFinite(matrix[key]))||Math.abs(matrix.a*matrix.d-matrix.b*matrix.c)<1e-12)throw new Error('Both paths need invertible transforms to join.');
 const mapped=structuredClone(right);
 for(const path of mapped)for(const point of path.points)for(let i=0;i<6;i+=2){const x=point[i],y=point[i+1];point[i]=matrix.a*x+matrix.c*y+matrix.e;point[i+1]=matrix.b*x+matrix.d*y+matrix.f;}
 checkedPath(mapped);
 return joinEndpoints([...structuredClone(left),...mapped],from,[left.length+to[0],to[1]]);
}
