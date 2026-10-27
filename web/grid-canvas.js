export const isNamedAreaLayer=shape=>!!(shape?.layout_item?.grid_container&&shape.layout_item.grid_cell?.area);
import {localPoint} from './rotation.js';
export function gridTracks(frame,plan){
 const l=frame.auto_layout,b=l.strokes_included&&frame.appearance?.stroke_enabled&&frame.appearance?.stroke_alignment==='inside'?frame.stroke_width:0;
 const axis=(sizes,start,gap)=>{let p=start;return sizes.map(size=>{const t={start:p,end:p+size};p+=size+gap;return t;});};
 return {columns:axis(plan.columns,frame.x+b+(l.padding_left??0)+(plan.offset_x??0),plan.column_gap??l.gap??0),rows:axis(plan.rows.length?plan.rows:[Math.max(0,frame.height-2*b-(l.padding_top??0)-(l.padding_bottom??0))],frame.y+b+(l.padding_top??0)+(plan.offset_y??0),plan.row_gap??l.cross_gap??l.gap??0)};
}
export function gridSpanResize(shape,frame,plan,point,cx,cy){
 const cell=plan.placements.find(c=>c.id===shape.id);if(!cell)return shape;
 const tracks=gridTracks(frame,plan),p=localPoint(frame,point),next={column:cell.column,row:cell.row,column_span:cell.column_span,row_span:cell.row_span};
 for(const [axis,coordinate,handle,key] of [['columns','x',cx,'column'],['rows','y',cy,'row']]){
  if(handle===.5||!tracks[axis].length)continue;
  const list=tracks[axis],edge=handle===0?'start':'end';let index=0;
  for(let i=1;i<list.length;i++)if(Math.abs(list[i][edge]-p[coordinate])<Math.abs(list[index][edge]-p[coordinate]))index=i;
  const start=cell[key],end=start+cell[key+'_span']-1;
  if(handle===0){next[key]=Math.min(index+1,end);next[key+'_span']=end-next[key]+1;}
  else next[key+'_span']=Math.max(1,index+2-start);
 }
 return {...shape,layout_item:{...shape.layout_item,grid_cell:{...shape.layout_item?.grid_cell,...next,area:''},...(cx!==.5?{fill_width:true}:{}),...(cy!==.5&&shape.component?.type!=='instance'?{fill_height:true}:{})}};
}
export function drawGridCells(ctx,frame,plan,zoom,hideAreas=false,showNumbers=false,selectedIds=new Set()){
 if(!plan)return;const pose=frame._rotationHit??frame,tracks=gridTracks(pose,plan);
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(-(pose.rotation??0)*Math.PI/180);ctx.translate(-pose.x,-pose.y);
 ctx.save();ctx.beginPath();ctx.rect(pose.x,pose.y,pose.width,pose.height);ctx.clip();ctx.strokeStyle='#2563eb99';ctx.lineWidth=1/zoom;ctx.setLineDash([4/zoom,3/zoom]);
 const cols=tracks.columns,rows=tracks.rows,selected=showNumbers?(plan.placements??[]).filter(p=>selectedIds.has(p.id)):[];
 if(cols.length&&rows.length){const left=cols[0].start,right=cols.at(-1).end,top=rows[0].start,bottom=rows.at(-1).end;ctx.beginPath();for(const t of cols.slice(0,128))for(const x of [t.start,t.end]){ctx.moveTo(x,top);ctx.lineTo(x,bottom);}for(const t of rows.slice(0,256))for(const y of [t.start,t.end]){ctx.moveTo(left,y);ctx.lineTo(right,y);}ctx.stroke();
 for(const p of selected){
  const x=cols[p.column-1],lastX=cols[p.column+p.column_span-2],y=rows[p.row-1],lastY=rows[p.row+p.row_span-2];
  if(!x||!lastX||!y||!lastY)continue;
  ctx.fillStyle='#2563eb0d';
  ctx.fillRect(x.start,top,lastX.end-x.start,bottom-top);
  ctx.fillRect(left,y.start,right-left,lastY.end-y.start);
  ctx.fillStyle='#2563eb24';ctx.fillRect(x.start,y.start,lastX.end-x.start,lastY.end-y.start);
  ctx.setLineDash([]);ctx.strokeStyle='#1d4ed8';ctx.lineWidth=2/zoom;
  ctx.strokeRect(x.start,y.start,lastX.end-x.start,lastY.end-y.start);
 }
 ctx.setLineDash([]);ctx.font=`${11/zoom}px Inter,sans-serif`;ctx.textBaseline='top';
 for(const a of hideAreas?[]:frame.auto_layout.grid?.areas??[]){const x=cols[a.column-1],lastX=cols[a.column+a.column_span-2],y=rows[a.row-1],lastY=rows[a.row+a.row_span-2];if(!x||!lastX||!y||!lastY)continue;ctx.fillStyle='#2563eb0c';ctx.fillRect(x.start,y.start,lastX.end-x.start,lastY.end-y.start);ctx.fillStyle='#1d4ed8';ctx.fillText(a.name,x.start+4/zoom,y.start+4/zoom,Math.max(0,lastX.end-x.start-8/zoom));}
 }ctx.restore();
 if(showNumbers&&cols.length&&rows.length){
  ctx.setLineDash([]);ctx.font=`500 ${11/zoom}px Inter,sans-serif`;ctx.textBaseline='middle';ctx.textAlign='center';
  const badge=(text,x,y,active)=>{const width=ctx.measureText(text).width+8/zoom,height=18/zoom;ctx.fillStyle=active?'#1d4ed8':'#dbeafe';ctx.fillRect(x-width/2,y-height/2,width,height);ctx.fillStyle=active?'#ffffff':'#1e40af';ctx.fillText(text,x,y);};
  // Outside the content bounds, so labels never cover the controls being placed.
  cols.slice(0,128).forEach((track,i)=>badge(`C${i+1}`,(track.start+track.end)/2,rows[0].start-13/zoom,selected.some(p=>i+1>=p.column&&i+1<p.column+p.column_span)));
  rows.slice(0,256).forEach((track,i)=>{const text=`R${i+1}`,width=ctx.measureText(text).width+8/zoom;badge(text,cols[0].start-4/zoom-width/2,(track.start+track.end)/2,selected.some(p=>i+1>=p.row&&i+1<p.row+p.row_span));});
 }
 ctx.restore();
}

