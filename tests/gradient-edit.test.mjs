import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {defaultGradient} from '../web/gradients.js';
import {gradientHandles,gradientHit,gradientPosition,moveGradientHandle,addGradientStopAt} from '../web/gradient-edit.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shape={id:1,kind:'rectangle',name:'Gradient',x:10,y:20,width:200,height:100,fill:'#ff0000',text:'',hidden:false,appearance:{opacity:1,corner_radius:0,fill_enabled:true,stroke_enabled:false,stroke_color:'#000000',gradient:defaultGradient('#ff0000')}};
test('gradient endpoints and separate stop handles remain selectable at different zooms',()=>{
 for(const zoom of [.1,1,4]){const h=gradientHandles(shape,zoom);assert.deepEqual(h[0],{part:'start',x:10,y:70});assert.equal(h[2].y,70+18/zoom);for(const handle of h)assert.equal(gradientHit(shape,handle,zoom).part,handle.part);}
 assert.deepEqual(gradientPosition(shape,{x:110,y:73}),{t:.5,distance:3});assert.equal(gradientPosition(shape,{x:999,y:70}).t,1);
});
test('endpoint drag normalizes coordinates, snaps angle, and prevents a degenerate gradient',()=>{
 const moved=moveGradientHandle(shape,{part:'end'},{x:110,y:120}).shape;assert.deepEqual(moved.appearance.gradient.end,[.5,1]);assert.equal(moved.x,10);assert.equal(moved.width,200);
 const snapped=moveGradientHandle(shape,{part:'end'},{x:110,y:150},true).shape.appearance.gradient.end;assert.ok(Math.abs(snapped[0]*200-(snapped[1]-.5)*100)<1e-8);
 assert.deepEqual(moveGradientHandle(shape,{part:'end'},{x:10,y:70}).shape,shape);assert.equal(moveGradientHandle(shape,{part:'end'},{x:1e8,y:70}).shape.appearance.gradient.end[0],10);
});
test('stop insertion interpolates alpha; crossing stops retains the dragged identity and commits one undo step',()=>{
 const s=structuredClone(shape);s.appearance.gradient.stops[1]={position:1,color:'#0000ff',opacity:0};
 const inserted=addGradientStopAt(s,.25);assert.deepEqual(inserted.shape.appearance.gradient.stops[1],{position:.25,color:'#ff0000',opacity:.75});
 const moved=moveGradientHandle(inserted.shape,{part:'stop',index:0},{x:170,y:70});assert.equal(moved.active.index,1);assert.equal(moved.shape.appearance.gradient.stops[1].position,.8);
 const e=new Editor();e.insert(JSON.stringify(inserted.shape));const before=e.snapshot();e.update(JSON.stringify(moved.shape));e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(JSON.parse(e.snapshot()).shapes[0].appearance.gradient.stops[1].position,.8);e.free();
});
