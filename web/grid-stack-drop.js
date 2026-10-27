import {gridDropTarget} from './grid-canvas.js';
import {localPoint,worldPoint,rotatedContains} from './rotation.js';
import {visibleInTree,lockedInTree} from './selection.js';

// Resolve from the pointer and measured tracks, not the dragged layer's centre.
export function gridStackDrop(shapes,p,moving,planFor){
 const excluded=new Set(moving);
 const inMoving=s=>{while(s){if(excluded.has(s.id))return true;s=shapes.find(n=>n.id===s.parent_id);}return false;};
 if(shapes.some(s=>excluded.has(s.id)&&lockedInTree(s,shapes)))return null;
 const depth=s=>{let n=0;while(s?.parent_id){n++;s=shapes.find(p=>p.id===s.parent_id);}return n;};
 for(const frame of [...shapes].reverse().sort((a,b)=>depth(b)-depth(a))){
  const pose=frame._rotationHit??frame;
  if(frame.auto_layout?.direction!=='grid'||frame.auto_layout.grid?.masonry||inMoving(frame)||!visibleInTree(frame,shapes)||lockedInTree(frame,shapes)||frame.component?.type==='instance'||!rotatedContains(pose,p))continue;
  const cell=gridDropTarget(frame,planFor(frame),p);if(!cell)continue;
  if(frame.layout_item?.grid_container&&!frame.auto_layout.grid?.cell_containers){
   return {grid:frame.id,parent:0,before:0,cell,direct:true,pose,
    start:worldPoint(pose,{x:cell.x,y:cell.y}),end:worldPoint(pose,{x:cell.x+cell.width,y:cell.y})};
  }
  const container=shapes.find(s=>s.parent_id===frame.id&&s.layout_item?.grid_container&&!inMoving(s)&&(()=>{const c=s.layout_item.grid_cell??{};return cell.area?c.area===cell.area:!c.area&&cell.column>=c.column&&cell.column<c.column+(c.column_span??1)&&cell.row>=c.row&&cell.row<c.row+(c.row_span??1);})());
  if(container&&(lockedInTree(container,shapes)||container.component?.type==='instance'))return null;
  if(container?.auto_layout?.direction==='grid')continue;
  if(container&&!['vertical','horizontal'].includes(container.auto_layout?.direction))return null;
  const parent=container?._rotationHit??container??pose,local=localPoint(parent,p),horizontal=container?.auto_layout?.direction==='horizontal';
  const children=container?shapes.filter(s=>s.parent_id===container.id&&!excluded.has(s.id)&&!s.hidden&&!s.layout_item?.absolute):[];
  const centers=children.map(s=>localPoint(parent,{x:s.x+s.width/2,y:s.y+s.height/2}));
  const index=centers.findIndex(c=>horizontal?local.x<c.x:local.y<c.y);
  const before=index<0?0:children[index].id,previous=index<0?children.at(-1):children[index-1],next=index<0?null:children[index];
  const edge=(s,end)=>{const c=localPoint(parent,{x:s.x+s.width/2,y:s.y+s.height/2});return (horizontal?c.x:c.y)+(end?1:-1)*(horizontal?s.width:s.height)/2;};
  const gap=container?.auto_layout?.gap??8;
  const at=previous&&next?(edge(previous,true)+edge(next,false))/2:next?edge(next,false)-gap/2:previous?edge(previous,true)+gap/2:horizontal?cell.x:cell.y;
  const start=horizontal?{x:at,y:cell.y}:{x:cell.x,y:at},end=horizontal?{x:at,y:cell.y+cell.height}:{x:cell.x+cell.width,y:at};
  return {grid:frame.id,parent:container?.id??0,before,cell,start:worldPoint(parent,start),end:worldPoint(parent,end)};
 }
 return null;
}
export function drawGridStackDrop(ctx,target,zoom){
 if(!target)return;
 if(target.direct){const {pose,cell}=target;ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(-(pose.rotation??0)*Math.PI/180);ctx.translate(-pose.x,-pose.y);ctx.fillStyle='#2563eb26';ctx.strokeStyle='#1d4ed8';ctx.lineWidth=2/zoom;ctx.setLineDash([]);ctx.fillRect(cell.x,cell.y,cell.width,cell.height);ctx.strokeRect(cell.x,cell.y,cell.width,cell.height);ctx.restore();return;}
 ctx.save();ctx.strokeStyle='#2563eb';ctx.fillStyle='#2563eb';ctx.lineWidth=2/zoom;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(target.start.x,target.start.y);ctx.lineTo(target.end.x,target.end.y);ctx.stroke();
 for(const p of [target.start,target.end]){ctx.beginPath();ctx.arc(p.x,p.y,3/zoom,0,Math.PI*2);ctx.fill();}ctx.restore();
}
