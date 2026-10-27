// Shared placement logic for the inspector's visual grid picker.
export function gridPickerCell(cell,placed,column,row,extend=false){
 const current={column:null,row:null,column_span:1,row_span:1,area:'',...cell};
 const startColumn=current.column??placed?.column??1,startRow=current.row??placed?.row??1;
 return {...current,area:'',column:extend?Math.min(startColumn,column):column,row:extend?Math.min(startRow,row):row,
  column_span:extend?Math.abs(column-startColumn)+1:current.column_span,row_span:extend?Math.abs(row-startRow)+1:current.row_span};
}
export function gridPickerWindow(plan,cell,placed){
 const column=cell?.column??placed?.column??1,row=cell?.row??placed?.row??1;
 const columns=Math.max(1,plan?.columns?.length??1),rows=Math.max(1,plan?.rows?.length??1);
 const left=Math.max(1,Math.min(column-2,columns-7)),top=Math.max(1,Math.min(row-2,rows-7));
 return {left,top,columns:Math.min(8,columns),rows:Math.min(8,rows),totalColumns:columns,totalRows:rows};
}
export function sizeGridTracks(grid,axis,mode){
 const track=()=>({mode,value:1,min:null,max:null});
 return {...grid,[axis]:(grid[axis]??[]).map(track),...(axis==='rows'?{auto_rows:track(),auto_row_pattern:[]}:{} )};
}
