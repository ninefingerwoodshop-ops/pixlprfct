// Canvas track headers for grid frames in "Edit spacing on canvas": click to
// select a column or row, Shift/Ctrl-click to select several, drag to reorder.
// Lanes are measured in screen pixels: column headers clear the frame name
// label above the frame, and the trailing end of each header is left to the
// track's resize edge.
import {gridTracks} from './grid-canvas.js';
export const TRACK_HEADER_LIMIT=128;
const LANE={columns:34,rows:14},HEIGHT=10,EDGE=9;
const plural={columns:'columns',rows:'rows'};
function inset(frame){
 const l=frame.auto_layout;
 return l.strokes_included&&frame.appearance?.stroke_enabled&&frame.appearance?.stroke_alignment==='inside'?frame.stroke_width:0;
}
// One rectangle per track, above the frame for columns and left of it for rows.
export function trackHeaders(frame,plan,zoom=1){
 if(frame?.auto_layout?.direction!=='grid'||!plan)return [];
 const tracks=gridTracks(frame,plan),b=inset(frame),size=HEIGHT/zoom,headers=[];
 // Automatic rows have no explicit track list; the plan reports what exists.
 for(const [axis,list] of [['columns',tracks.columns.slice(0,plan.columns.length)],['rows',tracks.rows.slice(0,plan.rows.length)]])
  list.slice(0,TRACK_HEADER_LIMIT).forEach((t,index)=>headers.push(axis==='columns'
   ?{axis,index,x:t.start,y:frame.y+b-LANE.columns/zoom-size/2,width:t.end-t.start,height:size}
   :{axis,index,x:frame.x+b-LANE.rows/zoom-size/2,y:t.start,width:size,height:t.end-t.start}));
 return headers;
}
export function trackHeaderHit(frame,plan,p,zoom=1){
 const slack=3/zoom,edge=EDGE/zoom;
 return trackHeaders(frame,plan,zoom).find(h=>{
  // The trailing edge belongs to the resize handle.
  const along=h.axis==='columns'?[p.x,h.x,h.width]:[p.y,h.y,h.height],across=h.axis==='columns'?[p.y,h.y,h.height]:[p.x,h.x,h.width];
  return along[0]>=along[1]&&along[0]<=along[1]+along[2]-edge&&across[0]>=across[1]-slack&&across[0]<=across[1]+across[2]+slack;
 })??null;
}
const sorted=indices=>[...new Set(indices)].sort((a,b)=>a-b);
// Plain click replaces, Shift extends from the anchor, toggle adds or removes.
// A selection never mixes columns with rows.
export function selectTrack(selection,axis,index,{shiftKey=false,toggle=false}={}){
 const same=selection?.axis===axis&&selection.indices.length;
 if(shiftKey&&same){
  const anchor=selection.anchor??selection.indices[0],from=Math.min(anchor,index),to=Math.max(anchor,index);
  return {axis,indices:Array.from({length:to-from+1},(_,i)=>from+i),anchor};
 }
 if(toggle&&same){
  const indices=selection.indices.includes(index)?selection.indices.filter(i=>i!==index):sorted([...selection.indices,index]);
  return indices.length?{axis,indices,anchor:indices.includes(index)?index:indices[0]}:null;
 }
 return {axis,indices:[index],anchor:index};
}
// Drop a selection the document no longer supports (other frame, fewer tracks).
export function validTrackSelection(selection,frame,plan){
 if(!selection||!frame||selection.frameId!==frame.id||frame.auto_layout?.direction!=='grid'||!plan)return null;
 const count=Math.min(plan[selection.axis]?.length??0,TRACK_HEADER_LIMIT),indices=selection.indices.filter(i=>i<count);
 return indices.length?{...selection,indices}:null;
}
// Insertion boundary (0..count) nearest the pointer: before the first track
// whose middle lies past it.
export function trackDropBoundary(frame,plan,axis,p){
 const list=gridTracks(frame,plan)[axis].slice(0,plan[axis].length),value=axis==='columns'?p.x:p.y;
 const before=list.findIndex(t=>value<(t.start+t.end)/2);
 return before<0?list.length:before;
}
// A boundary touching a contiguous selection would leave the order unchanged.
export function trackDropMoves(indices,before){
 const list=sorted(indices);if(!list.length)return false;
 const contiguous=list.at(-1)-list[0]===list.length-1;
 return !(contiguous&&before>=list[0]&&before<=list.at(-1)+1);
}
export function trackDropLine(frame,plan,axis,before,zoom=1){
 const tracks=gridTracks(frame,plan),list=tracks[axis].slice(0,plan[axis].length),cross=tracks[axis==='columns'?'rows':'columns'];
 if(!list.length||!cross.length)return null;
 const at=before<=0?list[0].start:before>=list.length?list.at(-1).end:(list[before-1].end+list[before].start)/2;
 const to=cross.at(-1).end,b=inset(frame);
 return axis==='columns'?{x1:at,y1:frame.y+b-LANE.columns/zoom,x2:at,y2:to}:{x1:frame.x+b-LANE.rows/zoom,y1:at,x2:to,y2:at};
}
export function trackSelectionLabel(selection){
 if(!selection?.indices.length)return '';
 const one=selection.axis==='columns'?'Column':'Row',n=selection.indices.length;
 return n===1?`${one} ${selection.indices[0]+1} selected`:`${n} ${plural[selection.axis]} selected`;
}
export function drawTrackHeaders(ctx,frame,plan,zoom,selection,drop=null){
 const headers=trackHeaders(frame,plan,zoom);if(!headers.length)return;
 const tracks=gridTracks(frame,plan),cols=tracks.columns,rows=tracks.rows,chosen=new Set(selection?.indices??[]);
 const on=h=>selection?.axis===h.axis&&chosen.has(h.index);
 ctx.save();ctx.lineWidth=1/zoom;
 if(cols.length&&rows.length){
  const left=cols[0].start,right=cols.at(-1).end,top=rows[0].start,bottom=rows.at(-1).end;
  ctx.fillStyle=drop?'#0d99ff14':'#0d99ff1f';
  for(const h of headers)if(on(h)){if(h.axis==='columns')ctx.fillRect(h.x,top,h.width,bottom-top);else ctx.fillRect(left,h.y,right-left,h.height);}
 }
 for(const h of headers){
  const active=on(h),r=Math.min(3/zoom,h.width/2,h.height/2);
  ctx.fillStyle=active?'#0d99ff':'#0d99ff33';ctx.strokeStyle='#0d99ff';
  ctx.beginPath();ctx.roundRect(h.x,h.y,Math.max(0,h.width-(h.axis==='columns'?EDGE/zoom:0)),Math.max(0,h.height-(h.axis==='rows'?EDGE/zoom:0)),r);ctx.fill();if(active)ctx.stroke();
 }
 if(drop){
  const line=trackDropLine(frame,plan,drop.axis,drop.before,zoom);
  if(line){ctx.strokeStyle=drop.moves?'#0d99ff':'#0d99ff66';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.moveTo(line.x1,line.y1);ctx.lineTo(line.x2,line.y2);ctx.stroke();}
 }
 ctx.restore();
}
