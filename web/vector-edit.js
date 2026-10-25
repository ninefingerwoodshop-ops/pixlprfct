import {anchors,reshape} from './vectors.js';
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function cubicPoint(a,b,t){const p=mix(a,a.out,t),q=mix(a.out,b.in,t),r=mix(b.in,b,t);return mix(mix(p,q,t),mix(q,r,t),t);}
export function nearestSegment(shape,point){
 const nodes=anchors(shape),count=nodes.length-(shape.closed?0:1);let best=null;
 for(let i=0;i<count;i++){
  const a=nodes[i],b=nodes[(i+1)%nodes.length];const distance=t=>{const p=cubicPoint(a,b,t);return (p.x-point.x)**2+(p.y-point.y)**2;};
  let t=0,d=Infinity;for(let k=0;k<=64;k++){const v=distance(k/64);if(v<d){d=v;t=k/64;}}
  let lo=Math.max(0,t-1/64),hi=Math.min(1,t+1/64);for(let k=0;k<24;k++){const u=lo+(hi-lo)/3,v=hi-(hi-lo)/3;if(distance(u)<distance(v))hi=v;else lo=u;}
  t=(lo+hi)/2;d=distance(t);if(!best||d<best.distance**2)best={segment:i,t,distance:Math.sqrt(d),point:cubicPoint(a,b,t)};
 }
 return best;
}
export function insertAnchor(shape,segment,t){
 const nodes=anchors(shape);if(nodes.length>=4096)throw new Error('A path can contain at most 4096 anchors');
 const count=nodes.length-(shape.closed?0:1);if(!Number.isInteger(segment)||segment<0||segment>=count||!Number.isFinite(t)||t<=0||t>=1)throw new Error('Choose a point inside a path segment');
 const a=nodes[segment],b=nodes[(segment+1)%nodes.length];
 const p=mix(a,a.out,t),q=mix(a.out,b.in,t),r=mix(b.in,b,t),u=mix(p,q,t),v=mix(q,r,t),point=mix(u,v,t);
 a.out=p;b.in=r;nodes.splice(segment+1,0,{...point,in:u,out:v});return reshape(shape,nodes);
}
export function deleteAnchor(shape,index){
 const nodes=anchors(shape);if(nodes.length<=(shape.closed?3:2))throw new Error(shape.closed?'Closed paths need at least 3 anchors':'Open paths need at least 2 anchors');
 if(!Number.isInteger(index)||index<0||index>=nodes.length)throw new Error('Select an anchor first');nodes.splice(index,1);return reshape(shape,nodes);
}
export function convertAnchor(shape,index,smooth){
 const nodes=anchors(shape),a=nodes[index];if(!a)throw new Error('Select an anchor first');
 if(!smooth){a.in={x:a.x,y:a.y};a.out={x:a.x,y:a.y};}
 else {const before=nodes[index-1]??(shape.closed?nodes.at(-1):a),after=nodes[index+1]??(shape.closed?nodes[0]:a),dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
 const incoming=Math.hypot(a.x-before.x,a.y-before.y)/3,outgoing=Math.hypot(after.x-a.x,after.y-a.y)/3;
 a.in={x:a.x-dx/length*incoming,y:a.y-dy/length*incoming};a.out={x:a.x+dx/length*outgoing,y:a.y+dy/length*outgoing};}
 return reshape(shape,nodes);
}
