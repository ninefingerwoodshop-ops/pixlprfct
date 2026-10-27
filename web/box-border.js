// CSS borders are the area between the rounded outer box and its inset box.
function roundedPath(x,y,w,h,corners){
 const scale=Math.min(1,...[w/(corners[0][0]+corners[1][0]),w/(corners[2][0]+corners[3][0]),h/(corners[0][1]+corners[3][1]),h/(corners[1][1]+corners[2][1])].filter(Number.isFinite));
 const r=corners.map(([a,b])=>[a*scale,b*scale]),arc=(i,px,py)=>r[i][0]&&r[i][1]?`A ${r[i][0]} ${r[i][1]} 0 0 1 ${px} ${py}`:`L ${px} ${py}`;
 return `M ${x+r[0][0]} ${y} H ${x+w-r[1][0]} ${arc(1,x+w,y+r[1][1])} V ${y+h-r[2][1]} ${arc(2,x+w-r[2][0],y+h)} H ${x+r[3][0]} ${arc(3,x,y+h-r[3][1])} V ${y+r[0][1]} ${arc(0,x+r[0][0],y)} Z`;
}
export function boxBorderPath(s){
 const [t,r,b,l]=s.border_widths,a=s.appearance??{},corners=s.kind==='ellipse'?Array(4).fill([s.width/2,s.height/2]):(a.corner_radii??Array(4).fill(a.corner_radius??0)).map(v=>[v,v]);
 const outer=roundedPath(s.x,s.y,s.width,s.height,corners),w=s.width-l-r,h=s.height-t-b;
 if(w<=0||h<=0)return outer;
 const inner=corners.map(([rx,ry],i)=>[Math.max(0,rx-(i===0||i===3?l:r)),Math.max(0,ry-(i<2?t:b))]);
 return outer+' '+roundedPath(s.x+l,s.y+t,w,h,inner);
}
