import {moveMorphPoint,validMorph} from './svg-animation-morph.js';

export const mirroringAttribute='data-pixl-mirroring';
export const validMirroring=value=>typeof value==='string'&&value.length<=1023&&/^[nas](?:[,;][nas])*$/.test(value);
export function readMirroring(value,encoded){
 const modes=validMirroring(encoded)?encoded.split(';').map(part=>part.split(',')):[];
 value.forEach((path,i)=>{path.mirroring=path.points.map((_,j)=>modes.length===value.length&&modes[i]?.length===path.points.length?modes[i][j]:'n');});
 return value;
}
const length=(p,offset)=>Math.hypot(p[offset]-p[0],p[offset+1]-p[1]);
export const canMirror=(path,index)=>!!path?.points[index]&&(path.closed||index>0&&index<path.points.length-1)&&(length(path.points[index],2)>0||length(path.points[index],4)>0);
// Subdivision can change one handle's length without changing the curve. Keep
// its tangent constraint, but never reshape artwork merely to retain a mode.
export function mirroringMode(path,index){
 const mode=path.mirroring?.[index]??'n',p=path.points[index];if(mode==='n'||!canMirror(path,index))return 'n';
 const ax=p[2]-p[0],ay=p[3]-p[1],bx=p[4]-p[0],by=p[5]-p[1],a=length(p,2),b=length(p,4);
 if(Math.abs(ax*by-ay*bx)>1e-5*Math.max(1,a*b)||ax*bx+ay*by>1e-6)return 'n';
 return mode==='s'&&Math.abs(a-b)>1e-5*Math.max(1,a,b)?'a':mode;
}
export function writeMirroring(value){
 const encoded=value.map(path=>path.points.map((_,i)=>mirroringMode(path,i)).join(',')).join(';');
 return /[as]/.test(encoded)?encoded:null;
}
function reflect(point,offset,mode,oppositeLength){
 const other=offset===2?4:2,dx=point[offset]-point[0],dy=point[offset+1]-point[1],distance=Math.hypot(dx,dy);
 if(mode==='s'){point[other]=point[0]-dx;point[other+1]=point[1]-dy;}
 else if(distance){point[other]=point[0]-dx/distance*oppositeLength;point[other+1]=point[1]-dy/distance*oppositeLength;}
}
export function setHandleMirroring(value,pathIndex,index,mode,handle='out'){
 if(!['n','a','s'].includes(mode))throw new Error('Choose a handle mirroring mode.');
 const next=structuredClone(value),path=next[pathIndex];if(!canMirror(path,index))throw new Error('Select a curved interior anchor, or use Smooth anchor first.');
 const point=path.points[index];path.mirroring??=path.points.map(()=>'n');path.mirroring[index]=mode;
 if(mode!=='n'){
  let offset=handle==='in'?2:4;if(!length(point,offset))offset=offset===2?4:2;
  reflect(point,offset,mode,length(point,offset===2?4:2));
 }
 if(!validMorph(next))throw new Error('Mirrored handle coordinates are out of range.');return next;
}
export function movePathPoint(value,pathIndex,index,kind,x,y){
 const next=moveMorphPoint(value,pathIndex,index,kind,x,y),mode=mirroringMode(value[pathIndex],index);
 if(kind!=='anchor'&&mode!=='n')reflect(next[pathIndex].points[index],kind==='in'?2:4,mode,length(value[pathIndex].points[index],kind==='in'?4:2));
 if(!validMorph(next))throw new Error('Mirrored handle coordinates are out of range.');return next;
}
