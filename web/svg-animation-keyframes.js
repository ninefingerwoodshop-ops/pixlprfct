import {newSvgAnimation,validateAnimation,validEasing,easingPoints,easings} from './svg-animation-model.js';

export const keyframeId=key=>JSON.stringify([key.element,key.property,key.time]);
const trackId=track=>JSON.stringify([track.element,track.property]);
const checked=animation=>{validateAnimation({...newSvgAnimation(),svg_animation:animation});return animation;};

export function adjacentKeyframeTime(animation,time,direction){
 if(!Number.isFinite(time)||![1,-1].includes(direction))return null;
 let nearest=null;
 for(const track of animation.tracks)for(const key of track.keys){
  const distance=(key.time-time)*direction;
  if(distance>0&&(nearest===null||distance<(nearest-time)*direction))nearest=key.time;
 }
 return nearest;
}

function selectedKeys(animation,selection){
 const ids=new Set(selection.map(keyframeId)),found=[];
 for(const track of animation.tracks)for(const key of track.keys){
  const ref={element:track.element,property:track.property,time:key.time};
  if(ids.has(keyframeId(ref)))found.push({track,key,ref});
 }
 if(found.length!==ids.size)throw new Error('The selected keyframes changed. Select them again.');
 return found;
}

export function keyframeEasing(animation,selection){
 const keys=selectedKeys(animation,selection);if(!keys.length)throw new Error('Select keyframes to edit their easing.');
 const value=keys[0].key.easing,curve=JSON.stringify(easingPoints(value));
 return {value:structuredClone(value),mixed:keys.some(({key})=>JSON.stringify(easingPoints(key.easing))!==curve),count:keys.length};
}

export function setKeyframeEasing(animation,selection,value){
 const keys=selectedKeys(animation,selection);if(!keys.length)throw new Error('Select keyframes to edit their easing.');
 if(!validEasing(value))throw new Error('Enter a valid easing curve.');
 if(keys.every(({key})=>JSON.stringify(key.easing)===JSON.stringify(value)))return animation;
 const ids=new Set(selection.map(keyframeId)),next=structuredClone(animation);
 for(const track of next.tracks)for(const key of track.keys)if(ids.has(keyframeId({...track,time:key.time})))key.easing=structuredClone(value);
 return checked(next);
}

export function keyframeMoveDelta(animation,selection,delta){
 if(!Number.isFinite(delta))throw new Error('Enter a valid keyframe offset.');
 const keys=selectedKeys(animation,selection);if(!keys.length)return 0;
 const first=keys.reduce((time,{key})=>Math.min(time,key.time),Infinity),last=keys.reduce((time,{key})=>Math.max(time,key.time),0);
 return Math.max(-first,Math.min(animation.duration-last,Math.round(delta)));
}

export function createKeyframeDrag(animation,selection,anchor,playhead){
 const keys=selectedKeys(animation,selection),ids=new Set(selection.map(keyframeId));
 if(!keys.length||!ids.has(keyframeId(anchor)))throw new Error('Select a keyframe to drag.');
 const first=keys.reduce((time,{key})=>Math.min(time,key.time),Infinity),last=keys.reduce((time,{key})=>Math.max(time,key.time),0);
 const clamp=delta=>Math.max(-first,Math.min(animation.duration-last,Math.round(delta)));
 const moving=new Map(),occupied=new Map(),points=new Set([0,animation.duration]);
 for(const {track,key} of keys){const id=trackId(track);if(!moving.has(id))moving.set(id,[]);moving.get(id).push(key.time);}
 const playheadTarget=Number.isFinite(playhead)&&playhead>=0&&playhead<=animation.duration?Math.round(playhead):null;
 if(playheadTarget!==null)points.add(playheadTarget);
 for(const track of animation.tracks){
  const stationary=track.keys.filter(key=>!ids.has(keyframeId({...track,time:key.time}))).map(key=>key.time);
  for(const time of stationary)points.add(time);
  if(moving.has(trackId(track)))occupied.set(trackId(track),new Set(stationary));
 }
 const targets=[...points].sort((a,b)=>a-b),origin=anchor.time;
 // Capture geometry once per drag; pointer updates inspect only nearby targets.
 return (offset,scale,{snap=false,free=false}={})=>{
  if(!Number.isFinite(offset)||!Number.isFinite(scale)||scale<=0)throw new Error('Enter a valid keyframe drag offset and scale.');
  const delta=clamp(offset);if(!snap||free)return {delta,snapTime:null};
  const time=origin+delta,radius=6/scale;let low=0,high=targets.length;
  while(low<high){const mid=Math.floor((low+high)/2);if(targets[mid]<time-radius)low=mid+1;else high=mid;}
  const candidates=[];
  for(let i=low;i<targets.length&&targets[i]<=time+radius;i++)candidates.push(targets[i]);
  candidates.sort((a,b)=>Math.abs(a-time)-Math.abs(b-time)||(a===playheadTarget?-1:b===playheadTarget?1:a-b));
  for(const target of candidates){
   const shift=target-origin;
   if(clamp(shift)!==shift)continue;
   if([...moving].some(([id,times])=>times.some(time=>occupied.get(id).has(time+shift))))continue;
   return {delta:shift,snapTime:target};
  }
  return {delta:clamp(Math.round((origin+offset)/100)*100-origin),snapTime:null};
 };
}

