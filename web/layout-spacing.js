const label={padding_left:'Left padding',padding_right:'Right padding',padding_top:'Top padding',padding_bottom:'Bottom padding',gap:'Gap',cross_gap:'Row / column gap'};
export function spacingHandles(frame,shapes,gridPlan=null){
 const l=frame?.auto_layout;if(!l)return [];
 const border=l.strokes_included&&frame.appearance?.stroke_enabled&&frame.appearance?.stroke_alignment==='inside'?frame.stroke_width:0;
 const x=frame.x+border,y=frame.y+border,w=Math.max(0,frame.width-2*border),h=Math.max(0,frame.height-2*border),handles=[];
 const add=(key,axis,sign,cx,cy,area)=>handles.push({key,axis,sign,x:cx,y:cy,area,label:label[key],value:l[key]??l.gap});
 add('padding_left','x',1,x+l.padding_left,y+h/2,{x,y,width:l.padding_left,height:h});
 add('padding_right','x',-1,x+w-l.padding_right,y+h/2,{x:x+w-l.padding_right,y,width:l.padding_right,height:h});
 add('padding_top','y',1,x+w/2,y+l.padding_top,{x,y,width:w,height:l.padding_top});
 add('padding_bottom','y',-1,x+w/2,y+h-l.padding_bottom,{x,y:y+h-l.padding_bottom,width:w,height:l.padding_bottom});
 if(l.direction==='grid'){
  if(!gridPlan)return handles;
  for(const [sizes,key,axis,start,crossStart,crossSize,gap] of [[gridPlan.columns,'gap','x',x+l.padding_left+(gridPlan.offset_x??0),y+l.padding_top,Math.max(0,h-l.padding_top-l.padding_bottom),gridPlan.column_gap??l.gap],[gridPlan.rows,'cross_gap','y',y+l.padding_top+(gridPlan.offset_y??0),x+l.padding_left,Math.max(0,w-l.padding_left-l.padding_right),gridPlan.row_gap??l.cross_gap??l.gap]]){
   let edge=start;
   // Bound editing overlays for large implicit grids; all tracks remain
   // accessible through the inspector and the document keeps every row.
   for(let i=0;i<Math.min(sizes.length,128);i++){
    edge+=sizes[i];
    const area=axis==='x'?{x:edge,y:crossStart,width:gap,height:crossSize}:{x:crossStart,y:edge,width:crossSize,height:gap};
    if(i<sizes.length-1){add(key,axis,1,area.x+area.width/2,area.y+area.height/2,area);handles.at(-1).label=axis==='x'?'Column gap':'Row gap';}
    const column=axis==='x',trackKey=`grid-${column?'column':'row'}-${i}`,cx=column?edge:x-12,cy=column?y-12:edge;
    handles.push({key:trackKey,axis,sign:1,x:cx,y:cy,area:column?{x:edge,y:crossStart,width:0,height:crossSize}:{x:crossStart,y:edge,width:crossSize,height:0},label:`${column?'Column':'Row'} ${i+1} width`.replace('Row '+(i+1)+' width','Row '+(i+1)+' height'),value:sizes[i],track:{axis:column?'columns':'rows',index:i}});
    edge+=gap;
   }
  }
  return handles;
 }
 const horizontal=l.direction==='horizontal',main=horizontal?'x':'y',cross=horizontal?'y':'x',size=horizontal?'width':'height',crossSize=horizontal?'height':'width';
 const items=shapes.filter(s=>s.parent_id===frame.id&&!s.hidden&&!s.layout_item?.absolute),rows=[];
 const available=horizontal?w-l.padding_left-l.padding_right:h-l.padding_top-l.padding_bottom,gap=['between','around','evenly'].includes(l.justify)?0:l.gap;
 let cursor=0,low=0,high=0;
 for(const s of items){
  const sl=s.auto_layout,b=sl?.strokes_included&&s.appearance?.stroke_enabled&&s.appearance?.stroke_alignment==='inside'?s.stroke_width:0;
  const floor=Math.max(1,sl?(horizontal?sl.padding_left+sl.padding_right:sl.padding_top+sl.padding_bottom)+2*b:0),li=s.layout_item??{},min=Math.max(floor,li[horizontal?'min_width':'min_height']??1),max=Math.max(floor,li[horizontal?'max_width':'max_height']??1e6);
  const basis=li[horizontal?'fill_width':'fill_height']?min:Math.max(min,Math.min(max,s[size]));
  let row=rows.at(-1);if(!row||l.wrap&&Math.max(high,cursor+basis)-Math.min(low,cursor)>available+1e-7){row={items:[],start:s[cross],end:s[cross]+s[crossSize]};rows.push(row);cursor=0;low=0;high=0;}
  low=Math.min(low,cursor);high=Math.max(high,cursor+basis);cursor+=basis+gap;row.items.push(s);row.start=Math.min(row.start,s[cross]);row.end=Math.max(row.end,s[cross]+s[crossSize]);
 }
 for(const row of rows)if(!['between','around','evenly'].includes(l.justify))for(let i=1;i<row.items.length;i++){
  const a=row.items[i-1],b=row.items[i],start=a[main]+a[size],end=b[main],lo=Math.max(a[cross],b[cross]),hi=Math.min(a[cross]+a[crossSize],b[cross]+b[crossSize]);
  if(hi<=lo)continue;
  const area=horizontal?{x:Math.min(start,end),y:lo,width:Math.abs(end-start),height:hi-lo}:{x:lo,y:Math.min(start,end),width:hi-lo,height:Math.abs(end-start)};
  add('gap',main,1,area.x+area.width/2,area.y+area.height/2,area);
 }
 if(l.wrap&&!['between','around','evenly'].includes(l.align_content))for(let i=1;i<rows.length;i++){
  const start=rows[i-1].end,end=rows[i].start;
  const area=horizontal?{x:x+l.padding_left,y:Math.min(start,end),width:Math.max(0,w-l.padding_left-l.padding_right),height:Math.abs(end-start)}:{x:Math.min(start,end),y:y+l.padding_top,width:Math.abs(end-start),height:Math.max(0,h-l.padding_top-l.padding_bottom)};
  add('cross_gap',cross,1,area.x+area.width/2,area.y+area.height/2,area);
 }
 return handles;
}
export function spacingHit(frame,shapes,p,zoom,gridPlan=null){return spacingHandles(frame,shapes,gridPlan).map(h=>({...h,distance:Math.hypot(p.x-h.x,p.y-h.y)})).filter(h=>h.distance<=9/zoom).sort((a,b)=>a.distance-b.distance)[0]??null;}
export function changeSpacing(frame,handle,delta,{shiftKey=false,altKey=false}={}){
 const step=shiftKey?10:1;
 if(handle.track){
  const fallback={mode:'fr',value:1,min:null,max:null},g=frame.auto_layout.grid??{columns:[fallback,fallback],rows:[],auto_rows:fallback},{axis,index}=handle.track;
  const tracks=Array.from({length:Math.max(g[axis].length,index+1)},(_,i)=>({...g[axis][i]??g.auto_rows??fallback})),t=tracks[index];
  if(t.mode==='minmax'){t.min=null;t.max=null;}t.mode='fixed';t.value=Math.max(t.min??0,Math.min(t.max??1e6,Math.round((handle.value+delta*handle.sign)/step)*step));
  return {...frame,auto_layout:{...frame.auto_layout,grid:{...g,[axis]:tracks}}};
 }
 if(frame.auto_layout.direction==='grid'&&['gap','cross_gap'].includes(handle.key)){const g=frame.auto_layout.grid??{},unit=g[handle.key==='gap'?'column_gap_unit':'row_gap_unit']??'px';if(unit==='em')delta/=frame.typography?.font_size??16;if(unit==='%'){const l=frame.auto_layout,available=handle.key==='gap'?frame.width-l.padding_left-l.padding_right:frame.height-l.padding_top-l.padding_bottom;delta=available>0?delta*100/available:0;}}
 const min=frame.auto_layout.direction!=='grid'&&(handle.key==='gap'||handle.key==='cross_gap')?-100000:0,value=Math.max(min,Math.min(100000,Math.round(((frame.auto_layout[handle.key]??frame.auto_layout.gap)+delta*handle.sign)/step)*step));
 const l={...frame.auto_layout,[handle.key]:value};
 if(altKey&&handle.key.startsWith('padding_')){const opposite={padding_left:'padding_right',padding_right:'padding_left',padding_top:'padding_bottom',padding_bottom:'padding_top'};l[opposite[handle.key]]=value;}
 return {...frame,auto_layout:l};
}
export function drawSpacing(ctx,frame,shapes,zoom,active,gridPlan=null){
 const handles=spacingHandles(frame,shapes,gridPlan);ctx.save();ctx.lineWidth=1/zoom;ctx.font=`${11/zoom}px Inter,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 for(const h of handles){const on=h.key===active;ctx.fillStyle=on?'#f2482238':'#f2482212';ctx.fillRect(h.area.x,h.area.y,h.area.width,h.area.height);ctx.strokeStyle='#f24822';ctx.fillStyle=on?'#f24822':'#fff';ctx.beginPath();ctx.roundRect(h.x-(h.axis==='x'?3:10)/zoom,h.y-(h.axis==='x'?10:3)/zoom,(h.axis==='x'?6:20)/zoom,(h.axis==='x'?20:6)/zoom,3/zoom);ctx.fill();ctx.stroke();
  if(on){const text=`${h.label}: ${Math.round(h.value*100)/100}`,width=ctx.measureText(text).width+12/zoom,cy=h.y-24/zoom;ctx.fillStyle='#f24822';ctx.fillRect(h.x-width/2,cy-10/zoom,width,20/zoom);ctx.fillStyle='#fff';ctx.fillText(text,h.x,cy);}
 }
 ctx.restore();
}
