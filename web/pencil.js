// Iterative Ramer–Douglas–Peucker reduction keeps long strokes off the call stack.
function distance(p,a,b){const x=b.x-a.x,y=b.y-a.y,d=x*x+y*y,t=d?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/d)):0;return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);}
export function smoothPencil(input,amount=50,zoom=1,closed=false){
 const points=input.filter((p,i)=>!i||p.x!==input[i-1].x||p.y!==input[i-1].y).map(p=>({x:p.x,y:p.y}));
 if(closed&&points.length>1&&points[0].x===points.at(-1).x&&points[0].y===points.at(-1).y)points.pop();
 const strength=Math.max(0,Math.min(100,Number.isFinite(amount)?amount:50))/100;
 if(points.length<3||!strength)return points;
 const tolerance=3*strength/Math.max(.01,zoom),keep=new Set([0,points.length-1]),pending=[[0,points.length-1]];
 if(closed){
  // Reduce both sides of the ring independently, keeping its seam and a far
  // anchor so a closed contour cannot collapse into a single point.
  let far=1;for(let i=2;i<points.length;i++)if(Math.hypot(points[i].x-points[0].x,points[i].y-points[0].y)>Math.hypot(points[far].x-points[0].x,points[far].y-points[0].y))far=i;
  points.push({...points[0]});keep.clear();[0,far,points.length-1].forEach(i=>keep.add(i));pending.splice(0,1,[0,far],[far,points.length-1]);
 }
 while(pending.length){const [a,b]=pending.pop();let index=-1,max=tolerance;for(let i=a+1;i<b;i++){const d=distance(points[i],points[a],points[b]);if(d>max){max=d;index=i;}}if(index>=0){keep.add(index);pending.push([a,index],[index,b]);}}
 if(closed&&keep.size===3){
  // Retain a third point for a non-collinear loop, even below the tolerance.
  const far=[...keep][1];let index=-1,max=0;for(let i=1;i<points.length-1;i++){const d=distance(points[i],points[0],points[far]);if(d>max){max=d;index=i;}}if(index>=0)keep.add(index);
 }
 const nodes=[...keep].sort((a,b)=>a-b).filter(i=>!closed||i<points.length-1).map(i=>points[i]);
 return nodes.map((p,i)=>{
  if(nodes.length<3||!closed&&(!i||i===nodes.length-1))return p;
  const a=nodes[(i+nodes.length-1)%nodes.length],b=nodes[(i+1)%nodes.length],before=Math.hypot(p.x-a.x,p.y-a.y),after=Math.hypot(b.x-p.x,b.y-p.y),dot=((p.x-a.x)*(b.x-p.x)+(p.y-a.y)*(b.y-p.y))/(before*after);
  // Keep sharp turns and reversals as corners; smooth gentle turns with aligned handles.
  if(dot<.5)return p;
  const tx=(p.x-a.x)/before+(b.x-p.x)/after,ty=(p.y-a.y)/before+(b.y-p.y)/after,length=Math.hypot(tx,ty),handle=Math.min(before,after)/3;
  return {...p,in:{x:p.x-tx/length*handle,y:p.y-ty/length*handle},out:{x:p.x+tx/length*handle,y:p.y+ty/length*handle}};
 });
}
