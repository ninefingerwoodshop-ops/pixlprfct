import {gridTracks,gridCellAt,gridSpanResize} from './grid-canvas.js';
import {localPoint,worldPoint} from './rotation.js';
const handles=[[0,0],[1,0],[0,1],[1,1],[0,.5],[1,.5],[.5,0],[.5,1]];
export function areaBox(frame,plan,a){const t=gridTracks(frame,plan),x=t.columns[a.column-1],r=t.columns[a.column+a.column_span-2],y=t.rows[a.row-1],b=t.rows[a.row+a.row_span-2];return x&&r&&y&&b?{x:x.start,y:y.start,width:r.end-x.start,height:b.end-y.start}:null;}
export function areaFromDrag(frame,plan,start,end,name){const a=gridCellAt(frame,plan,start),b=gridCellAt(frame,plan,end);if(!a||!b)return null;const columns=frame.auto_layout.grid.columns.length,column=Math.min(a.column,b.column,columns),row=Math.min(a.row,b.row,128);return {name,column,row,column_span:Math.min(columns,Math.max(a.column,b.column))-column+1,row_span:Math.min(128,Math.max(a.row,b.row))-row+1};}
export function pageArea(areas,active,backward=false){
 if(!areas.length)return null;
 const index=areas.findIndex(a=>a.name===active);
 if(index<0)return areas[backward?areas.length-1:0].name;
 return areas[Math.max(0,Math.min(areas.length-1,index+(backward?-5:5)))].name;
}
export function cycleArea(areas,active,backward=false){
 if(!areas.length)return null;
 const index=areas.findIndex(a=>a.name===active);
 return areas[index<0?(backward?areas.length-1:0):(index+(backward?-1:1)+areas.length)%areas.length].name;
}
export function nudgeArea(frame,plan,areas,area,dx,dy,resize=false){
 const tracks=gridTracks(frame,plan),next=resize?{...area,column_span:area.column_span+dx,row_span:area.row_span+dy}:{...area,column:area.column+dx,row:area.row+dy};
 if(next.column_span<1||next.row_span<1||next.column<1||next.row<1||next.column+next.column_span-1>tracks.columns.length||next.row+next.row_span-1>tracks.rows.length||!validArea(areas,next))return area;
 return next;
}
export function moveArea(frame,plan,area,start,end){
 const from=gridCellAt(frame,plan,start),to=gridCellAt(frame,plan,end);if(!from||!to)return area;
 const tracks=gridTracks(frame,plan);
 return {...area,column:Math.max(1,Math.min(tracks.columns.length-area.column_span+1,area.column+to.column-from.column)),row:Math.max(1,Math.min(tracks.rows.length-area.row_span+1,area.row+to.row-from.row))};
}
export function resizeArea(frame,plan,a,p,cx,cy){const fake={id:-1,layout_item:{grid_cell:a}},result=gridSpanResize(fake,frame,{...plan,placements:[{...a,id:-1}]},p,cx,cy).layout_item.grid_cell;return {...a,column:result.column,row:result.row,column_span:result.column_span,row_span:result.row_span};}
export function areasOverlap(a,b){return a.column<b.column+b.column_span&&b.column<a.column+a.column_span&&a.row<b.row+b.row_span&&b.row<a.row+a.row_span;}
export function validArea(areas,a){return !!a&&!areas.some(b=>b.name!==a.name&&areasOverlap(a,b));}
export function nextAreaName(areas){let i=1;while(areas.some(a=>a.name===`area-${i}`))i++;return `area-${i}`;}
export function areaHit(frame,plan,areas,p,zoom,active){p=localPoint(frame,p);const ordered=[...areas].sort((a,b)=>Number(b.name===active)-Number(a.name===active));
 for(const area of ordered){const box=areaBox(frame,plan,area);if(!box)continue;const pad=7/zoom;
 for(const [cx,cy] of handles){if(Math.abs(p.x-box.x-cx*box.width)<=pad&&Math.abs(p.y-box.y-cy*box.height)<=pad)return {area,cx,cy};}
 if(p.x>=box.x-pad&&p.x<=box.x+box.width+pad&&p.y>=box.y-pad&&p.y<=box.y+box.height+pad){if(Math.abs(p.x-box.x)<=pad)return {area,cx:0,cy:.5};if(Math.abs(p.x-box.x-box.width)<=pad)return {area,cx:1,cy:.5};if(Math.abs(p.y-box.y)<=pad)return {area,cx:.5,cy:0};if(Math.abs(p.y-box.y-box.height)<=pad)return {area,cx:.5,cy:1};if(p.x>=box.x&&p.x<=box.x+box.width&&p.y>=box.y&&p.y<=box.y+box.height)return {area};}
 }return null;
}
export function drawAreaEditing(ctx,frame,plan,areas,active,preview,valid,zoom){ctx.save();ctx.translate(frame.x,frame.y);ctx.rotate(-(frame.rotation??0)*Math.PI/180);ctx.translate(-frame.x,-frame.y);const list=preview?[...areas.filter(a=>a.name!==preview.name),preview]:areas;
 for(const a of list){const b=areaBox(frame,plan,a);if(!b)continue;const selected=a.name===active||a===preview;ctx.fillStyle=a===preview&&!valid?'#dc262626':selected?'#2563eb20':'#2563eb0d';ctx.strokeStyle=a===preview&&!valid?'#dc2626':'#2563eb';ctx.lineWidth=(selected?2:1)/zoom;ctx.setLineDash([]);ctx.fillRect(b.x,b.y,b.width,b.height);ctx.strokeRect(b.x,b.y,b.width,b.height);if(selected){const size=7/zoom;for(const [x,y] of handles){ctx.fillStyle='#fff';ctx.fillRect(b.x+b.width*x-size/2,b.y+b.height*y-size/2,size,size);ctx.strokeRect(b.x+b.width*x-size/2,b.y+b.height*y-size/2,size,size);}}ctx.fillStyle='#1d4ed8';ctx.font=`500 ${12/zoom}px Inter,sans-serif`;ctx.textBaseline='top';ctx.fillText(`${a.name} · ${a.column_span} × ${a.row_span}`,b.x+8/zoom,b.y+8/zoom,Math.max(0,b.width-16/zoom));}
 ctx.restore();}

