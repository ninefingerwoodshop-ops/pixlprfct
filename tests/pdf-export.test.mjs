import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {pdfDocument,pdfImagePage,pdfPageSize,splitRgba,PDF_MAX_PAGE_POINTS} from '../web/pdf-export.js';
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
