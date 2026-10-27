// Measured pixel sizes for the tracks occupied by a named-area layer.
export function areaTrackValues(shape,plan){
 if(!shape?.layout_item?.grid_container||!shape.layout_item.grid_cell?.area||!plan)return [];
 const cell=plan.placements.find(p=>p.id===shape.id);if(!cell)return [];
 return [['columns','Column',cell.column,cell.column_span],['rows','Row',cell.row,cell.row_span]].flatMap(([axis,label,start,span])=>
  Array.from({length:span},(_,i)=>({key:`${axis}-${start+i}`,label:`${label} ${start+i} (px)`,value:Number((plan[axis][start+i-1]??0).toFixed(2))})));
}
export function updateAreaTrackValues(panel,shape,plan){
 for(const track of areaTrackValues(shape,plan)){
  const input=panel.querySelector(`[data-area-track="${track.key}"]`);
  if(input&&(!input.dataset?.trackMode||input.dataset.trackMode==='fixed')&&input!==panel.ownerDocument?.activeElement&&input.value!==String(track.value))input.value=track.value;
  const measured=panel.querySelector(`[data-area-track-measured="${track.key}"]`);
  if(measured)measured.textContent=`${track.value} px on canvas`;
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
