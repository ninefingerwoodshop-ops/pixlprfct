import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {defaultGradient,canvasFill} from '../web/gradients.js';
import {appearance,paintAttributes} from '../web/appearance.js';
import {moveGradientHandle,addGradientStopAt,gradientHit} from '../web/gradient-edit.js';
import {svgLayers} from '../web/svg-import.js';
import {svgDocument,exportBounds} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),fill=defaultGradient('#ff0000'),stroke=defaultGradient('#00ff00','radial');
const set=(e,id,g)=>{const s=get(e,id);e.update(JSON.stringify({...s,appearance:{...appearance(s),stroke_enabled:true,gradient:fill,stroke_gradient:g}}));};
test('stroke gradients preserve independent fill, inherit main edits, reject instance overrides and keep history',()=>{
 const e=new Editor(),id=e.add('frame',0,0);set(e,id,stroke);e.create_component(id);const i=e.create_instance(id,400,0);const before=e.snapshot();assert.throws(()=>set(e,i,{...stroke,start:[.25,.25]}),/protected/);assert.equal(e.snapshot(),before);set(e,id,{...stroke,end:[.9,.8]});assert.deepEqual(get(e,i).appearance.stroke_gradient,get(e,id).appearance.stroke_gradient);assert.deepEqual(get(e,i).appearance.stroke_gradient.end,[.9,.8]);assert.deepEqual(get(e,i).appearance.gradient,fill);
 const saved=e.snapshot();set(e,id,null);e.undo();assert.equal(e.snapshot(),saved);const copy=new Editor();copy.paste_layers(e.copy_layers(JSON.stringify([i])),0,0,0);assert.deepEqual(JSON.parse(copy.snapshot()).shapes[0].appearance.stroke_gradient,get(e,i).appearance.stroke_gradient);e.free();copy.free();
});
test('stroke gradient geometry and stop edits never modify fill gradients',()=>{
 const s={x:10,y:20,width:100,height:100,appearance:{gradient:fill,stroke_gradient:stroke}};
 const moved=moveGradientHandle(s,{part:'end'},{x:90,y:100},false,'stroke_gradient').shape;assert.deepEqual(moved.appearance.gradient,fill);assert.deepEqual(moved.appearance.stroke_gradient.end,[.8,.8]);
 const added=addGradientStopAt(moved,.4,'stroke_gradient').shape;assert.equal(added.appearance.stroke_gradient.stops.length,3);assert.deepEqual(added.appearance.gradient,fill);assert.equal(gradientHit(s,{x:60,y:70},1,'stroke_gradient').part,'start');
});
test('SVG fill and stroke paints import independently and export distinct definition IDs',()=>{
 const n=(tag,attrs={},children=[])=>({tag,attrs,children}),stops=[n('stop',{offset:'0','stop-color':'red'}),n('stop',{offset:'1','stop-color':'blue'})];
 const payload=svgLayers(n('svg',{width:'200',height:'200'},[n('defs',{},[n('linearGradient',{id:'f'},stops),n('radialGradient',{id:'s'},stops)]),n('rect',{x:'20',y:'20',width:'160',height:'160',fill:'url(#f)',stroke:'url(#s)','stroke-width':'20'})]));
 const s=payload.shapes[1];assert.equal(s.appearance.gradient.kind,'linear');assert.equal(s.appearance.stroke_gradient.kind,'radial');assert.match(paintAttributes(s),/stroke="url\(#stroke-gradient-2\)"/);const svg=svgDocument(payload.shapes,exportBounds(payload.shapes),1,null,()=>[]);assert.match(svg,/linearGradient id="gradient-2"/);assert.match(svg,/radialGradient id="stroke-gradient-2"/);
});
test('stroke paint validation is atomic and linear canvas paint resolves the stroke channel',()=>{
 const e=new Editor(),id=e.add('rectangle',0,0);set(e,id,stroke);const saved=e.snapshot();assert.throws(()=>set(e,id,{...stroke,stops:[]}));assert.equal(e.snapshot(),saved);
 const s=get(e,id);s.appearance.stroke_gradient=fill;const calls=[];canvasFill({createLinearGradient:(...args)=>{calls.push(args);return{addColorStop(){}}}},s,'stroke');assert.equal(calls.length,1);e.free();
});
