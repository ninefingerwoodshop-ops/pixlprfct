import test from 'node:test';
import assert from 'node:assert/strict';
import {clampZoom,zoomTarget,followZoom} from '../web/zoom-inertia.js';
test('pinch accumulates fractional deltas without fixed zoom steps',()=>{
 let target=1;for(let i=0;i<20;i++)target=zoomTarget(target,-.25);
 assert.ok(Math.abs(target-zoomTarget(1,-5))<1e-12);
 assert.ok(zoomTarget(1,-.01)>1);assert.equal(clampZoom(100),64);assert.equal(clampZoom(.001),.02);
});
test('continuous zoom interpolation is refresh-rate independent without overshoot',()=>{
 const run=dt=>{let z=1;for(let t=0;t<160;t+=dt)z=followZoom(z,2,dt);return z;};
 assert.ok(Math.abs(run(16)-run(8))<1e-12);assert.ok(run(16)>1.99&&run(16)<2);
 assert.equal(followZoom(1,2,16,true),2);
 assert.ok(followZoom(2,1,16)<2);assert.equal(followZoom(1,1.00001,16),1.00001);
});
test('zoom anchor remains fixed during interpolation',()=>{
 const anchor={x:320,y:200},pan={x:20,y:-40},before=1,after=followZoom(before,3,16);
 const world={x:(anchor.x-pan.x)/before,y:(anchor.y-pan.y)/before};
 const next={x:anchor.x-(anchor.x-pan.x)*after/before,y:anchor.y-(anchor.y-pan.y)*after/before};
 assert.ok(Math.abs(world.x*after+next.x-anchor.x)<1e-9);assert.ok(Math.abs(world.y*after+next.y-anchor.y)<1e-9);
});
