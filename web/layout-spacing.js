const label={padding_left:'Left padding',padding_right:'Right padding',padding_top:'Top padding',padding_bottom:'Bottom padding',gap:'Gap',cross_gap:'Row / column gap'};
export function spacingHandles(frame,shapes){
 const l=frame?.auto_layout;if(!l)return [];
 const border=l.strokes_included&&frame.appearance?.stroke_enabled&&frame.appearance?.stroke_alignment==='inside'?frame.stroke_width:0;
 const x=frame.x+border,y=frame.y+border,w=Math.max(0,frame.width-2*border),h=Math.max(0,frame.height-2*border),handles=[];
 const add=(key,axis,sign,cx,cy,area)=>handles.push({key,axis,sign,x:cx,y:cy,area,label:label[key],value:l[key]??l.gap});
 add('padding_left','x',1,x+l.padding_left,y+h/2,{x,y,width:l.padding_left,height:h});
 add('padding_right','x',-1,x+w-l.padding_right,y+h/2,{x:x+w-l.padding_right,y,width:l.padding_right,height:h});
 add('padding_top','y',1,x+w/2,y+l.padding_top,{x,y,width:w,height:l.padding_top});
 add('padding_bottom','y',-1,x+w/2,y+h-l.padding_bottom,{x,y:y+h-l.padding_bottom,width:w,height:l.padding_bottom});
 const horizontal=l.direction==='horizontal',main=horizontal?'x':'y',cross=horizontal?'y':'x',size=horizontal?'width':'height',crossSize=horizontal?'height':'width';
 const items=shapes.filter(s=>s.parent_id===frame.id&&!s.hidden&&!s.layout_item?.absolute),rows=[];
 for(const s of items){let row=rows.at(-1);if(!row||l.wrap&&Math.min(row.end,s[cross]+s[crossSize])-Math.max(row.start,s[cross])<=1e-7){row={items:[],start:s[cross],end:s[cross]+s[crossSize]};rows.push(row);}row.items.push(s);row.start=Math.min(row.start,s[cross]);row.end=Math.max(row.end,s[cross]+s[crossSize]);}
 for(const row of rows)if(!['between','around','evenly'].includes(l.justify))for(let i=1;i<row.items.length;i++){
  const a=row.items[i-1],b=row.items[i],start=a[main]+a[size],end=b[main],lo=Math.max(a[cross],b[cross]),hi=Math.min(a[cross]+a[crossSize],b[cross]+b[crossSize]);
  if(end<start-1e-7||hi<=lo)continue;
  const area=horizontal?{x:start,y:lo,width:end-start,height:hi-lo}:{x:lo,y:start,width:hi-lo,height:end-start};
  add('gap',main,1,area.x+area.width/2,area.y+area.height/2,area);
 }
 if(l.wrap&&!['between','around','evenly'].includes(l.align_content))for(let i=1;i<rows.length;i++){
  const start=rows[i-1].end,end=rows[i].start;if(end<start-1e-7)continue;
  const area=horizontal?{x:x+l.padding_left,y:start,width:Math.max(0,w-l.padding_left-l.padding_right),height:end-start}:{x:start,y:y+l.padding_top,width:end-start,height:Math.max(0,h-l.padding_top-l.padding_bottom)};
  add('cross_gap',cross,1,area.x+area.width/2,area.y+area.height/2,area);
 }
 return handles;
}
export function spacingHit(frame,shapes,p,zoom){return spacingHandles(frame,shapes).map(h=>({...h,distance:Math.hypot(p.x-h.x,p.y-h.y)})).filter(h=>h.distance<=9/zoom).sort((a,b)=>a.distance-b.distance)[0]??null;}
export function changeSpacing(frame,handle,delta,{shiftKey=false,altKey=false}={}){
 const step=shiftKey?10:1,value=Math.max(0,Math.min(100000,Math.round(((frame.auto_layout[handle.key]??frame.auto_layout.gap)+delta*handle.sign)/step)*step));
 const l={...frame.auto_layout,[handle.key]:value};
 if(altKey&&handle.key.startsWith('padding_')){const opposite={padding_left:'padding_right',padding_right:'padding_left',padding_top:'padding_bottom',padding_bottom:'padding_top'};l[opposite[handle.key]]=value;}
 return {...frame,auto_layout:l};
}
export function drawSpacing(ctx,frame,shapes,zoom,active){
 const handles=spacingHandles(frame,shapes);ctx.save();ctx.lineWidth=1/zoom;ctx.font=`${11/zoom}px Inter,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 for(const h of handles){const on=h.key===active;ctx.fillStyle=on?'#f2482238':'#f2482212';ctx.fillRect(h.area.x,h.area.y,h.area.width,h.area.height);ctx.strokeStyle='#f24822';ctx.fillStyle=on?'#f24822':'#fff';ctx.beginPath();ctx.roundRect(h.x-(h.axis==='x'?3:10)/zoom,h.y-(h.axis==='x'?10:3)/zoom,(h.axis==='x'?6:20)/zoom,(h.axis==='x'?20:6)/zoom,3/zoom);ctx.fill();ctx.stroke();
  if(on){const text=`${h.label}: ${Math.round(h.value*100)/100}`,width=ctx.measureText(text).width+12/zoom,cy=h.y-24/zoom;ctx.fillStyle='#f24822';ctx.fillRect(h.x-width/2,cy-10/zoom,width,20/zoom);ctx.fillStyle='#fff';ctx.fillText(text,h.x,cy);}
 }
 ctx.restore();
}
