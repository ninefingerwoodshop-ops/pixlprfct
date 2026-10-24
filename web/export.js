import {descendants,visibleInTree,bounds} from './selection.js';
import {paintBounds,clipDefinitions} from './scene.js';
import {appearance,radius,paintAttributes,sceneSvg} from './appearance.js';
import {imageSvg} from './images.js';
import {vectorSvg} from './vectors.js';
import {textSvg} from './typography.js';
import {gradientSvg} from './gradients.js';
export function exportShapes(page,ids,scope){
 const chosen=scope==='selection'?descendants(page,ids):page,keep=new Set(chosen.map(s=>s.id));
 return chosen.filter(s=>visibleInTree(s,page)).map(s=>({...s,parent_id:keep.has(s.parent_id)?s.parent_id:0}));
}
export function exportBounds(shapes){const box=bounds(shapes.map(s=>paintBounds(s,shapes)).filter(Boolean));if(!box)throw new Error('Nothing visible to export');return box;}
export function exportSize(box,scale,format,shapes=[]){
 if(!Number.isFinite(scale)||scale<.25||scale>8)throw new Error('Export scale must be between 0.25 and 8');
 const width=Math.max(1,Math.ceil(box.width*scale)),height=Math.max(1,Math.ceil(box.height*scale));
 if(format==='png'){
  let depth=0;for(const s of shapes){let n=s,d=appearance(s).opacity<1?1:0;while(n.parent_id){n=shapes.find(p=>p.id===n.parent_id);if(!n)break;if(appearance(n).opacity<1)d++;}depth=Math.max(depth,d);}
  if(width>8192||height>8192||width*height>16_777_216||width*height*(1+depth)>67_108_864)throw new Error('PNG is too large. Reduce scale or export a smaller selection (8192 px per edge, 16 megapixels maximum).');
 }
 return{width,height};
}
export function svgDocument(shapes,box,scale,background,textLayout){
 const size=exportSize(box,scale,'svg');
 const paint=s=>{
  if(s.kind==='image')return `<clipPath id="image-clip-${s.id}"><rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${radius(s)}"/></clipPath><g clip-path="url(#image-clip-${s.id})">${imageSvg(s)}</g><rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${radius(s)}" ${paintAttributes({...s,appearance:{...appearance(s),fill_enabled:false}})}/>`;
  if(s.points?.length)return vectorSvg(s);
  if(s.kind==='ellipse')return `<ellipse cx="${s.x+s.width/2}" cy="${s.y+s.height/2}" rx="${s.width/2}" ry="${s.height/2}" ${paintAttributes(s)}/>`;
  if(s.kind==='text')return textSvg(s,textLayout(s));
  return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${radius(s)}" ${paintAttributes(s)}/>`;
 };
 if(background&&!/^#[0-9a-f]{6}$/i.test(background))throw new Error('Invalid export background');
 const backdrop=background?`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${background}"/>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${clipDefinitions(shapes)}<defs>${shapes.map(gradientSvg).join('')}</defs>${backdrop}${sceneSvg(shapes,paint)}</svg>`;
}
