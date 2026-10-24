import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {smoothPencil} from '../web/pencil.js';
import {fromPoints,anchors,vectorPath} from '../web/vectors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('freehand reduction removes jitter, preserves endpoints and scales tolerance with zoom',()=>{
 const points=Array.from({length:401},(_,i)=>({x:i,y:Math.sin(i)*.4}));const smooth=smoothPencil(points);assert.equal(smooth.length,2);assert.deepEqual(smooth[0],points[0]);assert.deepEqual(smooth.at(-1),points.at(-1));assert.equal(smoothPencil(points,0).length,points.length);
 const scaled=points.map(p=>({x:p.x*10,y:p.y*10}));assert.deepEqual(smoothPencil(scaled,50,.1).map(p=>({x:p.x/10,y:p.y/10})),smooth);
});
test('gentle freehand curves get aligned handles while sharp corners and reversals remain corners',()=>{
 const arc=Array.from({length:201},(_,i)=>({x:100*Math.cos(i*Math.PI/400),y:100*Math.sin(i*Math.PI/400)})),nodes=smoothPencil(arc,50);assert.ok(nodes.length<arc.length/4);assert.ok(nodes.some(p=>p.in&&p.out));
 for(const p of nodes.filter(p=>p.in)){assert.ok(Math.abs((p.in.x-p.x)*(p.out.y-p.y)-(p.in.y-p.y)*(p.out.x-p.x))<1e-8);}
 const corner=[{x:0,y:0},{x:50,y:0},{x:100,y:0},{x:100,y:50},{x:100,y:100}];assert.deepEqual(smoothPencil(corner),[corner[0],corner[2],corner[4]]);
 assert.deepEqual(smoothPencil([{x:0,y:0},{x:50,y:0},{x:0,y:0}]),[{x:0,y:0},{x:50,y:0},{x:0,y:0}]);
});
test('smoothed pencil paths keep editable handles through Rust history, persistence and SVG output',()=>{
 const raw=Array.from({length:201},(_,i)=>({x:i,y:40*Math.sin(i/60)})),shape=fromPoints('pencil',smoothPencil(raw)),e=new Editor();
 const id=e.insert(JSON.stringify(shape));const stored=JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);assert.equal(stored.handles.length,stored.points.length);assert.ok(vectorPath(stored).includes(' C'));const expected=anchors(shape);anchors(stored).forEach((p,i)=>{for(const key of ['in','out'])assert.ok(Math.hypot(p[key].x-expected[i][key].x,p[key].y-expected[i][key].y)<1e-9);assert.ok(Math.hypot(p.x-expected[i].x,p.y-expected[i].y)<1e-9);});
 const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);e.undo();assert.equal(JSON.parse(e.snapshot()).shapes.length,0);e.redo();assert.equal(e.snapshot(),saved);e.free();copy.free();
});
test('maximum length and duplicate pointer samples remain finite without recursive stack overflow',()=>{
 const raw=Array.from({length:4096},(_,i)=>({x:i,y:i%2?10:0}));const result=smoothPencil(raw,100);assert.ok(result.length<=4096);assert.ok(result.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.deepEqual(smoothPencil([{x:1,y:1},{x:1,y:1}]),[{x:1,y:1}]);
});
