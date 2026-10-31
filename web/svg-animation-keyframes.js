import {newSvgAnimation,validateAnimation} from './svg-animation-model.js';

export const keyframeId=key=>JSON.stringify([key.element,key.property,key.time]);
const trackId=track=>JSON.stringify([track.element,track.property]);
const checked=animation=>{validateAnimation({...newSvgAnimation(),svg_animation:animation});return animation;};

function selectedKeys(animation,selection){
 const ids=new Set(selection.map(keyframeId)),found=[];
 for(const track of animation.tracks)for(const key of track.keys){
  const ref={element:track.element,property:track.property,time:key.time};
  if(ids.has(keyframeId(ref)))found.push({track,key,ref});
 }
 if(found.length!==ids.size)throw new Error('The selected keyframes changed. Select them again.');
 return found;
}

export function keyframeMoveDelta(animation,selection,delta){
 if(!Number.isFinite(delta))throw new Error('Enter a valid keyframe offset.');
 const keys=selectedKeys(animation,selection);if(!keys.length)return 0;
 const first=keys.reduce((time,{key})=>Math.min(time,key.time),Infinity),last=keys.reduce((time,{key})=>Math.max(time,key.time),0);
 return Math.max(-first,Math.min(animation.duration-last,Math.round(delta)));
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

export function deleteKeyframes(animation,selection){
 selectedKeys(animation,selection);
 const ids=new Set(selection.map(keyframeId)),next=structuredClone(animation);
 next.tracks=next.tracks.map(track=>({...track,keys:track.keys.filter(key=>!ids.has(keyframeId({...track,time:key.time})))})).filter(track=>track.keys.length);
 return checked(next);
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
