import {layoutClass} from './layout-class.js';
import {areaTrackValues,editAreaTrack,areaTrackDefinition,areaPlacementKey} from './grid-area-track-values.js';
import {gridPickerCell,gridPickerWindow,sizeGridTracks} from './grid-ux.js';
import {icon} from './icons.js';
import {bindGridPickerDrag} from './grid-picker-drag.js';
import {gridTrackCss,gridCss} from './grid-model.js';
export const defaultTrack=()=>({mode:'fr',value:1,min:null,max:null});
export const defaultGrid=()=>({cell_containers:true,columns:[defaultTrack(),defaultTrack()],rows:[],auto_rows:defaultTrack()});
const units=[['fixed','px'],['fr','fr'],['percent','%'],['em','em'],['auto','Auto'],['min-content','Min content'],['max-content','Max content'],['hug','Hug contents'],['minmax','Min / max']];
const alignments=[['start','Start'],['center','Center'],['end','End'],['stretch','Stretch']];
function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
function field(parent,label,id,value,change,{min=0,max=1000000,placeholder='',type='number'}={}){const wrap=el('label',label,'grid-field'),input=el('input');input.id=id;input.type=type;input.setAttribute('aria-label',label);if(type==='number'){input.min=min;input.max=max;input.step='any';}input.placeholder=placeholder;input.value=value??'';input.onchange=()=>{input.setCustomValidity('');if(!input.checkValidity()){input.reportValidity();return;}try{change(type==='number'?(input.value===''?null:Number(input.value)):input.value);}catch(e){input.setCustomValidity(String(e));input.reportValidity();}};wrap.append(input);parent.append(wrap);return input;}
function select(parent,label,id,value,options,change){const wrap=el('label',label,'grid-field'),input=el('select');input.id=id;input.setAttribute('aria-label',label);for(const [v,name] of options){const option=el('option',name);option.value=v;input.append(option);}input.value=value;input.onchange=()=>change(input.value);wrap.append(input);parent.append(wrap);return input;}
function action(label,glyph,run){const b=el('button',null,'inspector-icon');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(glyph);b.onclick=run;return b;}
function group(parent,title,id,open=false){const d=el('details',null,'grid-settings-group');d.id=id;d.open=open;d.append(el('summary',title));parent.append(d);return d;}
function pair(parent){const row=el('div',null,'grid-field-pair');parent.append(row);return row;}
function trackRangeControls(card,id,t,change){const range=pair(card);field(range,'Minimum size',`${id}-min`,t.min??0,value=>change({...t,min:value??0}));select(range,'Minimum unit',`${id}-min-unit`,t.min_unit||'px',[['px','px'],['%','%'],['em','em'],['auto','Auto'],['min-content','Min content'],['max-content','Max content']],min_unit=>change({...t,min_unit}));select(card,'Maximum unit',`${id}-max-unit`,t.max_unit||'fr',[['fr','fr'],['px','px'],['%','%'],['em','em'],['auto','Auto'],['min-content','Min content'],['max-content','Max content']],max_unit=>change({...t,max_unit}));}
function trackControls(parent,title,id,t,change,reorder,remove){
 const card=el('div',null,'grid-track-card'),header=el('div',null,'grid-track-heading');header.append(el('span',title));const buttons=el('div',null,'grid-track-actions');
 if(reorder){buttons.append(action(`Move ${title.toLowerCase()} earlier`,'chevron-up',()=>reorder(-1)),action(`Move ${title.toLowerCase()} later`,'chevron-down',()=>reorder(1)));}
 if(remove)buttons.append(action(`Remove ${title.toLowerCase()}`,'minus',remove));header.append(buttons);card.append(header);parent.append(card);
 const row=pair(card);select(row,`${title} sizing`,`${id}-mode`,t.mode,units,mode=>change({...t,mode,value:mode==='fr'?1:mode==='fixed'?100:t.value,min:null,max:null}));
 if(['fixed','fr','percent','em','minmax'].includes(t.mode))field(row,t.mode==='minmax'?'Maximum size':`${title} size`,`${id}-value`,t.value,value=>change({...t,value:value??1}),{min:t.mode==='fr'?.001:0});
 if(t.mode==='minmax')trackRangeControls(card,id,t,change);
 else {const limits=group(card,'Size limits',`${id}-limits`),r=pair(limits);for(const key of ['min','max'])field(r,key==='min'?'Minimum (px)':'Maximum (px)',`${id}-${key}`,t[key],value=>change({...t,[key]:value}),{placeholder:'None'});}
}
function placementPicker(panel,c,placed,plan,change,preview){
 if(!plan)return;
 const view=gridPickerWindow(plan,c,placed),box=el('div',null,'grid-placement-picker');
 const caption=el('p','Choose a cell','grid-picker-title');box.append(caption);
 box.append(el('p','Click to place. Drag across cells to set the span.','grid-caption'));
 const map=el('div',null,'grid-picker-map');map.setAttribute('role','group');map.setAttribute('aria-label','Visual grid placement');map.style.gridTemplateColumns=`repeat(${view.columns},minmax(0,1fr))`;
 const column=c.column??placed?.column??1,row=c.row??placed?.row??1,buttons=[],cells=[];
 for(let y=view.top;y<view.top+view.rows;y++)for(let x=view.left;x<view.left+view.columns;x++){
  const b=el('button',`${x} · ${y}`);b.type='button';b.id=`grid-picker-${x}-${y}`;b.setAttribute('aria-label',`Column ${x}, row ${y}`);b.title=`Column ${x}, row ${y}`;
  const active=x>=column&&x<column+(c.column_span??1)&&y>=row&&y<row+(c.row_span??1);b.setAttribute('aria-pressed',String(active));b.tabIndex=x===column&&y===row?0:-1;
  const occupied=plan.placements?.some(p=>p.id!==placed?.id&&x>=p.column&&x<p.column+p.column_span&&y>=p.row&&y<p.row+p.row_span);b.classList.toggle('occupied',!!occupied);if(occupied)b.setAttribute('aria-label',`Column ${x}, row ${y}, occupied`);
  b.onclick=e=>change(gridPickerCell(c,placed,x,y,e.shiftKey));
  b.onkeydown=e=>{const index=buttons.indexOf(b),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-view.columns,ArrowDown:view.columns}[e.key];if(delta===undefined)return;e.preventDefault();e.stopPropagation();const next=buttons[Math.max(0,Math.min(buttons.length-1,index+delta))];b.tabIndex=-1;next.tabIndex=0;next.focus();};
  buttons.push(b);cells.push({button:b,column:x,row:y});map.append(b);
 }
 bindGridPickerDrag(map,cells,c,value=>{
  const selection=value??{...c,column,row};
  for(const cell of cells)cell.button.setAttribute('aria-pressed',String(cell.column>=selection.column&&cell.column<selection.column+(selection.column_span??1)&&cell.row>=selection.row&&cell.row<selection.row+(selection.row_span??1)));
  caption.textContent=value?`${value.column_span} columns × ${value.row_span} rows`:'Choose a cell';
  preview?.(value);
 },change);
 if(!buttons.some(b=>b.tabIndex===0))buttons[0].tabIndex=0;
 box.append(map,el('p',`Column · Row · Dot = occupied${view.totalColumns>8||view.totalRows>8?' · Showing a window around the selected item; use the fields below for other cells.':''}`,'grid-caption'));panel.append(box);
}
export function renderGridControls(panel,shape,update,reorder,plan,remove,renameArea,deleteArea){
 const hadContent=panel.childElementCount>0,expanded=new Set([...panel.querySelectorAll('details[open]')].map(e=>e.id));panel.replaceChildren();panel.classList.add('grid-editor');panel.hidden=shape?.auto_layout?.direction!=='grid';if(panel.hidden)return;
 const l=shape.auto_layout,g=l.grid??defaultGrid(),commit=grid=>update({...shape,auto_layout:{...l,grid}}),patch=v=>commit({...g,...v});
 select(panel,'Placement','grid-placement',g.masonry?'masonry':'manual',[['manual','Manual cells'],['masonry','Automatic masonry']],value=>patch({masonry:value==='masonry',cell_containers:true}));
 const intro=el('p',g.masonry?'Arrange cards in the shortest column. Each card keeps its editable cell wrapper.':'Build your columns and rows, then drag layers into cells. Each cell can contain its own Flex or Grid Layout.','grid-caption');panel.append(intro);
 const stats=el('div',null,'grid-counts');panel.append(stats);
 for(const key of (g.masonry?['columns']:['columns','rows']))field(stats,key==='columns'?'Columns':'Rows',`grid-${key}-count`,g[key].length,value=>{const n=Math.max(key==='columns'?1:0,Math.min(128,Math.trunc(value??0)));patch({[key]:Array.from({length:n},(_,i)=>g[key][i]??defaultTrack())});},{min:key==='columns'?1:0,max:128});
 if(!g.masonry)panel.append(el('p','Rows set to 0 grow automatically as you add items.','grid-caption'));
 const quick=el('div',null,'grid-quick-actions');panel.append(quick);
 for(const [title,axis,mode] of [['Equal columns','columns','fr'],...(!g.masonry?[['Content-height rows','rows','auto']]:[])]){const b=el('button',title);b.type='button';b.title=axis==='columns'?'Give every column an equal share of the available width':'Let each row grow to fit its content, including automatically added rows';b.onclick=()=>commit(sizeGridTracks(g,axis,mode));quick.append(b);}

 for(const key of (g.masonry?['columns']:['columns','rows'])){const section=group(panel,key==='columns'?`Column sizing · ${g.columns.length}`:`Row sizing · ${g.rows.length||'Auto'}`,`grid-${key}-section`,false);const tracks=g[key];
 tracks.forEach((t,i)=>trackControls(section,`${key==='columns'?'Column':'Row'} ${i+1}`,`grid-${key}-${i}`,t,value=>patch({[key]:tracks.map((old,j)=>i===j?value:old)}),reorder?delta=>reorder(key,i,delta):null,tracks.length>(key==='columns'?1:0)?()=>{if(remove&&(plan?.[key]?.length??0)>1)remove(key,i);else patch({[key]:tracks.filter((_,j)=>i!==j)});}:null));
 const add=el('button',`Add ${key==='columns'?'column':'row'}`,'wide-button grid-add-track');add.type='button';add.disabled=tracks.length>=128;add.onclick=()=>patch({[key]:[...tracks,defaultTrack()]});section.append(add);
 }
 const implicit=group(panel,'Auto placement & implicit tracks','grid-implicit');
 select(implicit,'Flow','grid-auto-flow',g.auto_flow??'row',[['row','Row →'],['column','Column ↓']],auto_flow=>patch({auto_flow}));
 const dense=el('label','Fill gaps densely','grid-toggle'),check=el('input');check.type='checkbox';check.checked=g.dense??false;check.onchange=()=>patch({dense:check.checked});dense.append(check);implicit.append(dense,el('p','Dense placement fills earlier empty cells; visual order can differ from reading order.','grid-caption'));
 for(const axis of ['column','row']){const key=`auto_${axis}_pattern`,fallback=g[`auto_${axis}s`]??defaultTrack(),tracks=g[key]?.length?g[key]:[fallback],d=group(implicit,`Automatic ${axis}s`,`grid-auto-${axis}-pattern`);
 tracks.forEach((t,i)=>trackControls(d,`Auto ${axis} ${i+1}`,`grid-auto-${axis}-${i}`,t,value=>patch({[key]:tracks.map((old,j)=>i===j?value:old)}),null,tracks.length>1?()=>patch({[key]:tracks.filter((_,j)=>i!==j)}):null));
 const add=el('button','Add repeating track','wide-button');add.type='button';add.disabled=tracks.length>=128;add.onclick=()=>patch({[key]:[...tracks,defaultTrack()]});d.append(add);
 }
 const alignment=group(panel,'Alignment','grid-alignment');const content=[...alignments,['between','Space between'],['around','Space around'],['evenly','Space evenly']];
 for(const [key,label] of [['justify_items','Items · horizontal'],['align_items','Items · vertical'],['justify_content','Grid · horizontal'],['align_content','Grid · vertical']])select(alignment,label,`grid-${key}`,g[key]??'start',key.endsWith('content')?content:alignments,value=>patch({[key]:value}));
 const areas=group(panel,'Named areas','grid-areas');areas.append(el('p','Name rectangular regions, then assign layers using their Grid cell controls.','grid-caption'));
 for(const [i,a] of (g.areas??[]).entries()){const card=el('div',null,'grid-track-card'),change=values=>patch({areas:g.areas.map((old,j)=>j===i?{...a,...values}:old)});areas.append(card);const name=field(card,'Area name',`grid-area-${i}-name`,a.name,value=>renameArea?renameArea(a.name,value):change({name:value}),{type:'text'});name.pattern='[A-Za-z][A-Za-z0-9_-]*';const r=pair(card);for(const [key,label] of [['column','Column'],['row','Row'],['column_span','Column span'],['row_span','Row span']])field(r,label,`grid-area-${i}-${key}`,a[key],value=>change({[key]:Math.trunc(value??1)}),{min:1,max:128});card.append(action(`Delete area ${a.name}`,'minus',()=>deleteArea?deleteArea(a.name):patch({areas:g.areas.filter((_,j)=>i!==j)})));}
 const addArea=el('button','Add named area','wide-button');addArea.type='button';addArea.onclick=()=>{const areas=g.areas??[];let row=1,column=1;while(areas.some(a=>column>=a.column&&column<a.column+a.column_span&&row>=a.row&&row<a.row+a.row_span)){column++;if(column>g.columns.length){column=1;row++;}if(row>128)return;}let n=areas.length+1;while(areas.some(a=>a.name===`area-${n}`))n++;patch({areas:[...areas,{name:`area-${n}`,column,row,column_span:1,row_span:1}]});};areas.append(addArea);
 if(g.masonry){implicit.hidden=true;areas.hidden=true;alignment.hidden=true;}
 const code=group(panel,'CSS output','grid-code');const css={display:'grid',...gridCss(g),'column-gap':`${l.gap}${g.column_gap_unit??'px'}`,'row-gap':`${l.cross_gap??l.gap}${g.row_gap_unit??'px'}`,padding:[l.padding_top,l.padding_right,l.padding_bottom,l.padding_left].map(v=>`${v}px`).join(' ')};const text=el('textarea');text.readOnly=true;text.setAttribute('aria-label','Grid CSS');if(g.masonry){css['--px-masonry-gap']=css['row-gap'];css['row-gap']='0px';css['grid-template-rows']='auto';css['grid-template-areas']='none';css['align-content']='start';}text.value=`${g.masonry?'/* Automatic masonry uses the exported JavaScript runtime to measure and place items. */\n':''}.${layoutClass(shape)} {\n${Object.entries(css).filter(([,v])=>v).map(([k,v])=>`  ${k}: ${v};`).join('\n')}\n}`;code.append(text);const copy=el('button','Copy CSS','wide-button');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text.value);copy.textContent='Copied';}catch{text.focus();text.select();copy.textContent='Select and copy CSS';}};code.append(copy);
 if(hadContent)for(const section of panel.querySelectorAll('details'))section.open=expanded.has(section.id);
}
export function renderGridCell(panel,shape,parent,update,plan,preview){
 const expanded=new Set([...panel.querySelectorAll('details[open]')].map(e=>e.id));panel.replaceChildren();panel.hidden=!shape||(!parent?.layout_item?.grid_container&&parent?.auto_layout?.direction!=='grid')||shape.layout_item?.absolute;if(panel.hidden)return;
 if(parent.auto_layout?.direction!=='grid'){
  panel.append(el('h3','Placement inside cell'),el('p',`Use CSS Grid inside ${parent.name} to choose this item's row and column.`,'grid-caption'));
  const button=el('button','Use Grid Layout in this cell','wide-button');button.type='button';
  button.onclick=()=>update({...parent,auto_layout:{...parent.auto_layout,direction:'grid',wrap:false,grid:{cell_containers:false,columns:[defaultTrack()],rows:[],auto_rows:{mode:'auto',value:1}}}});
  panel.append(button);return;
 }
 if(parent.layout_item?.grid_container){
  panel.append(el('p',`Placement inside ${parent.name}`,'grid-caption'));
  field(panel,'Cell columns','grid-cell-columns',parent.auto_layout.grid.columns.length,value=>{
   const count=Math.max(1,Math.min(128,Math.trunc(value??1))),g=parent.auto_layout.grid;
   update({...parent,auto_layout:{...parent.auto_layout,grid:{...g,columns:Array.from({length:count},(_,i)=>g.columns[i]??defaultTrack())}}});
  },{min:1,max:128});
 }
 const c={column:null,row:null,column_span:1,row_span:1,align_x:'auto',align_y:'auto',area:'',...shape.layout_item?.grid_cell},placed=plan?.placements.find(p=>p.id===shape.id);
 panel.append(el('h3','Grid cell'));
 const areaTracks=areaTrackValues(shape,plan);
 if(areaTracks.length){
  const active=el('div',null,'grid-active-area');active.hidden=true;active.dataset.basePlacement=areaPlacementKey(placed);
  const status=el('p',null,'grid-caption grid-active-placement');status.setAttribute('role','status');
  active.append(status,el('p',null,'grid-caption grid-active-tracks'));panel.append(active);
  const tracks=el('div',null,'grid-area-track-values');
  tracks.append(el('p','Base area tracks','grid-caption'),el('p','Edits apply to the base grid and every area sharing these tracks. Breakpoint overrides are edited in Layout CSS.','grid-caption'));
  for(const track of areaTracks){
   const definition=areaTrackDefinition(parent,track.key),label=track.label.replace(' (px)','');
   const card=el('div',null,'area-track-control');card.dataset.areaTrackControl=track.key;card.setAttribute('role','group');card.setAttribute('aria-label',label);tracks.append(card);
   const details=el('details',null,'area-track-details');details.id=`area-track-details-${parent.id}-${shape.id}-${track.key}`;details.open=expanded.has(details.id);card.append(details);
   const summary=el('summary'),heading=el('span',null,'area-track-heading');
   heading.append(el('span',label+' ','area-track-name'),el('span',gridTrackCss(definition),'area-track-rule'));
   const measured=el('span',`${track.value} px on canvas`,'area-track-measured');measured.dataset.areaTrackMeasured=track.key;
   summary.append(heading,measured);details.append(summary);
   // Let the disclosure and inspector scroll normally without editing canvas layers.
   summary.onkeydown=event=>{if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))event.stopPropagation();};
   const settings=el('div',null,'area-track-settings');details.append(settings);
   const row=pair(settings);
   const supported=['fixed','fr','percent','auto','minmax'].includes(definition.mode);
   const mode=definition.mode;
   const choices=[['fixed','px'],['fr','fr'],['percent','%'],['auto','Auto'],['minmax','Min / max']];
   if(!supported)choices.push([mode,gridTrackCss(definition)]);
   select(row,`${label} unit`,'area-track-unit-'+track.key,mode,choices,next=>{
    const value=next===mode?definition.value:next==='fixed'?track.value:next==='fr'?1:next==='percent'?50:1;
    update(editAreaTrack(parent,track.key,value,next));
   });
   if(!['auto','minmax'].includes(mode)&&supported){
    const input=field(row,label,'area-track-'+track.key,definition.value,value=>{if(value===null)throw new Error('Enter a track size.');update(editAreaTrack(parent,track.key,value,mode));});
    input.dataset.areaTrack=track.key;input.dataset.trackMode=mode;
   }
   if(mode==='minmax'){
    const change=next=>update(editAreaTrack(parent,track.key,next.value,'minmax',next));
    field(row,`${label} maximum size`,'area-track-max-'+track.key,definition.value,value=>{if(value===null)throw new Error('Enter a maximum size.');change({...definition,value});});
    trackRangeControls(settings,'area-track-'+track.key,definition,change);
   }
   const feedback=el('p',null,'area-track-limit');feedback.id='area-track-limit-'+track.key;feedback.hidden=true;card.append(feedback);
   summary.setAttribute('aria-describedby',feedback.id);
   for(const control of card.querySelectorAll('input,select'))control.setAttribute('aria-describedby',feedback.id);
  }
  panel.append(tracks);
 }
 const placementSummary=el('p',null,'grid-caption'),summaryText=cell=>`Column ${cell.column} · Row ${cell.row} · ${cell.column_span} × ${cell.row_span}`;
 if(placed){placementSummary.textContent=(c.area?'Base placement: ':'')+summaryText(placed);panel.append(placementSummary);}
 const cellShape=cell=>({...shape,layout_item:{...shape.layout_item,grid_cell:cell,...(cell.column_span>1?{fill_width:true}:{}),...(cell.row_span>1&&shape.component?.type!=='instance'?{fill_height:true}:{})}});
 const commitCell=cell=>update(cellShape(cell));
 const commit=(key,value)=>update({...shape,layout_item:{...shape.layout_item,grid_cell:{...c,...(['column','row','column_span','row_span'].includes(key)?{area:''}:{}),[key]:value},...(key==='column_span'&&value>1?{fill_width:true}:{}),...(key==='row_span'&&value>1&&shape.component?.type!=='instance'?{fill_height:true}:{})}});
 if(parent.auto_layout.grid?.masonry){
  select(panel,'Column','grid-cell-column',String(c.row==null&&!c.area?(c.column??''):''),[['','Auto · shortest column'],...parent.auto_layout.grid.columns.map((_,i)=>[String(i+1),`Column ${i+1}`])],v=>update({...shape,layout_item:{...shape.layout_item,grid_cell:{...c,column:v?Number(v):null,row:null,area:''}}}));
  panel.append(el('p','Items stack vertically in their chosen column. Auto uses the shortest column.','grid-caption'));return;
 }
 select(panel,'Placement','grid-cell-placement',c.area?'area':c.column!=null||c.row!=null?'explicit':'auto',[['auto','Automatic'],['explicit','Choose a cell'],...((parent.auto_layout.grid?.areas?.length??0)>0?[['area','Named area']]:[])],v=>update({...shape,layout_item:{...shape.layout_item,grid_cell:{...c,column:v==='explicit'?(c.column??placed?.column??1):null,row:v==='explicit'?(c.row??placed?.row??1):null,area:v==='area'?(parent.auto_layout.grid?.areas?.[0]?.name??''):''}}}));
 if(c.area)select(panel,'Named area','grid-cell-area',c.area,[['','None'],...(parent.auto_layout.grid?.areas??[]).map(a=>[a.name,a.name])],v=>commit('area',v));
 if(!c.area){
  const inputs=new Map(),explicit=c.column!=null||c.row!=null;
  placementPicker(panel,c,placed,plan,commitCell,cell=>{
   const values=cell??c;
   for(const [key,input] of inputs){
    input.value=values[key]??'';
    if(key==='column'||key==='row')input.parentElement.hidden=!cell&&!explicit;
   }
   if(placed)placementSummary.textContent=summaryText(cell??placed);
   preview?.(cell?cellShape(cell):null);
  });
  const positions=pair(panel);
  for(const [key,label,max] of [['column','Column start',128],['row','Row start',10000],['column_span','Column span',128],['row_span','Row span',128]]){
   const input=field(positions,label,`grid-cell-${key}`,c[key],value=>commit(key,value===null?(key.endsWith('span')?1:null):Math.trunc(value)),{min:1,max,placeholder:'Auto'});
   inputs.set(key,input);
   if(key==='column'||key==='row')input.parentElement.hidden=!explicit;
  }
 }
 const alignment=group(panel,'Item alignment','grid-cell-alignment',expanded.has('grid-cell-alignment'));
 for(const [key,label] of [['align_x','Horizontal alignment'],['align_y','Vertical alignment']])select(alignment,label,`grid-cell-${key}`,c[key],[['auto','Inherit'],...alignments],value=>commit(key,value));
 const reset=el('button','Reset to automatic placement','wide-button');reset.type='button';reset.onclick=()=>update({...shape,layout_item:{...shape.layout_item,grid_cell:{...c,column:null,row:null,column_span:1,row_span:1,area:''}}});panel.append(reset);
}
