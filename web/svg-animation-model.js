// SVG animation projects use their own versioned document payload. They never
// pass through the regular design engine's shape serializer.
import {validGradientStops,mixGradientStops} from './svg-animation-gradient-model.js';
import {parsePath} from './svg-path.js';
import {validMorph,sameMorphTopology,interpolateMorph} from './svg-animation-morph.js';
import {validInteraction} from './svg-animation-interactions.js';
export const SVG_ANIMATION_TYPE='svg-animation';
export const properties={
 x:{label:'Position X',initial:0,min:-100000,max:100000},y:{label:'Position Y',initial:0,min:-100000,max:100000},
 rotation:{label:'Rotation',initial:0,min:-36000,max:36000},scaleX:{label:'Scale X',initial:1,min:.001,max:100},scaleY:{label:'Scale Y',initial:1,min:.001,max:100},
 opacity:{label:'Opacity',initial:1,min:0,max:1,attribute:'opacity'},fill:{label:'Fill color',initial:'#000000',color:true,attribute:'fill'},
 stroke:{label:'Stroke color',initial:'#000000',color:true,attribute:'stroke'},strokeWidth:{label:'Stroke width',initial:1,min:0,max:10000,attribute:'stroke-width'},
 strokeOffset:{label:'Stroke offset',initial:0,min:-100000,max:100000,attribute:'stroke-dashoffset'},
 fillGradientRotation:{label:'Fill gradient rotation',initial:0,min:-36000,max:36000,gradientRotation:true,channel:'fill'},
 strokeGradientRotation:{label:'Stroke gradient rotation',initial:0,min:-36000,max:36000,gradientRotation:true,channel:'stroke'},
 fillGradient:{label:'Fill gradient stops',initial:null,gradient:true,channel:'fill'},
 strokeGradient:{label:'Stroke gradient stops',initial:null,gradient:true,channel:'stroke'},
 motionProgress:{label:'Path progress (%)',initial:0,min:0,max:100,motion:true},
 morph:{label:'Morph',initial:null,morph:true,attribute:'d'},
};
export const easings={linear:[0,0,1,1],ease:[.25,.1,.25,1],'ease-in':[.42,0,1,1],'ease-out':[0,0,.58,1],'ease-in-out':[.42,0,.58,1]};
export const validEasing=value=>typeof value==='string'?Object.hasOwn(easings,value):Array.isArray(value)&&value.length===4&&value.every(n=>Number.isFinite(n)&&n>=0&&n<=1);
export function easingPoints(value){if(!validEasing(value))throw new Error('Easing controls must be between 0 and 1.');return Array.isArray(value)?value:easings[value];}
export const isSvgAnimation=doc=>doc?.design_type===SVG_ANIMATION_TYPE;
export function newSvgAnimation(name=''){
 return {version:2,design_type:SVG_ANIMATION_TYPE,name:name.trim().slice(0,256)||'Untitled animation',shapes:[],pages:[{id:1,name:'Animation'}],active_page:1,
  svg_animation:{version:1,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"/>',duration:3000,loop:true,tracks:[],origins:{}}};
}
export function validateAnimation(doc){
 const a=doc?.svg_animation;
 if(!isSvgAnimation(doc)||doc.version!==2||typeof doc.name!=='string'||!doc.name.trim()||new TextEncoder().encode(doc.name).length>256||!Array.isArray(doc.shapes)||doc.shapes.length||!Array.isArray(doc.pages)||!a||a.version!==1||typeof a.svg!=='string'||a.svg.length>2_000_000||!Number.isInteger(a.duration)||a.duration<1||a.duration>60000||typeof a.loop!=='boolean'||!Array.isArray(a.tracks)||a.tracks.length>1000)throw new Error('Invalid SVG animation project.');
 const seen=new Set();
 if(a.interaction!==undefined&&!validInteraction(a.interaction))throw new Error('Invalid animation interaction settings.');
 for(const t of a.tracks){
  if(!t||typeof t.element!=='string'||!/^[-\w]+$/.test(t.element)||!Object.hasOwn(properties,t.property)||!Array.isArray(t.keys)||!t.keys.length||t.keys.length>200)throw new Error('Invalid animation track.');
  const id=t.element+':'+t.property;if(seen.has(id))throw new Error('Duplicate animation track.');seen.add(id);
  let previous=-1;
  for(const k of t.keys){if(!k||!Number.isInteger(k.time)||k.time<=previous||k.time>a.duration||!validValue(t.property,k.value)||!validEasing(k.easing))throw new Error('Invalid animation keyframe.');previous=k.time;}
  if(properties[t.property].gradient&&t.keys.some(k=>k.value.length!==t.keys[0].value.length))throw new Error('Gradient keyframes must have the same number of stops.');
  if(t.property==='morph'&&t.keys.some(k=>!sameMorphTopology(t.keys[0].value,k.value)))throw new Error('Morph keyframes must have the same nodes and open or closed paths.');
  if(t.property==='motionProgress')validateMotionPath(t.motion);
 }
 if(!a.origins||typeof a.origins!=='object'||Array.isArray(a.origins)||Object.keys(a.origins).length>5000||Object.entries(a.origins).some(([id,v])=>!/^[-\w]+$/.test(id)||!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isFinite(n)||Math.abs(n)>100000)))throw new Error('Invalid animation origin.');
 return doc;
}
export function validValue(property,value){const p=properties[property];return !!p&&(p.gradient?validGradientStops(value):p.morph?validMorph(value):p.color?typeof value==='string'&&/^#[\da-f]{6}$/i.test(value):Number.isFinite(value)&&value>=p.min&&value<=p.max);}
export function eased(progress,name='linear'){
 const [x1,y1,x2,y2]=easingPoints(name),t=Math.max(0,Math.min(1,progress));
 if(name==='linear'||t===0||t===1)return t;
 const curve=(u,a,b)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
 let lo=0,hi=1;for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(curve(mid,x1,x2)<t)lo=mid;else hi=mid;}return curve((lo+hi)/2,y1,y2);
}
export function trackValue(track,time){
 const keys=track.keys;if(time<=keys[0].time)return keys[0].value;if(time>=keys.at(-1).time)return keys.at(-1).value;
 const next=keys.findIndex(k=>k.time>time),a=keys[next-1],b=keys[next],t=eased((time-a.time)/(b.time-a.time),a.easing);
 if(properties[track.property].gradient)return mixGradientStops(a.value,b.value,t);
 if(properties[track.property].morph)return interpolateMorph(a.value,b.value,t);
 if(properties[track.property].color){const rgb=[1,3,5].map(i=>Math.round(parseInt(a.value.slice(i,i+2),16)*(1-t)+parseInt(b.value.slice(i,i+2),16)*t));return '#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('');}
 return a.value+(b.value-a.value)*t;
}
export function putKey(animation,element,property,time,value,easing='linear',initial=properties[property]?.initial){
 if(!validValue(property,value))throw new Error('Enter a valid '+(properties[property]?.label??'property')+' value.');
 if(!validEasing(easing))throw new Error('Enter a valid easing curve.');
 const next=structuredClone(animation);time=Math.max(0,Math.min(next.duration,Math.round(time)));
 let track=next.tracks.find(t=>t.element===element&&t.property===property);
 if(property==='morph'&&track&&!sameMorphTopology(track.keys[0].value,value))throw new Error('Morph keyframes must have the same nodes and open or closed paths.');
 if(!track){track={element,property,keys:[]};if(time>0)track.keys.push({time:0,value:structuredClone(validValue(property,initial)?initial:value),easing:'linear'});next.tracks.push(track);}
 if(property==='morph'&&track.keys.length&&!sameMorphTopology(track.keys[0].value,value))throw new Error('Morph keyframes must have the same nodes and open or closed paths.');
 if(properties[property].gradient&&track.keys.some(k=>k.value.length!==value.length))throw new Error('Gradient keyframes must have the same number of stops.');
 value=structuredClone(value);easing=structuredClone(easing);const key=track.keys.find(k=>k.time===time);if(key)Object.assign(key,{value,easing});else track.keys.push({time,value,easing});track.keys.sort((a,b)=>a.time-b.time);
 if(track.keys.length>200)throw new Error('A property can contain up to 200 keyframes.');return next;
}
export function deleteKey(animation,element,property,time){const next=structuredClone(animation);next.tracks=next.tracks.map(t=>t.element===element&&t.property===property?{...t,keys:t.keys.filter(k=>k.time!==time)}:t).filter(t=>t.keys.length);return next;}
export function moveKey(animation,element,property,from,to){
 const next=structuredClone(animation),t=next.tracks.find(t=>t.element===element&&t.property===property);to=Math.max(0,Math.min(next.duration,Math.round(to)));
 if(!t||from===to)return animation;if(t.keys.some(k=>k.time===to))throw new Error('There is already a keyframe at that time.');const k=t.keys.find(k=>k.time===from);if(!k)return animation;k.time=to;t.keys.sort((a,b)=>a.time-b.time);return next;
}
export function resizeDuration(animation,duration){
 if(!Number.isInteger(duration)||duration<1||duration>60000)throw new Error('Duration must be between 1 and 60,000 ms.');
 if(animation.tracks.some(t=>t.keys.some(k=>k.time>duration)))throw new Error('Move or delete keyframes beyond the new duration first.');return {...animation,duration};
}
export function exportKeys(track,duration){const keys=structuredClone(track.keys);if(keys[0].time>0)keys.unshift({...keys[0],time:0,easing:'linear'});if(keys.at(-1).time<duration){keys.at(-1).easing='linear';keys.push({...keys.at(-1),time:duration});}return keys;}
export function validateMotionPath(motion){
 if(!motion||typeof motion.d!=='string'||motion.d.length>200000||typeof motion.name!=='string'||motion.name.length>256||!['none','auto','auto-reverse'].includes(motion.rotate))throw new Error('Invalid motion path.');
 const paths=parsePath(motion.d);if(paths.length!==1||paths[0].points.length<2)throw new Error('Choose one continuous motion path.');
 return motion;
}
export function setMotionPath(animation,element,motion,origin){
 if(!motion)return {...animation,tracks:animation.tracks.filter(t=>t.element!==element||t.property!=='motionProgress')};
 validateMotionPath(motion);let next=structuredClone(animation),track=next.tracks.find(t=>t.element===element&&t.property==='motionProgress');
 if(!track){next=putKey(next,element,'motionProgress',0,0);next=putKey(next,element,'motionProgress',next.duration,100);track=next.tracks.find(t=>t.element===element&&t.property==='motionProgress');}
 track.motion=structuredClone(motion);next.origins[element]??=origin;return next;
}