export function moveKeyframes(animation,selection,delta){
 delta=keyframeMoveDelta(animation,selection,delta);
 if(!delta)return {animation,selection:structuredClone(selection)};
 const ids=new Set(selection.map(keyframeId)),next=structuredClone(animation);
 for(const track of next.tracks){
  const moving=track.keys.filter(key=>ids.has(keyframeId({...track,time:key.time})));
  const occupied=new Set(track.keys.filter(key=>!moving.includes(key)).map(key=>key.time));
  if(moving.some(key=>occupied.has(key.time+delta)))throw new Error('There is already a keyframe at that time. The group was not moved.');
  for(const key of moving)key.time+=delta;
  track.keys.sort((a,b)=>a.time-b.time);
 }
 return {animation:checked(next),selection:selection.map(key=>({...key,time:key.time+delta}))};
}

export function keyframeTiming(animation,selection){
 const keys=selectedKeys(animation,selection);if(!keys.length)throw new Error('Select keyframes to edit their timing.');
 const start=keys.reduce((time,{key})=>Math.min(time,key.time),Infinity),end=keys.reduce((time,{key})=>Math.max(time,key.time),0);
 return {start,duration:end-start,count:keys.length};
}

export function retimeKeyframes(animation,selection,start,duration){
 const before=keyframeTiming(animation,selection);
 if(!Number.isInteger(start)||!Number.isInteger(duration)||start<0||duration<0)throw new Error('Enter whole milliseconds for the selection timing.');
 if(start+duration>animation.duration)throw new Error('The selection would exceed the animation duration. Extend the animation first.');
 if((before.duration===0)!==(duration===0))throw new Error(before.duration===0?'Select keyframes at different times to scale their duration.':'The selection duration must be at least 1 ms.');
 if(before.start===start&&before.duration===duration)return {animation,selection:structuredClone(selection)};
 const at=time=>start+(before.duration?Math.round((time-before.start)*duration/before.duration):0);
 const ids=new Set(selection.map(keyframeId)),next=structuredClone(animation);
 for(const track of next.tracks){
  const occupied=new Set();
  for(const key of track.keys){
   if(ids.has(keyframeId({...track,time:key.time})))key.time=at(key.time);
   if(occupied.has(key.time))throw new Error('The timing would overlap keyframes on the same track. Nothing was changed.');
   occupied.add(key.time);
  }
  track.keys.sort((a,b)=>a.time-b.time);
 }
 return {animation:checked(next),selection:selection.map(key=>({...key,time:at(key.time)}))};
}

export function deleteKeyframes(animation,selection){
 selectedKeys(animation,selection);
 const ids=new Set(selection.map(keyframeId)),next=structuredClone(animation);
 next.tracks=next.tracks.map(track=>({...track,keys:track.keys.filter(key=>!ids.has(keyframeId({...track,time:key.time})))})).filter(track=>track.keys.length);
 return checked(next);
}

function reversedEasing(value){
 const [x1,y1,x2,y2]=easingPoints(value),points=[1-x2,1-y2,1-x1,1-y1];
 return Object.keys(easings).find(name=>easings[name].every((n,i)=>Math.abs(n-points[i])<1e-12))??points;
}

