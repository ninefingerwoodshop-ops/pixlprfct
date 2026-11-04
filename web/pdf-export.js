// Minimal PDF 1.4 writer for exported artwork. Each page holds one image
// rendered by the same canvas renderer as PNG export, compressed losslessly
// with FlateDecode, with a soft mask when the artwork has transparency.
// Page size is 1 pt per CSS pixel of the exported area, matching how design
// frames are usually printed or shared as PDF.

export const PDF_MAX_PAGE_POINTS=14400;
export const PDF_MAX_PAGES=100;

export function pdfPageSize(box){
 const width=+box.width.toFixed(3),height=+box.height.toFixed(3);
 if(!(width>0&&height>0))throw new Error('Nothing visible to export');
 if(width>PDF_MAX_PAGE_POINTS||height>PDF_MAX_PAGE_POINTS)throw new Error('PDF pages are limited to 14,400 px per edge. Export a smaller frame or selection.');
 return {width,height};
}

// Split canvas RGBA into RGB samples and, if any pixel is not opaque, an alpha mask.
export function splitRgba(rgba,width,height){
 if(rgba.length!==width*height*4)throw new Error('Image data does not match its size');
 const rgb=new Uint8Array(width*height*3),alpha=new Uint8Array(width*height);let opaque=true;
 for(let i=0,j=0,k=0;i<rgba.length;i+=4,j+=3,k++){
  const a=rgba[i+3];alpha[k]=a;if(a!==255)opaque=false;
  // Canvas data is unpremultiplied; transparent pixels keep their color channels.
  rgb[j]=rgba[i];rgb[j+1]=rgba[i+1];rgb[j+2]=rgba[i+2];
 }
 return {rgb,alpha:opaque?null:alpha};
}

// zlib-format deflate, which is what FlateDecode expects.
export async function deflate(bytes){
 const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Turns {width,height,pixelWidth,pixelHeight,rgba} pages into image pages ready for pdfDocument.
export async function pdfImagePage({width,height,pixelWidth,pixelHeight,rgba}){
 const {rgb,alpha}=splitRgba(rgba,pixelWidth,pixelHeight);
 return {width,height,image:{width:pixelWidth,height:pixelHeight,rgb:await deflate(rgb),alpha:alpha&&await deflate(alpha)}};
}

function pdfText(value){
 // UTF-16BE with BOM, as a hex string, so any title is represented exactly.
 let hex='FEFF';for(const char of String(value)){const code=char.codePointAt(0);
  if(code>0xffff){const v=code-0x10000;hex+=(0xd800+(v>>10)).toString(16).padStart(4,'0')+(0xdc00+(v&0x3ff)).toString(16).padStart(4,'0');}
  else hex+=code.toString(16).padStart(4,'0');}
 return '<'+hex.toUpperCase()+'>';
}
const number=value=>{const text=(+value.toFixed(3)).toString();return text==='-0'?'0':text;};
function pdfDate(date){const p=n=>String(n).padStart(2,'0');return `(D:${date.getUTCFullYear()}${p(date.getUTCMonth()+1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z)`;}

export function pdfDocument(pages,{title='',date=new Date()}={}){
 if(!pages.length)throw new Error('Nothing visible to export');
 if(pages.length>PDF_MAX_PAGES)throw new Error('PDF export supports up to 100 pages');
 const encoder=new TextEncoder(),chunks=[],offsets=[];let length=0;
 const push=part=>{const bytes=typeof part==='string'?encoder.encode(part):part;chunks.push(bytes);length+=bytes.length;};
 // Object numbers: 1 catalog, 2 page tree, 3 info, then per page: page, contents, image, [mask].
 let next=4;const layout=pages.map(page=>{const ids={page:next++,contents:next++,image:next++,mask:page.image.alpha?next++:null};return ids;});
 const object=(id,body,stream)=>{offsets[id]=length;push(`${id} 0 obj\n${body}\n`);if(stream){push('stream\n');push(stream);push('\nendstream\n');}push('endobj\n');};
 push('%PDF-1.4\n');push(new Uint8Array([0x25,0xe2,0xe3,0xcf,0xd3,0x0a]));
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,`<< /Type /Pages /Kids [${layout.map(ids=>ids.page+' 0 R').join(' ')}] /Count ${pages.length} >>`);
 object(3,`<< /Title ${pdfText(title)} /Producer ${pdfText('PixlPrfct')} /CreationDate ${pdfDate(date)} >>`);
 pages.forEach((page,index)=>{
  const ids=layout[index],{width,height,image}=page;
  if(!(width>0&&height>0&&width<=PDF_MAX_PAGE_POINTS&&height<=PDF_MAX_PAGE_POINTS))throw new Error('Invalid PDF page size');
  if(!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1)throw new Error('Invalid PDF page image');
  const content=encoder.encode(`q ${number(width)} 0 0 ${number(height)} 0 0 cm /Im0 Do Q`);
  object(ids.page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(width)} ${number(height)}] /Resources << /XObject << /Im0 ${ids.image} 0 R >> >> /Contents ${ids.contents} 0 R >>`);
  object(ids.contents,`<< /Length ${content.length} >>`,content);
  object(ids.image,`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${ids.mask?` /SMask ${ids.mask} 0 R`:''} /Length ${image.rgb.length} >>`,image.rgb);
  if(ids.mask)object(ids.mask,`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.alpha.length} >>`,image.alpha);
 });
 const xref=length;
 push(`xref\n0 ${next}\n0000000000 65535 f \n`);
 for(let id=1;id<next;id++)push(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 push(`trailer\n<< /Size ${next} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
 const output=new Uint8Array(length);let at=0;for(const chunk of chunks){output.set(chunk,at);at+=chunk.length;}
 return output;
}
