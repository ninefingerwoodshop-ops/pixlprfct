import {radii} from './appearance.js';
import {clippingFrames} from './scene.js';
import {visibleInTree} from './selection.js';
export const defaultGuide=()=>({kind:'columns',size:64,count:4,gutter:16,margin:16,alignment:'stretch',color:'#ff3366',opacity:.12,visible:true});
// Geometry is independent of canvas so resized guides and export exclusion can
// be checked without a browser. Dense square grids are omitted at low zoom.
export function guideGeometry(frame,g,zoom=1){
 if(!g.visible||g.opacity===0)return [];
 if(g.kind==='grid'){
  if(g.size*zoom<4)return [];
  const nx=Math.floor(frame.width/g.size),ny=Math.floor(frame.height/g.size);if(nx+ny>4096)return [];
  return [...Array.from({length:nx+1},(_,i)=>({x:frame.x+i*g.size,y:frame.y,width:0,height:frame.height})),...Array.from({length:ny+1},(_,i)=>({x:frame.x,y:frame.y+i*g.size,width:frame.width,height:0}))];
 }
 const columns=g.kind==='columns',length=columns?frame.width:frame.height;
 const size=g.alignment==='stretch'?(length-2*g.margin-(g.count-1)*g.gutter)/g.count:g.size;
 if(size<=0)return [];
 const occupied=size*g.count+(g.count-1)*g.gutter;
 const start=g.alignment==='center'?(length-occupied)/2:g.alignment==='end'?length-g.margin-occupied:g.margin;
 return Array.from({length:g.count},(_,i)=>columns?{x:frame.x+start+i*(size+g.gutter),y:frame.y,width:size,height:frame.height}:{x:frame.x,y:frame.y+start+i*(size+g.gutter),width:frame.width,height:size});
}
export function drawLayoutGuides(ctx,shapes,zoom){
 for(const frame of shapes){if(frame.kind!=='frame'||!frame.layout_grids?.length||!visibleInTree(frame,shapes))continue;
  ctx.save();for(const clip of [frame,...clippingFrames(frame,shapes)]){ctx.beginPath();ctx.roundRect(clip.x,clip.y,clip.width,clip.height,radii(clip));ctx.clip();}
  for(const g of frame.layout_grids){ctx.fillStyle=g.color;ctx.strokeStyle=g.color;ctx.globalAlpha=g.opacity;ctx.lineWidth=1/zoom;ctx.setLineDash([]);ctx.beginPath();
   for(const r of guideGeometry(frame,g,zoom)){if(g.kind==='grid'){ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+r.width,r.y+r.height);}else ctx.fillRect(r.x,r.y,r.width,r.height);}if(g.kind==='grid')ctx.stroke();
  }ctx.restore();
 }
}
export function renderGuideControls(host,shape,change,shown,toggle){
 host.replaceChildren();host.hidden=shape?.kind!=='frame';if(host.hidden)return;
 const title=document.createElement('h3');title.textContent='Layout guides';host.append(title);
 const show=document.createElement('button');show.className='wide-button';show.textContent=shown?'Hide all guides · Shift G':'Show all guides · Shift G';show.onclick=toggle;host.append(show);
 const grids=shape.layout_grids??[];
 const save=(i,patch)=>change({...shape,layout_grids:grids.map((g,n)=>n===i?{...g,...patch}:g)});
 grids.forEach((g,i)=>{
  const box=document.createElement('div');box.className='guide-settings';host.append(box);
  const label=(name,input)=>{const l=document.createElement('label');l.append(document.createTextNode(name),input);input.setAttribute('aria-label',`Guide ${i+1} ${name}`);box.append(l);};
  const select=(name,key,values)=>{const el=document.createElement('select');for(const [value,text] of values){const opt=document.createElement('option');opt.value=value;opt.textContent=text;el.append(opt);}el.value=g[key];el.onchange=()=>save(i,{[key]:el.value});label(name,el);};
  const number=(name,key,min,max)=>{const el=document.createElement('input');el.type='number';el.min=min;el.max=max;el.value=key==='opacity'?g[key]*100:g[key];el.onchange=()=>save(i,{[key]:Number(el.value)/(key==='opacity'?100:1)});label(name,el);};
  select('Type','kind',[['grid','Square grid'],['columns','Columns'],['rows','Rows']]);
  if(g.kind!=='grid'){select('Alignment','alignment',[['stretch','Stretch'],['start','Start'],['center','Center'],['end','End']]);number('Count','count',1,256);number('Gutter','gutter',0,1000000);number('Margin','margin',0,1000000);}
  if(g.kind==='grid'||g.alignment!=='stretch')number('Size','size',1,1000000);
  const color=document.createElement('input');color.type='color';color.value=g.color;color.onchange=()=>save(i,{color:color.value});label('Color',color);number('Opacity (%)','opacity',0,100);
  const visible=document.createElement('input');visible.type='checkbox';visible.checked=g.visible;visible.onchange=()=>save(i,{visible:visible.checked});label('Visible',visible);
  const remove=document.createElement('button');remove.className='wide-button danger';remove.textContent=`Remove guide ${i+1}`;remove.onclick=()=>change({...shape,layout_grids:grids.filter((_,n)=>n!==i)});box.append(remove);
 });
 const add=document.createElement('button');add.className='wide-button';add.textContent='Add layout guide';add.disabled=grids.length>=8;add.onclick=()=>change({...shape,layout_grids:[...grids,defaultGuide()]});host.append(add);
}
