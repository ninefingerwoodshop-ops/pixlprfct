import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {deflateSync,zipSync,unzipSync} from 'fflate';
import {parseSchema,compileSchema,encodeBinarySchema} from 'kiwi-schema';
import {parseFigma,decodeKiwi,inflateBounded} from '../web/figma/parse.js';
import {convertFigma,vectorCommands} from '../web/figma/convert.js';
import {readDesignFile} from '../web/design-import.js';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
const {readDesign}=createRequire(import.meta.url)('../desktop/design-files.cjs');
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const fixture=async name=>parseFigma(await readFile(new URL(`fixtures/figma/${name}`,import.meta.url)));
function load(body){const e=new Editor();try{e.load(body);return JSON.parse(e.snapshot());}finally{e.free();}}
const node=(id,type,parent='page',extra={})=>({guid:id,type,name:id,parentIndex:{guid:parent,position:id},size:{x:100,y:50},...extra});
const parsed=(nodes,extra={})=>({message:{nodeChanges:[node('page','CANVAS',null),...nodes]},images:new Map(),...extra});
const solid=(r,g,b,a=1)=>({type:'SOLID',color:{r,g,b,a}});
test('real deflate export imports editable hierarchy, paints and stroke; edits undo and persist',async()=>{
 const p=await fixture('circle.fig');assert.equal(p.version,101);
 const {body,report}=await convertFigma(p,'circle.fig');assert.equal(report.pages,1);assert.equal(report.layers,2);assert.deepEqual(report.warnings,[]);
 const e=new Editor();try{e.load(body);const before=e.snapshot(),[frame,circle]=JSON.parse(before).shapes;
  assert.equal(frame.width,350);assert.equal(circle.width,300);assert.equal(circle.parent_id,frame.id);assert.equal(circle.fill,'#ff0000');assert.equal(circle.stroke_width,5);assert.ok(Math.abs(circle.x-25)<1e-6);
  e.update(JSON.stringify({...circle,width:280}));assert.equal(JSON.parse(e.snapshot()).shapes[1].width,280);e.undo();assert.equal(e.snapshot(),before);e.redo();const restored=load(e.snapshot());assert.equal(restored.shapes[1].width,280);assert.equal(restored.shapes[1].parent_id,frame.id);assert.equal(restored.shapes[1].fill,'#ff0000');
 }finally{e.free();}
});
test('real Zstandard export has editable curves and an explicit compound-path report',async()=>{
 const p=await fixture('vector-zstd.fig');assert.equal(p.version,106);const {body,report}=await convertFigma(p,'vector.fig'),doc=load(body);
 assert.ok(doc.shapes.some(s=>s.kind==='pen'&&s.handles?.length));assert.ok(report.warnings.some(w=>w.message.includes('Compound')));assert.equal(report.layers,27);
});
test('unfilled native vector networks import editable points without fill geometry',async()=>{
 const {body}=await convertFigma(await fixture('open-path.fig'),'line.fig');const pen=load(body).shapes.find(s=>s.kind==='pen');assert.ok(pen);assert.equal(pen.points.length,2);assert.equal(pen.closed,false);
});
test('pages use source order and omit Figma internal canvases',async()=>{
 const p=parsed([node('page2','CANVAS',null,{parentIndex:{position:'A'}}),node('internal','CANVAS',null,{name:'Internal Only Canvas'}),node('b','RECTANGLE'),node('a','RECTANGLE'),node('c','TEXT','page2',{textData:{characters:'Hello'},fontName:{family:'Inter',style:'Bold'},fontSize:24,textAlignVertical:'CENTER'})]);
 const {body}=await convertFigma(p);const d=load(body);assert.equal(d.pages.length,2);assert.equal(d.pages[0].name,'page2');assert.deepEqual(d.shapes.map(s=>s.name),['c','a','b']);assert.equal(d.shapes[0].text,'Hello');assert.equal(d.shapes[0].typography.font_weight,700);assert.equal(d.shapes[0].typography.vertical_align,'center');
});
test('rotation converts Figma origin-based transforms to editor center-based geometry',async()=>{
 const {body}=await convertFigma(parsed([node('rotated','RECTANGLE','page',{transform:{m00:0,m01:-1,m10:1,m11:0,m02:100,m12:200}})]));const s=load(body).shapes[0];
 assert.equal(s.rotation,-90);assert.equal(s.x,25);assert.equal(s.y,225);assert.equal(s.width,100);assert.equal(s.height,50);
});
test('multiple paints, gradients, effects, auto layout and text remain native controls',async()=>{
 const {body}=await convertFigma(parsed([node('frame','FRAME','page',{stackMode:'HORIZONTAL',stackSpacing:8,stackPadding:12,stackCounterAlignItems:'CENTER',stackPrimaryAlignItems:'SPACE_BETWEEN',fillPaints:[solid(1,0,0,.5),{type:'GRADIENT_LINEAR',stops:[{position:0,color:{r:1,g:1,b:1,a:1}},{position:1,color:{r:0,g:0,b:0,a:0}}]}],strokePaints:[solid(0,0,0)],effects:[{type:'DROP_SHADOW',offset:{x:2,y:4},radius:8,color:{r:0,g:0,b:0,a:.2}}]}),node('text','TEXT','frame',{textData:{characters:'Editable'},fontName:{family:'Inter',style:'Regular'},textAlignHorizontal:'CENTER'})]));
 const [frame,text]=load(body).shapes;assert.equal(frame.auto_layout.direction,'horizontal');assert.equal(frame.auto_layout.gap,8);assert.equal(frame.appearance.fills.length,2);assert.equal(frame.appearance.fills[0].opacity,.5);assert.equal(frame.appearance.fills[1].gradient.kind,'linear');assert.equal(frame.appearance.shadows[0].blur,8);assert.equal(text.parent_id,frame.id);assert.equal(text.typography.align,'center');
});
test('component sources become masters and instances expand with overrides into editable layers',async()=>{
 const {body,report}=await convertFigma(parsed([node('master','SYMBOL'),node('label','TEXT','master',{textData:{characters:'Source'}}),node('instance','INSTANCE','page',{symbolData:{symbolID:'master',symbolOverrides:[{guidPath:{guids:['label']},textData:{characters:'Override'}}]}})]));
 const d=load(body),master=d.shapes.find(s=>s.name==='master'),instance=d.shapes.find(s=>s.name==='instance');assert.equal(master.component.type,'master');assert.equal(instance.component,null);assert.equal(d.shapes.find(s=>s.parent_id===instance.id).text,'Override');assert.equal(report.instances,1);assert.equal(report.components,1);assert.ok(report.warnings.some(w=>w.message.includes('detached')));
});
test('embedded images are cached, converted to native image paints and missing images are reported',async()=>{
 const hash='a'.repeat(40),bytes=Uint8Array.from([137,80,78,71]),image={type:'IMAGE',imageRef:hash,imageScaleMode:'FIT'};let calls=0;
 const {body,report}=await convertFigma(parsed([node('one','RECTANGLE','page',{fillPaints:[image]}),node('two','RECTANGLE','page',{fillPaints:[image]}),node('missing','RECTANGLE','page',{fillPaints:[{...image,imageRef:'b'.repeat(40)}]})],{images:new Map([[hash,bytes]])}),'images.fig',{prepareImage:async()=>{calls++;return {data_url:'data:image/png;base64,iVBORw0KGgo=',width:1,height:1};}});
 assert.equal(calls,1);assert.equal(report.images,1);assert.equal(load(body).shapes.find(s=>s.name==='one').appearance.fills[0].media.mode,'fit');assert.ok(report.warnings.some(w=>w.message.includes('Missing embedded')));
});
test('mixed text, masks, variables, prototypes and unsupported paints appear in the review report',async()=>{
 const {body,report}=await convertFigma(parsed([node('text','TEXT','page',{textData:{characters:'Read me',styleOverrideTable:[{}]},fontName:{family:'Inter',style:'Italic'},isMask:true,reactions:[{}],boundVariables:{x:1},fillPaints:[{type:'VIDEO'}]})]));load(body);assert.ok(report.warnings.length>=5);
});
test('cycles, duplicate IDs, missing pages and overlarge text fail before creating a project',async()=>{
 for(const p of [parsed([node('a','FRAME','b'),node('b','FRAME','a')]),parsed([node('a','RECTANGLE'),node('a','RECTANGLE')]),{message:{nodeChanges:[]}},parsed([node('text','TEXT','page',{textData:{characters:'x'.repeat(10001)}})])])await assert.rejects(()=>convertFigma(p));
});
test('self-contained binary schema is interpreted as data, including hostile property names',()=>{
 const schema=parseSchema('message Node { string name = 1; } message Message { Node[] nodeChanges = 1; string __proto__ = 2; }'),codec=compileSchema(schema);
 const data=codec.encodeMessage({nodeChanges:[{name:'test'}],__proto__:null});const decoded=decodeKiwi(schema,data);assert.equal(Object.getPrototypeOf(decoded),null);assert.equal(decoded.nodeChanges[0].name,'test');
 const chunks=[encodeBinarySchema(schema),data].map(x=>deflateSync(x));const raw=new Uint8Array(12+chunks.reduce((n,c)=>n+4+c.length,0)),v=new DataView(raw.buffer);raw.set(new TextEncoder().encode('fig-kiwi'));v.setUint32(8,101,true);let at=12;for(const c of chunks){v.setUint32(at,c.length,true);raw.set(c,at+4);at+=4+c.length;}
 assert.equal(parseFigma(raw).message.nodeChanges[0].name,'test');assert.equal(parseFigma(zipSync({'canvas.fig':raw})).version,101);
});
test('invalid archives, unsafe paths, truncated chunks and excessive decompression are rejected',async()=>{
 assert.throws(()=>parseFigma(new Uint8Array([1,2,3])),/supported/);assert.throws(()=>parseFigma(zipSync({'../canvas.fig':new Uint8Array(5)})),/Invalid path/);
 const zipped=unzipSync(await readFile(new URL('fixtures/figma/circle.fig',import.meta.url))),canvas=zipped['canvas.fig'];assert.throws(()=>parseFigma(canvas.subarray(0,24)),/truncated/);
 assert.throws(()=>inflateBounded(deflateSync(new Uint8Array(100_000)),100),/limit/);
 // A Zstandard single-segment frame declaring 4 GB must be refused before allocation.
 assert.throws(()=>inflateBounded(new Uint8Array([0x28,0xb5,0x2f,0xfd,0xa0,255,255,255,255]),1024),/limit/);
 assert.throws(()=>vectorCommands(new Uint8Array([4])),/Invalid/);
});
test('native desktop reads binary Figma files and keeps PixlPrfct JSON import compatible',async()=>{
 const file=new URL('fixtures/figma/circle.fig',import.meta.url);const native=await readDesign(file.pathname);assert.equal(native.name,'circle.fig');assert.equal(parseFigma(native.data).version,101);
 const dir=await mkdtemp(path.join(os.tmpdir(),'pixl-import-'));try{
  await writeFile(path.join(dir,'design.pixl'),'{}');const design=await readDesign(path.join(dir,'design.pixl'));assert.equal((await readDesignFile(design)).body,'{}');
  await writeFile(path.join(dir,'large.pixl'),new Uint8Array(5_000_001));await assert.rejects(()=>readDesign(path.join(dir,'large.pixl')),/smaller/);await assert.rejects(()=>readDesign(path.join(dir,'code.js')),/Choose/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
