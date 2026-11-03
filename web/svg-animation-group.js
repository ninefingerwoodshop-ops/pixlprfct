import {animationLayers,normalizeSvgAnimation,sanitizeSvg} from './svg-animation-svg.js';
import {normalizeElementSelection} from './svg-animation-selection-model.js';

function selectedNodes(root,selection){
 const layers=animationLayers(root),known=new Set(layers.map(layer=>layer.id));
 if(selection.some(id=>!known.has(id)))throw new Error('Select existing SVG elements.');
 return normalizeElementSelection(layers,selection).map(id=>root.querySelector('#'+id));
}
function groupReason(root,nodes){
 if(!nodes.length)return 'Select SVG elements to group.';
 const parent=nodes[0].parentElement;
 if(!['svg','g'].includes(parent.localName)||nodes.some(node=>node.parentElement!==parent))return 'Select elements with the same parent to group.';
 if(root.querySelectorAll('*').length>=5000)return 'SVGs can contain up to 5,000 elements.';
 return null;
}
function ungroupReason(root,nodes,animation){
 if(!nodes.length||nodes.some(node=>node.localName!=='g'))return 'Select SVG groups to ungroup.';
 const ids=new Set(nodes.map(node=>node.id));
 if(animation.tracks.some(track=>ids.has(track.element)))return 'This group has animation. Ungrouping it would change playback.';
 if(nodes.some(node=>[...node.attributes].some(attribute=>!['id','data-layer-name'].includes(attribute.name))))return 'This group has its own appearance or transform. Ungrouping it would change the artwork.';
 for(const node of [root,...root.querySelectorAll('*')])for(const attribute of node.attributes){
  if(attribute.name==='href'&&attribute.value.startsWith('#')&&ids.has(attribute.value.slice(1))||[...attribute.value.matchAll(/url\(\s*['"]?#([\w.-]+)['"]?\s*\)/g)].some(match=>ids.has(match[1])))return 'Other SVG artwork references this group. Keep the group to preserve those references.';
 }
 return null;
}
export function svgGroupingAvailability(root,selection,animation){
 try{const nodes=selectedNodes(root,selection);return {group:groupReason(root,nodes),ungroup:ungroupReason(root,nodes,animation)};}
 catch(error){return {group:error.message,ungroup:error.message};}
}

export function groupSvgElements(doc,selection,{ungroup=false}={}){
 if(!selection.length)return {document:doc,selected:[]};
 const {root}=sanitizeSvg(doc.svg_animation.svg),nodes=selectedNodes(root,selection),animation=doc.svg_animation;
 const reason=ungroup?ungroupReason(root,nodes,animation):groupReason(root,nodes);if(reason)throw new Error(reason);
 let selected,origins=animation.origins;
 if(ungroup){
  // Only remove neutral wrappers. Distributing group opacity, effects or
  // animated transforms among children is not generally appearance-preserving.
  const removed=new Set(nodes.map(node=>node.id)),children=nodes.flatMap(node=>[...node.children]);
  for(const node of nodes)node.replaceWith(...node.childNodes);
  origins=Object.fromEntries(Object.entries(origins).filter(([id])=>!removed.has(id)));
  const known=new Set(animationLayers(root).map(layer=>layer.id));
  selected=normalizeElementSelection(animationLayers(root),children.flatMap(node=>[node,...node.querySelectorAll('*')]).map(node=>node.id).filter(id=>known.has(id)));
 }else{
  const group=root.ownerDocument.createElementNS(root.namespaceURI,'g'),used=new Set([root,...root.querySelectorAll('[id]')].map(node=>node.id)),names=new Set(animationLayers(root).map(layer=>layer.name));let id=1,name=1;
  while(used.has('pxv'+id))id++;while(names.has('Group '+name))name++;
  group.id='pxv'+id;group.setAttribute('data-layer-name','Group '+name);
  // Keep selected siblings in paint order at the frontmost selected position.
  // Their source coordinates, IDs, inherited styles and tracks remain intact.
  nodes.at(-1).after(group);group.append(...nodes);selected=[group.id];
 }
 const next={...doc,svg_animation:{...animation,svg:new XMLSerializer().serializeToString(root),origins}};
 return {document:normalizeSvgAnimation(next).document,selected};
}
