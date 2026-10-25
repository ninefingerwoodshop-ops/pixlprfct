import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {appearance} from '../web/appearance.js';
import {transformRectangle,rectangleToVector} from '../web/rectangle-actions.js';
import {hexToHsv,hsvToHex} from '../web/color-picker.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const read=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
test('rectangle rotation and reflections retain painted corners and round-trip',()=>{
 const e=new Editor(),id=e.add('rectangle',10,20),s=read(e,id);s.width=200;s.height=100;s.appearance={...appearance(s),corner_radii:[10,20,30,40],gradient:{kind:'linear',start:[0,0],end:[1,1],stops:[{position:0,color:'#ff0000',opacity:1},{position:1,color:'#0000ff',opacity:1}]}};
 e.update(JSON.stringify(s));const original=read(e,id),rotated=transformRectangle(original,'rotate');assert.deepEqual([rotated.x,rotated.y,rotated.width,rotated.height],[60,-30,100,200]);assert.deepEqual(rotated.appearance.corner_radii,[40,10,20,30]);assert.deepEqual(rotated.appearance.gradient.start,[1,0]);e.update(JSON.stringify(rotated));assert.equal(read(e,id).kind,'rectangle');e.undo();assert.deepEqual(read(e,id),original);
 for(const action of ['horizontal','vertical']){const reflected=transformRectangle(transformRectangle(original,action),action);assert.deepEqual(reflected.appearance.corner_radii,original.appearance.corner_radii);assert.deepEqual(reflected.appearance.gradient,original.appearance.gradient);}let round=original;for(let i=0;i<4;i++)round=transformRectangle(round,'rotate');assert.equal(round.x,original.x);assert.equal(round.y,original.y);assert.deepEqual(round.appearance.corner_radii,original.appearance.corner_radii);e.free();
});
test('Edit object creates editable closed curves without changing rectangle bounds or paints; undo restores primitive',()=>{
 const e=new Editor(),id=e.add('rectangle',10,20),s=read(e,id);s.width=200;s.height=100;s.appearance={...appearance(s),corner_radii:[0,20,30,10]};e.update(JSON.stringify(s));const original=read(e,id),vector=rectangleToVector(original);assert.equal(vector.kind,'pen');assert.equal(vector.points.length,7);assert.equal(vector.handles.length,7);assert.equal(vector.closed,true);for(const k of ['id','x','y','width','height','fill','parent_id'])assert.equal(vector[k],original[k]);e.update(JSON.stringify(vector));const copy=new Editor();copy.load(e.snapshot());assert.deepEqual(read(copy,id).points,vector.points);assert.equal(e.hit_test(110,70),id);e.undo();assert.deepEqual(read(e,id),original);e.free();copy.free();
});
test('color picker converts hue sectors and grayscale without losing 8-bit color values',()=>{
 for(const hex of ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#00ffff','#ff00ff','#574ce6','#d9d9d9','#123456'])assert.equal(hsvToHex(hexToHsv(hex)),hex);assert.equal(hsvToHex([360,1,1]),'#ff0000');assert.equal(hsvToHex([-60,1,1]),'#ff00ff');
});
