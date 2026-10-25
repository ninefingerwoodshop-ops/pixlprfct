import test from 'node:test';
import assert from 'node:assert/strict';
import {snapGuides} from '../web/guide-snap.js';
import {defaultGuide} from '../web/layout-guides.js';
const frame=(patch={})=>({id:1,parent_id:0,kind:'frame',x:0,y:0,width:300,height:300,layout_grids:[{...defaultGuide(),kind:'grid',size:50}],...patch});
const snap=(shapes,box,zoom=1,excluded=new Set(),axes)=>snapGuides(shapes,box,excluded,zoom,axes);
test('guide snapping chooses nearest edges or centers and obeys axis locks',()=>{
 const box={x:47,y:94,width:20,height:20},f=frame();
 const result=snap([f],box);assert.equal(result.dx,3);assert.equal(result.dy,-4);
 assert.deepEqual(result.lines.map(l=>l.value),[50,100]);
 assert.equal(snap([f],box,1,new Set(),{x:true,y:false}).dy,0);
 assert.equal(snap([f],{x:37,y:37,width:20,height:20}).dx,3);
 assert.equal(snap([f],{x:28,y:28,width:20,height:20}).dx,2);
});
test('snap tolerance remains six screen pixels and ignores unavailable guides',()=>{
 const box={x:45,y:45,width:0,height:0},f=frame();
 assert.equal(snap([f],box).dx,5);assert.equal(snap([f],box,2).dx,0);
 for(const unavailable of [frame({hidden:true}),frame({layout_grids:[{...f.layout_grids[0],visible:false}]}),frame({layout_grids:[{...f.layout_grids[0],opacity:0}]})])assert.equal(snap([unavailable],box).lines.length,0);
 assert.equal(snap([f],box,1,new Set([1])).lines.length,0);
 assert.equal(snap([f],box,.01).lines.length,0);
 assert.equal(snap([f],{...box,x:400}).lines.length,0);
});
test('stretched columns and rows retain fractional boundaries for resize points',()=>{
 const g={...defaultGuide(),count:3,margin:10,gutter:7};
 const f=frame({width:301,layout_grids:[g,{...g,kind:'rows'}]});
 const result=snap([f],{x:98,y:97,width:0,height:0});
 assert.ok(Math.abs(98+result.dx-99)<1e-9);
 assert.ok(Math.abs(97+result.dy-(10+266/3))<1e-9);
});
test('ancestor visibility and clipping limit snapping candidates and hint spans',()=>{
 const outer=frame({id:2,width:125,height:125,clip_content:true,layout_grids:[]});
 const inner=frame({parent_id:2});
 const result=snap([outer,inner],{x:98,y:98,width:0,height:0});
 assert.equal(result.dx,2);assert.equal(result.lines[0].end,125);
 assert.equal(snap([outer,inner],{x:148,y:98,width:0,height:0}).lines.length,0);
 assert.equal(snap([{...outer,hidden:true},inner],{x:98,y:98,width:0,height:0}).lines.length,0);
});
