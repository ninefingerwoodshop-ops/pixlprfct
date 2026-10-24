export function bounds(shapes) {
  if (!shapes.length) return null;
  const x = Math.min(...shapes.map(s => s.x)), y = Math.min(...shapes.map(s => s.y));
  return { x, y, width: Math.max(...shapes.map(s => s.x + s.width)) - x, height: Math.max(...shapes.map(s => s.y + s.height)) - y };
}
export function marqueeSelection(shapes, start, end) {
  const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x), bottom = Math.max(start.y, end.y);
  return shapes.filter(s => !s.hidden && s.x <= right && s.x + s.width >= x && s.y <= bottom && s.y + s.height >= y).map(s => s.id);
}
export function layerRange(shapes, anchor, target) {
  const a = shapes.findIndex(s => s.id === anchor), b = shapes.findIndex(s => s.id === target);
  return a < 0 || b < 0 ? [target] : shapes.slice(Math.min(a, b), Math.max(a, b) + 1).map(s => s.id);
}
export function expandGroups(shapes, ids) {
  const selected=new Set(ids),groups=new Set(shapes.filter(s=>selected.has(s.id)&&s.group_id).map(s=>s.group_id));
  return shapes.filter(s=>selected.has(s.id)||(s.group_id&&groups.has(s.group_id))).map(s=>s.id);
}
export function selectedGroup(shapes,ids) {
  const selected=new Set(ids),members=shapes.filter(s=>selected.has(s.id));
  const group=members[0]?.group_id;
  return group&&members.every(s=>s.group_id===group)&&shapes.filter(s=>s.group_id===group).length===members.length?group:0;
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
export function canvasSelection(shapes,ids) {
  return expandGroups(shapes,ids).filter(id=>{const s=shapes.find(s=>s.id===id);return visibleInTree(s,shapes)&&!lockedInTree(s,shapes);});
}
