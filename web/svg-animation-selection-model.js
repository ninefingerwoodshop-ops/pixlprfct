import {selectionRoots,layerRange} from './selection.js';

// SVG layer order is preorder, including nested groups. Keep ancestor/child
// selections exclusive so future batch actions cannot affect a child twice.
export function elementTree(layers){
 const stack=[],known=new Set(layers.map(layer=>layer.id));return layers.map(layer=>{
  while(stack.length&&stack.at(-1).depth>=layer.depth)stack.pop();
  let parentId=stack.at(-1)?.id??null;
  // Nested SVG viewports are not editable layers. Their indentation must not
  // make an unrelated preceding sibling look like an ancestor.
  if(layer.node){let parent=layer.node.parentElement;while(parent&&!known.has(parent.id))parent=parent.parentElement;parentId=parent?.id??null;}
  const item={...layer,parent_id:parentId};stack.push(layer);return item;
 });
}
export function normalizeElementSelection(layers,ids){
 const roots=new Set(selectionRoots(elementTree(layers),ids));return layers.filter(layer=>roots.has(layer.id)).map(layer=>layer.id);
}
export function toggleElementSelection(layers,ids,id){
 if(ids.includes(id))return normalizeElementSelection(layers,ids.filter(value=>value!==id));
 const tree=elementTree(layers),byId=new Map(tree.map(layer=>[layer.id,layer]));
 const ancestor=(parent,child)=>{for(let node=byId.get(child);node;node=byId.get(node.parent_id))if(node.id===parent)return true;return false;};
 return normalizeElementSelection(layers,[...ids.filter(value=>!ancestor(value,id)&&!ancestor(id,value)),id]);
}
export function rangeElementSelection(layers,visible,anchor,target){return normalizeElementSelection(layers,layerRange(visible,anchor,target));}

// Separating axes work for rotated/skewed bounds, including zero-width lines.
export function intersectsSelection(points,start,end){
 if(!points.length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
 const left=Math.min(start.x,end.x),right=Math.max(start.x,end.x),top=Math.min(start.y,end.y),bottom=Math.max(start.y,end.y),rect=[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}];
 const axes=[{x:1,y:0},{x:0,y:1},...points.map((p,i)=>{const next=points[(i+1)%points.length];return {x:next.y-p.y,y:p.x-next.x};})];
 return axes.every(axis=>{const a=points.map(p=>p.x*axis.x+p.y*axis.y),b=rect.map(p=>p.x*axis.x+p.y*axis.y);return Math.max(...a)>=Math.min(...b)-1e-7&&Math.max(...b)>=Math.min(...a)-1e-7;});
}
