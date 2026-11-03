import {test} from 'node:test';
import assert from 'node:assert/strict';
import {elementTree,normalizeElementSelection,toggleElementSelection,rangeElementSelection,intersectsSelection} from '../web/svg-animation-selection-model.js';
const layers=[{id:'group',depth:0},{id:'a',depth:1},{id:'nested',depth:1},{id:'b',depth:2},{id:'c',depth:0},{id:'d',depth:0}];
test('SVG selection keeps stable order and removes duplicate, stale and descendant IDs',()=>{
 assert.deepEqual(elementTree(layers).map(layer=>layer.parent_id),[null,'group','group','nested',null,null]);
 assert.deepEqual(normalizeElementSelection(layers,['c','b','group','group','missing']),['group','c']);
 assert.deepEqual(normalizeElementSelection(layers,['b','a']),['a','b']);
});
test('individual toggles can replace an ancestor with a child or children with a parent',()=>{
 assert.deepEqual(toggleElementSelection(layers,['group','c'],'b'),['b','c']);
 assert.deepEqual(toggleElementSelection(layers,['a','b','c'],'group'),['group','c']);
 assert.deepEqual(toggleElementSelection(layers,['a','c'],'a'),['c']);
});
test('layer ranges follow visible rows in either direction and fall back from hidden anchors',()=>{
 assert.deepEqual(rangeElementSelection(layers,layers,'d','a'),['a','nested','c','d']);
 assert.deepEqual(rangeElementSelection(layers,[layers[1],layers[4]],'a','c'),['a','c']);
 assert.deepEqual(rangeElementSelection(layers,[layers[4]],'a','c'),['c']);
});
test('marquee intersects transformed bounds and thin lines without selecting empty rotated corners',()=>{
 const diamond=[{x:0,y:5},{x:5,y:0},{x:10,y:5},{x:5,y:10}];
 assert.equal(intersectsSelection(diamond,{x:1,y:1},{x:0,y:0}),false);
 assert.equal(intersectsSelection(diamond,{x:6,y:6},{x:4,y:4}),true);
 assert.equal(intersectsSelection([{x:0,y:0},{x:10,y:10}],{x:4,y:5},{x:6,y:7}),true);
 assert.equal(intersectsSelection([{x:0,y:0},{x:10,y:10}],{x:1,y:8},{x:2,y:9}),false);
 assert.equal(intersectsSelection([{x:NaN,y:0}],{x:0,y:0},{x:1,y:1}),false);
});
