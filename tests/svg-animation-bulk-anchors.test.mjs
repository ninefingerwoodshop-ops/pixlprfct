import {test} from 'node:test';
import assert from 'node:assert/strict';
import {morphPath} from '../web/svg-animation-morph.js';
import {editPathAnchors} from '../web/svg-animation-drawing-model.js';

const fixture=()=>{const value=morphPath('M0 0L30 30L60 0L90 30L120 0 M200 0L240 0L240 40L200 40Z M300 0L350 0');value[0].mirroring=['n','a','s','a','n'];value[1].mirroring=['s','a','n','s'];return value;};

test('group smoothing and corner conversion preserve unselected points, topology and metadata',()=>{
 const value=fixture(),before=structuredClone(value),selection=[[0,1],[0,2],[1,0],[1,3],[0,1]],result=editPathAnchors(value,selection,'smooth');
 assert.deepEqual(result.selections,selection.slice(0,-1));assert.deepEqual(value,before);assert.deepEqual(result.value[2],value[2]);assert.equal(result.value[1].closed,true);
 assert.deepEqual(result.value[0].points[0],value[0].points[0]);assert.deepEqual(result.value[0].points[3],value[0].points[3]);assert.deepEqual(result.value[1].points[2],value[1].points[2]);
 for(const [path,index] of result.selections){const p=result.value[path].points[index];assert.deepEqual(p.slice(0,2),value[path].points[index].slice(0,2));assert.notDeepEqual(p.slice(2,4),p.slice(0,2));assert.ok(Math.abs((p[2]-p[0])*(p[5]-p[1])-(p[3]-p[1])*(p[4]-p[0]))<1e-8);assert.equal(result.value[path].mirroring[index],'a');}
 const corner=editPathAnchors(result.value,result.selections,'corner');for(const [path,index] of corner.selections){const p=corner.value[path].points[index];assert.deepEqual(p,[p[0],p[1],p[0],p[1],p[0],p[1]]);assert.equal(corner.value[path].mirroring[index],'n');}
 assert.deepEqual(corner.value[0].points,value[0].points);assert.deepEqual(corner.value[1].points,value[1].points);
});

test('group deletion uses original indexes across open and closed subpaths and remaps selection',()=>{
 const value=fixture(),before=structuredClone(value),result=editPathAnchors(value,[[0,3],[1,0],[0,1],[1,3],[0,3]],'delete');
 assert.deepEqual(result.value[0].points,[value[0].points[0],value[0].points[2],value[0].points[4]]);assert.deepEqual(result.value[0].mirroring,['n','s','n']);
 assert.deepEqual(result.value[1].points,[value[1].points[1],value[1].points[2]]);assert.deepEqual(result.value[1].mirroring,['a','n']);assert.equal(result.value[1].closed,true);
 assert.deepEqual(result.selections,[[0,1],[1,0]]);assert.deepEqual(result.value[2],value[2]);assert.deepEqual(value,before);
 const end=editPathAnchors(value,[[0,4],[0,3]],'delete');assert.deepEqual(end.selections,[[0,2]]);
});

test('bulk operations reject invalid selections, undersized subpaths and out-of-bounds smoothing atomically',()=>{
 const value=fixture(),before=structuredClone(value);
 for(const operation of ['delete','smooth','corner']){assert.throws(()=>editPathAnchors(value,[],operation),/Select anchors/);assert.throws(()=>editPathAnchors(value,[[0,1],[3,0]],operation),/no longer available/);assert.throws(()=>editPathAnchors(value,[[0,1.5]],operation),/no longer available/);}
 assert.throws(()=>editPathAnchors(value,[[0,1],[2,0]],'delete'),/two anchors in each subpath/);assert.throws(()=>editPathAnchors(value,[[1,0],[1,1],[1,2]],'delete'),/two anchors/);assert.throws(()=>editPathAnchors(value,[[0,1]],'insert'),/Delete, Smooth or Corner/);assert.deepEqual(value,before);
 const edge=morphPath('M99990 -20L100000 0L99999 20'),copy=structuredClone(edge);assert.throws(()=>editPathAnchors(edge,[[0,0],[0,1]],'smooth'),/100,000/);assert.deepEqual(edge,copy);
});
