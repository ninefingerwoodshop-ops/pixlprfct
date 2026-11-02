import {test} from 'node:test';
import assert from 'node:assert/strict';
import {morphPath,morphData} from '../web/svg-animation-morph.js';
import {editAnchor,continuePath,checkedPath,pencilPath} from '../web/svg-animation-drawing-model.js';
const cubic=(p,q,t)=>{const u=1-t;return [0,1].map(i=>u*u*u*p[i]+3*u*u*t*p[4+i]+3*u*t*t*q[2+i]+t*t*t*q[i]);};
test('midpoint insertion exactly preserves a cubic, including the closing segment',()=>{
 for(const data of ['M0 0C20 80 80 -20 100 50','M0 0L100 0C60 100 20 60 0 0Z']){
  const original=morphPath(data),i=original[0].closed?original[0].points.length-1:0,a=original[0].points[i],b=original[0].points[(i+1)%original[0].points.length],after=editAnchor(original,0,i,'insert')[0];
  for(let step=0;step<=20;step++){const t=step/20,expected=cubic(a,b,t),actual=t<=.5?cubic(after.points[i],after.points[i+1],t*2):cubic(after.points[i+1],after.points[(i+2)%after.points.length],t*2-1);actual.forEach((n,k)=>assert.ok(Math.abs(n-expected[k])<1e-8));}
 }
});
test('continuing the first endpoint reverses handles without changing its curve',()=>{
 const original=morphPath('M0 0C20 80 80 -20 100 50'),reversed=continuePath(original,0,0);
 for(let i=0;i<=20;i++)assert.deepEqual(cubic(original[0].points[0],original[0].points[1],i/20).map(n=>+n.toFixed(6)),cubic(reversed[0].points[0],reversed[0].points[1],1-i/20).map(n=>+n.toFixed(6)));
 assert.deepEqual(original,morphPath('M0 0C20 80 80 -20 100 50'));
});
test('corner, smooth, and deletion preserve other subpaths and reject invalid operations atomically',()=>{
 const original=morphPath('M0 0L50 30L100 0M200 0L250 50');
 const smooth=editAnchor(original,0,1,'smooth'),p=smooth[0].points[1];assert.equal(p[3],p[5]);assert.ok(p[2]<p[0]&&p[4]>p[0]);
 assert.deepEqual(editAnchor(smooth,0,1,'corner'),original);assert.deepEqual(editAnchor(original,0,1,'delete')[1],original[1]);
 assert.throws(()=>editAnchor(original,1,0,'delete'),/two anchors/);assert.throws(()=>editAnchor(original,0,2,'insert'),/following segment/);assert.throws(()=>continuePath(original,0,1),/first or last/);assert.throws(()=>checkedPath([{closed:false,points:[[0,0,0,0,0,0]]}]),/2–512/);
 assert.deepEqual(morphPath(morphData(original)),original);
});
test('pencil converts smoothed freehand samples to editable cubic paths and preserves endpoints',()=>{
 const raw=Array.from({length:201},(_,i)=>({x:i,y:40*Math.sin(i/60)})),before=structuredClone(raw),value=pencilPath(raw,50),points=value[0].points;
 assert.ok(points.length<raw.length/4);assert.ok(points.some(p=>p[0]!==p[2]||p[1]!==p[3]));assert.deepEqual(points[0].slice(0,2),[raw[0].x,raw[0].y]);assert.deepEqual(points.at(-1).slice(0,2),[raw.at(-1).x,raw.at(-1).y]);assert.equal(pencilPath(raw,0)[0].points.length,201);assert.equal(checkedPath(value),value);assert.deepEqual(raw,before);
});
test('pencil rejects oversized strokes atomically and treats duplicate-only samples as a tap',()=>{
 assert.equal(pencilPath([{x:1,y:1},{x:1,y:1}]),null);assert.throws(()=>pencilPath([{x:NaN,y:0}]),/finite/);
 const raw=Array.from({length:4096},(_,i)=>({x:i,y:i%2?10:0}));assert.throws(()=>pencilPath(raw,100),/512 anchors/);assert.throws(()=>pencilPath([...raw,{x:4096,y:0}]),/4,096 samples/);
 assert.equal(pencilPath(raw.map(p=>({...p,y:0})),100)[0].points.length,2);
});
