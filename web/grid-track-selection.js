// Canvas track handles for grid frames, following Figma (inspected 2026-11-11):
// hovering a cell shows a small pill above its column and left of its row;
// hovering a pill, or selecting a track, turns it into a chip with a grip, the
// track size and a chevron. Click selects, Shift/Ctrl-click selects several,
// dragging reorders. Sizes are screen pixels measured in Figma: pills 22 x 10
// and chips 16 high, both centred 34 px outside the frame.
import {gridTracks} from './grid-canvas.js';
export const TRACK_HEADER_LIMIT=128;
export const TRACK_HANDLE={offset:34,pillLong:22,pillShort:10,chipHeight:16,grip:17,chevron:16,reach:46};
const plural={columns:'columns',rows:'rows'};
function inset(frame){
 const l=frame.auto_layout;
 return l.strokes_included&&frame.appearance?.stroke_enabled&&frame.appearance?.stroke_alignment==='inside'?frame.stroke_width:0;
}
const trackList=(frame,plan,axis)=>gridTracks(frame,plan)[axis].slice(0,Math.min(plan[axis].length,TRACK_HEADER_LIMIT));
// Short size text for a chip: "1fr", "120", "Hug".
export function trackSizeLabel(track){
 if(!track)return 'Auto';
 const n=value=>String(Math.round((value??0)*100)/100);
 return ({fr:n(track.value??1)+'fr',fixed:n(track.value),percent:n(track.value)+'%',em:n(track.value)+'em',hug:'Hug',auto:'Auto','min-content':'Min','max-content':'Max',minmax:'Min/max'})[track.mode]??'Auto';
}
const chipWidth=label=>TRACK_HANDLE.grip+Math.max(22,label.length*6+4)+TRACK_HANDLE.chevron;
// The pill for one track, in document units.
export function trackPill(frame,plan,axis,index,zoom=1){
 const t=trackList(frame,plan,axis)[index];if(!t)return null;
 const H=TRACK_HANDLE,b=inset(frame),mid=(t.start+t.end)/2,long=H.pillLong/zoom,short=H.pillShort/zoom,away=H.offset/zoom;
 return axis==='columns'?{axis,index,kind:'pill',x:mid-long/2,y:frame.y+b-away-short/2,width:long,height:short}:{axis,index,kind:'pill',x:frame.x+b-away-short/2,y:mid-long/2,width:short,height:long};
}
// The chip for one track. Column chips are centred over the track; row chips
// end just past where the pill sat, so they grow away from the frame.
export function trackChip(frame,plan,axis,index,zoom=1){
 const t=trackList(frame,plan,axis)[index];if(!t)return null;
 const H=TRACK_HANDLE,b=inset(frame),mid=(t.start+t.end)/2,label=trackSizeLabel(frame.auto_layout.grid?.[axis]?.[index]),width=chipWidth(label)/zoom,height=H.chipHeight/zoom,away=H.offset/zoom;
 const x=axis==='columns'?mid-width/2:frame.x+b-away+8/zoom-width,y=axis==='columns'?frame.y+b-away-height/2:mid-height/2;
 return {axis,index,kind:'chip',label,x,y,width,height,grip:H.grip/zoom,chevron:H.chevron/zoom};
}
// Which column and row the pointer is over, counting the gaps before a track's end as that track.
export function hoveredTracks(frame,plan,p){
 if(frame?.auto_layout?.direction!=='grid'||!plan)return null;
 if(p.x<frame.x||p.x>frame.x+frame.width||p.y<frame.y||p.y>frame.y+frame.height)return null;
 const at=(axis,value)=>{const list=trackList(frame,plan,axis),found=list.findIndex(t=>value<=t.end);return list.length?(found<0?list.length-1:found):null;};
 return {column:at('columns',p.x),row:at('rows',p.y)};
}
// Handles to show: chips for selected tracks and the hovered handle, pills for the hovered cell's tracks.
export function trackHandles(frame,plan,zoom=1,{hover=null,selection=null}={}){
 if(frame?.auto_layout?.direction!=='grid'||!plan)return [];
 const out=[],seen=new Set(),add=h=>{if(h&&!seen.has(h.axis+h.index)){seen.add(h.axis+h.index);out.push(h);}};
 for(const index of selection?.indices??[])add(trackChip(frame,plan,selection.axis,index,zoom));
 if(hover?.chip)add(trackChip(frame,plan,hover.chip.axis,hover.chip.index,zoom));
 if(hover?.column!=null)add(trackPill(frame,plan,'columns',hover.column,zoom));
 if(hover?.row!=null)add(trackPill(frame,plan,'rows',hover.row,zoom));
 return out;
}
// The handle under the pointer and, for a chip, which part of it.
export function trackHandleHit(frame,plan,p,zoom=1,state={}){
 const slack=3/zoom;
 for(const h of trackHandles(frame,plan,zoom,state)){
  if(p.x<h.x-slack||p.x>h.x+h.width+slack||p.y<h.y-slack||p.y>h.y+h.height+slack)continue;
  const part=h.kind==='pill'?'pill':p.x<h.x+h.grip?'grip':p.x>h.x+h.width-h.chevron?'chevron':'size';
  return {axis:h.axis,index:h.index,kind:h.kind,part};
 }
 return null;
}
// Pills stay while the pointer crosses from the frame to them.
export function nearTrackHandles(frame,p,zoom=1){
 const reach=TRACK_HANDLE.reach/zoom;
 return !!frame&&p.x>=frame.x-reach&&p.x<=frame.x+frame.width&&p.y>=frame.y-reach&&p.y<=frame.y+frame.height;
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
 return axis==='columns'?{x1:at,y1:frame.y+b-TRACK_HANDLE.offset/zoom,x2:at,y2:to}:{x1:frame.x+b-TRACK_HANDLE.offset/zoom,y1:at,x2:to,y2:at};
}
export function trackSelectionLabel(selection){
 if(!selection?.indices.length)return '';
 const one=selection.axis==='columns'?'Column':'Row',n=selection.indices.length;
 return n===1?`${one} ${selection.indices[0]+1} selected`:`${n} ${plural[selection.axis]} selected`;
}
export function drawTrackHandles(ctx,frame,plan,zoom,{hover=null,selection=null,drop=null}={}){
 const handles=trackHandles(frame,plan,zoom,{hover,selection});if(!handles.length&&!drop)return;
 const tracks=gridTracks(frame,plan),cols=tracks.columns,rows=tracks.rows,px=1/zoom;
 ctx.save();
 // Selected tracks get one 2 px outline per run of neighbours, across the whole grid.
 if(selection?.indices.length&&cols.length&&rows.length){
  const list=tracks[selection.axis],chosen=[...selection.indices].filter(i=>list[i]).sort((a,b)=>a-b);
  ctx.strokeStyle='#0d99ff';ctx.lineWidth=2*px;ctx.fillStyle=drop?'#0d99ff0f':'#0d99ff14';
  for(let i=0;i<chosen.length;i++){let end=i;while(end+1<chosen.length&&chosen[end+1]===chosen[end]+1)end++;
   const from=list[chosen[i]].start,to=list[chosen[end]].end,r=selection.axis==='columns'?[from,rows[0].start,to-from,rows.at(-1).end-rows[0].start]:[cols[0].start,from,cols.at(-1).end-cols[0].start,to-from];
   ctx.fillRect(...r);ctx.strokeRect(...r);i=end;}
 }
 for(const h of handles){
  if(h.kind==='pill'){
   ctx.fillStyle='#7cc4f8';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5*px;ctx.beginPath();ctx.roundRect(h.x,h.y,h.width,h.height,Math.min(h.width,h.height)/2);ctx.fill();ctx.stroke();continue;
  }
  ctx.fillStyle='#0d99ff';ctx.beginPath();ctx.roundRect(h.x,h.y,h.width,h.height,4*px);ctx.fill();
  // Grip: three short bars, upright for columns and lying down for rows.
  ctx.strokeStyle='#ffffff';ctx.lineWidth=px;ctx.beginPath();const gx=h.x+h.grip/2+1*px,gy=h.y+h.height/2;
  for(const d of [-3,0,3]){if(h.axis==='columns'){ctx.moveTo(gx+d*px,gy-3*px);ctx.lineTo(gx+d*px,gy+3*px);}else{ctx.moveTo(gx-3.5*px,gy+d*px);ctx.lineTo(gx+3.5*px,gy+d*px);}}
  // Chevron.
  const cx=h.x+h.width-h.chevron/2-1*px;ctx.moveTo(cx-2.5*px,gy-1.25*px);ctx.lineTo(cx,gy+1.25*px);ctx.lineTo(cx+2.5*px,gy-1.25*px);ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.font=`600 ${11*px}px Inter,system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(h.label,h.x+h.grip+(h.width-h.grip-h.chevron)/2,gy+.5*px);
 }
 if(drop){
  const line=trackDropLine(frame,plan,drop.axis,drop.before,zoom);
  if(line){ctx.strokeStyle=drop.moves?'#0d99ff':'#0d99ff66';ctx.lineWidth=2*px;ctx.beginPath();ctx.moveTo(line.x1,line.y1);ctx.lineTo(line.x2,line.y2);ctx.stroke();}
 }
 ctx.restore();
}
