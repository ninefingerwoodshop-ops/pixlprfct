import {multiply,parseTransform,transformPoint} from './svg-path.js';

// SVG objectBoundingBox uses geometric extrema, not the control-point hull.
export function pathBounds(paths){
 const xs=[],ys=[];
 const extrema=(a,b,c,d)=>{const A=d-3*c+3*b-a,B=2*(c-2*b+a),C=b-a;if(Math.abs(A)<1e-12)return Math.abs(B)<1e-12?[]:[-C/B];const disc=B*B-4*A*C;return disc<0?[]:[(-B+Math.sqrt(disc))/(2*A),(-B-Math.sqrt(disc))/(2*A)];};
 const at=(a,b,c,d,t)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;};
 for(const path of paths){const points=path.points;for(const p of points){xs.push(p.x);ys.push(p.y);}for(let i=1;i<points.length+(path.closed?1:0);i++){const a=points[i-1],d=points[i%points.length],b=a.out??a,c=d.in??d;for(const key of ['x','y'])for(const t of extrema(a[key],b[key],c[key],d[key]))if(t>0&&t<1)(key==='x'?xs:ys).push(at(a[key],b[key],c[key],d[key],t));}}
 if(!xs.length)return{x:0,y:0,width:0,height:0};
 const x=Math.min(...xs),y=Math.min(...ys);return{x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y};
}

const declarations=attrs=>Object.fromEntries((attrs.style??'').split(';').filter(s=>s.trim()).map(s=>{const at=s.indexOf(':');return[s.slice(0,at).trim(),s.slice(at+1).trim()];}));
const amount=(raw,fallback=0)=>{if(raw==null)return fallback;const text=String(raw).trim();if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?$/i.test(text))throw new Error('Invalid SVG gradient number');const n=Number(text.replace('%',''))/(text.endsWith('%')?100:1);if(!Number.isFinite(n))throw new Error('Invalid SVG gradient number');return n;};
const clamp=n=>Math.max(0,Math.min(1,n));

