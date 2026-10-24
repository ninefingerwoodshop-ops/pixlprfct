// SVG endpoint-to-center conversion follows W3C SVG implementation notes:
// https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
export function arcCubics(start,rx,ry,angle,large,sweep,end){
 rx=Math.abs(rx);ry=Math.abs(ry);
 if(start.x===end.x&&start.y===end.y)return [];
 if(!rx||!ry)return [{c1:start,c2:end,end}];
 const phi=angle*Math.PI/180,c=Math.cos(phi),s=Math.sin(phi),dx=(start.x-end.x)/2,dy=(start.y-end.y)/2;
 const x=c*dx+s*dy,y=-s*dx+c*dy,ratio=x*x/(rx*rx)+y*y/(ry*ry);
 if(ratio>1){rx*=Math.sqrt(ratio);ry*=Math.sqrt(ratio);}
 const factor=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-rx*rx*y*y-ry*ry*x*x)/(rx*rx*y*y+ry*ry*x*x)));
 const cxp=factor*rx*y/ry,cyp=-factor*ry*x/rx,cx=c*cxp-s*cyp+(start.x+end.x)/2,cy=s*cxp+c*cyp+(start.y+end.y)/2;
 const ux=(x-cxp)/rx,uy=(y-cyp)/ry,vx=(-x-cxp)/rx,vy=(-y-cyp)/ry;
 let theta=Math.atan2(uy,ux),delta=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
 if(!sweep&&delta>0)delta-=Math.PI*2;if(sweep&&delta<0)delta+=Math.PI*2;
 const count=Math.ceil(Math.abs(delta)/(Math.PI/2)),step=delta/count,segments=[];
 const point=t=>({x:cx+rx*c*Math.cos(t)-ry*s*Math.sin(t),y:cy+rx*s*Math.cos(t)+ry*c*Math.sin(t)});
 const tangent=t=>({x:-rx*c*Math.sin(t)-ry*s*Math.cos(t),y:-rx*s*Math.sin(t)+ry*c*Math.cos(t)});
 for(let i=0;i<count;i++){const next=theta+step,k=4/3*Math.tan(step/4),a=point(theta),b=point(next),ta=tangent(theta),tb=tangent(next);segments.push({c1:{x:a.x+k*ta.x,y:a.y+k*ta.y},c2:{x:b.x-k*tb.x,y:b.y-k*tb.y},end:i===count-1?end:b});theta=next;}
 return segments;
}

export function parsePath(data){
 if(data.length>1_000_000)throw new Error('SVG path is too large');
 let at=0,command='',current={x:0,y:0},sub=null,previous='',control=null,total=0;
 const paths=[],number=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i;
 const skip=()=>{while(/[\s,]/.test(data[at]??'!'))at++;};
 const read=()=>{skip();const m=data.slice(at).match(number);if(!m)throw new Error('Invalid SVG path coordinates');at+=m[0].length;const n=Number(m[0]);if(!Number.isFinite(n)||Math.abs(n)>1e9)throw new Error('SVG path coordinate is out of range');return n;};
 const flag=()=>{skip();const v=data[at++];if(v!=='0'&&v!=='1')throw new Error('Invalid SVG arc flag');return Number(v);};
 const push=p=>{if(++total>4096)throw new Error('SVG path exceeds 4096 anchors');sub.points.push({...p});current={...p};};
 const curve=(a,b,end)=>{sub.points.at(-1).out=a;push(end);sub.points.at(-1).in=b;};
 const reflect=p=>p?{x:2*current.x-p.x,y:2*current.y-p.y}:{...current};
 while(true){skip();if(at===data.length)break;if(/[a-z]/i.test(data[at]))command=data[at++];else if(!command)throw new Error('SVG path command is missing');
  const upper=command.toUpperCase(),relative=command!==upper,base={...current};
  const pair=()=>({x:read()+(relative?base.x:0),y:read()+(relative?base.y:0)});
  if(upper==='Z'){
   if(!sub)throw new Error('SVG close command needs a path');sub.closed=true;current={x:sub.points[0].x,y:sub.points[0].y};
   const last=sub.points.at(-1),first=sub.points[0];if(sub.points.length>1&&last.x===first.x&&last.y===first.y){first.in=last.in;sub.points.pop();}
   previous='Z';control=null;command='';continue;
  }
  if(upper==='M'){const p=pair();sub={points:[],closed:false};paths.push(sub);push(p);command=relative?'l':'L';previous='M';control=null;continue;}
  if(!sub)throw new Error('SVG segment needs a subpath');
  if(sub.closed){sub={points:[],closed:false};paths.push(sub);push(base);}
  let nextControl=null;
  if(upper==='L')push(pair());
  else if(upper==='H')push({x:read()+(relative?base.x:0),y:base.y});
  else if(upper==='V')push({x:base.x,y:read()+(relative?base.y:0)});
  else if(upper==='C'){const a=pair(),b=pair(),end=pair();curve(a,b,end);nextControl=b;}
  else if(upper==='S'){const a=['C','S'].includes(previous)?reflect(control):{...base},b=pair(),end=pair();curve(a,b,end);nextControl=b;}
  else if(upper==='Q'||upper==='T'){const q=upper==='Q'?pair():['Q','T'].includes(previous)?reflect(control):{...base},end=pair();curve({x:base.x+2/3*(q.x-base.x),y:base.y+2/3*(q.y-base.y)},{x:end.x+2/3*(q.x-end.x),y:end.y+2/3*(q.y-end.y)},end);nextControl=q;}
  else if(upper==='A'){const rx=read(),ry=read(),angle=read(),large=flag(),sweep=flag(),end=pair();for(const seg of arcCubics(base,rx,ry,angle,large,sweep,end))curve(seg.c1,seg.c2,seg.end);}
  else throw new Error('Unsupported SVG path command '+command);
  previous=upper;control=nextControl;
 }
 return paths.filter(p=>p.points.length>=2);
}

export const identity=()=>[1,0,0,1,0,0];
export function multiply(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
export const transformPoint=(p,m)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
export function parseTransform(text=''){
 let result=identity(),at=0;const re=/\s*([a-zA-Z]+)\s*\(([^)]*)\)\s*,?/gy;
 while(at<text.length){if(!text.slice(at).trim())break;re.lastIndex=at;const match=re.exec(text);if(!match)throw new Error('Invalid SVG transform');at=re.lastIndex;
  const args=match[2].trim().split(/[\s,]+/).map(Number),kind=match[1];if(args.some(v=>!Number.isFinite(v)))throw new Error('Invalid SVG transform values');let m;
  if(kind==='matrix'&&args.length===6)m=args;
  else if(kind==='translate'&&[1,2].includes(args.length))m=[1,0,0,1,args[0],args[1]??0];
  else if(kind==='scale'&&[1,2].includes(args.length))m=[args[0],0,0,args[1]??args[0],0,0];
  else if(kind==='rotate'&&[1,3].includes(args.length)){const t=args[0]*Math.PI/180,c=Math.cos(t),s=Math.sin(t);m=[c,s,-s,c,0,0];if(args.length===3)m=multiply(multiply([1,0,0,1,args[1],args[2]],m),[1,0,0,1,-args[1],-args[2]]);}
  else if(['skewX','skewY'].includes(kind)&&args.length===1){const t=Math.tan(args[0]*Math.PI/180);m=kind==='skewX'?[1,0,t,1,0,0]:[1,t,0,1,0,0];}
  else throw new Error('Unsupported SVG transform '+kind);
  result=multiply(result,m);
 }return result;
}
