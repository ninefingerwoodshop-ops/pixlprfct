import test from 'node:test';
import assert from 'node:assert/strict';
import {panInertiaStep,releasePanVelocity} from '../web/pan-inertia.js';
test('pan glide decays consistently across refresh rates',()=>{
 const run=dt=>{let velocity={x:1,y:-.5},x=0,y=0;for(let t=0;t<400;t+=dt){const step=panInertiaStep(velocity,dt);velocity=step.velocity;x+=step.dx;y+=step.dy;}return {x,y,velocity};};
 const a=run(20),b=run(10);assert.ok(Math.abs(a.x-b.x)<1e-9);assert.ok(Math.abs(a.y-b.y)<1e-9);assert.ok(a.velocity.x<.02);assert.ok(a.x<100);
});
test('pan release respects stopping, reduced motion, and speed limit',()=>{
 assert.deepEqual(releasePanVelocity({x:1,y:0},81),{x:0,y:0});
 assert.deepEqual(releasePanVelocity({x:1,y:0},0,true),{x:0,y:0});
 assert.deepEqual(releasePanVelocity({x:.01,y:0},0),{x:0,y:0});
 const v=releasePanVelocity({x:10,y:10},0);assert.ok(Math.hypot(v.x,v.y)<=1.8+1e-9);
});
