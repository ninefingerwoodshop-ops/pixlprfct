import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewportRenderer} from '../web/viewport-renderer.js';
function fixture(options={}){
 const renders=[],surfaces=[],blits=[],transforms=[];
 const transform={a:2,b:0,c:0,d:2,e:40.25,f:-20.5};
 const target={canvas:{width:800,height:600},getTransform:()=>transform,save(){},restore(){},setTransform(){},drawImage(...args){blits.push(args);}};
 const renderer=createViewportRenderer((...args)=>renders.push(args),{padding:100,createSurface(width,height){const s={width,height,getContext:()=>({setTransform(...args){transforms.push(args);}})};surfaces.push(s);return s;},...options});
 return {renderer,renders,surfaces,blits,transforms,transform,target};
}
test('unchanged artwork reuses its raster through pan and selection redraws at the original pixel density',()=>{
 const f=fixture(),scene=[{id:1,text:'Label'}];f.renderer.draw(scene,f.target);
 assert.deepEqual(f.transforms[0],[2,0,0,2,140.25,79.5]);
 f.transform.e+=30;f.transform.f-=15;f.renderer.draw(structuredClone(scene),f.target);
 assert.equal(f.renders.length,1);assert.deepEqual(f.blits.at(-1),[f.surfaces[0],-70,-115]);
});
test('edits, zoom, viewport resize, overscan exhaustion and fractional pans repaint without resampling',()=>{
 const f=fixture(),scene=[{id:1,text:'Label'}];f.renderer.draw(scene,f.target);
 const changes=[()=>scene[0].text='Changed',()=>{f.transform.a=f.transform.d=3;},()=>f.target.canvas.width++,()=>f.transform.e+=101,()=>f.transform.e+=.25];
 for(const change of changes){const old=f.surfaces.at(-1),count=f.renders.length;change();f.renderer.draw(scene,f.target);assert.equal(f.renders.length,count+1);assert.equal(old.width,1);assert.equal(old.height,1);assert.deepEqual(f.blits.at(-1).slice(1),[-100,-100]);}
});
test('loaded fonts, images and textures can invalidate unchanged scene data',()=>{
 const f=fixture();f.renderer.draw([],f.target);f.renderer.invalidate();f.renderer.draw([],f.target);assert.equal(f.renders.length,2);
});
test('oversized or rotated targets use direct painting without a lossy or unbounded buffer',()=>{
 const f=fixture({maxPixels:900000});f.renderer.draw([],f.target);assert.equal(f.surfaces.length,1);
 f.target.canvas.width=8192;f.renderer.draw([],f.target);assert.equal(f.renders.at(-1)[1],f.target);assert.equal(f.surfaces[0].width,1);
 f.target.canvas.width=800;f.transform.b=.1;f.renderer.draw([],f.target);assert.equal(f.renders.at(-1)[1],f.target);assert.equal(f.surfaces.length,1);
});
