// Minimal PDF 1.4 writer for exported artwork. Each page holds one image
// rendered by the same canvas renderer as PNG export, compressed losslessly
// with FlateDecode, with a soft mask when the artwork has transparency.
// Page size is 1 pt per CSS pixel of the exported area, matching how design
// frames are usually printed or shared as PDF.
// A page may also carry `text` runs: an invisible layer over the image so the
// words can be selected, copied and searched. The artwork itself stays raster.

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
export async function pdfImagePage({width,height,pixelWidth,pixelHeight,rgba,text=[]}){
 const {rgb,alpha}=splitRgba(rgba,pixelWidth,pixelHeight);
 return {width,height,text,image:{width:pixelWidth,height:pixelHeight,rgb:await deflate(rgb),alpha:alpha&&await deflate(alpha)}};
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

// A TrueType font with two glyphs that paint nothing: .notdef and one glyph
// every character maps to. Viewers need a real embedded font to select text
// reliably; this is the smallest one that is still well formed.
export function glyphlessFont(){
 const u16=(...v)=>v.flatMap(n=>[(n>>8)&255,n&255]),u32=(...v)=>v.flatMap(n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
 const tables={
  // One on-curve point at the origin: a real outline with no area.
  glyf:[...u16(1,0,0,0,0,0,0),0x31,0],
  head:[...u32(0x00010000,0x00010000,0,0x5f0f3cf5),...u16(0,1000),...u32(0,0,0,0),...u16(0,0,0,0,0,8,2,0,0)],
  hhea:[...u32(0x00010000),...u16(800,0x10000-200,0,1000,0,0,0,1,0,0,0,0,0,0,0,2)],
  hmtx:u16(1000,0,1000,0),
  loca:u16(0,0,8),
  maxp:[...u32(0x00010000),...u16(2,1,1,0,0,2,0,0,0,0,0,0,0,0)],
 };
 const tags=Object.keys(tables).sort(),header=12+tags.length*16;let offset=header;
 const sum=bytes=>{let total=0;for(let i=0;i<bytes.length;i+=4)total=(total+(((bytes[i]??0)<<24)|((bytes[i+1]??0)<<16)|((bytes[i+2]??0)<<8)|(bytes[i+3]??0)))>>>0;return total;};
 const power=2**Math.floor(Math.log2(tags.length)),out=[...u32(0x00010000),...u16(tags.length,power*16,Math.log2(power),tags.length*16-power*16)],body=[];
 for(const tag of tags){const data=tables[tag];out.push(...[...tag].map(c=>c.charCodeAt(0)),...u32(sum(data),offset,data.length));const padded=[...data];while(padded.length%4)padded.push(0);body.push(...padded);offset+=padded.length;}
 const font=new Uint8Array([...out,...body]),head=header+tags.slice(0,tags.indexOf('head')).reduce((n,tag)=>n+Math.ceil(tables[tag].length/4)*4,0);
 font.set(u32((0xb1b0afba-sum(font))>>>0),head+8);
 return font;
}

const hex4=n=>n.toString(16).toUpperCase().padStart(4,'0');
function utf16Hex(code){if(code>0xffff){const v=code-0x10000;return hex4(0xd800+(v>>10))+hex4(0xdc00+(v&0x3ff));}return hex4(code);}
// Maps every character id back to its Unicode value so extraction is exact.
function toUnicodeCMap(codes){
 const lines=['/CIDInit /ProcSet findresource begin','12 dict begin','begincmap','/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def','/CMapName /Adobe-Identity-UCS def','/CMapType 2 def','1 begincodespacerange','<0000> <FFFF>','endcodespacerange'];
 for(let i=0;i<codes.length;i+=100){const part=codes.slice(i,i+100);lines.push(part.length+' beginbfchar',...part.map((code,j)=>`<${hex4(i+j+1)}> <${utf16Hex(code)}>`),'endbfchar');}
 lines.push('endcmap','CMapName currentdict /CMap defineresource pop','end','end');
 return lines.join('\n');
}
// Content-stream operators for one page's runs. `ids` assigns character ids.
function textOperators(runs,height,ids){
 const parts=['BT','3 Tr'];
 for(const run of runs){
  const chars=[...String(run.text)];
  if(!chars.length||!(run.width>0&&run.size>0)||![run.x,run.y,run.angle].every(Number.isFinite))throw new Error('Invalid PDF text run');
  // Every glyph is one em wide, so horizontal scaling stretches the run to the measured width.
  const scale=run.width/(chars.length*run.size)*100,a=run.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),n=v=>{const t=(+v.toFixed(5)).toString();return t==='-0'?'0':t;};
  parts.push(`/F0 ${number(run.size)} Tf ${n(scale)} Tz ${n(c)} ${n(s)} ${n(-s)} ${n(c)} ${number(run.x)} ${number(height-run.y)} Tm <${chars.map(char=>hex4(ids(char.codePointAt(0)))).join('')}> Tj`);
 }
 parts.push('ET');return parts.join('\n');
}

export function pdfDocument(pages,{title='',date=new Date()}={}){
 if(!pages.length)throw new Error('Nothing visible to export');
 if(pages.length>PDF_MAX_PAGES)throw new Error('PDF export supports up to 100 pages');
 const encoder=new TextEncoder(),chunks=[],offsets=[];let length=0;
 const push=part=>{const bytes=typeof part==='string'?encoder.encode(part):part;chunks.push(bytes);length+=bytes.length;};
 // Object numbers: 1 catalog, 2 page tree, 3 info, then per page: page, contents, image, [mask].
 // When any page has text: one shared glyphless font (6 objects) follows the pages.
 const codes=[],codeIds=new Map(),charId=code=>{if(!codeIds.has(code)){if(codes.length>=65535)throw new Error('PDF text uses too many distinct characters');codes.push(code);codeIds.set(code,codes.length);}return codeIds.get(code);};
 const hasText=pages.some(page=>page.text?.length);
 let next=4;const layout=pages.map(page=>{const ids={page:next++,contents:next++,image:next++,mask:page.image.alpha?next++:null};return ids;});
 const fontId=hasText?next:0;if(hasText)next+=6;
 const object=(id,body,stream)=>{offsets[id]=length;push(`${id} 0 obj\n${body}\n`);if(stream){push('stream\n');push(stream);push('\nendstream\n');}push('endobj\n');};
 push('%PDF-1.4\n');push(new Uint8Array([0x25,0xe2,0xe3,0xcf,0xd3,0x0a]));
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,`<< /Type /Pages /Kids [${layout.map(ids=>ids.page+' 0 R').join(' ')}] /Count ${pages.length} >>`);
 object(3,`<< /Title ${pdfText(title)} /Producer ${pdfText('PixlPrfct')} /CreationDate ${pdfDate(date)} >>`);
 pages.forEach((page,index)=>{
  const ids=layout[index],{width,height,image}=page;
  if(!(width>0&&height>0&&width<=PDF_MAX_PAGE_POINTS&&height<=PDF_MAX_PAGE_POINTS))throw new Error('Invalid PDF page size');
  if(!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1)throw new Error('Invalid PDF page image');
  const text=page.text?.length?'\n'+textOperators(page.text,height,charId):'';
  const content=encoder.encode(`q ${number(width)} 0 0 ${number(height)} 0 0 cm /Im0 Do Q${text}`);
  object(ids.page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(width)} ${number(height)}] /Resources << /XObject << /Im0 ${ids.image} 0 R >>${text?` /Font << /F0 ${fontId} 0 R >>`:''} >> /Contents ${ids.contents} 0 R >>`);
  object(ids.contents,`<< /Length ${content.length} >>`,content);
  object(ids.image,`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${ids.mask?` /SMask ${ids.mask} 0 R`:''} /Length ${image.rgb.length} >>`,image.rgb);
  if(ids.mask)object(ids.mask,`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.alpha.length} >>`,image.alpha);
 });
 if(hasText){
  const file=glyphlessFont(),cmap=encoder.encode(toUnicodeCMap(codes)),gids=new Uint8Array((codes.length+1)*2);for(let i=1;i<=codes.length;i++)gids[i*2+1]=1;
  object(fontId,`<< /Type /Font /Subtype /Type0 /BaseFont /PixlPrfctGlyphless /Encoding /Identity-H /DescendantFonts [${fontId+1} 0 R] /ToUnicode ${fontId+4} 0 R >>`);
  object(fontId+1,`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /PixlPrfctGlyphless /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontId+2} 0 R /DW 1000 /CIDToGIDMap ${fontId+5} 0 R >>`);
  object(fontId+2,`<< /Type /FontDescriptor /FontName /PixlPrfctGlyphless /Flags 4 /FontBBox [0 0 1000 1000] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 800 /StemV 80 /FontFile2 ${fontId+3} 0 R >>`);
  object(fontId+3,`<< /Length ${file.length} /Length1 ${file.length} >>`,file);
  object(fontId+4,`<< /Length ${cmap.length} >>`,cmap);
  object(fontId+5,`<< /Length ${gids.length} >>`,gids);
 }
 const xref=length;
 push(`xref\n0 ${next}\n0000000000 65535 f \n`);
 for(let id=1;id<next;id++)push(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 push(`trailer\n<< /Size ${next} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
 const output=new Uint8Array(length);let at=0;for(const chunk of chunks){output.set(chunk,at);at+=chunk.length;}
 return output;
}
