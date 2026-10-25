// Iterative Ramer–Douglas–Peucker reduction keeps long strokes off the call stack.
function distance(p,a,b){const x=b.x-a.x,y=b.y-a.y,d=x*x+y*y,t=d?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/d)):0;return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);}
export function smoothPencil(input,amount=50,zoom=1){
 const points=input.filter((p,i)=>!i||p.x!==input[i-1].x||p.y!==input[i-1].y).map(p=>({x:p.x,y:p.y}));
 const strength=Math.max(0,Math.min(100,Number.isFinite(amount)?amount:50))/100;
 if(points.length<3||!strength)return points;
 const tolerance=3*strength/Math.max(.01,zoom),keep=new Set([0,points.length-1]),pending=[[0,points.length-1]];
 while(pending.length){const [a,b]=pending.pop();let index=-1,max=tolerance;for(let i=a+1;i<b;i++){const d=distance(points[i],points[a],points[b]);if(d>max){max=d;index=i;}}if(index>=0){keep.add(index);pending.push([a,index],[index,b]);}}
 const nodes=[...keep].sort((a,b)=>a-b).map(i=>points[i]);
 return nodes.map((p,i)=>{
  if(!i||i===nodes.length-1)return p;
  const a=nodes[i-1],b=nodes[i+1],before=Math.hypot(p.x-a.x,p.y-a.y),after=Math.hypot(b.x-p.x,b.y-p.y),dot=((p.x-a.x)*(b.x-p.x)+(p.y-a.y)*(b.y-p.y))/(before*after);
  // Keep sharp turns and reversals as corners; smooth gentle turns with aligned handles.
  if(dot<.5)return p;
  const tx=(p.x-a.x)/before+(b.x-p.x)/after,ty=(p.y-a.y)/before+(b.y-p.y)/after,length=Math.hypot(tx,ty),handle=Math.min(before,after)/3;
  return {...p,in:{x:p.x-tx/length*handle,y:p.y-ty/length*handle},out:{x:p.x+tx/length*handle,y:p.y+ty/length*handle}};
 });
}
