import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {appearance,sceneSvg} from '../web/appearance.js';
import {compositeGeometry} from '../web/shadows.js';
import {exportSize} from '../web/export.js';
import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
const set=(e,id,layer_blur)=>{const s=get(e,id);e.update(JSON.stringify({...s,appearance:{...appearance(s),layer_blur}}));};
test('blur persists through history and clipboard and invalid values reject atomically',()=>{
 const e=new Editor(),id=e.add('rectangle',0,0);set(e,id,16);const saved=e.snapshot();
 for(const bad of [-1,100001,null]){assert.throws(()=>set(e,id,bad));assert.equal(e.snapshot(),saved);}
 set(e,id,0);e.undo();assert.equal(e.snapshot(),saved);const other=new Editor();other.load(saved);const ids=JSON.parse(other.paste_layers(e.copy_layers(JSON.stringify([id])),400,0,0));assert.equal(get(other,ids[0]).appearance.layer_blur,16);e.free();other.free();
});
test('blur component overrides reset independently and scale with geometry',()=>{
 const e=new Editor(),id=e.add('frame',0,0);set(e,id,10);e.create_component(id);const i=e.create_instance(id,400,0);set(e,i,20);set(e,id,30);assert.equal(get(e,i).appearance.layer_blur,20);e.reset_override(i,'appearance.layer_blur');assert.equal(get(e,i).appearance.layer_blur,30);assert.equal(scaleShapes([get(e,i)],{x:0,y:0},2)[0].appearance.layer_blur,60);e.free();
});
test('frame blur follows child clipping and expands only paint bounds',()=>{
 const a={opacity:1,stroke_enabled:false,layer_blur:10},frame={id:1,parent_id:0,kind:'frame',x:0,y:0,width:100,height:100,clip_content:true,appearance:a},child={...frame,id:2,parent_id:1,kind:'rectangle',x:90,y:20,width:30,height:30};
 const result=compositeGeometry([frame,child],appearance);assert.deepEqual(result.geometry.get(1).content,{x:0,y:0,width:100,height:100});assert.deepEqual(result.bounds,{x:-15,y:-15,width:130,height:130});assert.equal(frame.width,100);
 const svg=sceneSvg([frame,child],s=>`<rect id="paint-${s.id}"/>`);assert.match(svg,/stdDeviation="5"/);assert.ok(svg.indexOf('filter="url(#blur-1)"')<svg.indexOf('id="paint-1"'));assert.match(svg,/clip-path="url\(#frame-clip-1\)"/);
});
test('large blur buffers reject raster exports even when a small target is requested',()=>{
 const shape={id:1,parent_id:0,kind:'rectangle',x:0,y:0,width:100,height:100,appearance:{opacity:1,stroke_enabled:false,layer_blur:100000}};
 assert.throws(()=>exportSize({width:100,height:100},1,'png',[shape]),/Effect buffer/);
});
