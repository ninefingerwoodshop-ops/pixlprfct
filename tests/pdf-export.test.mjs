import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {pdfDocument,pdfImagePage,pdfPageSize,splitRgba,glyphlessFont,PDF_MAX_PAGE_POINTS} from '../web/pdf-export.js';
import {exportSize} from '../web/export.js';

const latin=bytes=>Buffer.from(bytes).toString('latin1');
// Parse the cross-reference table and confirm every offset lands on its object.
function objects(pdf){
 const text=latin(pdf),start=Number(text.match(/startxref\n(\d+)\n%%EOF\n$/)[1]);
 assert.equal(text.slice(start,start+4),'xref');
 const [,first,count]=text.slice(start).match(/^xref\n(\d+) (\d+)\n/),entries=text.slice(start).split('\n').slice(2,2+Number(count));
 assert.equal(Number(first),0);assert.equal(entries[0],'0000000000 65535 f ');
 const found=new Map();
 entries.slice(1).forEach((entry,index)=>{const id=index+1,offset=Number(entry.slice(0,10));assert.match(entry,/^\d{10} 00000 n $/);assert.equal(text.slice(offset,offset+`${id} 0 obj`.length),`${id} 0 obj`);
  const end=text.indexOf('endobj',offset);found.set(id,{body:text.slice(offset,end),offset});});
 assert.match(text,new RegExp(`/Size ${count} /Root 1 0 R`));
 return {text,found};
}
function stream(pdf,object){
 const start=object.offset+object.body.indexOf('stream\n')+7,length=Number(object.body.match(/\/Length (\d+)/)[1]);
 return Buffer.from(pdf.subarray(start,start+length));
}

test('splitRgba separates color from alpha and omits the mask for opaque artwork',()=>{
 const opaque=splitRgba(new Uint8Array([1,2,3,255,4,5,6,255]),2,1);
 assert.deepEqual([...opaque.rgb],[1,2,3,4,5,6]);assert.equal(opaque.alpha,null);
 const clear=splitRgba(new Uint8Array([1,2,3,255,4,5,6,0]),2,1);
 assert.deepEqual([...clear.alpha],[255,0]);
 assert.throws(()=>splitRgba(new Uint8Array(4),2,1),/does not match/);
});

test('a single page PDF has a valid cross-reference table, page size and lossless image',async()=>{
 const rgba=new Uint8Array(3*2*4).map((_,i)=>i%4===3?255:i*7%256);
 const page=await pdfImagePage({width:30,height:20,pixelWidth:3,pixelHeight:2,rgba});
 const pdf=pdfDocument([page],{title:'Card – ✓ 🎨',date:new Date(Date.UTC(2026,10,4,12,30,5))});
 assert.equal(latin(pdf.subarray(0,9)),'%PDF-1.4\n');
 const {text,found}=objects(pdf);
 assert.match(text,/\/Type \/Pages \/Kids \[4 0 R\] \/Count 1/);
 assert.match(found.get(4).body,/\/MediaBox \[0 0 30 20\]/);
 assert.equal(stream(pdf,found.get(5)).toString(),'q 30 0 0 20 0 0 cm /Im0 Do Q');
 assert.match(found.get(6).body,/\/Width 3 \/Height 2 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/FlateDecode \/Length/);
 assert.doesNotMatch(found.get(6).body,/SMask/);
 assert.deepEqual([...inflateSync(stream(pdf,found.get(6)))],[...splitRgba(rgba,3,2).rgb]);
 assert.match(found.get(3).body,/\/CreationDate \(D:20261104123005Z\)/);
 // UTF-16BE title, including a surrogate pair.
 assert.match(found.get(3).body,/\/Title <FEFF004300610072006400202013002027130020D83CDFA8>/);
});

test('transparent pages carry a soft mask and multiple pages share one document',async()=>{
 const make=alpha=>pdfImagePage({width:10,height:10,pixelWidth:1,pixelHeight:1,rgba:new Uint8Array([10,20,30,alpha])});
 const pdf=pdfDocument([await make(128),await make(255),await make(0)]);
 const {text,found}=objects(pdf);
 assert.match(text,/\/Kids \[4 0 R 8 0 R 11 0 R\] \/Count 3/);
 assert.match(found.get(6).body,/\/SMask 7 0 R/);
 assert.deepEqual([...inflateSync(stream(pdf,found.get(7)))],[128]);
 assert.doesNotMatch(found.get(10).body,/SMask/);
 assert.match(found.get(13).body,/\/SMask 14 0 R/);
 assert.match(found.get(14).body,/\/ColorSpace \/DeviceGray/);
 assert.deepEqual([...inflateSync(stream(pdf,found.get(14)))],[0]);
});

