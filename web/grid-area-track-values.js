// Measured pixel sizes for the tracks occupied by a named-area layer.
export function areaTrackValues(shape,plan){
 if(!shape?.layout_item?.grid_container||!shape.layout_item.grid_cell?.area||!plan)return [];
 const cell=plan.placements.find(p=>p.id===shape.id);if(!cell)return [];
 return [['columns','Column',cell.column,cell.column_span],['rows','Row',cell.row,cell.row_span]].flatMap(([axis,label,start,span])=>
  Array.from({length:span},(_,i)=>({key:`${axis}-${start+i}`,label:`${label} ${start+i} (px)`,value:Number((plan[axis][start+i-1]??0).toFixed(2))})));
}
export const areaPlacementKey=cell=>cell?[cell.column,cell.row,cell.column_span,cell.row_span].join(','):'';
export function updateAreaTrackValues(panel,shape,plan,{preview=false,parent}={}){
 for(const measured of panel.querySelectorAll('[data-area-track-measured]')){
  const key=measured.dataset.areaTrackMeasured,[axis,number]=key.split('-'),value=plan?.[axis]?.[Number(number)-1];
  const input=panel.querySelector(`[data-area-track="${key}"]`);
  // Base values remain editable while a media query changes measured sizes.
  const size=value==null?null:Number(value.toFixed(2));
  if(preview&&size!=null&&input&&(!input.dataset?.trackMode||input.dataset.trackMode==='fixed')&&input!==panel.ownerDocument?.activeElement&&input.value!==String(size))input.value=size;
  measured.textContent=!plan?'Not in active Grid':size==null?'Not present at this breakpoint':`${size} px on canvas`;
 }
 const active=panel.querySelector('.grid-active-area');
 if(active&&!preview){
  const cell=plan?.placements.find(p=>p.id===shape.id),name=shape.layout_item?.grid_cell?.area;
  const omitted=parent?.auto_layout?.direction==='grid'&&name&&!parent.auto_layout.grid?.areas?.some(a=>a.name===name);
  active.hidden=!!plan&&!omitted&&areaPlacementKey(cell)===active.dataset.basePlacement;
  const status=active.querySelector('.grid-active-placement'),tracks=active.querySelector('.grid-active-tracks');
  status.textContent=!plan?'On canvas: not in active Grid.':!cell?'On canvas: not placed.':`On canvas: Column ${cell.column} · Row ${cell.row} · ${cell.column_span} × ${cell.row_span}${omitted?` · “${name}” is not defined here; contents use automatic placement.`:''}`;
  tracks.textContent=areaTrackValues(shape,plan).map(t=>`${t.label.replace(' (px)','')}: ${t.value}px`).join(' · ');
 }
}

// Editing a measured size pins only that track to pixels; other sizing modes stay intact.
export function editAreaTrack(parent,key,value,mode='fixed',range={}){
 const match=/^(columns|rows)-(\d+)$/.exec(key);
 if(!['fixed','fr','percent','auto','minmax'].includes(mode))throw new Error('Choose px, fr, %, or Auto.');
 if(mode==='auto')value=1;
 if(!match||!Number.isFinite(value)||value<0||value>1000000)throw new Error('Enter a track size between 0 and 1000000 px.');
 const [,axis,number]=match,index=Number(number)-1,g=parent?.auto_layout?.grid;
 if(!g||index<0||index>=128)throw new Error('Grid track not found.');
 const tracks=(g[axis]??[]).map(track=>({...track}));
 const pattern=g[axis==='rows'?'auto_row_pattern':'auto_column_pattern']??[];
 const fallback=g[axis==='rows'?'auto_rows':'auto_columns']??{mode:'auto',value:1};
 const explicit=tracks.length;
 while(tracks.length<=index)tracks.push({...pattern[(tracks.length-explicit)%pattern.length]??fallback});
 tracks[index]={mode,value,min:null,max:null,min_unit:'',max_unit:''};
 if(mode==='minmax'){
  const min=range.min??0,min_unit=range.min_unit||'px',max_unit=range.max_unit||'fr';
  if(!Number.isFinite(min)||min<0||min>1000000)throw new Error('Enter a valid minimum size.');
  if(!['px','%','em','auto','min-content','max-content'].includes(min_unit)||!['px','%','em','fr','auto','min-content','max-content'].includes(max_unit))throw new Error('Choose valid min/max units.');
  tracks[index]={mode,value,min,max:null,min_unit,max_unit};
 }
 return {...parent,auto_layout:{...parent.auto_layout,grid:{...g,[axis]:tracks}}};
}

export function areaTrackDefinition(parent,key){
 const [axis,number]=key.split('-'),index=Number(number)-1,g=parent.auto_layout.grid,tracks=g[axis]??[];
 const pattern=g[axis==='rows'?'auto_row_pattern':'auto_column_pattern']??[];
 return tracks[index]??pattern[(index-tracks.length)%pattern.length]??g[axis==='rows'?'auto_rows':'auto_columns']??{mode:'auto',value:1};
}