export function reverseKeyframes(animation,selection){
 const {start,duration}=keyframeTiming(animation,selection);
 if(!duration)throw new Error('Select keyframes at different times to reverse.');
 const end=start+duration,at=time=>start+end-time,ids=new Set(selection.map(keyframeId)),next=structuredClone(animation);
 for(const track of next.tracks){
  const chosen=track.keys.filter(key=>ids.has(keyframeId({...track,time:key.time})));
  if(!chosen.length)continue;
  if(track.keys.some(key=>key.time>=start&&key.time<=end&&!chosen.includes(key)))throw new Error('Select every key on the affected tracks within this time range before reversing. Nothing was changed.');
  // Easing belongs to the outgoing segment, so it moves to the other end of
  // that segment on reversal. Preserve the outgoing curve at the range's end.
  const curves=chosen.map(key=>structuredClone(key.easing));
  chosen.forEach((key,index)=>{key.time=at(key.time);key.easing=index?reversedEasing(curves[index-1]):curves.at(-1);});
  track.keys.sort((a,b)=>a.time-b.time);
 }
 return {animation:checked(next),selection:selection.map(key=>({...key,time:at(key.time)}))};
}

export function copyKeyframes(animation,selection){
 const selected=selectedKeys(animation,selection);if(!selected.length)throw new Error('Select keyframes to copy.');
 const start=selected.reduce((time,{key})=>Math.min(time,key.time),Infinity),tracks=new Map();
 for(const {track,key} of selected){
  const id=trackId(track);if(!tracks.has(id))tracks.set(id,{...structuredClone(track),keys:[]});
  tracks.get(id).keys.push({...structuredClone(key),time:key.time-start});
 }
 return {version:1,tracks:[...tracks.values()]};
}

export function pasteKeyframes(animation,clipboard,time){
 if(!clipboard||clipboard.version!==1||!Array.isArray(clipboard.tracks)||!clipboard.tracks.length)throw new Error('Copy timeline keyframes first.');
 if(!Number.isFinite(time))throw new Error('Enter a valid paste time.');
 time=Math.round(time);const next=structuredClone(animation),selection=[];
 for(const source of clipboard.tracks){
  let track=next.tracks.find(track=>trackId(track)===trackId(source));
  if(!track){track={...structuredClone(source),keys:[]};next.tracks.push(track);}
  for(const key of source.keys){
   const at=time+key.time;
   if(at<0||at>next.duration)throw new Error('Pasted keyframes would fall outside the duration. Move the playhead or extend the duration first.');
   if(track.keys.some(key=>key.time===at))throw new Error('There is already a keyframe at that time. Nothing was pasted.');
   track.keys.push({...structuredClone(key),time:at});selection.push({element:source.element,property:source.property,time:at});
  }
  track.keys.sort((a,b)=>a.time-b.time);
 }
 return {animation:checked(next),selection};
}

export function pasteKeyframesToElement(animation,clipboard,time,element,origin){
 if(!clipboard||clipboard.version!==1||!Array.isArray(clipboard.tracks)||!clipboard.tracks.length)throw new Error('Copy timeline keyframes first.');
 if(typeof element!=='string'||!/^[-\w]+$/.test(element))throw new Error('Select a destination element first.');
 const sources=new Set(clipboard.tracks.map(track=>track.element));
 if(sources.size!==1)throw new Error('Copy keyframes from one element to paste onto another element. Nothing was pasted.');
 if(sources.has(element))return pasteKeyframes(animation,clipboard,time);
 if(clipboard.tracks.some(track=>['morph','motionProgress','fillGradient','strokeGradient','fillGradientRotation','strokeGradientRotation'].includes(track.property)))throw new Error('Morph, motion path and gradient keys can only be pasted onto their original element. Copy transform or appearance keys to reuse them on another element.');
 const retargeted={...clipboard,tracks:clipboard.tracks.map(track=>({...track,element}))};
 const result=pasteKeyframes(animation,retargeted,time);
 result.animation.origins[element]??=structuredClone(origin);
 return {...result,animation:checked(result.animation)};
}
