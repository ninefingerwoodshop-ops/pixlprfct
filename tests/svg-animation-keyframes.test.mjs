import test from 'node:test';
import assert from 'node:assert/strict';
import {newSvgAnimation,putKey,setMotionPath} from '../web/svg-animation-model.js';
import {morphPath,moveMorphPoint} from '../web/svg-animation-morph.js';
import {keyframeMoveDelta,moveKeyframes,keyframeTiming,retimeKeyframes,deleteKeyframes,copyKeyframes,pasteKeyframes,pasteKeyframesToElement,keyframeEasing,setKeyframeEasing} from '../web/svg-animation-keyframes.js';
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

test('selection timing scales across tracks, preserving key values, curves and unselected keys',()=>{
 const a=example(),before=structuredClone(a),keys=[ref('one','x',1000),ref('two','opacity',500),ref('one','x',2000)];
 assert.deepEqual(keyframeTiming(a,keys),{start:500,duration:1500,count:3});
 const {animation,selection}=retimeKeyframes(a,keys,1000,1800),expected=structuredClone(a);
 expected.tracks[0].keys[1].time=1600;expected.tracks[0].keys[2].time=2800;expected.tracks[1].keys[1].time=1000;
 assert.deepEqual(animation,expected);assert.deepEqual(selection.map(k=>k.time),[1600,1000,2800]);assert.deepEqual(a,before);
 assert.equal(retimeKeyframes(a,keys,500,1500).animation,a);
 const compressed=retimeKeyframes(animation,selection,100,300);assert.deepEqual(compressed.selection.map(k=>k.time),[200,100,400]);
});

test('selection timing rejects collisions, rounding overlaps, invalid ranges and stale selections atomically',()=>{
 const a=example(),before=structuredClone(a),keys=[ref('one','x',0),ref('one','x',1000)];
 assert.throws(()=>retimeKeyframes(a,keys,1000,1000),/overlap/);
 const all=a.tracks[0].keys.map(k=>ref('one','x',k.time));assert.throws(()=>retimeKeyframes(a,all,0,1),/overlap/);
 for(const [start,duration] of [[-1,100],[NaN,100],[0,Infinity],[.5,100],[0,10.5],[0,-1]])assert.throws(()=>retimeKeyframes(a,keys,start,duration),/whole milliseconds/);
 assert.throws(()=>retimeKeyframes(a,keys,2500,1000),/exceed/);assert.throws(()=>retimeKeyframes(a,keys,0,0),/at least/);
 assert.throws(()=>retimeKeyframes(a,[ref('one','x',999)],0,0),/changed/);assert.throws(()=>retimeKeyframes(a,[],0,0),/Select/);assert.deepEqual(a,before);
});

