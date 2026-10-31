import test from 'node:test';
import assert from 'node:assert/strict';
import {newSvgAnimation,putKey,setMotionPath} from '../web/svg-animation-model.js';
import {morphPath,moveMorphPoint} from '../web/svg-animation-morph.js';
import {keyframeMoveDelta,moveKeyframes,deleteKeyframes,copyKeyframes,pasteKeyframes,keyframeEasing,setKeyframeEasing} from '../web/svg-animation-keyframes.js';
const ref=(element,property,time)=>({element,property,time});
function example(){let a=newSvgAnimation().svg_animation;for(const [id,prop,keys] of [['one','x',[[0,0],[1000,40],[2000,80]]],['two','opacity',[[0,1],[500,.5],[2000,0]]]])for(const [time,value] of keys)a=putKey(a,id,prop,time,value,[.2,.7,.7,.9]);return a;}

test('group easing updates only selected curves, preserves timing and values, and isolates arrays',()=>{
 const a=example(),before=structuredClone(a),keys=[ref('one','x',1000),ref('two','opacity',500)],curve=[.1,.2,.3,.4];
 const next=setKeyframeEasing(a,keys,curve),expected=structuredClone(a);expected.tracks[0].keys[1].easing=[...curve];expected.tracks[1].keys[1].easing=[...curve];
 assert.deepEqual(next,expected);assert.deepEqual(a,before);assert.deepEqual(keyframeEasing(next,keys),{value:curve,mixed:false,count:2});
 assert.equal(setKeyframeEasing(next,keys,curve),next);curve[0]=.9;next.tracks[0].keys[1].easing[1]=.8;assert.deepEqual(next.tracks[1].keys[1].easing,[.1,.2,.3,.4]);
});

test('group easing distinguishes mixed curves and rejects invalid or stale selections atomically',()=>{
 let a=example();const keys=[ref('one','x',0),ref('two','opacity',0)];a=setKeyframeEasing(a,[keys[0]],'linear');assert.equal(keyframeEasing(a,keys).mixed,true);
 a=setKeyframeEasing(a,[keys[1]],[0,0,1,1]);assert.deepEqual(keyframeEasing(a,[...keys,keys[0]]),{value:'linear',mixed:false,count:2});
 const before=structuredClone(a);
 for(const value of ['unknown',[-.1,0,1,1],[0,0,1,NaN],[0,0,1]])assert.throws(()=>setKeyframeEasing(a,keys,value),/valid/);
 assert.throws(()=>setKeyframeEasing(a,[...keys,ref('missing','x',0)],'ease'),/changed/);assert.throws(()=>setKeyframeEasing(a,[],'ease'),/Select/);assert.deepEqual(a,before);
});

test('group retiming preserves offsets, values and easing across tracks and clamps as a unit',()=>{
 const a=example(),before=structuredClone(a),selected=[ref('one','x',1000),ref('two','opacity',500)];
 const result=moveKeyframes(a,selected,250);assert.deepEqual(result.selection.map(k=>k.time),[1250,750]);
 assert.deepEqual(result.animation.tracks[0].keys[1],{...a.tracks[0].keys[1],time:1250});assert.deepEqual(result.animation.tracks[1].keys[1],{...a.tracks[1].keys[1],time:750});
 assert.equal(keyframeMoveDelta(a,selected,-2000),-500);assert.equal(keyframeMoveDelta(a,selected,10000),2000);
 assert.deepEqual(moveKeyframes(a,selected,10000).selection.map(k=>k.time),[3000,2500]);assert.deepEqual(a,before);
});

test('group moves allow vacated selected times but reject collisions atomically',()=>{
 const a=example(),before=structuredClone(a);
 const moved=moveKeyframes(a,[ref('one','x',0),ref('one','x',1000),ref('one','x',2000)],500);assert.deepEqual(moved.animation.tracks[0].keys.map(k=>k.time),[500,1500,2500]);
 assert.throws(()=>moveKeyframes(a,[ref('one','x',1000),ref('two','opacity',500)],1000),/already/);assert.deepEqual(a,before);
 assert.throws(()=>moveKeyframes(a,[ref('one','x',123)],10),/changed/);assert.throws(()=>keyframeMoveDelta(a,[],NaN),/valid/);
});

test('clipboard snapshots paste at the playhead with relative timing and independent values',()=>{
 const a=example(),selected=[ref('one','x',1000),ref('two','opacity',500)],clip=copyKeyframes(a,selected);
 const result=pasteKeyframes(a,clip,2200);assert.deepEqual(result.selection.map(k=>k.time),[2700,2200]);
 assert.equal(result.animation.tracks[0].keys.at(-1).value,40);assert.equal(result.animation.tracks[1].keys.at(-1).value,.5);
 result.animation.tracks[0].keys.at(-1).easing[0]=.99;assert.equal(clip.tracks[0].keys[0].easing[0],.2);assert.equal(a.tracks[0].keys[1].easing[0],.2);
});

test('paste rejects collisions, out-of-range keys, and limits without partial edits',()=>{
 const a=example(),before=structuredClone(a),clip=copyKeyframes(a,[ref('one','x',1000),ref('two','opacity',500)]);
 assert.throws(()=>pasteKeyframes(a,clip,1500),/already/);assert.throws(()=>pasteKeyframes(a,clip,2800),/duration/);assert.throws(()=>pasteKeyframes(a,clip,-1),/duration/);assert.throws(()=>pasteKeyframes(a,null,0),/Copy/);assert.deepEqual(a,before);
 let dense=newSvgAnimation().svg_animation;for(let i=0;i<200;i++)dense=putKey(dense,'one','x',i,0);
 assert.throws(()=>pasteKeyframes(dense,copyKeyframes(dense,[ref('one','x',0)]),500),/Invalid/);assert.equal(dense.tracks[0].keys.length,200);
});

test('deleting and restoring a copied track retains motion metadata and morph geometry',()=>{
 let a=setMotionPath(newSvgAnimation().svg_animation,'one',{d:'M0 0L100 100',name:'Route',rotate:'auto'},[10,10]);
 const shape=morphPath('M0 0L20 0L20 20Z');a=putKey(a,'two','morph',0,shape);a=putKey(a,'two','morph',1000,moveMorphPoint(shape,0,1,'anchor',30,0));
 const selected=a.tracks.flatMap(t=>t.keys.map(k=>ref(t.element,t.property,k.time))),clip=copyKeyframes(a,selected),deleted=deleteKeyframes(a,selected);
 assert.equal(deleted.tracks.length,0);assert.deepEqual(pasteKeyframes(deleted,clip,0).animation,a);
 const incompatible=structuredClone(a);incompatible.tracks[1].keys=[{time:2000,value:morphPath('M0 0L10 10'),easing:'linear'}];
 assert.throws(()=>pasteKeyframes(incompatible,{version:1,tracks:[clip.tracks[1]]},0),/same nodes/);
});
