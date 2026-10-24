import {identity} from './svg-path.js';
export function svgViewport(attrs,length,fallback=[300,150]){
 const view=attrs.viewBox?.trim().split(/[\s,]+/).map(Number);
 if(view&&(view.length!==4||view.some(v=>!Number.isFinite(v))||view[2]<=0||view[3]<=0))throw new Error('Invalid SVG viewBox');
 const width=length(attrs.width,view?.[2]??fallback[0]),height=length(attrs.height,view?.[3]??fallback[1]);
 if(width<=0||height<=0)throw new Error('SVG dimensions must be positive');
 let matrix=identity();
 if(view){const aspect=attrs.preserveAspectRatio??'xMidYMid meet';let sx=width/view[2],sy=height/view[3],dx=0,dy=0;
  if(aspect!=='none'){const m=aspect.match(/^x(Min|Mid|Max)Y(Min|Mid|Max)(?:\s+(meet|slice))?$/);if(!m)throw new Error('Unsupported SVG aspect ratio');sx=sy=m[3]==='slice'?Math.max(sx,sy):Math.min(sx,sy);dx=(width-view[2]*sx)*({Min:0,Mid:.5,Max:1}[m[1]]);dy=(height-view[3]*sy)*({Min:0,Mid:.5,Max:1}[m[2]]);}
  matrix=[sx,0,0,sy,dx-view[0]*sx,dy-view[1]*sy];
 }
 return{width,height,matrix,units:[view?.[2]??width,view?.[3]??height]};
}
export function svgReferences(tree){
 const index=new Map();let count=0;
 const collect=(node,depth)=>{if(++count>10000||depth>64)throw new Error('SVG structure is too large or deeply nested');if(node.attrs.id){if(index.has(node.attrs.id))throw new Error('SVG IDs must be unique');index.set(node.attrs.id,node);}for(const child of node.children)collect(child,depth+1);};collect(tree,0);
 return (attrs,active)=>{const href=attrs.href??attrs['xlink:href'];if(!href||!/^#[^\s]+$/.test(href))throw new Error('SVG use references must identify local artwork');const id=href.slice(1);if(active.has(id))throw new Error('Cyclic SVG use reference');const node=index.get(id);if(!node)throw new Error('SVG use reference not found: '+id);if(!['symbol','g','use','path','rect','circle','ellipse','line','polyline','polygon'].includes(node.tag))throw new Error('Unsupported SVG use target: '+node.tag);return{id,node};};
}
