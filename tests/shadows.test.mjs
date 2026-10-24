import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {appearance} from '../web/appearance.js';
import {scaleShapes} from '../web/scaling.js';
import {shadowBounds,shadowFilter,spreadAlpha,compositeGeometry,effectSurfaceSize} from '../web/shadows.js';
import {exportBounds,exportSize,svgDocument} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),shadow={x:4,y:8,blur:12,spread:2,color:'#123456',opacity:.4,visible:true};
const set=(e,id,shadows)=>{const s=get(e,id);e.update(JSON.stringify({...s,appearance:{...appearance(s),shadows}}));};
test('shadow stacks persist through history, clipboard and save; malformed effects reject atomically',()=>{
 const e=new Editor(),r=e.add('rectangle',0,0);set(e,r,[shadow,{...shadow,x:-10,spread:-4,visible:false}]);const saved=e.snapshot();
 for(const bad of [[{...shadow,blur:-1}],[{...shadow,spread:100001}],[{...shadow,opacity:2}],[{...shadow,color:'red'}],Array(9).fill(shadow)]){assert.throws(()=>set(e,r,bad));assert.equal(e.snapshot(),saved);}
 set(e,r,[]);e.undo();assert.equal(e.snapshot(),saved);const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);const ids=JSON.parse(copy.paste_layers(e.copy_layers(JSON.stringify([r])),200,0,0));assert.deepEqual(get(copy,ids[0]).appearance.shadows,get(e,r).appearance.shadows);e.free();copy.free();
});
test('shadow overrides are independent of opacity and scaling changes geometry without changing paint',()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,[shadow]);e.create_component(f);const i=e.create_instance(f,400,0);set(e,i,[{...shadow,blur:30}]);const main=get(e,f);e.update(JSON.stringify({...main,appearance:{...main.appearance,opacity:.6}}));assert.equal(get(e,i).appearance.opacity,.6);assert.equal(get(e,i).appearance.shadows[0].blur,30);
 e.reset_override(i,'appearance.shadows');assert.equal(get(e,i).appearance.shadows[0].blur,12);const scaled=scaleShapes([get(e,i)],{x:0,y:0},2)[0];assert.deepEqual(scaled.appearance.shadows[0],{...shadow,x:8,y:16,blur:24,spread:4});e.free();
});
test('effect bounds include independent offsets and Gaussian tails, ignore hidden effects and conservatively retain eroded masks',()=>{
 const box={x:10,y:20,width:100,height:50};assert.deepEqual(shadowBounds(box,[shadow]),{x:-6,y:8,width:140,height:90});assert.deepEqual(shadowBounds(box,[{...shadow,visible:false}]),box);assert.deepEqual(shadowBounds(box,[{...shadow,opacity:0}]),box);
 assert.deepEqual(shadowBounds(box,[{...shadow,x:-200,y:0,blur:0,spread:-5}]),{x:-190,y:20,width:300,height:50});
});
test('SVG filter primitives use composed source alpha, independent shadow ordering, sRGB and spread morphology',()=>{
 const svg=shadowFilter('shadows-1',{x:0,y:0,width:100,height:60},[shadow,{...shadow,x:-8,spread:-2,color:'#abcdef'}]);assert.match(svg,/color-interpolation-filters="sRGB"/);assert.match(svg,/operator="dilate" radius="2"/);assert.match(svg,/operator="erode" radius="2"/);assert.match(svg,/stdDeviation="6"/);assert.match(svg,/<feMergeNode in="shadow-1"\/><feMergeNode in="shadow-0"\/><feMergeNode in="SourceGraphic"\/>/);assert.equal((svg.match(/in="SourceAlpha"/g)??[]).length,2);
});
test('spread uses square dilation and erosion, including transparent pixels beyond every edge',()=>{
 const w=7,h=5,source=Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?(i*37)%256:0);
 for(const radius of [1,2,9])for(const dilate of [true,false]){const actual=spreadAlpha(source.slice(),w,h,radius,dilate);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let expected=dilate?0:255;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const v=x+dx<0||x+dx>=w||y+dy<0||y+dy>=h?0:source[((y+dy)*w+x+dx)*4+3];expected=dilate?Math.max(expected,v):Math.min(expected,v);}assert.equal(actual[(y*w+x)*4+3],expected,`${x},${y},${radius},${dilate}`);}}
});
test('frame shadow uses clipped child output, preserves its own effect, and remains under the frame opacity',()=>{
 const style={opacity:.5,corner_radius:0,fill_enabled:true,stroke_enabled:false,stroke_color:'#000000',shadows:[{...shadow,x:20,y:0,blur:0,spread:0}]};
 const frame={id:1,parent_id:0,kind:'frame',x:0,y:0,width:100,height:100,clip_content:true,fill:'#ffffff',appearance:style},child={...frame,id:2,parent_id:1,kind:'rectangle',x:90,y:20,width:30,height:30,appearance:{...style,opacity:1,shadows:[]}};
 const shapes=[frame,child],geometry=compositeGeometry(shapes,appearance);assert.deepEqual(geometry.geometry.get(1).content,{x:0,y:0,width:100,height:100});assert.deepEqual(exportBounds(shapes),{x:0,y:0,width:120,height:100});
 const svg=svgDocument(shapes,exportBounds(shapes),1,null,()=>[]);assert.match(svg,/<g opacity="0.5"><defs><filter id="shadows-1"/);assert.match(svg,/<g filter="url\(#shadows-1\)">/);assert.match(svg,/clip-path="url\(#frame-clip-1\)"/);
});
test('preview buffers stay bounded while full-resolution exports reject oversized effect sources',()=>{
 const size=effectSurfaceSize({width:100000,height:100000},8);assert.ok(size.width<=8192&&size.height<=8192);assert.ok(size.width*size.height<=16_777_216);
 const shape={id:1,parent_id:0,kind:'rectangle',x:0,y:0,width:100000,height:100000,appearance:{opacity:.5,stroke_enabled:false,shadows:[]}};
 assert.throws(()=>exportSize({width:100,height:100},1,'png',[shape]),/Effect buffer/);
});
