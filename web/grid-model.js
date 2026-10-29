const num=v=>Number.isFinite(Number(v))?Number(v):0;
const length=(v,u)=>`${num(v)}${['px','%','em','fr'].includes(u)?u:'px'}`;
const sizing=(v,u)=>['auto','min-content','max-content'].includes(u)?u:length(v,u);
export function gridTrackCss(t={mode:'fr',value:1}){
 if(t.mode==='minmax')return `minmax(${sizing(t.min??0,t.min_unit||'px')},${sizing(t.value,t.max_unit||'fr')})`;
 // A bounded length still has a preferred size. minmax(min,max) discards it
 // and makes the browser grow fixed tracks to their maximum during a drag.
 if(['fixed','percent','em'].includes(t.mode)&&(t.min!=null||t.max!=null))return `clamp(${length(t.min??0,'px')},${length(t.value,t.mode==='percent'?'%':t.mode==='em'?'em':'px')},${length(t.max??1000000,'px')})`;
 const value=t.mode==='hug'?'max-content':['auto','min-content','max-content'].includes(t.mode)?t.mode:t.mode==='fr'?`${Math.max(.001,num(t.value))}fr`:length(t.value,t.mode==='percent'?'%':t.mode==='em'?'em':'px');
 return t.min!=null||t.max!=null?`minmax(${length(t.min??0,'px')},${t.max!=null?length(t.max,'px'):value})`:t.mode==='fr'?`minmax(0,${value})`:value;
}
export function gridAreaRows(g){
 const areas=g.areas??[],height=Math.max(g.rows?.length??0,...areas.map(a=>a.row+a.row_span-1)),width=g.columns?.length??0;
 if(!areas.length||!height||!width)return [];
 const rows=Array.from({length:height},()=>Array(width).fill('.'));
 for(const a of areas)if(/^[a-z][\w-]*$/i.test(a.name))for(let r=a.row-1;r<Math.min(height,a.row-1+a.row_span);r++)for(let c=a.column-1;c<Math.min(width,a.column-1+a.column_span);c++)if(r>=0&&c>=0)rows[r][c]=a.name;
 return rows.map(r=>r.join(' '));
}
export const gridAlignment=v=>({between:'space-between',around:'space-around',evenly:'space-evenly'}[v]??v??'start');
export function gridCss(g={}){
 const pattern=(p,f)=>(p?.length?p:[f??{mode:'auto',value:1}]).map(gridTrackCss).join(' ');
 const result={'grid-template-columns':(g.columns??[]).map(gridTrackCss).join(' ')||'1fr','grid-template-rows':(g.rows??[]).map(gridTrackCss).join(' '),'grid-auto-columns':pattern(g.auto_column_pattern,g.auto_columns),'grid-auto-rows':pattern(g.auto_row_pattern,g.auto_rows),'grid-auto-flow':`${g.auto_flow??'row'}${g.dense?' dense':''}`,'justify-items':g.justify_items??'start','align-items':g.align_items??'start','justify-content':gridAlignment(g.justify_content),'align-content':gridAlignment(g.align_content)};
 const areas=gridAreaRows(g);if(areas.length)result['grid-template-areas']=areas.map(s=>`"${s}"`).join(' ');
 return result;
}
