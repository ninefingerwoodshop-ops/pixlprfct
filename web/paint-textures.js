// Paint sources share the same SVG pattern in the canvas and CSS renderers.
const imageCache=new Map();
const encode=value=>`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(value)))}`;
export const emptyMedia=kind=>({kind,data_url:'',poster:'',width:1,height:1,mode:'fill',scale:1,offset_x:.5,offset_y:.5,rotation:0,filters:Array(7).fill(0)});
export const emptyPattern=()=>({source_id:0,tile_type:'grid',scale:1,spacing_x:0,spacing_y:0,offset_x:0,offset_y:0});
export const emptyShader=color=>({preset:'mesh',color:color==='#7c3aed'?'#0d99ff':'#7c3aed',scale:3,time:0,seed:1,code:'',snapshot:''});
export function mediaLayout(m,w,h){
 const scale=(m.mode==='tile'?1:m.mode==='fit'?Math.min(w/m.width,h/m.height):Math.max(w/m.width,h/m.height))*m.scale;
 const width=m.width*scale,height=m.height*scale;
 return {x:(w-width)*m.offset_x,y:(h-height)*m.offset_y,width,height};
}
export function patternLayout(p,w,h){
 const sw=(p._width??32)*p.scale,sh=(p._height??32)*p.scale;
 return {sw,sh,width:p.tile_type==='vertical'?Math.max(w,sw):sw+p.spacing_x,height:p.tile_type==='horizontal'?Math.max(h,sh):(sh+p.spacing_y)*(p.tile_type==='hexagonal'?2:1)};
}
export function paintFilter(filters=[]){
 const [exposure=0,contrast=0,saturation=0,temperature=0,tint=0,highlights=0,shadows=0]=filters;
 const brightness=Math.pow(2,exposure),c=1+contrast,offset=(1-c)/2+shadows*.2,hi=1+highlights*.3;
 const r=brightness*c*hi*(1+temperature*.3),g=brightness*c*hi*(1-tint*.2),b=brightness*c*hi*(1-temperature*.3);
 return {saturation:1+saturation,matrix:[r,0,0,0,offset,0,g,0,0,offset,0,0,b,0,offset,0,0,0,1,0]};
}
export function textureSvg(s,channel='fill'){
 const p=s.appearance?.[channel+'_texture'];if(!p)return '';const id=`${channel}-texture-${s.id}`,w=s.width,h=s.height;
 let width=w,height=h,x=s.x,y=s.y,content='';
 if('source_id' in p){const tile=patternLayout(p,w,h);width=tile.width;height=tile.height;x+=p.offset_x*width;y+=p.offset_y*height;const source=p._svg??'';content=`<svg width="${tile.sw}" height="${tile.sh}" viewBox="0 0 ${p._width??32} ${p._height??32}">${source}</svg>`;if(p.tile_type==='hexagonal'){const tileContent=content;for(const dx of [-width/2,width/2])content+=`<g transform="translate(${dx} ${height/2})">${tileContent}</g>`;}
 }else if('preset' in p){content=p.snapshot?`<image width="${w}" height="${h}" preserveAspectRatio="none" href="${p.snapshot}"/>`:'';
 }else{const src=p.kind==='video'?(p._frame??p.poster):p.data_url;if(src){const layout=mediaLayout(p,w,h),filter=paintFilter(p.filters);if(p.mode==='tile'){width=layout.width;height=layout.height;x+=p.offset_x*width;y+=p.offset_y*height;layout.x=layout.y=0;}
 content=`<defs><filter id="${id}-adjust" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="${filter.saturation}"/><feColorMatrix type="matrix" values="${filter.matrix.join(' ')}"/></filter></defs><g transform="rotate(${p.rotation} ${w/2} ${h/2})"><image x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" preserveAspectRatio="none" href="${src}" filter="url(#${id}-adjust)"/></g>`;}}
 if(!content)content='<rect width="100%" height="100%" fill="#f3f3f3"/><defs><pattern id="'+id+'-empty" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#e5e5e5"/><rect x="8" y="8" width="8" height="8" fill="#e5e5e5"/></pattern></defs><rect width="100%" height="100%" fill="url(#'+id+'-empty)"/>';
 return `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${x}" y="${y}" width="${Math.max(.01,width)}" height="${Math.max(.01,height)}">${content}</pattern>`;
}
export function canvasTexture(ctx,s,channel){
 return canvasSvgPaint(ctx,s,textureSvg(s,channel),`${channel}-texture-${s.id}`);
}
export function canvasSvgPaint(ctx,s,markup,id){
 const url=encode(`<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="${s.x} ${s.y} ${s.width} ${s.height}"><defs>${markup}</defs><rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="url(#${id})"/></svg>`);
 let image=imageCache.get(url);if(!image){image=new Image();image.onload=()=>window.dispatchEvent(new Event('paint-texture-ready'));image.src=url;imageCache.set(url,image);while(imageCache.size>64)imageCache.delete(imageCache.keys().next().value);}
 if(!image.complete||!image.naturalWidth)return 'transparent';const pattern=ctx.createPattern(image,'no-repeat');pattern?.setTransform(new DOMMatrix([s.width/image.naturalWidth,0,0,s.height/image.naturalHeight,s.x,s.y]));return pattern??'transparent';
}
// Resolve source layers at render time, so editing a source updates every pattern.
// Cycles and deleted sources remain transparent rather than recursing forever.
export function resolvePatternPaints(shapes,render){
 const byId=new Map(shapes.map(s=>[s.id,s])),cache=new Map();
 const visit=(s,seen=new Set())=>{if(cache.has(s.id))return cache.get(s.id);if(seen.has(s.id))return null;const branch=new Set([...seen,s.id]);let changed=false;const appearance={...s.appearance};
 for(const key of ['fills','strokes'])if(appearance[key])appearance[key]=appearance[key].map(p=>{if(!p.pattern||p.pattern._svg!==undefined)return p;changed=true;const source=byId.get(p.pattern.source_id);if(!source||branch.has(source.id))return {...p,pattern:{...p.pattern,_svg:''}};
 const ids=new Set([source.id]);for(let i=0;i<shapes.length;i++)for(const child of shapes)if(ids.has(child.parent_id))ids.add(child.id);
 const sourceShapes=shapes.filter(n=>ids.has(n.id)).map(n=>visit(n,branch)).filter(Boolean).map(n=>({...n,parent_id:ids.has(n.parent_id)?n.parent_id:0}));
 const svg=render(sourceShapes,{x:source.x,y:source.y,width:source.width,height:source.height});
 return {...p,pattern:{...p.pattern,_width:source.width,_height:source.height,_svg:`<svg viewBox="${source.x} ${source.y} ${source.width} ${source.height}" width="${source.width}" height="${source.height}">${svg}</svg>`}};});
 const result=changed?{...s,appearance}:s;cache.set(s.id,result);return result;};
 return shapes.map(s=>visit(s)).filter(Boolean);
}
export async function readPaintMedia(file,kind){
 if(kind==='image'){
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choose a PNG, JPEG, WebP, or GIF image.');
  if(file.size>10_000_000)throw Error('Choose an image smaller than 10 MB.');
  const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const data_url=canvas.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png',.9);if(data_url.length>2_000_000)throw Error('This image is too large to embed. Choose a smaller image.');return {...emptyMedia(kind),data_url,poster:'',width:canvas.width,height:canvas.height};}finally{bitmap.close();}
 }
 if(!['video/mp4','video/webm','video/quicktime'].includes(file.type))throw Error('Choose an MP4, WebM, or MOV video.');if(file.size>2_000_000)throw Error('Choose a video smaller than 2 MB.');
 const data_url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read video.'));r.readAsDataURL(file);});
 const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=data_url;
 try{await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('This browser cannot decode this video. Try H.264 MP4 or VP8 WebM.'));});if(!video.videoWidth||!video.videoHeight)throw Error('Video dimensions are unavailable.');const canvas=document.createElement('canvas'),ratio=Math.min(1,1024/video.videoWidth);canvas.width=Math.round(video.videoWidth*ratio);canvas.height=Math.round(video.videoHeight*ratio);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);return {...emptyMedia(kind),data_url,poster:canvas.toDataURL('image/jpeg',.8),width:video.videoWidth,height:video.videoHeight};}finally{video.removeAttribute('src');video.load();}
}
