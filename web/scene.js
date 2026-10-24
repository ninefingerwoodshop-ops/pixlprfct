import {visibleInTree,lockedInTree} from './selection.js';
import {appearance,radius,roundedContains} from './appearance.js';
export function clippingFrames(shape,shapes) {
  const frames=[];let parent=shape.parent_id;
  while(parent) {const node=shapes.find(s=>s.id===parent);if(!node)break;if(node.clip_content)frames.push(node);parent=node.parent_id;}
  return frames;
}
export function paintBounds(shape,shapes) {
  if(!visibleInTree(shape,shapes))return null;
  const pad=appearance(shape).stroke_enabled?(shape.stroke_width??2)/2:0;
  let left=shape.x-pad,top=shape.y-pad,right=shape.x+shape.width+pad,bottom=shape.y+shape.height+pad;
  for(const frame of clippingFrames(shape,shapes)) {left=Math.max(left,frame.x);top=Math.max(top,frame.y);right=Math.min(right,frame.x+frame.width);bottom=Math.min(bottom,frame.y+frame.height);}
  return right>left&&bottom>top?{...shape,x:left,y:top,width:right-left,height:bottom-top}:null;
}
export function frameAt(shapes,point) {
  return [...shapes].reverse().find(s=>s.kind==='frame'&&s.component?.type!=='instance'&&visibleInTree(s,shapes)&&!lockedInTree(s,shapes)&&[s,...clippingFrames(s,shapes)].every(f=>roundedContains(f,point)))?.id??0;
}
export function clipDefinitions(shapes) {
  return `<defs>${shapes.filter(s=>s.kind==='frame'&&s.clip_content).map(s=>`<clipPath id="frame-clip-${s.id}" clipPathUnits="userSpaceOnUse"><rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${radius(s)}"/></clipPath>`).join('')}</defs>`;
}
export function clipSvg(shape,shapes,content) {
  return clippingFrames(shape,shapes).reduce((body,frame)=>`<g clip-path="url(#frame-clip-${frame.id})">${body}</g>`,content);
}
export function dropParent(shapes,previews,selectedIds) {
  const moved=new Set(previews.map(s=>s.id)),selected=new Set(selectedIds);
  // A direct edit of one group member must not move its unselected siblings into another frame.
  if(previews.some(s=>s.group_id&&shapes.some(other=>other.group_id===s.group_id&&!moved.has(other.id))))return null;
  const roots=previews.filter(s=>selected.has(s.id)&&!moved.has(s.parent_id));
  if(roots.some(s=>s.component?.type==='instance'&&s.component.master!==s.component.source))return null;
  if(!roots.length)return null;
  const left=Math.min(...roots.map(s=>s.x)),top=Math.min(...roots.map(s=>s.y));
  const right=Math.max(...roots.map(s=>s.x+s.width)),bottom=Math.max(...roots.map(s=>s.y+s.height));
  return frameAt(shapes.filter(s=>!moved.has(s.id)),{x:(left+right)/2,y:(top+bottom)/2});
}