test('selection timing moves a single instant and rounds proportional times without losing metadata',()=>{
 const a=example(),keys=[ref('one','x',0),ref('two','opacity',0)];
 assert.deepEqual(retimeKeyframes(a,keys,3000,0).selection.map(k=>k.time),[3000,3000]);
 assert.throws(()=>retimeKeyframes(a,keys,10,100),/different times/);
 assert.deepEqual(retimeKeyframes(a,[ref('one','x',0)],250,0).animation.tracks[0].keys[0],{...a.tracks[0].keys[0],time:250});
 const all=a.tracks[0].keys.map(k=>ref('one','x',k.time));assert.deepEqual(retimeKeyframes(a,all,0,1001).selection.map(k=>k.time),[0,501,1001]);
 let rich=setMotionPath(newSvgAnimation().svg_animation,'one',{d:'M0 0L100 100',name:'Route',rotate:'auto'},[10,10]);
 const shape=morphPath('M0 0L20 0L20 20Z');rich=putKey(rich,'two','morph',0,shape);rich=putKey(rich,'two','morph',3000,moveMorphPoint(shape,0,1,'anchor',30,0));
 const selection=rich.tracks.flatMap(t=>t.keys.map(k=>ref(t.element,t.property,k.time))),result=retimeKeyframes(rich,selection,500,2000),expected=structuredClone(rich);
 for(const track of expected.tracks){track.keys[0].time=500;track.keys[1].time=2500;}
 assert.deepEqual(result.animation,expected);
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

test('pasting to another element keeps property types, relative timing and easing without sharing data',()=>{
 let a=example();a=putKey(a,'one','opacity',500,.8);a=putKey(a,'one','opacity',1500,.2);a.origins.one=[10,20];
 const before=structuredClone(a),clip=copyKeyframes(a,[ref('one','x',1000),ref('one','x',2000),ref('one','opacity',500),ref('one','opacity',1500)]),origin=[80,60];
 const result=pasteKeyframesToElement(a,clip,250,'three',origin);
 assert.deepEqual(result.animation.tracks.slice(0,a.tracks.length),a.tracks);
 assert.deepEqual(result.animation.tracks.slice(a.tracks.length),clip.tracks.map(track=>({...track,element:'three',keys:track.keys.map(key=>({...key,time:key.time+250}))})));
 assert.deepEqual(result.selection,[ref('three','x',750),ref('three','x',1750),ref('three','opacity',250),ref('three','opacity',1250)]);
 assert.deepEqual(result.animation.origins,{one:[10,20],three:[80,60]});assert.deepEqual(a,before);
 origin[0]=500;result.animation.tracks.at(-2).keys[0].easing[0]=.9;
 assert.deepEqual(result.animation.origins.three,[80,60]);assert.equal(clip.tracks[0].keys[0].easing[0],.2);assert.deepEqual(a,before);
});

test('pasting animation retains the destination origin and unrelated keys and properties',()=>{
 let a=example();a=putKey(a,'two','x',0,5);a.origins.two=[700,800];const before=structuredClone(a),clip=copyKeyframes(a,[ref('one','x',1000),ref('one','x',2000)]);
 const result=pasteKeyframesToElement(a,clip,500,'two',[80,60]).animation;
 assert.deepEqual(result.origins,a.origins);assert.deepEqual(result.tracks.slice(0,2),a.tracks.slice(0,2));
 assert.deepEqual(result.tracks[2].keys.map(key=>[key.time,key.value]),[[0,5],[500,40],[1500,80]]);assert.deepEqual(a,before);
});

test('destination paste rejects ambiguous selections, collisions, invalid ranges and limits atomically',()=>{
 let a=example();a=putKey(a,'two','x',1500,5);const before=structuredClone(a),clip=copyKeyframes(a,[ref('one','x',1000),ref('one','x',2000)]),copy=structuredClone(clip);
 assert.throws(()=>pasteKeyframesToElement(a,null,0,'two',[0,0]),/Copy timeline/);
 assert.throws(()=>pasteKeyframesToElement(a,clip,0,null,[0,0]),/destination element/);
 assert.throws(()=>pasteKeyframesToElement(a,copyKeyframes(a,[ref('one','x',1000),ref('two','opacity',500)]),0,'three',[0,0]),/one element/);
 assert.throws(()=>pasteKeyframesToElement(a,clip,500,'two',[0,0]),/already/);
 assert.throws(()=>pasteKeyframesToElement(a,clip,2500,'three',[0,0]),/duration/);
 assert.throws(()=>pasteKeyframesToElement(a,clip,0,'three',[NaN,0]),/origin/);
 assert.deepEqual(a,before);assert.deepEqual(clip,copy);
 let dense=newSvgAnimation().svg_animation;for(let i=0;i<200;i++)dense=putKey(dense,'target','x',i,0);dense=putKey(dense,'source','x',0,1);
 assert.throws(()=>pasteKeyframesToElement(dense,copyKeyframes(dense,[ref('source','x',0)]),500,'target',[0,0]),/Invalid/);assert.equal(dense.tracks[0].keys.length,200);
});

test('geometry-specific animation stays on its original element with no partial paste of other tracks',()=>{
 let a=setMotionPath(newSvgAnimation().svg_animation,'one',{d:'M0 0L100 100',name:'Route',rotate:'auto'},[10,10]);
 a=putKey(a,'one','rotation',0,0);a=putKey(a,'two','morph',0,morphPath('M0 0L20 0L20 20Z'));const before=structuredClone(a);
 const route=copyKeyframes(a,[ref('one','rotation',0),ref('one','motionProgress',0)]),morph=copyKeyframes(a,[ref('two','morph',0)]);
 for(const clip of [route,morph])assert.throws(()=>pasteKeyframesToElement(a,clip,500,'three',[0,0]),/original element/);
 assert.deepEqual(pasteKeyframesToElement(a,route,500,'one',[0,0]),pasteKeyframes(a,route,500));
 assert.deepEqual(pasteKeyframesToElement(a,morph,500,'two',[0,0]),pasteKeyframes(a,morph,500));assert.deepEqual(a,before);
});

test('deleting and restoring a copied track retains motion metadata and morph geometry',()=>{
 let a=setMotionPath(newSvgAnimation().svg_animation,'one',{d:'M0 0L100 100',name:'Route',rotate:'auto'},[10,10]);
 const shape=morphPath('M0 0L20 0L20 20Z');a=putKey(a,'two','morph',0,shape);a=putKey(a,'two','morph',1000,moveMorphPoint(shape,0,1,'anchor',30,0));
 const selected=a.tracks.flatMap(t=>t.keys.map(k=>ref(t.element,t.property,k.time))),clip=copyKeyframes(a,selected),deleted=deleteKeyframes(a,selected);
 assert.equal(deleted.tracks.length,0);assert.deepEqual(pasteKeyframes(deleted,clip,0).animation,a);
 const incompatible=structuredClone(a);incompatible.tracks[1].keys=[{time:2000,value:morphPath('M0 0L10 10'),easing:'linear'}];
 assert.throws(()=>pasteKeyframes(incompatible,{version:1,tracks:[clip.tracks[1]]},0),/same nodes/);
});
