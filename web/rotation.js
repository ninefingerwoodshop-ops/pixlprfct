export function visualBounds(s) {
 const a=(s.rotation??0)*Math.PI/180,c=Math.cos(a),t=Math.sin(a),xs=[0,s.width*c,s.height*t,s.width*c+s.height*t],ys=[0,-s.width*t,s.height*c,-s.width*t+s.height*c],x=Math.min(...xs),y=Math.min(...ys);
 return {...s,x:s.x+x,y:s.y+y,width:Math.max(...xs)-x,height:Math.max(...ys)-y};
}
export function rotatedContains(s,p){const a=(s.rotation??0)*Math.PI/180,c=Math.cos(a),t=Math.sin(a),dx=p.x-s.x,dy=p.y-s.y,x=dx*c-dy*t,y=dx*t+dy*c;return x>=0&&y>=0&&x<=s.width&&y<=s.height;}

// Local coordinates retain the original origin so axis-aligned sizing can be reused.
export function localPoint(s,p){const a=(s.rotation??0)*Math.PI/180,c=Math.cos(a),t=Math.sin(a),dx=p.x-s.x,dy=p.y-s.y;return {x:s.x+dx*c-dy*t,y:s.y+dx*t+dy*c};}
export function worldPoint(s,p){const a=(s.rotation??0)*Math.PI/180,c=Math.cos(a),t=Math.sin(a),dx=p.x-s.x,dy=p.y-s.y;return {x:s.x+dx*c+dy*t,y:s.y-dx*t+dy*c};}
export function rotateFromDrag(s,start,end,snap=false){
 const center=worldPoint(s,{x:s.x+s.width/2,y:s.y+s.height/2});
 const delta=(Math.atan2(start.y-center.y,start.x-center.x)-Math.atan2(end.y-center.y,end.x-center.x))*180/Math.PI;
 let rotation=(s.rotation??0)+delta;if(snap)rotation=Math.round(rotation/15)*15;rotation=((rotation+180)%360+360)%360-180;
 const next={...s,rotation,layout_item:{...s.layout_item,fill_width:false,fill_height:false}};
 const offset=worldPoint({...next,x:0,y:0},{x:s.width/2,y:s.height/2});
 return {...next,x:center.x-offset.x,y:center.y-offset.y};
}

export function ancestorsOf(s,shapes){const byId=new Map(shapes.map(n=>[n.id,n])),chain=[];let p=byId.get(s.parent_id);while(p){chain.push(p);p=byId.get(p.parent_id);}return chain;}
export function worldShape(s,shapes){let result={...s};for(const p of ancestorsOf(s,shapes)){result={...result,...worldPoint(p,result),rotation:(result.rotation??0)+(p.rotation??0)};}return result;}
export function sceneToWorld(shapes){return shapes.map(s=>worldShape(s,shapes));}
export function shapeToLocal(s,shapes){let result={...s};for(const p of ancestorsOf(s,shapes).reverse()){result={...result,...localPoint(p,result),rotation:(result.rotation??0)-(p.rotation??0)};}return result;}