test('PDF limits: page size, page count and export scale',()=>{
 assert.deepEqual(pdfPageSize({width:1440.12345,height:900}),{width:1440.123,height:900});
 assert.throws(()=>pdfPageSize({width:PDF_MAX_PAGE_POINTS+1,height:10}),/14,400/);
 assert.throws(()=>pdfDocument([]),/Nothing visible/);
 const page={width:1,height:1,image:{width:1,height:1,rgb:new Uint8Array([1]),alpha:null}};
 assert.throws(()=>pdfDocument(Array(101).fill(page)),/100 pages/);
 assert.deepEqual(exportSize({x:0,y:0,width:100,height:50},2,'pdf'),{width:200,height:100});
 assert.throws(()=>exportSize({x:0,y:0,width:5000,height:5000},2,'pdf'),/too large/);
 assert.throws(()=>exportSize({x:0,y:0,width:20000,height:10},0.25,'pdf'),/14,400/);
});

const textPage=(text,size={width:400,height:200})=>({...size,text,image:{width:1,height:1,rgb:new Uint8Array([120,156,251,255,255,63,0,5,254,2,254]),alpha:null}});
// Decode the hex strings of a content stream back to text through the ToUnicode map.
function extracted(pdf){
 const {found}=objects(pdf),all=[...found.values()].map(o=>o.body),cmap=all.find(body=>body.includes('begincmap'));
 const map=new Map([...cmap.matchAll(/^<([0-9A-F]{4})> <([0-9A-F]+)>$/gm)].map(([,id,hex])=>[id,Buffer.from(hex,'hex').swap16().toString('utf16le')]));
 return all.filter(body=>body.includes(' Tj')).map(body=>[...body.matchAll(/<([0-9A-F]+)> Tj/g)].map(([,hex])=>hex.match(/.{4}/g).map(id=>map.get(id)).join('')));
}

test('the glyphless font is a well-formed TrueType file',()=>{
 const font=glyphlessFont(),view=new DataView(font.buffer);
 assert.equal(view.getUint32(0),0x00010000);assert.equal(font.length%4,0);
 let sum=0;for(let i=0;i<font.length;i+=4)sum=(sum+view.getUint32(i))>>>0;assert.equal(sum,0xb1b0afba);
 const tables=new Map();for(let i=0;i<view.getUint16(4);i++){const at=12+i*16,tag=latin(font.subarray(at,at+4)),offset=view.getUint32(at+8),length=view.getUint32(at+12);
  let check=0;for(let j=0;j<length;j+=4)check=(check+view.getUint32(offset+j))>>>0;
  // head is checksummed with its adjustment field zeroed.
  if(tag==='head')check=(check-view.getUint32(offset+8))>>>0;
  assert.equal(check,view.getUint32(at+4),tag);tables.set(tag,{offset,length});}
 assert.deepEqual([...tables.keys()],['glyf','head','hhea','hmtx','loca','maxp']);
 assert.equal(tables.get('head').length,54);assert.equal(view.getUint32(tables.get('head').offset+12),0x5f0f3cf5);assert.equal(view.getUint16(tables.get('head').offset+18),1000);
 assert.equal(tables.get('hhea').length,36);assert.equal(tables.get('maxp').length,32);assert.equal(view.getUint16(tables.get('maxp').offset+4),2);
 // Both glyphs advance one em; the second has a single point and no area.
 assert.deepEqual([0,4].map(i=>view.getUint16(tables.get('hmtx').offset+i)),[1000,1000]);
 assert.deepEqual([0,2,4].map(i=>view.getUint16(tables.get('loca').offset+i)*2),[0,0,16]);
});

