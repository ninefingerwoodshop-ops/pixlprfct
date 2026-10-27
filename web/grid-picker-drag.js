import {gridPickerCell} from './grid-ux.js';

// Keep drag previews local: releasing commits one edit; cancelling commits none.
export function bindGridPickerDrag(map,cells,current,preview,commit){
 let drag=null,suppressClick=false;
 const hit=e=>cells.find(({button})=>{const r=button.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});
 const move=e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const cell=hit(e);if(!cell)return;
  if(cell.column!==drag.column||cell.row!==drag.row)drag.moved=true;
  if(drag.moved&&(drag.lastColumn!==cell.column||drag.lastRow!==cell.row)){drag.lastColumn=cell.column;drag.lastRow=cell.row;drag.value=gridPickerCell({...current,column:drag.column,row:drag.row},null,cell.column,cell.row,true);preview(drag.value);}
 };
 const finish=(e,cancel=false)=>{
  if(!drag||(e.pointerId!=null&&e.pointerId!==drag.id))return;
  const ended=drag;drag=null;
  suppressClick=cancel||ended.moved;
  if(ended.button.hasPointerCapture(ended.id))ended.button.releasePointerCapture(ended.id);
  preview(null);
  if(!cancel&&ended.moved)commit(ended.value);
 };
 map.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.isPrimary===false)return;
  const cell=hit(e);if(!cell)return;
  suppressClick=false;
  drag={button:cell.button,id:e.pointerId,column:cell.column,row:cell.row,moved:false,value:null};
  cell.button.focus({preventScroll:true});
  cell.button.setPointerCapture(e.pointerId);
 });
 map.addEventListener('pointermove',move);
 map.addEventListener('pointerup',e=>{move(e);finish(e);});
 map.addEventListener('pointercancel',e=>finish(e,true));
 map.addEventListener('lostpointercapture',e=>finish(e,true));
 map.addEventListener('keydown',e=>{if(drag&&e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(e,true);}},true);
 map.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
}
