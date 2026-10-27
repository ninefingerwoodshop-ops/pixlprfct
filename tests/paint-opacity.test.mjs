import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {paintAttributes,withPaintOpacity} from '../web/appearance.js';
import {svgDocument} from '../web/export.js';
import {svgLayers} from '../web/svg-import.js';
import {scaleShapes} from '../web/scaling.js';
import {textSvg} from '../web/typography.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const appearance={opacity:.8,fill_opacity:.25,stroke_opacity:.75,corner_radius:0,fill_enabled:true,stroke_enabled:true,stroke_color:'#ff0000'};
test('paint opacity persists, defaults to opaque for legacy files, and rejects invalid values atomically',()=>{
 const e=new Editor(),id=e.add('rectangle',0,0);edit(e,id,{appearance});const saved=e.snapshot();edit(e,id,{appearance:{...appearance,fill_opacity:0}});e.undo();assert.equal(e.snapshot(),saved);e.redo();assert.equal(get(e,id).appearance.fill_opacity,0);
 const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);
 const scaled=scaleShapes([get(copy,id)],{x:0,y:0},2)[0];assert.equal(scaled.appearance.fill_opacity,.25);assert.equal(scaled.appearance.stroke_opacity,.75);
 for(const field of ['fill_opacity','stroke_opacity'])for(const value of [-.1,1.1,null]){const before=e.snapshot();assert.throws(()=>edit(e,id,{appearance:{...appearance,[field]:value}}));assert.equal(e.snapshot(),before);}
 const legacy={...appearance};delete legacy.fill_opacity;delete legacy.stroke_opacity;edit(e,id,{appearance:legacy});assert.equal(get(e,id).appearance.fill_opacity,1);assert.equal(get(e,id).appearance.stroke_opacity,1);e.free();copy.free();
});
test('paint opacity propagates from the main with other appearance changes and instances reject paint opacity overrides',()=>{
 const e=new Editor(),f=e.add('frame',0,0);edit(e,f,{appearance});e.create_component(f);const i=e.create_instance(f,400,0);
 const before=e.snapshot();assert.throws(()=>edit(e,i,{appearance:{...get(e,i).appearance,fill_opacity:.1}}),/protected/);assert.equal(e.snapshot(),before);edit(e,f,{appearance:{...get(e,f).appearance,fill_opacity:.5,stroke_opacity:.3,opacity:1}});
 assert.equal(get(e,i).appearance.fill_opacity,.5);assert.equal(get(e,i).appearance.stroke_opacity,.3);assert.equal(get(e,i).appearance.opacity,1);e.free();
});
test('canvas paint alpha multiplies the caller alpha and cannot leak to subsequent paints',()=>{
 const ctx={globalAlpha:.6},seen=[];
 withPaintOpacity(ctx,appearance,'fill',()=>seen.push(ctx.globalAlpha));withPaintOpacity(ctx,appearance,'stroke',()=>seen.push(ctx.globalAlpha));assert.deepEqual(seen,[.15,.44999999999999996]);assert.equal(ctx.globalAlpha,.6);
 assert.throws(()=>withPaintOpacity(ctx,appearance,'fill',()=>{throw Error('failed paint');}));assert.equal(ctx.globalAlpha,.6);
 withPaintOpacity(ctx,{},'fill',()=>assert.equal(ctx.globalAlpha,.6));
});
test('SVG exports preserve separate paint and layer opacity for gradients, text and images',()=>{
 const base={id:1,parent_id:0,kind:'rectangle',name:'Shape',x:0,y:0,width:100,height:100,fill:'#123456',appearance,stroke_width:4};
 assert.match(paintAttributes(base),/fill-opacity="0.25" stroke-opacity="0.75"/);
 const gradient={...base,appearance:{...appearance,gradient:{kind:'linear',start:[0,0],end:[1,1],stops:[{position:0,color:'#ffffff',opacity:.2},{position:1,color:'#000000',opacity:.8}]}}};
 const output=svgDocument([gradient],base,1,null,()=>{});assert.match(output,/stop-opacity="0.2"/);assert.match(output,/<g opacity="0.8">/);assert.match(output,/fill-opacity="0.25"/);
 const image={...base,kind:'image',image:{data_url:'data:image/png;base64,AAAA',width:10,height:10,mode:'fit',zoom:1,offset_x:.5,offset_y:.5}};
 assert.match(svgDocument([image],base,1,null,()=>{}),/<g clip-path="url\(#image-clip-1\)" opacity="0.25">/);
 const text=textSvg({...base,kind:'text'},{style:{align:'left',font_family:'Arial',font_size:20,font_weight:400},lines:[{x:0,y:0,text:'Paint'}]});assert.match(text,/fill-opacity="0.25" stroke-opacity="0.75"/);
});
test('SVG inherited paint opacity remains independent of group opacity',()=>{
 const n=(tag,attrs={},children=[])=>({tag,attrs,children});const payload=svgLayers(n('svg',{},[n('g',{'fill-opacity':'.2','stroke-opacity':'.7',opacity:'.5'},[n('rect',{width:'100',height:'100',fill:'red',stroke:'blue'}),n('circle',{cx:'50',cy:'50',r:'20','fill-opacity':'.9'})])]));
 const e=new Editor();e.paste_layers(JSON.stringify(payload),0,0,0);const shapes=doc(e).shapes;assert.equal(shapes[1].appearance.opacity,.5);assert.equal(shapes[2].appearance.fill_opacity,.2);assert.equal(shapes[2].appearance.stroke_opacity,.7);assert.equal(shapes[2].appearance.opacity,1);assert.equal(shapes[3].appearance.fill_opacity,.9);e.free();
});
