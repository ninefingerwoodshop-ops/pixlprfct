import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {radii,roundedContains,roundedSvg} from '../web/appearance.js';
import {scaleShapes} from '../web/scaling.js';
import {svgDocument} from '../web/export.js';
import {clipDefinitions,frameAt} from '../web/scene.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const paint={opacity:1,corner_radius:0,corner_radii:[40,0,20,10],fill_enabled:true,stroke_enabled:true,stroke_color:'#000000'};
test('independent corners agree in Rust hit testing, JS containment and frame clipping',()=>{
 const e=new Editor(),f=e.add('frame',0,0),child=e.add('rectangle',0,0);edit(e,f,{width:100,height:100,clip_content:true,appearance:paint});edit(e,child,{width:100,height:100});e.reparent_many(JSON.stringify([child]),f);
 for(const [x,y,inside] of [[1,1,false],[99,1,true],[99,99,false],[1,99,false],[50,50,true],[30,10,true]]){assert.equal(roundedContains(get(e,f),{x,y}),inside);assert.equal(e.hit_test(x,y),inside?child:0);assert.equal(frameAt(all(e),{x,y}),inside?f:0);}
 assert.match(clipDefinitions(all(e)),/<path d="M 40 0/);e.free();
});
test('oversized radii normalize opposing sums and SVG paths retain all four arcs',()=>{
 const s={id:1,kind:'rectangle',x:0,y:0,width:100,height:80,fill:'#123456',appearance:{...paint,corner_radii:[100,0,20,20]}};
 radii(s).forEach((r,i)=>assert.ok(Math.abs(r-[100*2/3,0,20*2/3,20*2/3][i])<1e-10));assert.equal(roundedContains(s,{x:99,y:1}),true);
 const path=roundedSvg({...s,width:300,height:300});assert.match(path,/M 100 0 H 300 L 300 0 V 280 A 20 20/);assert.match(path,/A 100 100 0 0 1 100 0 Z/);
 const svg=svgDocument([s],{x:0,y:0,width:100,height:80},1,null,()=>{});assert.match(svg,/<path d=/);assert.match(svg,/fill="#123456"/);
});
test('corner arrays validate atomically, roundtrip, scale and propagate to instances that reject corner overrides',()=>{
 const e=new Editor(),f=e.add('frame',0,0);edit(e,f,{appearance:paint});e.create_component(f);const i=e.create_instance(f,300,0),locked=e.snapshot();assert.throws(()=>edit(e,i,{appearance:{...get(e,i).appearance,corner_radii:[4,8,12,16]}}),/protected/);assert.equal(e.snapshot(),locked);
 edit(e,f,{appearance:{...paint,opacity:.4,corner_radii:[20,30,40,50]}});assert.deepEqual(get(e,i).appearance.corner_radii,[20,30,40,50]);assert.equal(get(e,i).appearance.opacity,.4);
 const before=e.snapshot();for(const corner_radii of [[1,2,3],[-1,0,0,0],[1e7,0,0,0]]){assert.throws(()=>edit(e,f,{appearance:{...paint,corner_radii}}));assert.equal(e.snapshot(),before);}
 e.undo();assert.deepEqual(get(e,i).appearance.corner_radii,[40,0,20,10]);e.redo();assert.equal(e.snapshot(),before);
 const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);const scaled=scaleShapes([get(e,i)],{x:0,y:0},2)[0];assert.deepEqual(scaled.appearance.corner_radii,[40,60,80,100]);
 const legacy={...paint};delete legacy.corner_radii;edit(e,f,{appearance:legacy});assert.equal(get(e,f).appearance.corner_radii,null);e.free();copy.free();
});