export function restoredAreaSelection(before,after){
 for(const frame of after.shapes.filter(s=>s.page_id===after.active_page)){
  const old=before.shapes.find(s=>s.id===frame.id&&s.page_id===frame.page_id),areas=frame.auto_layout?.grid?.areas??[],previous=old?.auto_layout?.grid?.areas??[];
  if(!old||areas.length<=previous.length)continue;
  const restored=areas.find(a=>!previous.some(b=>b.name===a.name));
  if(restored)return {frame:frame.id,name:restored.name};
 }return null;
}

export function historyAreaSelection(before,after,selection){
 for(const frame of after.shapes.filter(s=>s.page_id===after.active_page&&s.auto_layout?.direction==='grid')){
  const old=before.shapes.find(s=>s.id===frame.id&&s.page_id===frame.page_id);if(!old)continue;
  const areas=frame.auto_layout.grid?.areas??[],previous=old.auto_layout?.grid?.areas??[];
  const added=areas.filter(a=>!previous.some(b=>b.name===a.name)),removed=previous.filter(a=>!areas.some(b=>b.name===a.name));
  if(added.length===1&&(removed.length===0||removed.length===1))return {frame:frame.id,name:added[0].name};
  const changed=areas.find(a=>{const b=previous.find(b=>b.name===a.name);return b&&['column','row','column_span','row_span'].some(k=>a[k]!==b[k]);});
  if(changed)return {frame:frame.id,name:changed.name};
 }
 const frame=after.shapes.find(s=>s.id===selection?.frame&&s.page_id===after.active_page&&s.auto_layout?.direction==='grid');
 return frame?.auto_layout.grid?.areas?.some(a=>a.name===selection.name)?selection:null;
}

export function areaVisiblePan(frame,plan,area,pan,zoom,viewport){
 const b=areaBox(frame,plan,area);if(!b)return pan;
 const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>worldPoint(frame,{x,y}));
 const xs=points.map(p=>pan.x+p.x*zoom),ys=points.map(p=>pan.y+p.y*zoom);
 const delta=(start,end,min,max)=>{if(end-start>max-min){if(start>min)return min-start;if(end<max)return max-end;return 0;}return start<min?min-start:end>max?max-end:0;};
 return {x:pan.x+delta(Math.min(...xs),Math.max(...xs),viewport.left,viewport.right),y:pan.y+delta(Math.min(...ys),Math.max(...ys),viewport.top,viewport.bottom)};
}

export function areaSelectionStatus(areas,active){const index=areas.findIndex(a=>a.name===active);return index<0?null:{name:areas[index].name,count:`${index+1} of ${areas.length}`};}
