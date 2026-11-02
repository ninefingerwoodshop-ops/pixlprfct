import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movePathAnchors} from '../web/svg-animation-drawing-model.js';

const fixture=()=>[{closed:false,points:[[10,20,10,20,30,40],[50,60,40,50,70,80],[90,20,80,30,90,20]],mirroring:['n','s','n']},{closed:true,points:[[0,0,0,0,0,0],[10,10,10,10,10,10]]}];
test('group movement carries both handles across subpaths without changing other anchors or modes',()=>{
 const before=fixture(),next=movePathAnchors(before,[[0,1],[1,0],[0,1]],7,-3);
 assert.deepEqual(next[0].points[1],[57,57,47,47,77,77]);assert.deepEqual(next[1].points[0],[7,-3,7,-3,7,-3]);
 assert.deepEqual(next[0].points[0],before[0].points[0]);assert.deepEqual(next[0].points[2],before[0].points[2]);assert.deepEqual(next[0].mirroring,before[0].mirroring);assert.deepEqual(before,fixture());
});
test('invalid group movement fails atomically when any handle exceeds the coordinate bounds',()=>{
 const before=fixture();for(const [selection,dx,dy] of [[[[0,0],[0,1]],99940,0],[[[0,0]],NaN,0],[[[0,99]],1,0],[[],1,0]])assert.throws(()=>movePathAnchors(before,selection,dx,dy));assert.deepEqual(before,fixture());
});