export function gridCellAt(frame,plan,point){
 const tracks=gridTracks(frame,plan),p=localPoint(frame._rotationHit??frame,point);
 const index=(list,value)=>{let i=list.findIndex((t,j)=>value<=t.end+((list[j+1]?.start??t.end)-t.end)/2);return i<0?list.length-1:i;};
 const column=index(tracks.columns,p.x),row=index(tracks.rows,p.y);if(column<0||row<0)return null;
 const x=tracks.columns[column],y=tracks.rows[row];return {column:column+1,row:row+1,x:x.start,y:y.start,width:x.end-x.start,height:y.end-y.start};
}
export function gridDropTarget(frame,plan,point){
 const cell=gridCellAt(frame,plan,point);if(!cell)return null;
 const area=frame.auto_layout.grid?.areas?.find(a=>cell.column>=a.column&&cell.column<a.column+a.column_span&&cell.row>=a.row&&cell.row<a.row+a.row_span);
 if(!area)return cell;
 const t=gridTracks(frame,plan),x=t.columns[area.column-1],right=t.columns[area.column+area.column_span-2],y=t.rows[area.row-1],bottom=t.rows[area.row+area.row_span-2];
 return x&&right&&y&&bottom?{...cell,area:area.name,x:x.start,y:y.start,width:right.end-x.start,height:bottom.end-y.start}:cell;
}
export function drawGridDestination(ctx,frame,plan,point,zoom){
 const pose=frame._rotationHit??frame,cell=gridDropTarget(pose,plan,point);if(!cell)return;
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(-(pose.rotation??0)*Math.PI/180);ctx.translate(-pose.x,-pose.y);ctx.fillStyle='#2563eb26';ctx.strokeStyle='#2563eb';ctx.lineWidth=2/zoom;ctx.fillRect(cell.x,cell.y,cell.width,cell.height);ctx.strokeRect(cell.x,cell.y,cell.width,cell.height);if(cell.area){ctx.fillStyle='#1d4ed8';ctx.font=`500 ${12/zoom}px Inter,sans-serif`;ctx.textBaseline='top';ctx.fillText(cell.area,cell.x+8/zoom,cell.y+8/zoom,Math.max(0,cell.width-16/zoom));}ctx.restore();
}

export function historyGridItemSelection(before,after,ids){
 const previous=new Map(before.shapes.map(s=>[s.id,s])),next=new Map(after.shapes.map(s=>[s.id,s]));
 const changed=ids.some(id=>{
  const a=previous.get(id),b=next.get(id);
  if(!a||!b||b.page_id!==after.active_page)return false;
  const grid=previous.get(a.parent_id)?.auto_layout?.direction==='grid'||next.get(b.parent_id)?.auto_layout?.direction==='grid';
  return grid&&(a.parent_id!==b.parent_id||JSON.stringify(a.layout_item?.grid_cell)!==JSON.stringify(b.layout_item?.grid_cell));
 });
 return changed?ids.filter(id=>next.get(id)?.page_id===after.active_page):null;
}

// Return null outside a wrapper grid, or [] when the selection is at its edge.
export function gridArrowMove(shapes,parent,plan,key){
 const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(!directions[key]||!shapes.length||!parent?.layout_item?.grid_container||parent.auto_layout?.direction!=='grid'||parent.auto_layout.grid?.masonry||shapes.some(s=>s.parent_id!==parent.id||s.layout_item?.absolute))return null;
 const cells=shapes.map(s=>plan?.placements.find(p=>p.id===s.id));if(cells.some(c=>!c))return [];
 const [dx,dy]=directions[key];
 if(cells.some(c=>c.column+dx<1||c.row+dy<1||c.column+dx+c.column_span-1>plan.columns.length||c.row+dy+c.row_span-1>plan.rows.length))return [];
 return shapes.map((s,i)=>({...s,layout_item:{...s.layout_item,grid_cell:{...s.layout_item?.grid_cell,column:cells[i].column+dx,row:cells[i].row+dy,column_span:cells[i].column_span,row_span:cells[i].row_span,area:''}}}));
}

// Creation should honor the cell under the pointer, including empty cell space.
export function gridCreationPlacement(shape,frame,plan,point){
 if(frame?.auto_layout?.direction!=='grid'||frame.auto_layout.grid?.masonry||!plan)return shape;
 const cell=gridDropTarget(frame,plan,point);if(!cell)return shape;
 return {...shape,layout_item:{...shape.layout_item,grid_cell:{...shape.layout_item?.grid_cell,column:cell.column,row:cell.row,column_span:1,row_span:1,area:cell.area??''}}};
}
