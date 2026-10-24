export function imageLayout(shape) {
  const i=shape.image,ratio=shape.width/shape.height,sourceRatio=i.width/i.height;
  if(i.mode==='fit') {
    const scale=Math.min(shape.width/i.width,shape.height/i.height),dw=i.width*scale,dh=i.height*scale;
    return {sx:0,sy:0,sw:i.width,sh:i.height,dx:shape.x+(shape.width-dw)/2,dy:shape.y+(shape.height-dh)/2,dw,dh};
  }
  let sw=i.width,sh=i.height;
  if(sourceRatio>ratio)sw=sh*ratio;else sh=sw/ratio;
  sw/=i.zoom;sh/=i.zoom;
  return {sx:(i.width-sw)*i.offset_x,sy:(i.height-sh)*i.offset_y,sw,sh,dx:shape.x,dy:shape.y,dw:shape.width,dh:shape.height};
}
export function imageSvg(shape) {
  const p=imageLayout(shape),i=shape.image;
  // A nested SVG viewport applies the same source crop as canvas drawImage.
  return `<svg x="${p.dx}" y="${p.dy}" width="${p.dw}" height="${p.dh}" viewBox="${p.sx} ${p.sy} ${p.sw} ${p.sh}" preserveAspectRatio="none" overflow="hidden"><image width="${i.width}" height="${i.height}" href="${i.data_url}"/></svg>`;
}
export async function readImage(file) {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG, or WebP image.');
  if(file.size>10_000_000)throw new Error('Choose an image smaller than 10 MB.');
  const bitmap=await createImageBitmap(file);
  try {
    if(bitmap.width>16384||bitmap.height>16384)throw new Error('Image dimensions must be at most 16384 pixels.');
    const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const data_url=canvas.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png',.9);
    if(data_url.length>2_000_000)throw new Error('Image is too large to embed. Use a smaller image or a JPEG.');
    return {data_url,width:canvas.width,height:canvas.height,mode:'fill',zoom:1,offset_x:.5,offset_y:.5};
  } finally {bitmap.close();}
}
