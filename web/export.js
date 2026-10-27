import {sceneToWorld} from './rotation.js';
import {strokeAlignment,strokePadding,strokeTips} from './stroke-tips.js';
import {alignedStrokeSvg} from './stroke-alignment.js';
import {compositeGeometry,visibleShadows,effectSurfaceSize} from './shadows.js';
import {descendants,visibleInTree,bounds} from './selection.js';
import {paintBounds,clipDefinitions} from './scene.js';
import {appearance,roundedSvg,paintAttributes,sceneSvg} from './appearance.js';
import {imageSvg} from './images.js';
import {vectorSvg} from './vectors.js';
import {textSvg} from './typography.js';
import {gradientSvg} from './gradients.js';
export function exportShapes(page,ids,scope){
 const chosen=scope==='selection'?descendants(page,ids):page,keep=new Set(chosen.map(s=>s.id));
 return chosen.filter(s=>visibleInTree(s,page)).map(s=>({...s,parent_id:keep.has(s.parent_id)?s.parent_id:0}));
}
export function exportBounds(shapes){const box=compositeGeometry(sceneToWorld(shapes),appearance).bounds;if(!box)throw new Error('Nothing visible to export');return box;}
export function exportSize(box,scale,format,shapes=[]){
  if(shapes.some(s=>s.appearance?.backdrop_blur>0))throw new Error('Background blur requires HTML/CSS export (File menu). Image and SVG export do not capture the browser backdrop.');
 if(!['png','jpeg','svg'].includes(format))throw new Error('Unsupported export format');
 if(!Number.isFinite(scale)||scale<.25||scale>8)throw new Error('Export scale must be between 0.25 and 8');
 const width=Math.max(1,Math.ceil(box.width*scale)),height=Math.max(1,Math.ceil(box.height*scale));
 if(format==='png'||format==='jpeg'){
  const {geometry,children}=compositeGeometry(shapes,appearance);
  const pixels=area=>{const size=effectSurfaceSize(area,scale);if(size.scale<scale)throw new Error('Effect buffer is too large. Reduce export scale or the size of the layer and its shadows.');return size.width*size.height;};
  const peak=s=>{const box=geometry.get(s.id)?.content;if(!box)return 0;let childPeak=0;for(const child of children.get(s.id)??[])childPeak=Math.max(childPeak,peak(child));const style=appearance(s),shadows=visibleShadows(style);if(style.stroke_enabled){const aligned=strokeAlignment(s)!=='center',tips=strokeTips(s).length>0;if(aligned||tips){const pad=strokePadding(s)+(aligned?1:0);childPeak=Math.max(childPeak,(aligned?2:1)*pixels({width:s.width+2*pad,height:s.height+2*pad}));}}if((!style.blend_mode||style.blend_mode==='pass-through')&&style.opacity===1&&!shadows.length&&!style.layer_blur)return childPeak;const base=pixels(box);let maskPeak=0;for(const shadow of shadows){const pad=(shadow.kind==='inner'?Math.abs(shadow.spread??0):Math.max(0,shadow.spread??0))+1.5*shadow.blur;maskPeak=Math.max(maskPeak,4*pixels({width:box.width+2*pad,height:box.height+2*pad}));}const combined=style.layer_blur||(shadows.length&&(style.opacity<1||(style.blend_mode&&style.blend_mode!=='pass-through')))?pixels(geometry.get(s.id).output):0;return base+Math.max(childPeak,combined+maskPeak);};
  let buffers=0;for(const root of children.get(0)??[])buffers=Math.max(buffers,peak(root));
  if(width>8192||height>8192||width*height>16_777_216||width*height+buffers>67_108_864)throw new Error('Raster export is too large. Reduce scale or export a smaller selection (8192 px per edge, 16 megapixels maximum).');
 }
 return{width,height};
}
export function rasterSettings(format,background,quality=90){
 if(!['png','jpeg'].includes(format))throw new Error('Unsupported raster format');
 if(background&&!/^#[0-9a-f]{6}$/i.test(background))throw new Error('Invalid export background');
 if(format==='jpeg'&&(!Number.isFinite(quality)||quality<1||quality>100))throw new Error('JPEG quality must be between 1 and 100');
 return {type:format==='jpeg'?'image/jpeg':'image/png',extension:format==='jpeg'?'jpg':'png',background:format==='jpeg'?(background??'#ffffff'):background,quality:format==='jpeg'?quality/100:undefined};
}
export function svgDocument(shapes,box,scale,background,textLayout){
 const size=exportSize(box,scale,'svg');
 const outline=s=>{if(s.points?.length)return vectorSvg(s);if(s.kind==='ellipse')return `<ellipse cx="${s.x+s.width/2}" cy="${s.y+s.height/2}" rx="${s.width/2}" ry="${s.height/2}" ${paintAttributes(s)}/>`;if(s.kind==='text')return textSvg(s,textLayout(s));return roundedSvg(s,paintAttributes(s));};
 const paint=s=>{
  if(s.kind==='group')return '';
  if(s.kind==='image')return `<clipPath id="image-clip-${s.id}">${roundedSvg(s)}</clipPath><g clip-path="url(#image-clip-${s.id})" opacity="${appearance(s).fill_opacity??1}">${imageSvg(s)}</g>${roundedSvg(s,paintAttributes({...s,appearance:{...appearance(s),fill_enabled:false}}))}`;
  if(s.points?.length)return vectorSvg(s);
  if(s.kind==='ellipse')return `<ellipse cx="${s.x+s.width/2}" cy="${s.y+s.height/2}" rx="${s.width/2}" ry="${s.height/2}" ${paintAttributes(s)}/>`;
  if(s.kind==='text')return textSvg(s,textLayout(s));
  return roundedSvg(s,paintAttributes(s));
 };
 if(background&&!/^#[0-9a-f]{6}$/i.test(background))throw new Error('Invalid export background');
 const backdrop=background?`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${background}"/>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${clipDefinitions(shapes)}<defs>${shapes.map(s=>gradientSvg(s)+gradientSvg(s,'stroke')).join('')}</defs>${backdrop}${sceneSvg(shapes,s=>s.rotation?`<g transform="rotate(${-s.rotation} ${s.x} ${s.y})">${alignedStrokeSvg(s,paint,outline)}</g>`:alignedStrokeSvg(s,paint,outline))}</svg>`;
}
