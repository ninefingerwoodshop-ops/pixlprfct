import {displayedText,letterSpacing,textStyle} from './typography.js';
// Editor-only regions and review marks are persisted with their layer, never
// baked into exported artwork. Sections keep their children on export.
export const editorRole=s=>s?.editor_meta?.role||'';
export const isEditorMark=s=>['slice','comment','annotation','measurement','spec'].includes(editorRole(s));
export function artworkShapes(shapes){
 const byId=new Map(shapes.map(s=>[s.id,s]));
 return shapes.filter(s=>!editorRole(s)).map(s=>{let parent=s.parent_id,seen=new Set();while(editorRole(byId.get(parent))&&!seen.has(parent)){seen.add(parent);parent=byId.get(parent).parent_id;}return parent===s.parent_id?s:{...s,parent_id:parent};});
}
export function editorShape(role,start,end){
 const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),width=Math.max(1,Math.abs(end.x-start.x)),height=Math.max(1,Math.abs(end.y-start.y));
 return {id:0,kind:role==='section'?'frame':'rectangle',name:role[0].toUpperCase()+role.slice(1),x,y,width:role==='comment'?28:width,height:role==='comment'?28:height,fill:'#d9d9d9',text:'',hidden:false,clip_content:false,appearance:{opacity:1,corner_radius:0,fill_enabled:false,stroke_enabled:false,stroke_color:'#000000'},editor_meta:{role,body:'',resolved:false,replies:[]}};
}
export function drawEditorMarks(ctx,shapes,zoom){
 if(!shapes.some(s=>editorRole(s)&&!s.hidden))return;
 ctx.save();ctx.lineWidth=1/zoom;ctx.font=`${11/zoom}px Inter, sans-serif`;ctx.textBaseline='top';
 for(const s of shapes){const role=editorRole(s);if(!role||s.hidden)continue;ctx.save();ctx.strokeStyle=role==='section'?'#8d8d8d':role==='comment'?'#0d99ff':'#9562e9';ctx.fillStyle=ctx.strokeStyle;
  if(role==='comment'){ctx.globalAlpha=s.editor_meta.resolved?.45:1;ctx.beginPath();ctx.arc(s.x+12/zoom,s.y+12/zoom,12/zoom,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(s.editor_meta.resolved?'✓':'…',s.x+12/zoom,s.y+5/zoom);}
  else if(role==='measurement'){ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.width,s.y);ctx.moveTo(s.x,s.y-4/zoom);ctx.lineTo(s.x,s.y+4/zoom);ctx.moveTo(s.x+s.width,s.y-4/zoom);ctx.lineTo(s.x+s.width,s.y+4/zoom);ctx.moveTo(s.x+s.width,s.y);ctx.lineTo(s.x+s.width,s.y+s.height);ctx.stroke();ctx.fillText(`${Math.round(s.width)} × ${Math.round(s.height)} px`,s.x+4/zoom,s.y+6/zoom);}
  else{ctx.setLineDash(role==='slice'?[4/zoom,3/zoom]:[]);ctx.strokeRect(s.x,s.y,s.width,s.height);ctx.fillText(role==='section'?s.name:(s.editor_meta.body||s.name).slice(0,64),s.x+4/zoom,s.y-16/zoom);}
  ctx.restore();
 }
 ctx.restore();
}
// Sample a vector into a self-contained normalized path; copying the text
// therefore never leaves a dangling reference to a deleted source layer.
export function textOnPath(source){
 const points=[];if(source.kind==='ellipse'){for(let i=0;i<=128;i++){const a=-Math.PI/2+i*Math.PI*2/128;points.push([.5+.5*Math.cos(a),.5+.5*Math.sin(a)]);}}
 else if(source.points?.length){const nodes=source.points,handles=source.handles??[];for(let i=0;i<nodes.length-(source.closed?0:1);i++){const a=nodes[i],b=nodes[(i+1)%nodes.length],c=handles[i]?.[1]??a,d=handles[(i+1)%nodes.length]?.[0]??b;for(let j=0;j<=24;j++){const t=j/24,u=1-t;points.push([u*u*u*a[0]+3*u*u*t*c[0]+3*u*t*t*d[0]+t*t*t*b[0],u*u*u*a[1]+3*u*u*t*c[1]+3*u*t*t*d[1]+t*t*t*b[1]]);}}}
 else points.push([0,0],[1,0],[1,1],[0,1],[0,0]);
 return {id:0,kind:'text',name:'Text on path',x:source.x,y:source.y,width:source.width,height:source.height,rotation:source.rotation??0,fill:'#111111',text:'Text on path',hidden:false,typography:{font_family:'Inter',font_size:24,font_weight:400,line_height:1.2,align:'left',wrap:false,sizing:'fixed'},editor_meta:{role:'',text_path:{points,offset:0,reverse:false}}};
}
export function pathGlyphs(shape,measure){
 const path=shape.editor_meta?.text_path;if(!path)return [];let points=path.points.map(([x,y])=>[shape.x+x*shape.width,shape.y+y*shape.height]);if(path.reverse)points=points.reverse();const segments=[],total=points.slice(1).reduce((n,p,i)=>{const a=points[i],length=Math.hypot(p[0]-a[0],p[1]-a[1]);segments.push({a,b:p,length,start:n});return n+length;},0);let cursor=total*path.offset;
 const chars=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(displayedText(shape.text,textStyle(shape)).replace(/\n/g,' '))].map(s=>s.segment),widths=chars.map(text=>Math.max(0,measure(text)+letterSpacing(textStyle(shape)))),align=shape.typography?.align;if(align==='center')cursor+=(total-cursor-widths.reduce((a,b)=>a+b,0))/2;if(align==='right')cursor=total-widths.reduce((a,b)=>a+b,0);
 return chars.flatMap((text,i)=>{const width=widths[i],at=cursor+width/2;cursor+=width;const segment=segments.find(s=>s.length>0&&at>=s.start&&at<=s.start+s.length);if(!segment)return [];const t=(at-segment.start)/segment.length;return [{text,x:segment.a[0]+(segment.b[0]-segment.a[0])*t,y:segment.a[1]+(segment.b[1]-segment.a[1])*t,angle:Math.atan2(segment.b[1]-segment.a[1],segment.b[0]-segment.a[0])}];});
}
