import {test} from 'node:test';
import assert from 'node:assert/strict';
import {morphPath} from '../web/svg-animation-morph.js';
import {readMirroring,writeMirroring,setHandleMirroring,movePathPoint,mirroringMode,validMirroring} from '../web/svg-animation-mirroring.js';
import {editAnchor,splitPath,joinEndpoints,continuePath} from '../web/svg-animation-drawing-model.js';
const fixture=()=>readMirroring(morphPath('M0 0C20 0 30 50 60 50C100 80 150 0 200 0'),null);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('mirroring follows the selected handle and preserves opposite length in angle mode',()=>{
 const original=fixture(),before=structuredClone(original),next=setHandleMirroring(original,0,1,'a','in'),p=next[0].points[1];
 assert.deepEqual(p.slice(2,4),[30,50]);near(Math.hypot(p[4]-60,p[5]-50),50);near(p[5],50);
 const moved=movePathPoint(next,0,1,'in',60,20)[0].points[1];near(moved[4],60);near(moved[5],100);assert.deepEqual(original,before);
});
test('symmetric handles follow pointer or keyboard coordinates in both directions and survive anchor moves',()=>{
 const value=setHandleMirroring(fixture(),0,1,'s'),moved=movePathPoint(value,0,1,'out',90,10),p=moved[0].points[1];assert.deepEqual(p,[60,50,30,90,90,10]);
 const reverse=movePathPoint(moved,0,1,'in',50,80);assert.deepEqual(reverse[0].points[1],[60,50,50,80,70,20]);
 const translated=movePathPoint(reverse,0,1,'anchor',70,65);assert.deepEqual(translated[0].points[1],[70,65,60,95,80,35]);assert.equal(writeMirroring(translated),'n,s,n');
 const free=setHandleMirroring(reverse,0,1,'n');assert.deepEqual(movePathPoint(free,0,1,'in',40,90)[0].points[1].slice(4),[70,20]);assert.equal(writeMirroring(free),null);
});
test('collapsed handles stay finite and invalid mirrored coordinates are rejected atomically',()=>{
 const value=setHandleMirroring(fixture(),0,1,'s'),before=structuredClone(value);assert.deepEqual(movePathPoint(value,0,1,'out',60,50)[0].points[1],[60,50,60,50,60,50]);
 assert.throws(()=>movePathPoint(value,0,1,'out',-100000,0),/out of range/);assert.deepEqual(value,before);
 assert.throws(()=>setHandleMirroring(value,0,0,'s'),/interior/);assert.throws(()=>setHandleMirroring(value,0,1,'invalid'),/mode/);
});
test('native mirroring metadata is bounded, independent of inferred alignment, and topology checked',()=>{
 const value=fixture();assert.equal(mirroringMode(value[0],1),'n');assert.equal(writeMirroring(value),null);
 for(const encoded of ['n,x,n','n,,n','n;a;n',Array(600).fill('s').join(',')]){if(encoded!=='n;a;n')assert.equal(validMirroring(encoded),false);assert.equal(writeMirroring(readMirroring(fixture(),encoded)),null);}
 const next=setHandleMirroring(value,0,1,'s');assert.equal(writeMirroring(readMirroring(next,writeMirroring(next))),'n,s,n');
});
test('topology edits retain unrelated modes and downgrade symmetric subdivision without changing geometry',()=>{
 const value=setHandleMirroring(fixture(),0,1,'s'),inserted=editAnchor(value,0,1,'insert',.3);
 assert.equal(inserted[0].mirroring.length,4);assert.equal(mirroringMode(inserted[0],1),'a');assert.equal(mirroringMode(inserted[0],2),'a');
 const deleted=editAnchor(inserted,0,2,'delete');assert.equal(deleted[0].mirroring.length,3);
 const reversed=continuePath(value,0,0);assert.equal(writeMirroring(reversed),'n,s,n');
 const split=splitPath(inserted,0,2).value;assert.equal(split.length,2);assert.equal(mirroringMode(split[0],1),'a');assert.equal(mirroringMode(split[0],2),'n');
 const joined=joinEndpoints(split,[0,2],[1,0]).value;assert.equal(joined[0].mirroring.length,4);assert.equal(mirroringMode(joined[0],1),'a');
 assert.equal(writeMirroring(editAnchor(value,0,1,'corner')),null);assert.equal(writeMirroring(editAnchor(value,0,1,'smooth')),'n,a,n');
});
