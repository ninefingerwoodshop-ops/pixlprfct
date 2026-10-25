// Geometry is shared by canvas masks, SVG masks and export/effect bounds.
export function strokeAlignment(s){return s.points?.length&&!s.closed?'center':s.appearance?.stroke_alignment??'center';}
export function endpointStyle(s,end){return s.appearance?.[end?'stroke_end':'stroke_start']??(end&&s.kind==='arrow'?'legacy_arrow':'none');}
export function strokeTips(s){
 if(s.closed||!s.points||s.points.length<2)return [];
 if([false,true].every(end=>endpointStyle(s,end)==='none'))return [];
 const world=p=>[s.x+p[0]*s.width,s.y+p[1]*s.height],nodes=s.points.map(world),w=s.stroke_width??2,result=[];
 for(const end of [false,true]){
  let kind=endpointStyle(s,end);if(kind==='none'){kind=s.appearance?.stroke_cap??'round';if(kind==='butt')continue;}
  const i=end?nodes.length-1:0,p=nodes[i],j=end?i-1:1,near=nodes[j];
  const candidates=[s.handles?.[i]?.[end?0:1],s.handles?.[j]?.[end?1:0]].filter(Boolean).map(world);
  candidates.push(...(end?nodes.slice(0,i).reverse():nodes.slice(1)));
  const q=candidates.find(v=>Math.hypot(v[0]-p[0],v[1]-p[1])>1e-9);if(!q)continue;
  const length=Math.hypot(p[0]-q[0],p[1]-q[1]),u=[(p[0]-q[0])/length,(p[1]-q[1])/length];
  const at=(x,y)=>[p[0]+x*u[0]-y*u[1],p[1]+x*u[1]+y*u[0]];
  let points,closed=true,d;
  if(kind==='circle'||kind==='round'){const r=kind==='circle'?w*2:w/2,a=at(-r,0),b=at(r,0);d=`M${a} A${r} ${r} 0 1 0 ${b} A${r} ${r} 0 1 0 ${a} Z`;}
  else {
   if(kind==='legacy_arrow'){const size=Math.min(Math.hypot(p[0]-near[0],p[1]-near[1])*.4,Math.max(10,w*4));points=[[-Math.cos(.5)*size,-Math.sin(.5)*size],[0,0],[-Math.cos(.5)*size,Math.sin(.5)*size]];closed=false;}
   else if(kind==='line'){points=[[-3*w,-3*w],[0,0],[-3*w,3*w]];closed=false;}
   else if(kind==='square')points=[[-w/2,-w/2],[w/2,-w/2],[w/2,w/2],[-w/2,w/2]];
   else if(kind==='triangle')points=[[0,0],[-4*w,-2*w],[-4*w,2*w]];
   else if(kind==='reverse_triangle')points=[[-4*w,0],[0,-2*w],[0,2*w]];
   else if(kind==='diamond')points=[[0,0],[-3*w,-2*w],[-6*w,0],[-3*w,2*w]];
   else continue;
   d=points.map((v,k)=>(k?'L':'M')+at(...v).join(' ')).join(' ')+(closed?' Z':'');
  }
  const cut=['triangle','diamond'].includes(kind)?[[-w,-w],[w,-w],[w,w],[-w,w]].map((v,k)=>(k?'L':'M')+at(...v).join(' ')).join(' ')+' Z':null;
  result.push({d,closed,cut});
 }
 return result;
}
export function strokePadding(s,style=s.appearance??{}){
 const reach=s.points?.length?Math.max(style.stroke_join==='miter'?(style.stroke_miter_limit??10):1,style.stroke_cap==='square'?Math.SQRT2:1):1;
 const alignment=strokeAlignment(s);
 let pad=(s.stroke_width??2)*(alignment==='inside'?0:alignment==='outside'?1:.5)*reach;
 if(!s.closed&&s.points?.length>1){for(const end of [false,true]){const tip=endpointStyle(s,end);if(tip==='legacy_arrow')pad=Math.max(pad,Math.max(10,(s.stroke_width??2)*4)+(s.stroke_width??2));else if(tip!=='none')pad=Math.max(pad,(s.stroke_width??2)*7);}}
 return pad;
}
