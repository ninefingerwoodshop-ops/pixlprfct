import {visualBounds} from './rotation.js';
export function bounds(shapes) {
  if (!shapes.length) return null;
  shapes=shapes.map(visualBounds);
  const x = Math.min(...shapes.map(s => s.x)), y = Math.min(...shapes.map(s => s.y));
  return { x, y, width: Math.max(...shapes.map(s => s.x + s.width)) - x, height: Math.max(...shapes.map(s => s.y + s.height)) - y };
}
export function marqueeSelection(shapes, start, end) {
  const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x), bottom = Math.max(start.y, end.y);
  return shapes.map(visualBounds).filter(s => !s.hidden && s.x <= right && s.x + s.width >= x && s.y <= bottom && s.y + s.height >= y).map(s => s.id);
}
export function layerRange(shapes, anchor, target) {
  const a = shapes.findIndex(s => s.id === anchor), b = shapes.findIndex(s => s.id === target);
  return a < 0 || b < 0 ? [target] : shapes.slice(Math.min(a, b), Math.max(a, b) + 1).map(s => s.id);
}
// A group is selected by its own ID. Selecting its children is a distinct edit.
export function selectionRoots(shapes, ids) {
  const chosen=new Set(ids),byId=new Map(shapes.map(s=>[s.id,s]));
  return [...chosen].filter(id=>{let s=byId.get(id);if(!s)return false;while(s.parent_id){if(chosen.has(s.parent_id))return false;s=byId.get(s.parent_id);if(!s)break;}return true;});
}
export function selectedGroup(shapes,ids) {
  return ids.length===1&&shapes.find(s=>s.id===ids[0])?.kind==='group'?ids[0]:0;
}
export function selectionTarget(shapes,id,selected=[],{deep=false,drill=false}={}) {
  const byId=new Map(shapes.map(s=>[s.id,s])),path=[];
  let node=byId.get(id);if(!node)return 0;if(deep)return id;
  while(node){path.unshift(node.id);node=byId.get(node.parent_id);}
  // The page's outer frame is a canvas for normal clicks inside it.
  if(path.length>1&&byId.get(path[0]).kind==='frame'&&!byId.get(path[0]).component)path.shift();
  // Normal dragging treats an instance as one object, including clicks on its contents.
  const slotIndex=path.findLastIndex(id=>byId.get(id).slot&&byId.get(id).component?.type==='instance');
  if(slotIndex>=0)path.splice(0,slotIndex+(slotIndex<path.length-1?1:0));
  const instance=path.find(id=>byId.get(id).component?.type==='instance'&&!byId.get(id).slot);
  if(instance&&!drill)return instance;
  const chosen=path.findIndex(id=>selected.includes(id));
  if(chosen>=0)return path[Math.min(chosen+(drill?1:0),path.length-1)];
  // Once inside a container, sibling clicks stay at that nesting level.
  for(const selectedId of selected){const parent=byId.get(selectedId)?.parent_id,index=path.indexOf(parent);if(index>=0&&index<path.length-1)return path[index+1];}
  return path[0];
}
export function childSelection(shapes,ids) {
  const children=shapes.filter(s=>ids.includes(s.parent_id)&&visibleInTree(s,shapes)&&!lockedInTree(s,shapes));
  return children.length?children.map(s=>s.id):ids;
}
export function parentSelection(shapes,ids) {
  return selectionRoots(shapes,[...new Set(ids.map(id=>shapes.find(s=>s.id===id)?.parent_id).filter(Boolean))]);
}
export function siblingSelection(shapes,ids,backward=false) {
  if(!ids.length)return [];
  const last=shapes.find(s=>s.id===ids.at(-1));if(!last)return [];
  const siblings=shapes.filter(s=>s.parent_id===last.parent_id&&visibleInTree(s,shapes)&&!lockedInTree(s,shapes)).reverse();
  const index=siblings.findIndex(s=>s.id===last.id);
  return siblings.length?[siblings[(index+(backward?-1:1)+siblings.length)%siblings.length].id]:ids;
}
export function descendants(shapes,ids) {
  const found=new Set(ids);
  let size=-1;while(size!==found.size) {size=found.size;for(const s of shapes)if(s.parent_id&&found.has(s.parent_id))found.add(s.id);}
  return shapes.filter(s=>found.has(s.id));
}
export function visibleInTree(shape,shapes) {
  let node=shape;
  while(node) {if(node.hidden)return false;node=shapes.find(s=>s.id===node.parent_id);}
  return true;
}
export function lockedInTree(shape,shapes) {
  let node=shape;while(node){if(node.locked)return true;node=shapes.find(s=>s.id===node.parent_id);}return false;
}
export function canvasSelection(shapes,ids,options={}) {
  return selectionRoots(shapes,ids.filter(id=>{const s=shapes.find(s=>s.id===id);return s&&visibleInTree(s,shapes)&&!lockedInTree(s,shapes);}).map(id=>selectionTarget(shapes,id,options.selected??[],options)));
}
