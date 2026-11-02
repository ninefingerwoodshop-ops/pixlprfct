import test from 'node:test';
import assert from 'node:assert/strict';
import {morphPath} from '../web/svg-animation-morph.js';
import {splitPath,joinEndpoints,continuePath,checkedPath} from '../web/svg-animation-drawing-model.js';
const curve='M0 0C20 80 80 -20 100 50C120 90 180 0 200 40C230 60 250 20 300 0';
const cubic=(a,b,t)=>{const u=1-t;return [0,1].map(i=>u**3*a[i]+3*u*u*t*a[4+i]+3*u*t*t*b[2+i]+t**3*b[i]);};
const segmentEqual=(a,b,c,d)=>{for(let n=0;n<=20;n++)assert.deepEqual(cubic(a,b,n/20),cubic(c,d,n/20));};
test('split duplicates the cut anchor without changing any cubic or unrelated subpath',()=>{
 const original=morphPath(curve+'M400 0L450 50'),before=structuredClone(original),next=splitPath(original,0,1);assert.deepEqual(next.selection,[0,1]);assert.equal(next.value.length,3);assert.deepEqual(next.value[2],original[1]);
 segmentEqual(original[0].points[0],original[0].points[1],next.value[0].points[0],next.value[0].points[1]);for(let i=1;i<3;i++)segmentEqual(original[0].points[i],original[0].points[i+1],next.value[1].points[i-1],next.value[1].points[i]);assert.deepEqual(original,before);
 assert.deepEqual(joinEndpoints(next.value,[0,1],[1,0]).value,original);
});
test('opening at every closed anchor preserves the closing cubic and rejoining restores the seam',()=>{
 const original=morphPath('M0 0C20 -30 70 -20 100 0C110 50 30 100 0 70C-30 50 -20 10 0 0Z'),points=original[0].points;
 for(let index=0;index<points.length;index++){const opened=splitPath(original,0,index).value;assert.equal(opened[0].closed,false);assert.equal(opened[0].points.length,points.length+1);for(let i=0;i<points.length;i++)segmentEqual(points[(index+i)%points.length],points[(index+i+1)%points.length],opened[0].points[i],opened[0].points[i+1]);const closed=joinEndpoints(opened,[0,0],[0,points.length]).value[0];assert.equal(closed.closed,true);assert.deepEqual(closed.points,points.slice(index).concat(points.slice(0,index)));}
});
test('joining supports both endpoint orientations and either subpath order',()=>{
 const original=morphPath(curve),parts=splitPath(original,0,1).value;
 for(const ra of [false,true])for(const rb of [false,true]){let value=structuredClone(parts);if(ra)value=continuePath(value,0,0);if(rb)value=continuePath(value,1,0);const result=joinEndpoints(value,[0,ra?0:1],[1,rb?2:0]);assert.deepEqual(result.value,original);assert.deepEqual(result.selection,[0,1]);}
 const reordered=[parts[1],parts[0]];assert.deepEqual(joinEndpoints(reordered,[1,1],[0,0]).value,original);
});
test('joining distinct ends creates a straight bridge and closing an open path preserves existing curves',()=>{
 const value=morphPath('M0 0C10 20 30 20 40 0M60 10C80 -20 100 50 120 0'),before=structuredClone(value),joined=joinEndpoints(value,[0,1],[1,0]).value[0].points;
 segmentEqual(value[0].points[0],value[0].points[1],joined[0],joined[1]);segmentEqual(value[1].points[0],value[1].points[1],joined[2],joined[3]);assert.deepEqual(joined[1].slice(4),joined[1].slice(0,2));assert.deepEqual(joined[2].slice(2,4),joined[2].slice(0,2));
 const closed=joinEndpoints([value[0]],[0,0],[0,1]).value;assert.equal(closed[0].closed,true);assert.deepEqual(closed[0].points,value[0].points);assert.deepEqual(value,before);
});
test('invalid topology and path limits reject edits without mutating the input',()=>{
 const value=morphPath(curve),before=structuredClone(value);assert.throws(()=>splitPath(value,0,0),/interior/);assert.throws(()=>joinEndpoints(value,[0,0],[0,0]),/different/);assert.throws(()=>joinEndpoints(value,[0,0],[0,1]),/open endpoints/);assert.deepEqual(value,before);
 const many=Array.from({length:64},()=>structuredClone(value[0]));checkedPath(many);assert.throws(()=>splitPath(many,0,1),/2–512/);assert.equal(many.length,64);
 const limit=[{closed:true,points:Array.from({length:512},(_,i)=>[i,0,i,0,i,0])}];assert.throws(()=>splitPath(limit,0,10),/2–512/);assert.equal(limit[0].points.length,512);
});
