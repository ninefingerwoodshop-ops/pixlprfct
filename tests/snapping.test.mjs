import test from 'node:test';import assert from 'node:assert/strict';
import {snapMovement,normalizeSnapping} from '../web/snapping.js';
const target={id:1,kind:'rectangle',x:100,y:100,width:50,height:50,parent_id:0};
const box={x:77,y:120,width:20,height:20};
test('snaps edges and centers, excludes moving and hidden layers',()=>{
 const settings=normalizeSnapping({grid:false});const result=snapMovement([target],box,new Set(),1,settings,undefined,false);assert.equal(result.dx,3);assert.equal(result.lines[0].value,100);
 assert.equal(snapMovement([target],box,new Set([1]),1,settings,undefined,false).dx,0);
 assert.equal(snapMovement([{...target,hidden:true}],box,new Set(),1,settings,undefined,false).dx,0);
 assert.equal(snapMovement([target],{...box,x:112},new Set(),1,settings,undefined,false).dx,3);
});
test('increments use document coordinates, preserve locked axes, and respect disabling and zoom',()=>{
 const settings=normalizeSnapping({increment:8});assert.equal(snapMovement([],box,new Set(),1,settings,{x:true,y:false},false).dx,3);assert.equal(snapMovement([],box,new Set(),1,settings,{x:true,y:false},false).dy,0);
 assert.deepEqual(snapMovement([target],box,new Set(),1,{...settings,enabled:false}),{dx:0,dy:0,lines:[]});
 assert.equal(snapMovement([target],box,new Set(),4,{...settings,grid:false},undefined,false).dx,0);
 assert.equal(normalizeSnapping({increment:0}).increment,1);
});
