import {test} from 'node:test';
import assert from 'node:assert/strict';
import {morphPath} from '../web/svg-animation-morph.js';
import {readMirroring,writeMirroring,setHandleMirroring,setPathHandleMirroring,mirroringMode} from '../web/svg-animation-mirroring.js';
const fixture=()=>readMirroring(morphPath('M0 0C20 0 30 50 60 50C100 80 150 0 200 0 M20 200C50 100 90 250 120 200C180 250 220 300 220 200Z'),null);
const len=(p,o)=>Math.hypot(p[o]-p[0],p[o+1]-p[1]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('group angle mirroring preserves opposite lengths and unrelated anchors across open and closed subpaths',()=>{
 const value=setHandleMirroring(fixture(),1,2,'s'),before=structuredClone(value),selected=[[0,1],[1,1],[0,1]],next=setPathHandleMirroring(value,selected,'a');
 for(const [path,index] of selected){const p=next[path].points[index],original=value[path].points[index];assert.deepEqual(p.slice(4),original.slice(4));near(len(p,2),len(original,2));near((p[2]-p[0])*(p[5]-p[1])-(p[3]-p[1])*(p[4]-p[0]),0);assert.equal(mirroringMode(next[path],index),'a');}
 assert.deepEqual(next[0].points[0],before[0].points[0]);assert.deepEqual(next[1].points[2],before[1].points[2]);assert.equal(next[1].mirroring[2],'s');assert.deepEqual(value,before);
 assert.deepEqual(setPathHandleMirroring(value,[[1,1],[0,1]],'a'),next);
});
test('symmetric and independent group modes preserve metadata and use a surviving handle when outgoing is collapsed',()=>{
 const value=fixture();value[1].points[1].splice(4,2,...value[1].points[1].slice(0,2));const next=setPathHandleMirroring(value,[[0,1],[1,1]],'s');
 for(const [path,index] of [[0,1],[1,1]]){const p=next[path].points[index];near(p[2]+p[4],2*p[0]);near(p[3]+p[5],2*p[1]);assert.equal(mirroringMode(next[path],index),'s');}
 assert.deepEqual(next[1].points[1].slice(2,4),value[1].points[1].slice(2,4));const encoded=writeMirroring(next);assert.equal(writeMirroring(readMirroring(structuredClone(next),encoded)),encoded);
 const independent=setPathHandleMirroring(next,[[0,1],[1,1]],'n');assert.deepEqual(independent.map(p=>p.points),next.map(p=>p.points));assert.equal(writeMirroring(independent),null);
});
test('empty, stale, endpoint, corner and out-of-range group requests reject atomically',()=>{
 const value=fixture(),before=structuredClone(value);
 for(const selection of [[],[[0,1],[9,1]],[[0,1],[0,-1]],[[0,1],[0,.5]],[[0,1],[0,0]]])assert.throws(()=>setPathHandleMirroring(value,selection,'s'),/Select|selected/);
 assert.throws(()=>setPathHandleMirroring(value,[[0,1]],'bad'),/mode/);assert.deepEqual(value,before);
 const corner=fixture();corner[1].points[1]=[120,200,120,200,120,200];const snapshot=structuredClone(corner);assert.throws(()=>setPathHandleMirroring(corner,[[0,1],[1,1]],'s'),/curved/);assert.deepEqual(corner,snapshot);
 const out=fixture();out[1].points[1]=[90000,200,89900,200,-90000,200];const original=structuredClone(out);assert.throws(()=>setPathHandleMirroring(out,[[0,1],[1,1]],'s'),/out of range/);assert.deepEqual(out,original);
});
