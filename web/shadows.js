export function visibleShadows(style){return(style?.shadows??[]).filter(s=>s.visible!==false&&s.opacity>0);}

// Gaussian tails are bounded at three standard deviations. Negative spread can
// shrink a mask but never expands its conservative export rectangle.
export function shadowBounds(box,shadows){
 if(!box)return null;let x=box.x,y=box.y,right=x+box.width,bottom=y+box.height;
 for(const s of visibleShadows({shadows}).filter(s=>s.kind!=='inner')){const pad=Math.max(0,s.spread??0)+1.5*s.blur;
  x=Math.min(x,box.x+s.x-pad);y=Math.min(y,box.y+s.y-pad);
  right=Math.max(right,box.x+box.width+s.x+pad);bottom=Math.max(bottom,box.y+box.height+s.y+pad);
 }
 return{x,y,width:right-x,height:bottom-y};
}

// Every shadow uses the original composed alpha, not the shadow before it.
// The first effect is nearest to the artwork; paint the list in reverse order.
export function shadowFilter(id,box,shadows){
 const active=visibleShadows({shadows});if(!active.length||!box)return '';
 const padding=Math.max(...active.map(s=>Math.max(Math.abs(s.x),Math.abs(s.y))+Math.abs(s.spread??0)+1.5*s.blur));
 const area={x:box.x-padding,y:box.y-padding,width:box.width+2*padding,height:box.height+2*padding},nodes=[],merge=[];let artwork='SourceGraphic';
 for(let i=active.length-1;i>=0;i--){const s=active[i],name=`shadow-${i}`;let input='SourceAlpha';
  const inner=s.kind==='inner';
  if(s.spread){nodes.push(`<feMorphology in="${input}" operator="${(s.spread>0)!==inner?'dilate':'erode'}" radius="${Math.abs(s.spread)}" result="${name}-spread"/>`);input=`${name}-spread`;}
  nodes.push(`<feGaussianBlur in="${input}" stdDeviation="${s.blur/2}" result="${name}-blur"/><feOffset in="${name}-blur" dx="${s.x}" dy="${s.y}" result="${name}-offset"/><feFlood flood-color="${s.color}" flood-opacity="${s.opacity}" result="${name}-color"/><feComposite in="${name}-color" in2="${name}-offset" operator="${inner?'out':'in'}" result="${name}"/>`);
  if(inner){nodes.push(`<feComposite in="${name}" in2="${artwork}" operator="atop" result="${name}-artwork"/>`);artwork=`${name}-artwork`;}else merge.push(`<feMergeNode in="${name}"/>`);
 }
 return `<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="${area.x}" y="${area.y}" width="${area.width}" height="${area.height}" color-interpolation-filters="sRGB">${nodes.join('')}<feMerge>${merge.join('')}<feMergeNode in="${artwork}"/></feMerge></filter>`;
}

const union=(a,b)=>!a?b:!b?a:{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(a.x+a.width,b.x+b.width)-Math.min(a.x,b.x),height:Math.max(a.y+a.height,b.y+b.height)-Math.min(a.y,b.y)};
const intersect=(a,b)=>{if(!a)return null;const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),r=Math.min(a.x+a.width,b.x+b.width),d=Math.min(a.y+a.height,b.y+b.height);return r>x&&d>y?{x,y,width:r-x,height:d-y}:null;};
export function compositeGeometry(shapes,styleOf){
 const children=new Map(),geometry=new Map();for(const s of shapes){const list=children.get(s.parent_id||0)??[];list.push(s);children.set(s.parent_id||0,list);}
 const visit=s=>{
  const a=styleOf(s);if(s.hidden||a.opacity===0){geometry.set(s.id,{content:null,output:null});return null;}
  const reach=s.points?.length?Math.max(a.stroke_join==='miter'?(a.stroke_miter_limit??10):1,a.stroke_cap==='square'?Math.SQRT2:1):1,pad=a.stroke_enabled?(s.stroke_width??2)/2*reach:0;
  let content={x:s.x-pad,y:s.y-pad,width:s.width+2*pad,height:s.height+2*pad};
  for(const child of children.get(s.id)??[]){let box=visit(child);if(s.kind==='frame'&&s.clip_content)box=intersect(box,s);content=union(content,box);}
  const output=shadowBounds(content,a.shadows);geometry.set(s.id,{content,output});return output;
 };
 let bounds=null;for(const s of children.get(0)??[])bounds=union(bounds,visit(s));return{children,geometry,bounds};
}