export function gradientResolver(tree,viewport,color){
 const nodes=new Map(),styles=new Map();let count=0;
 const collect=(node,parent={},depth=0)=>{
  if(++count>10000||depth>64)throw new Error('SVG structure is too large or deeply nested');
  const own={...parent};const css=declarations(node.attrs);for(const key of ['color','stop-color','stop-opacity','color-interpolation'])if(css[key]??node.attrs[key])own[key]=css[key]??node.attrs[key];
  styles.set(node,own);if(node.attrs.id){if(nodes.has(node.attrs.id))throw new Error('SVG IDs must be unique');nodes.set(node.attrs.id,node);}
  for(const child of node.children)collect(child,own,depth+1);
 };collect(tree);
 const resolve=(id,seen=new Set())=>{
  if(seen.has(id)||seen.size>64)throw new Error('Cyclic or excessively deep SVG gradient reference');seen.add(id);
  const node=nodes.get(id);if(!node)throw new Error('SVG gradient reference not found: '+id);
  if(node.tag!=='linearGradient')throw new Error('Only linear SVG gradient fills are supported currently');
  for(const key of Object.keys(declarations(node.attrs)))if(!['color','stop-color','stop-opacity','color-interpolation'].includes(key))throw new Error('Unsupported SVG gradient style: '+key);
  const href=node.attrs.href??node.attrs['xlink:href'];let parent={attrs:{},stops:[]};
  if(href){if(!/^#[^\s]+$/.test(href))throw new Error('SVG gradient references must be local');parent=resolve(href.slice(1),seen);}
  const children=node.children.filter(n=>!['title','desc','metadata'].includes(n.tag));if(children.some(n=>n.tag!=='stop'))throw new Error('Unsupported SVG gradient child');
  const stops=children.length?children.map(n=>({attrs:n.attrs,style:styles.get(n)})):parent.stops.map(stop=>{const own={...styles.get(node)},css=declarations(stop.attrs);for(const key of ['color','stop-color','stop-opacity','color-interpolation'])if(css[key]??stop.attrs[key])own[key]=css[key]??stop.attrs[key];return{attrs:stop.attrs,style:own};});
  return {attrs:{...parent.attrs,...node.attrs},stops,style:styles.get(node)};
 };
 return (paint,shape,paths,matrix,localViewport=viewport)=>{
  const ref=paint.trim().match(/^url\(\s*['"]?#([^\s'")]+)['"]?\s*\)$/);if(!ref)throw new Error('SVG gradient fill must reference a local gradient');
  const def=resolve(ref[1]),a=def.attrs;
  if((a.spreadMethod??'pad')!=='pad')throw new Error('Repeating/reflected SVG gradients are not supported yet');
  if((def.style?.['color-interpolation']??'sRGB')!=='sRGB')throw new Error('Only sRGB SVG gradient interpolation is supported');
  if(def.stops.length>16)throw new Error('SVG gradients allow at most 16 stops');
  let previous=0;
  let stops=def.stops.map(({attrs,style})=>{for(const key of Object.keys(declarations(attrs)))if(!['color','stop-color','stop-opacity','color-interpolation'].includes(key))throw new Error('Unsupported SVG stop style: '+key);if((style?.['color-interpolation']??'sRGB')!=='sRGB')throw new Error('Only sRGB SVG gradient interpolation is supported');const position=Math.max(previous,clamp(amount(attrs.offset)));previous=position;const raw=style?.['stop-color']??'#000000',c=color(raw,style?.color??'#000000');return{position,color:c==='none'?'#000000':c,opacity:c==='none'?0:clamp(amount(style?.['stop-opacity'],1))};});
  if(!stops.length)stops=[{position:0,color:'#000000',opacity:0},{position:1,color:'#000000',opacity:0}];
  if(stops.length===1)stops=[{...stops[0],position:0},{...stops[0],position:1}];
  const units=a.gradientUnits??'objectBoundingBox';if(!['objectBoundingBox','userSpaceOnUse'].includes(units))throw new Error('Invalid SVG gradient units');
  const coordinate=(value,axis,fallback)=>{if(value==null)value=fallback;if(units==='objectBoundingBox')return amount(value);if(String(value).trim().endsWith('%'))return amount(value)*localViewport[axis];const n=Number(String(value).replace(/px$/,''));if(!Number.isFinite(n))throw new Error('Unsupported SVG gradient coordinate');return n;};
  const start={x:coordinate(a.x1,0,'0%'),y:coordinate(a.y1,1,'0%')},end={x:coordinate(a.x2,0,'100%'),y:coordinate(a.y2,1,'0%')},vx=end.x-start.x,vy=end.y-start.y,len=vx*vx+vy*vy;
  if(len<1e-20){const last=stops.at(-1);return{kind:'linear',start:[0,0],end:[1,0],stops:[{...last,position:0},{...last,position:1}]};}
  let basis=matrix;if(units==='objectBoundingBox'){const b=pathBounds(paths);if(b.width<=0||b.height<=0)throw new Error('SVG bounding-box gradients require nonzero geometry');basis=multiply(basis,[b.width,0,0,b.height,b.x,b.y]);}
  basis=multiply(basis,parseTransform(a.gradientTransform??''));const [aa,b,c,d]=basis,det=aa*d-b*c;if(Math.abs(det)<1e-20)throw new Error('Singular SVG gradient transform');
  // Transform the gradient normal covector. Transforming endpoints alone is
  // incorrect for nonuniform scales and shears (SVG 2 paint-server geometry).
  const nx=(d*vx-b*vy)/(det*len),ny=(-c*vx+aa*vy)/(det*len),norm=nx*nx+ny*ny;
  const worldStart=transformPoint(start,basis),worldEnd={x:worldStart.x+nx/norm,y:worldStart.y+ny/norm};
  const normalize=p=>[(p.x-shape.x)/shape.width,(p.y-shape.y)/shape.height];
  return{kind:'linear',start:normalize(worldStart),end:normalize(worldEnd),stops};
 };
}
