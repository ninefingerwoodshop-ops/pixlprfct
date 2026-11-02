import {test} from 'node:test';
import assert from 'node:assert/strict';
import {smoothExistingPath} from '../web/svg-animation-smoothing.js';
import {morphPath,validMorph} from '../web/svg-animation-morph.js';
import {editPathAnchors} from '../web/svg-animation-drawing-model.js';

const identity={a:1,b:0,c:0,d:1,e:0,f:0};
const polyline=(points,closed=false)=>({closed,points:points.map(([x,y])=>[x,y,x,y,x,y]),mirroring:points.map(()=>'n')});
const jitter=()=>[polyline(Array.from({length:101},(_,i)=>[i*3,100+(i%2?.4:0)]))];
const map=(value,m)=>value.map(part=>({...part,points:part.points.map(p=>{const next=[];for(let i=0;i<6;i+=2)next.push(m.a*p[i]+m.c*p[i+1]+m.e,m.b*p[i]+m.d*p[i+1]+m.f);return next;})}));
const sample=value=>value.flatMap(part=>part.points.flatMap((p,i)=>{if(!part.closed&&i===part.points.length-1)return [p.slice(0,2)];const q=part.points[(i+1)%part.points.length];return Array.from({length:40},(_,k)=>{const t=k/40,u=1-t;return [0,1].map(a=>u**3*p[a]+3*u*u*t*p[4+a]+3*u*t*t*q[2+a]+t**3*q[a]);});}));

test('existing-path smoothing reduces jitter, retains endpoints and leaves its input untouched',()=>{
 const value=jitter(),before=structuredClone(value),result=smoothExistingPath(value,100,identity);assert.deepEqual(result,[polyline([[0,100],[300,100]])]);assert.deepEqual(value,before);assert.deepEqual(smoothExistingPath(value,0,identity),before);assert.ok(validMorph(result));
});

test('smoothing samples existing cubics and keeps their curved shape instead of flattening their anchors',()=>{
 let value=morphPath('M0 0C40 120 160 -80 200 40');for(let i=0;i<5;i++)value=editPathAnchors(value,value[0].points.slice(0,-1).map((_,index)=>[0,index]),'insert').value;
 const result=smoothExistingPath(value,100,identity);assert.ok(result[0].points.length<value[0].points.length);assert.ok(result[0].points.some(p=>p[2]!==p[0]||p[3]!==p[1]));assert.deepEqual(result[0].points[0].slice(0,2),[0,0]);assert.deepEqual(result[0].points.at(-1).slice(0,2),[200,40]);
 const before=sample(value),after=sample(result);for(const [left,right] of [[before,after],[after,before]])for(const p of left)assert.ok(Math.min(...right.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])))<4);
});

test('closed rings keep a smooth seam, orientation and nonzero area; sharp turns remain corners',()=>{
 const ring=polyline(Array.from({length:128},(_,i)=>{const angle=i*Math.PI/64;return [100+60*Math.cos(angle),100+60*Math.sin(angle)];}),true),result=smoothExistingPath([ring],100,identity)[0];assert.ok(result.points.length<ring.points.length);assert.equal(result.closed,true);assert.deepEqual(result.points[0].slice(0,2),ring.points[0].slice(0,2));assert.ok(result.points[0][2]!==result.points[0][0]||result.points[0][3]!==result.points[0][1]);assert.ok(result.points[0][4]!==result.points[0][0]||result.points[0][5]!==result.points[0][1]);assert.equal(result.mirroring[0],'a');assert.ok(result.points.reduce((area,p,i)=>{const q=result.points[(i+1)%result.points.length];return area+p[0]*q[1]-q[0]*p[1];},0)>0);
 const square=polyline([[0,0],[50,0],[100,0],[100,50],[100,100],[50,100],[0,100],[0,50]],true),corners=smoothExistingPath([square],100,identity)[0];assert.deepEqual(corners,polyline([[0,0],[100,0],[100,100],[0,100]],true));
 const tiny=smoothExistingPath([polyline([[0,0],[.05,0],[.1,0],[.1,.1],[0,.1]],true)],100,identity)[0];assert.ok(tiny.points.length>=3);
});

test('smoothing measures visible pixels under affine transforms and supports mixed subpaths',()=>{
 const value=[...jitter(),polyline(Array.from({length:60},(_,i)=>[300+i*2,200+30*Math.sin(i/15)])),...morphPath('M0 300C0 400 80 400 80 300')],matrix={a:1.4,b:.4,c:.2,d:.8,e:30,f:-15},screen=map(value,matrix),local=smoothExistingPath(value,80,matrix),expected=smoothExistingPath(screen,80,identity),mapped=map(local,matrix);
 assert.deepEqual(local[2],value[2]);for(let i=0;i<mapped.length;i++){assert.equal(mapped[i].points.length,expected[i].points.length);mapped[i].points.forEach((p,j)=>p.forEach((n,k)=>assert.ok(Math.abs(n-expected[i].points[j][k])<1e-8)));}assert.ok(validMorph(local));
});

test('zero strength, compact curves and degenerate paths do not rebuild geometry or metadata',()=>{
 const value=morphPath('M0 0C20 50 80 50 100 0 M0 20L0 20 M0 30L100 30L100 100Z');value.forEach(part=>part.mirroring=part.points.map(()=>'n'));assert.deepEqual(smoothExistingPath(value,0,identity),value);assert.deepEqual(smoothExistingPath(value,100,identity),value);
});

test('invalid strength, transforms, geometry and excessive sampling reject atomically',()=>{
 const value=jitter(),copy=structuredClone(value);for(const amount of [-1,101,NaN,Infinity])assert.throws(()=>smoothExistingPath(value,amount,identity),/0 to 100/);
 for(const matrix of [null,{...identity,d:0},{...identity,a:Infinity}])assert.throws(()=>smoothExistingPath(value,50,matrix),/invertible/);assert.throws(()=>smoothExistingPath([],50,identity),/2–512/);
 const detailed=[...value,{closed:false,points:Array.from({length:400},(_,i)=>[i,0,i-.3,100000,i+.3,-100000])}],before=structuredClone(detailed);assert.throws(()=>smoothExistingPath(detailed,100,identity),/too detailed/);assert.deepEqual(detailed,before);assert.deepEqual(value,copy);
});
