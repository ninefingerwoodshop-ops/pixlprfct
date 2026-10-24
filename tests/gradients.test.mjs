import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {defaultGradient,gradientGeometry,gradientSvg,insertGradientStop,canvasFill} from '../web/gradients.js';
import {appearance,paintAttributes} from '../web/appearance.js';
import {svgDocument,exportBounds} from '../web/export.js';
import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const list=e=>JSON.parse(e.snapshot()).shapes;
const style={opacity:.7,corner_radius:20,fill_enabled:true,stroke_enabled:false,stroke_color:'#000000',gradient:defaultGradient('#ff0000')};
test('gradients persist through edit history, clipboard, duplication and scale; malformed stops are atomic',()=>{
 const e=new Editor(),id=e.add('rectangle',20,30);e.update(JSON.stringify({...list(e)[0],appearance:style}));const before=e.snapshot();
 for(const gradient of [{...style.gradient,stops:[]},{...style.gradient,end:style.gradient.start},{...style.gradient,stops:[{position:1,color:'#ff0000',opacity:1},{position:0,color:'#000000',opacity:1}]},{...style.gradient,stops:[{position:0,color:'url(bad)',opacity:1},style.gradient.stops[1]]},{...style.gradient,stops:[{position:0,color:'#ffffff',opacity:2},style.gradient.stops[1]]}]){assert.throws(()=>e.update(JSON.stringify({...list(e)[0],appearance:{...style,gradient}})));assert.equal(e.snapshot(),before);}
 e.duplicate(id);e.undo();assert.equal(e.snapshot(),before);e.redo();assert.deepEqual(list(e)[1].appearance.gradient,style.gradient);
 const copy=new Editor();copy.paste_layers(e.copy_layers(JSON.stringify([id])),0,0,0);assert.deepEqual(list(copy)[0].appearance.gradient,style.gradient);copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());
 const scaled=scaleShapes(list(e),{x:0,y:0},2);assert.deepEqual(scaled[0].appearance.gradient,style.gradient);e.free();copy.free();
});
test('gradient canvas coordinates and SVG definitions use matching object-relative geometry',()=>{
 const s={id:9,parent_id:0,kind:'rectangle',x:10,y:20,width:200,height:100,fill:'#ff0000',appearance:style};const p=gradientGeometry(s,style.gradient);assert.deepEqual(p.start,[10,70]);assert.deepEqual(p.end,[210,70]);
 const stops=[],calls=[];const ctx={createLinearGradient:(...args)=>{calls.push(args);return{addColorStop:(...args)=>stops.push(args)}}};canvasFill(ctx,s);assert.deepEqual(calls[0],[10,70,210,70]);assert.equal(stops.length,2);
 assert.match(paintAttributes(s),/fill="url\(#gradient-9\)"/);const svg=svgDocument([s],exportBounds([s]),1,null,()=>{});assert.match(svg,/<linearGradient id="gradient-9"/);assert.match(svg,/x1="10" y1="70" x2="210" y2="70"/);assert.match(svg,/<g opacity="0.7">/);
 const radial={...s,appearance:{...style,gradient:defaultGradient('#ffffff','radial')}};assert.match(gradientSvg(radial),/cx="0.5" cy="0.5" r="0.5" gradientTransform="translate\(10 20\) scale\(200 100\)"/);
 assert.equal(gradientSvg({...s,appearance:{...style,fill_enabled:false}}),'');assert.equal(canvasFill({}, {...s,appearance:null}),'#ff0000');
});
test('inserting a midpoint stop preserves premultiplied color and hard-stop ordering',()=>{
 const g=defaultGradient('#ff0000');g.stops[1]={position:1,color:'#0000ff',opacity:0};const result=insertGradientStop(g);assert.deepEqual(result.stops[1],{position:.5,color:'#ff0000',opacity:.5});assert.equal(g.stops.length,2);
 const full={...g,stops:Array.from({length:16},(_,i)=>({...g.stops[0],position:i/15}))};assert.equal(insertGradientStop(full),full);
});
