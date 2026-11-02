import {test} from 'node:test';
import assert from 'node:assert/strict';
import {morphPath,morphData} from '../web/svg-animation-morph.js';
import {editPathAnchors} from '../web/svg-animation-drawing-model.js';
import {readMirroring,writeMirroring} from '../web/svg-animation-mirroring.js';

const fixture=()=>readMirroring(morphPath('M0 0C20 80 80 -20 100 50C120 120 180 -30 200 60C220 150 280 -20 300 50 M400 0C420 80 480 -20 500 50L450 120Z M600 0L700 0'),'n,a,n,n;n,n,n;n,n');
const cubic=(p,q,t)=>[0,1].map(i=>(1-t)**3*p[i]+3*(1-t)**2*t*p[4+i]+3*(1-t)*t*t*q[2+i]+t**3*q[i]);
test('bulk midpoint insertion preserves every curve across adjacent segments and a closed seam',()=>{
 const value=fixture(),before=structuredClone(value),pairs=[[1,2],[0,1],[1,0],[0,0],[0,1]],result=editPathAnchors(value,pairs,'insert');
 assert.deepEqual(value,before);assert.deepEqual(result.selections,[[1,4],[0,3],[1,1],[0,1]]);assert.deepEqual(result.value[2],value[2]);
 value.forEach((part,path)=>{
  const chosen=new Set(pairs.filter(p=>p[0]===path).map(p=>p[1])),next=result.value[path];assert.equal(next.closed,part.closed);assert.equal(next.points.length,part.points.length+chosen.size);
  let offset=0;for(let index=0;index<part.points.length-(part.closed?0:1);index++){
   const a=part.points[index],b=part.points[(index+1)%part.points.length],j=index+offset,split=chosen.has(index);
   for(let step=0;step<=40;step++){
    const t=step/40,expected=cubic(a,b,t),actual=split?(t<=.5?cubic(next.points[j],next.points[j+1],t*2):cubic(next.points[j+1],next.points[(j+2)%next.points.length],t*2-1)):cubic(next.points[j],next.points[(j+1)%next.points.length],t);
    actual.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-8));
   }if(split)offset++;
  }
 });
 assert.deepEqual(result.value[0].mirroring,['n','a','a','a','n','n']);assert.deepEqual(result.value[1].mirroring,['n','a','n','n','a']);
 const reopened=readMirroring(morphPath(morphData(result.value)),writeMirroring(result.value));for(const [path,index] of result.selections)assert.equal(reopened[path].mirroring[index],'a');
});

test('selection order and duplicates cannot change subdivision geometry',()=>{
 const value=fixture(),pairs=[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],a=editPathAnchors(value,pairs,'insert'),b=editPathAnchors(value,[...pairs].reverse().concat(pairs),'insert');
 assert.deepEqual(a.value,b.value);assert.deepEqual(b.selections,[...a.selections].reverse());assert.equal(a.value[1].points.length,6);
});

test('an open final endpoint or invalid address rejects the entire insertion without mutation',()=>{
 const value=fixture(),before=structuredClone(value);
 for(const pair of [[0,3],[2,1]])assert.throws(()=>editPathAnchors(value,[[1,2],pair],'insert'),/following segments/);
 for(const pair of [[4,0],[0,-1],[0,.5],[NaN,0]])assert.throws(()=>editPathAnchors(value,[[0,0],pair],'insert'),/no longer available/);
 assert.throws(()=>editPathAnchors(value,[],'insert'),/Select anchors/);assert.deepEqual(value,before);
});

test('bulk insertion enforces the total anchor limit across subpaths atomically',()=>{
 const value=[{closed:false,points:Array.from({length:508},(_,x)=>[x,0,x,0,x,0])},{closed:true,points:[[600,0,600,0,600,0],[700,0,700,0,700,0]]}],before=structuredClone(value);
 const exact=editPathAnchors(value,[[0,0],[1,1],[0,0]],'insert');assert.equal(exact.value.reduce((n,p)=>n+p.points.length,0),512);
 assert.throws(()=>editPathAnchors(value,[[0,0],[0,1],[1,1]],'insert'),/512/);assert.deepEqual(value,before);
});