// Preview buffers have a fixed pixel budget; extreme zoom is sampled at a lower
// density. Raster export checks these same limits before rendering.
export function effectSurfaceSize(box,density){
 const scale=Math.min(density,8192/Math.max(1,box.width),8192/Math.max(1,box.height),Math.sqrt(16_777_216/Math.max(1,box.width*box.height)));
 return{scale,width:Math.max(1,Math.ceil(box.width*scale)),height:Math.max(1,Math.ceil(box.height*scale))};
}

export function spreadAlpha(data,width,height,radius,dilate){
 radius=Math.ceil(radius);if(!radius)return data;
 let alpha=Uint8Array.from({length:width*height},(_,i)=>data[i*4+3]);
 const pass=(input,length,lines,stride,lineStride)=>{
  const out=new Uint8Array(input.length),r=Math.min(radius,length),queue=new Int32Array(length+2*r+1);
  for(let line=0;line<lines;line++){let head=0,tail=0;const value=i=>i<0||i>=length?0:input[line*lineStride+i*stride];
   for(let i=-r;i<length+r;i++){const v=value(i);while(tail>head&&(dilate?value(queue[tail-1])<=v:value(queue[tail-1])>=v))tail--;queue[tail++]=i;while(tail>head&&queue[head]<i-2*r)head++;const x=i-r;if(x>=0&&x<length)out[line*lineStride+x*stride]=value(queue[head]);}
  }return out;
 };
 alpha=pass(alpha,width,height,1,width);alpha=pass(alpha,height,width,width,1);
 for(let i=0;i<alpha.length;i++)data[i*4+3]=alpha[i];return data;
}

export function drawShadow(target,source,box,shadow){
 const inner=shadow.kind==='inner',pad=(inner?Math.abs(shadow.spread??0):Math.max(0,shadow.spread??0))+1.5*shadow.blur,area={x:box.x-pad,y:box.y-pad,width:box.width+2*pad,height:box.height+2*pad};
 const density=Math.hypot(target.getTransform().a,target.getTransform().b),size=effectSurfaceSize(area,density),mask=new OffscreenCanvas(size.width,size.height),ctx=mask.getContext('2d');
 if(inner){ctx.fillStyle='#000000';ctx.fillRect(0,0,size.width,size.height);ctx.globalCompositeOperation='destination-out';}
 ctx.drawImage(source,(pad+(inner?shadow.x:0))*size.scale,(pad+(inner?shadow.y:0))*size.scale,box.width*size.scale,box.height*size.scale);
 if(shadow.spread){const pixels=ctx.getImageData(0,0,size.width,size.height);spreadAlpha(pixels.data,size.width,size.height,Math.abs(shadow.spread)*size.scale,shadow.spread>0);ctx.putImageData(pixels,0,0);}
 ctx.globalCompositeOperation='source-in';const rgb=[1,3,5].map(i=>parseInt(shadow.color.slice(i,i+2),16));ctx.fillStyle=`rgba(${rgb.join(',')},${shadow.opacity})`;ctx.fillRect(0,0,size.width,size.height);
 target.save();if(inner)target.globalCompositeOperation='source-atop';target.filter=shadow.blur?`blur(${shadow.blur*density/2}px)`:'none';target.drawImage(mask,area.x+(inner?0:shadow.x),area.y+(inner?0:shadow.y),size.width/size.scale,size.height/size.scale);target.restore();
}