test('text runs become an invisible, exactly positioned layer over the image',()=>{
 const pdf=pdfDocument([textPage([{text:'Hello ',x:20,y:50,width:60,size:20,angle:0},{text:'up',x:300,y:180,width:24,size:16,angle:90}])],{title:'T',date:new Date(0)}),{found}=objects(pdf);
 assert.equal(found.size,12);
 const page=found.get(4).body,content=found.get(5).body;
 assert.match(page,/\/Font << \/F0 7 0 R >>/);
 // The image is painted first; text follows in render mode 3 (neither filled nor stroked).
 assert.match(content,/Do Q\nBT\n3 Tr\n/);
 // Six one-em glyphs at 20 pt are 120 pt wide, so 50% scaling gives the measured 60 pt. Y is flipped.
 assert.match(content,/\/F0 20 Tf 50 Tz 1 0 0 1 20 150 Tm <000100020003000300040005> Tj/);
 assert.match(content,/\/F0 16 Tf 75 Tz 0 1 -1 0 300 20 Tm <00060007> Tj\nET/);
 assert.match(found.get(7).body,/\/Subtype \/Type0 .*\/Encoding \/Identity-H \/DescendantFonts \[8 0 R\] \/ToUnicode 11 0 R/);
 assert.match(found.get(8).body,/\/CIDFontType2 .*\/FontDescriptor 9 0 R \/DW 1000 \/CIDToGIDMap 12 0 R/);
 assert.match(found.get(9).body,/\/FontFile2 10 0 R/);
 assert.match(found.get(10).body,new RegExp(`/Length ${glyphlessFont().length} /Length1 ${glyphlessFont().length}`));
 // Seven distinct characters plus id 0, two bytes each, all pointing at glyph 1.
 assert.match(found.get(12).body,/\/Length 16 >>/);
 assert.deepEqual(extracted(pdf),[['Hello ','up']]);
});

test('any Unicode text survives, and the font is shared by all pages',()=>{
 const words=['Ünïcödé ','日本語','😀👍🏽','(paren) \\ <x>'];
 const pdf=pdfDocument([textPage(words.slice(0,2).map((text,i)=>({text,x:10,y:20+i*20,width:80,size:12,angle:0}))),{...textPage([]),width:50},textPage(words.slice(2).map((text,i)=>({text,x:10,y:20+i*20,width:80,size:12,angle:-12.5})))],{date:new Date(0)}),{found}=objects(pdf);
 assert.deepEqual(extracted(pdf),[words.slice(0,2),words.slice(2)]);
 const bodies=[...found.values()].map(o=>o.body);
 assert.equal(bodies.filter(body=>body.includes('/Subtype /Type0')).length,1);
 assert.equal(bodies.filter(body=>body.includes('/Font << /F0')).length,2);
 // An astral character is one id mapped to a surrogate pair.
 assert.match(bodies.find(body=>body.includes('begincmap')),/<[0-9A-F]{4}> <D83DDE00>/);
});

test('pages without text are written exactly as before',()=>{
 const plain=pdfDocument([textPage([])],{date:new Date(0)}),legacy=pdfDocument([{width:400,height:200,image:textPage([]).image}],{date:new Date(0)});
 assert.deepEqual(plain,legacy);assert.equal(objects(plain).found.size,6);assert.doesNotMatch(latin(plain),/\/Font|BT/);
});

test('malformed text runs are rejected',()=>{
 for(const run of [{text:'a',x:0,y:0,width:0,size:10,angle:0},{text:'a',x:NaN,y:0,width:5,size:10,angle:0},{text:'',x:0,y:0,width:5,size:10,angle:0},{text:'a',x:0,y:0,width:5,size:0,angle:0}])
  assert.throws(()=>pdfDocument([textPage([run])]),/Invalid PDF text run/);
});

test('pdfImagePage carries text runs through',async()=>{
 const runs=[{text:'a',x:1,y:2,width:3,size:4,angle:0}],page=await pdfImagePage({width:1,height:1,pixelWidth:1,pixelHeight:1,rgba:new Uint8ClampedArray([1,2,3,255]),text:runs});
 assert.equal(page.text,runs);assert.deepEqual((await pdfImagePage({width:1,height:1,pixelWidth:1,pixelHeight:1,rgba:new Uint8ClampedArray([1,2,3,255])})).text,[]);
});
