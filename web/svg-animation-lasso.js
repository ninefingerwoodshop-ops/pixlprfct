// Screen-space even/odd selection, including the closing edge and boundary.
// A retraced line has no region; a self-crossing loop can still have filled lobes.
export function lassoSelection(anchors,outline){
 if(outline.length<3)return [];
 const first=outline[0],other=outline.find(p=>Math.hypot(p.x-first.x,p.y-first.y)>1e-6);
 if(!other||!outline.some(p=>Math.abs((other.x-first.x)*(p.y-first.y)-(other.y-first.y)*(p.x-first.x))>1e-6))return [];
 return anchors.filter(point=>{
  let inside=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
   const a=outline[j],b=outline[i],dx=b.x-a.x,dy=b.y-a.y,cross=(point.x-a.x)*dy-(point.y-a.y)*dx;
   if(Math.abs(cross)<=1e-7*Math.max(1,Math.hypot(dx,dy))&&point.x>=Math.min(a.x,b.x)-1e-7&&point.x<=Math.max(a.x,b.x)+1e-7&&point.y>=Math.min(a.y,b.y)-1e-7&&point.y<=Math.max(a.y,b.y)+1e-7)return true;
   if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
 }).map(p=>[p.path,p.index]);
}
