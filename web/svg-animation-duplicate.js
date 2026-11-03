import {animationLayers,normalizeSvgAnimation,sanitizeSvg} from './svg-animation-svg.js';
import {normalizeElementSelection} from './svg-animation-selection-model.js';

// Duplicate source geometry, never the preview's temporary animation wrappers.
// References within the copied set follow their new IDs; references outside it
// keep their existing shared resources. Originals are not rewritten.
export function duplicateSvgElements(doc,selection){
 const {root}=sanitizeSvg(doc.svg_animation.svg),layers=animationLayers(root);
 if(!selection.length)return {document:doc,selected:[]};
 const known=new Set(layers.map(layer=>layer.id));
 if(selection.some(id=>!known.has(id)))throw new Error('Select existing SVG elements to duplicate.');
 const ids=normalizeElementSelection(layers,selection),copies=ids.map(id=>{const source=root.querySelector('#'+id);return {source,copy:source.cloneNode(true)};});
 const nodes=copies.flatMap(({copy})=>[copy,...copy.querySelectorAll('*')]);
 if(root.querySelectorAll('*').length+nodes.length>5000)throw new Error('SVGs can contain up to 5,000 elements.');
 const used=new Set([root,...root.querySelectorAll('[id]')].map(node=>node.id)),mapped=new Map();let sequence=0;
 for(const node of nodes){let id;do{id='pxv'+(++sequence);}while(used.has(id));used.add(id);mapped.set(node.id,id);node.id=id;}
 for(const node of nodes)for(const attribute of [...node.attributes]){
  if(attribute.name==='href'&&attribute.value.startsWith('#')){const id=mapped.get(attribute.value.slice(1));if(id)node.setAttribute(attribute.name,'#'+id);}
  else if(/url\(/i.test(attribute.value))node.setAttribute(attribute.name,attribute.value.replace(/url\(\s*['"]?#([\w.-]+)['"]?\s*\)/g,(value,id)=>mapped.has(id)?`url(#${mapped.get(id)})`:value));
 }
 for(const {source,copy} of copies)source.after(copy);
 const animation=doc.svg_animation,tracks=animation.tracks.filter(track=>mapped.has(track.element)).map(track=>({...structuredClone(track),element:mapped.get(track.element)}));
 if(animation.tracks.length+tracks.length>1000)throw new Error('An SVG animation can contain up to 1,000 tracks.');
 const origins=Object.fromEntries(Object.entries(animation.origins).filter(([id])=>mapped.has(id)).map(([id,value])=>[mapped.get(id),[...value]]));
 const next={...doc,svg_animation:{...animation,svg:new XMLSerializer().serializeToString(root),tracks:[...animation.tracks,...tracks],origins:{...animation.origins,...origins}}};
 // Enforce the existing size, keyframe, origin and scene constraints atomically.
 return {document:normalizeSvgAnimation(next).document,selected:ids.map(id=>mapped.get(id))};
}
