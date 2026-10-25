import {appearance,radii} from './appearance.js';
import {fromPoints} from './vectors.js';

// Bake orthogonal transforms into rectangle geometry, including asymmetric
// corners and paint coordinates. No renderer-specific transform is needed.
export function transformRectangle(shape,action){
 if(shape.kind!=='rectangle')throw new Error('Select a rectangle');
 const rotate=action==='rotate',horizontal=action==='horizontal';
 if(!['rotate','horizontal','vertical'].includes(action))throw new Error('Unknown rectangle transform');
 const point=([x,y])=>rotate?[1-y,x]:horizontal?[1-x,y]:[x,1-y];
 const vector=([x,y])=>rotate?[-y,x]:horizontal?[-x,y]:[x,-y];
 const a=appearance(shape),corners=a.corner_radii;
 const gradient=g=>{if(!g)return g;const m=g.radial_transform??[1,0,0,1];return {...g,start:point(g.start),end:point(g.end),...(g.kind==='radial'?{radial_transform:[...vector(m.slice(0,2)),...vector(m.slice(2,4))]}:{})};};
 return {...shape,...(rotate?{x:shape.x+(shape.width-shape.height)/2,y:shape.y+(shape.height-shape.width)/2,width:shape.height,height:shape.width}:{}),appearance:{...a,gradient:gradient(a.gradient),stroke_gradient:gradient(a.stroke_gradient),...(corners?{corner_radii:(rotate?[3,0,1,2]:horizontal?[1,0,3,2]:[3,2,1,0]).map(i=>corners[i])}:{})}};
}

export function rectangleToVector(shape){
 if(shape.kind!=='rectangle')throw new Error('Select a rectangle');
 const [tl,tr,br,bl]=radii(shape),x=shape.x,y=shape.y,r=x+shape.width,b=y+shape.height,k=4*(Math.sqrt(2)-1)/3;
 const points=[];
 const corner=(radius,start,end,c1,c2)=>{if(!radius){points.push({x:start[0],y:start[1]});return;}points.push({x:start[0],y:start[1],out:{x:c1[0],y:c1[1]}});points.push({x:end[0],y:end[1],in:{x:c2[0],y:c2[1]}});};
 corner(tr,[r-tr,y],[r,y+tr],[r-tr+k*tr,y],[r,y+tr-k*tr]);
 corner(br,[r,b-br],[r-br,b],[r,b-br+k*br],[r-br+k*br,b]);
 corner(bl,[x+bl,b],[x,b-bl],[x+bl-k*bl,b],[x,b-bl+k*bl]);
 corner(tl,[x,y+tl],[x+tl,y],[x,y+tl-k*tl],[x+tl-k*tl,y]);
 const geometry=fromPoints('pen',points,true);
 return {...shape,kind:'pen',closed:true,points:geometry.points,handles:geometry.handles,appearance:{...appearance(shape),corner_radius:0,corner_radii:null}};
}
