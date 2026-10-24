import {parsePath,parseTransform,multiply,identity,transformPoint} from './svg-path.js';
import {fromPoints} from './vectors.js';
import {bounds} from './selection.js';
import {gradientResolver} from './svg-gradients.js';

const inherited=['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','fill-opacity','stroke-opacity','fill-rule','color','visibility'];
const allowed=new Set([...inherited,'opacity','display']);
const defaults={fill:'#000000',stroke:'none','stroke-width':'1','stroke-linecap':'butt','stroke-linejoin':'miter','stroke-miterlimit':'4','stroke-dasharray':'none','stroke-dashoffset':'0','fill-opacity':'1','stroke-opacity':'1','fill-rule':'nonzero',color:'#000000',visibility:'visible'};
const length=(value,fallback=0)=>{if(value==null||value==='')return fallback;if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i.test(value.trim()))throw new Error('SVG lengths must use pixels or unitless values');const n=Number(value.replace(/px$/i,''));if(!Number.isFinite(n)||Math.abs(n)>1e6)throw new Error('SVG length is out of range');return n;};
const names={black:'#000000',white:'#ffffff',red:'#ff0000',green:'#008000',blue:'#0000ff',yellow:'#ffff00',gray:'#808080',grey:'#808080',orange:'#ffa500',purple:'#800080',pink:'#ffc0cb',transparent:'none'};
function color(value,current){value=value.trim().toLowerCase();if(value==='currentcolor')value=current.toLowerCase();if(names[value])return names[value];if(value==='none'||/^#[0-9a-f]{6}$/.test(value))return value;if(/^#[0-9a-f]{3}$/.test(value))return '#'+[...value.slice(1)].map(c=>c+c).join('');const rgb=value.match(/^rgb\(\s*([\d.]+)(%)?[,\s]+([\d.]+)(%)?[,\s]+([\d.]+)(%)?\s*\)$/);if(rgb)return '#'+[1,3,5].map(i=>Math.round(Math.max(0,Math.min(255,Number(rgb[i])*(rgb[i+1]?2.55:1)))).toString(16).padStart(2,'0')).join('');throw new Error('Unsupported SVG paint: '+value.slice(0,60)+'. Use solid hex or RGB colors.');}
const opacity=v=>{const n=Number(v??1);if(!Number.isFinite(n))throw new Error('Invalid SVG opacity');return Math.max(0,Math.min(1,n));};
function paint(attrs,parent){const style={...parent,opacity:'1',display:'inline'};for(const key of allowed)if(attrs[key]!=null)style[key]=attrs[key];for(const part of (attrs.style??'').split(';').filter(s=>s.trim())){const at=part.indexOf(':'),key=part.slice(0,at).trim(),value=part.slice(at+1).trim();if(at<0||!allowed.has(key))throw new Error('Unsupported SVG style: '+key);style[key]=value;}return style;}
function geometry(tag,a){
 const n=(key,fallback=0)=>length(a[key],fallback);
 if(tag==='path')return parsePath(a.d??'');
 if(tag==='line')return parsePath(`M${n('x1')} ${n('y1')} L${n('x2')} ${n('y2')}`);
 if(tag==='polyline'||tag==='polygon'){const values=(a.points??'').trim().split(/[\s,]+/).map(Number);if(values.length<4||values.length%2||values.some(v=>!Number.isFinite(v)))throw new Error('Invalid SVG polygon points');return parsePath('M'+values.join(' ')+(tag==='polygon'?'Z':''));}
 if(tag==='circle'||tag==='ellipse'){const x=n('cx'),y=n('cy'),rx=n(tag==='circle'?'r':'rx'),ry=tag==='circle'?rx:n('ry');if(rx<0||ry<0)throw new Error('Invalid ellipse radius');if(!rx||!ry)return [];return parsePath(`M${x+rx} ${y} A${rx} ${ry} 0 1 1 ${x-rx} ${y} A${rx} ${ry} 0 1 1 ${x+rx} ${y} Z`);}
 if(tag==='rect'){const x=n('x'),y=n('y'),w=n('width'),h=n('height');if(w<0||h<0)throw new Error('Invalid rectangle size');if(!w||!h)return [];const rx=Math.min(w/2,n('rx',n('ry'))),ry=Math.min(h/2,n('ry',rx));if(rx<0||ry<0)throw new Error('Invalid corner radius');return parsePath(rx&&ry?`M${x+rx} ${y} H${x+w-rx} A${rx} ${ry} 0 0 1 ${x+w} ${y+ry} V${y+h-ry} A${rx} ${ry} 0 0 1 ${x+w-rx} ${y+h} H${x+rx} A${rx} ${ry} 0 0 1 ${x} ${y+h-ry} V${y+ry} A${rx} ${ry} 0 0 1 ${x+rx} ${y} Z`:`M${x} ${y} H${x+w} V${y+h} H${x} Z`);}
 throw new Error('Unsupported SVG element: '+tag+'. Convert text and special effects to simple paths.');
}
export function svgLayers(tree,name='SVG artwork'){
 if(tree.tag!=='svg')throw new Error('Choose an SVG document');
 if(tree.attrs.transform)throw new Error('Move the root SVG transform into a group before importing');
 const a=tree.attrs,view=a.viewBox?.trim().split(/[\s,]+/).map(Number);
 if(view&&(view.length!==4||view.some(v=>!Number.isFinite(v))||view[2]<=0||view[3]<=0))throw new Error('Invalid SVG viewBox');
 const width=length(a.width,view?.[2]??300),height=length(a.height,view?.[3]??150);if(width<=0||height<=0)throw new Error('SVG dimensions must be positive');
 let viewport=identity();if(view){const aspect=a.preserveAspectRatio??'xMidYMid meet';let sx=width/view[2],sy=height/view[3],dx=0,dy=0;if(aspect!=='none'){const m=aspect.match(/^x(Min|Mid|Max)Y(Min|Mid|Max)(?:\s+(meet|slice))?$/);if(!m)throw new Error('Unsupported SVG aspect ratio');sx=sy=m[3]==='slice'?Math.max(sx,sy):Math.min(sx,sy);dx=(width-view[2]*sx)*({Min:0,Mid:.5,Max:1}[m[1]]);dy=(height-view[3]*sy)*({Min:0,Mid:.5,Max:1}[m[2]]);}viewport=[sx,0,0,sy,dx-view[0]*sx,dy-view[1]*sy];}
 const gradientFill=gradientResolver(tree,[view?.[2]??width,view?.[3]??height],color);
 const shapes=[];let next=1,visited=0;
 const frame=(name,parent,alpha)=>({id:next++,kind:'frame',name:name.slice(0,128),parent_id:parent,x:0,y:0,width:1,height:1,fill:'#ffffff',text:'',hidden:false,clip_content:false,appearance:{opacity:alpha,corner_radius:0,fill_enabled:false,stroke_enabled:false,stroke_color:'#000000'}});
 function walk(node,parent,matrix,style,depth){
  if(++visited>10000||depth>64)throw new Error('SVG structure is too large or deeply nested');
  const {tag,attrs}=node;if(['title','desc','metadata','defs','linearGradient','radialGradient'].includes(tag))return;
  for(const key of Object.keys(attrs))if(/^on/i.test(key)||['href','xlink:href','filter','clip-path','mask','marker-start','marker-mid','marker-end','vector-effect'].includes(key)&&attrs[key]!=='none')throw new Error('Unsupported SVG attribute: '+key);
  const own=paint(attrs,style);if(own.display==='none')return;
  const m=multiply(matrix,parseTransform(attrs.transform??''));
  if(tag==='svg'||tag==='g'){
   if(tag==='svg'&&depth!==0)throw new Error('Nested SVG viewports are not supported yet');
   const group=frame(attrs.id|| (depth===0?name:'SVG group'),parent,opacity(own.opacity));shapes.push(group);const start=shapes.length;
   for(const child of node.children)walk(child,group.id,m,own,depth+1);
   Object.assign(group,bounds(shapes.slice(start))??{x:0,y:0,width:1,height:1});
   if(depth===0){Object.assign(group,{x:0,y:0,width,height,clip_content:true});}return;
  }
  const paths=geometry(tag,attrs),hasGradient=/^url\(/i.test(own.fill.trim()),fill=hasGradient?'#000000':color(own.fill,own.color),stroke=color(own.stroke,own.color),alpha=opacity(own.opacity);
  if(own['fill-rule']!=='nonzero'&&fill!=='none')throw new Error('Even-odd SVG fills are not supported yet');
  if(paths.length>1&&fill!=='none')throw new Error('Filled compound SVG paths are not supported yet. Separate them before importing.');
  const sx=Math.hypot(m[0],m[1]),sy=Math.hypot(m[2],m[3]);
  if(stroke!=='none'&&(Math.abs(sx-sy)>1e-6*Math.max(1,sx,sy)||Math.abs(m[0]*m[2]+m[1]*m[3])>1e-6*Math.max(1,sx*sy)))throw new Error('Non-uniformly transformed SVG strokes must be outlined before import');
  const weight=length(own['stroke-width'])*sx;if(weight<0)throw new Error('Invalid SVG stroke width');
  const dash=own['stroke-dasharray']==='none'?[]:own['stroke-dasharray'].trim().split(/[\s,]+/).map(v=>length(v)*sx);
  for(const path of paths){const points=path.points.map(p=>({...transformPoint(p,m),...(p.in?{in:transformPoint(p.in,m)}:{}),...(p.out?{out:transformPoint(p.out,m)}:{})})),shape=fromPoints('pen',points,path.closed);
   Object.assign(shape,{id:next++,parent_id:parent,name:(attrs.id||tag).slice(0,128),fill:fill==='none'?'#000000':fill,stroke_width:Math.max(.1,weight),hidden:['hidden','collapse'].includes(own.visibility),appearance:{opacity:alpha,fill_opacity:opacity(own['fill-opacity']),stroke_opacity:opacity(own['stroke-opacity']),corner_radius:0,fill_enabled:fill!=='none',stroke_enabled:stroke!=='none'&&weight>0,stroke_color:stroke==='none'?'#000000':stroke,stroke_dash:dash,stroke_dash_offset:length(own['stroke-dashoffset'])*sx,stroke_cap:own['stroke-linecap'],stroke_join:own['stroke-linejoin'],stroke_miter_limit:Number(own['stroke-miterlimit'])}});shapes.push(shape);
   if(hasGradient)shape.appearance.gradient=gradientFill(own.fill,shape,paths,m);
  }
 }
 walk(tree,0,viewport,defaults,0);if(shapes.length===1)throw new Error('SVG contains no supported visible artwork');
 return {format:'pixlprfct.layers',version:1,shapes};
}
export function parseSvg(text,name){
 if(text.length>2_000_000)throw new Error('SVG must be smaller than 2 MB');
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('SVG document types and entities are not supported');
 const xml=new DOMParser().parseFromString(text,'image/svg+xml');if(xml.querySelector('parsererror'))throw new Error('Invalid SVG XML');
 let count=0;
 const tree=(el,depth=0)=>{if(++count>10000||depth>64)throw new Error('SVG structure is too large or deeply nested');return {tag:el.localName,attrs:Object.fromEntries(Array.from(el.attributes,a=>[a.name,a.value])),children:Array.from(el.children,c=>tree(c,depth+1))};};
 return svgLayers(tree(xml.documentElement),name);
}
