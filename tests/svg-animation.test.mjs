import test from 'node:test';
import assert from 'node:assert/strict';
import {newSvgAnimation,validateAnimation,putKey,trackValue,moveKey,deleteKey,resizeDuration,exportKeys,eased,setMotionPath,easingPoints} from '../web/svg-animation-model.js';
import {newDesign,LocalDrafts} from '../web/local-drafts.js';
import {projectUrl} from '../web/project-navigation.js';
import {projectFile} from '../web/project-file.js';
import {readDocument} from '../lib/documents.mjs';
import {morphPath,morphData,moveMorphPoint,validMorph,sameMorphTopology} from '../web/svg-animation-morph.js';
import {interactionSettings,interactionClock} from '../web/svg-animation-interactions.js';

test('SVG Animation is a separate portable design type with its own route and native file',async()=>{
 const doc=JSON.parse(newDesign('Logo','blank','svg-animation'));assert.equal(doc.design_type,'svg-animation');assert.equal(validateAnimation(doc),doc);assert.deepEqual(doc.shapes,[]);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},drafts=new LocalDrafts(storage,storage,{id:()=> 'svg-project',now:()=>1});const file=drafts.create(JSON.stringify(doc));
 assert.equal(projectUrl({...file,kind:'local'}),'/editor/svg-animation.html?draft=svg-project');assert.equal(projectUrl({kind:'local',id:'regular'}),'/editor/index.html?draft=regular');
 assert.deepEqual(JSON.parse(projectFile(drafts.activate(file.id)).data),doc);
 const accepted=await readDocument(new Request('https://test/api/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(doc)}));assert.deepEqual(JSON.parse(accepted.body),doc);
});
test('property tracks interpolate independently with segment easing and color interpolation',()=>{
 let a=newSvgAnimation().svg_animation;a=putKey(a,'pxv1','x',0,0,'ease-in');a=putKey(a,'pxv1','x',1000,100);a=putKey(a,'pxv1','opacity',500,.2,'linear',1);
 assert.ok(trackValue(a.tracks[0],500)<50);assert.equal(trackValue(a.tracks[1],250),.6);
 a=putKey(a,'pxv2','fill',0,'#000000');a=putKey(a,'pxv2','fill',1000,'#ffffff');assert.equal(trackValue(a.tracks[2],500),'#808080');
 assert.equal(eased(.5,'ease-in-out').toFixed(5),'0.50000');assert.equal(trackValue(a.tracks[0],2000),100);
});
test('moving and deleting one property never overwrites another, and duration never drops keys',()=>{
 let a=newSvgAnimation().svg_animation;a=putKey(a,'pxv1','x',0,0);a=putKey(a,'pxv1','x',1000,100);a=putKey(a,'pxv1','opacity',1000,.5);
 const moved=moveKey(a,'pxv1','x',1000,1500);assert.equal(moved.tracks[0].keys.at(-1).time,1500);assert.equal(moved.tracks[1].keys.at(-1).time,1000);assert.equal(a.tracks[0].keys.at(-1).time,1000);
 assert.throws(()=>moveKey(a,'pxv1','x',1000,0),/already/);assert.throws(()=>resizeDuration(moved,1200),/Move or delete/);
 const deleted=deleteKey(a,'pxv1','x',1000);assert.equal(deleted.tracks[0].keys.length,1);assert.equal(deleted.tracks[1].keys.length,2);
});
test('export pads held first and last values without changing authored keys',()=>{
 const track={property:'x',keys:[{time:200,value:10,easing:'ease-in'},{time:1000,value:30,easing:'ease-out'}]},padded=exportKeys(track,3000);
 assert.deepEqual(padded.map(k=>k.time),[0,200,1000,3000]);assert.equal(padded[0].value,10);assert.equal(padded.at(-1).value,30);assert.equal(track.keys.length,2);assert.equal(track.keys[1].easing,'ease-out');
});
test('invalid, duplicate and unsupported animation payloads fail before rendering',()=>{
 for(const patch of [{duration:0},{duration:Infinity},{loop:'yes'},{origins:{pxv1:[NaN,2]}},{tracks:[{element:'x" onload="bad',property:'x',keys:[]}]}]){const doc=newSvgAnimation();Object.assign(doc.svg_animation,patch);assert.throws(()=>validateAnimation(doc),/Invalid/);}
 const doc=newSvgAnimation();doc.svg_animation=putKey(doc.svg_animation,'pxv1','x',0,1);doc.svg_animation.tracks.push(structuredClone(doc.svg_animation.tracks[0]));assert.throws(()=>validateAnimation(doc),/Duplicate/);
 assert.throws(()=>putKey(newSvgAnimation().svg_animation,'pxv1','fill',0,'url(https://bad)'),/valid/);
});
test('custom cubic easing stays portable and applies independently to each segment',()=>{
 const curve=[.2,.7,.7,.9],doc=newSvgAnimation();doc.svg_animation=putKey(doc.svg_animation,'pxv1','x',0,0,curve);doc.svg_animation=putKey(doc.svg_animation,'pxv1','x',1000,100,'linear');doc.svg_animation=putKey(doc.svg_animation,'pxv1','x',2000,0);
 assert.equal(validateAnimation(JSON.parse(JSON.stringify(doc))).svg_animation.tracks[0].keys[0].easing[1],.7);assert.ok(trackValue(doc.svg_animation.tracks[0],500)>70);assert.equal(trackValue(doc.svg_animation.tracks[0],1500),50);assert.deepEqual(easingPoints('ease'),[.25,.1,.25,1]);
 for(const curve of [[-1,0,1,1],[0,0,2,1],[0,NaN,1,1],[0,1,1],{},'unknown'])assert.throws(()=>putKey(doc.svg_animation,'pxv1','x',10,0,curve),/easing/);
});
test('motion paths retain property keys and orientation when the route changes',()=>{
 const doc=newSvgAnimation(),route={d:'M10 10C20 60 50 60 90 10',name:'Route',rotate:'auto'};doc.svg_animation=putKey(doc.svg_animation,'pxv1','opacity',0,.5);
 doc.svg_animation=setMotionPath(doc.svg_animation,'pxv1',route,[20,30]);assert.equal(validateAnimation(doc),doc);const motion=doc.svg_animation.tracks[1];assert.deepEqual(motion.keys.map(k=>[k.time,k.value]),[[0,0],[3000,100]]);assert.deepEqual(doc.svg_animation.origins.pxv1,[20,30]);
 let changed=putKey(doc.svg_animation,'pxv1','motionProgress',1500,75,[.2,.7,.7,.9]);changed=setMotionPath(changed,'pxv1',{...route,d:'M10 10L90 90'},[0,0]);assert.equal(changed.tracks[1].keys[1].value,75);assert.deepEqual(changed.origins.pxv1,[20,30]);assert.equal(setMotionPath(changed,'pxv1',null).tracks.length,1);
 assert.throws(()=>setMotionPath(changed,'pxv1',{...route,d:'M0 0L10 10M20 20L30 30'},[0,0]),/continuous/);assert.throws(()=>setMotionPath(changed,'pxv1',{...route,rotate:'invalid'},[0,0]),/Invalid/);
});

test('morph keys interpolate anchors and curve handles with fixed topology and segment easing',()=>{
 const before=morphPath('M0 0L100 0L100 100Z'),after=moveMorphPoint(before,0,1,'anchor',140,20);let a=newSvgAnimation().svg_animation;
 a=putKey(a,'pxv1','morph',0,before,'ease-in');a=putKey(a,'pxv1','morph',1000,after);const halfway=trackValue(a.tracks[0],500),ratio=eased(.5,'ease-in');assert.ok(Math.abs(halfway[0].points[1][0]-(100+40*ratio))<1e-7);assert.equal(before[0].points[1][0],100);assert.deepEqual(after[0].points[1],[140,20,140,20,140,20]);
 const curve=moveMorphPoint(after,0,1,'out',180,70);assert.deepEqual(curve[0].points[1],[140,20,140,20,180,70]);assert.equal(validateAnimation({...newSvgAnimation(),svg_animation:a}).svg_animation.tracks.length,1);
 assert.throws(()=>putKey(a,'pxv1','morph',2000,morphPath('M0 0L10 10')),/same nodes/);const invalid=structuredClone(a);invalid.tracks[0].keys[1].value=morphPath('M0 0L10 10');assert.throws(()=>validateAnimation({...newSvgAnimation(),svg_animation:invalid}),/same nodes/);
});

test('morph geometry preserves subpaths, closure and cubic handles through canonical SVG data',()=>{
 const value=morphPath('M0 0Q50 80 100 0T200 0M40 40h40v40h-40z'),data=morphData(value),roundTrip=morphPath(data);assert.equal(value.length,2);assert.equal(value[0].closed,false);assert.equal(value[1].closed,true);assert.ok(sameMorphTopology(value,roundTrip));assert.equal((data.match(/M/g)||[]).length,2);assert.equal((data.match(/Z/g)||[]).length,1);assert.equal(data.includes('Q'),false);
 for(let i=0;i<value.length;i++)for(let j=0;j<value[i].points.length;j++)for(let k=0;k<6;k++)assert.ok(Math.abs(value[i].points[j][k]-roundTrip[i].points[j][k])<.000001);
 for(const bad of [null,[],[{closed:true,points:[[0,0]]}],[{closed:true,points:[[Infinity,0,0,0,0,0],[0,0,0,0,0,0]]}]])assert.equal(validMorph(bad),false);
 assert.throws(()=>morphPath('M0 0'),/Morphing supports/);assert.throws(()=>moveMorphPoint(value,0,0,'anchor',100001,0),/out of range/);
});

function player(options={}){let now=0,next=0;const pending=new Map(),clock={now:()=>now,request:fn=>{pending.set(++next,fn);return next;},cancel:id=>pending.delete(id)},frames=[];const playback=interactionClock({duration:1000,loop:false,...interactionSettings({}),...options},t=>frames.push(t),clock);return {playback,frames,step(ms){now+=ms;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(now));},pending};}
test('interaction settings remain optional for older files and reject unsupported behavior',()=>{
 const doc=newSvgAnimation();assert.equal(interactionSettings(doc.svg_animation).trigger,'load');validateAnimation(doc);
 for(const trigger of ['load','hover','click']){doc.svg_animation.interaction={...interactionSettings({}),trigger};validateAnimation(doc);}
 for(const value of [null,[],{trigger:'scroll'}, {...interactionSettings({}),onClick:'injected()'},{...interactionSettings({}),onLeave:'restart'}]){doc.svg_animation.interaction=value;assert.throws(()=>validateAnimation(doc),/interaction/);}
});
test('click playback pauses, resumes, restarts and reverses without losing the playhead',()=>{
 const p=player({onClick:'pause'});p.playback.activate();p.step(400);p.playback.activate();p.step(200);assert.equal(p.playback.state().time,400);assert.equal(p.playback.state().playing,false);p.playback.activate();p.step(600);assert.equal(p.playback.state().time,1000);assert.equal(p.pending.size,0);p.playback.activate();assert.equal(p.playback.state().time,0);
 const r=player({onClick:'reverse'});r.playback.activate();r.step(600);r.playback.activate();r.step(200);assert.equal(r.playback.state().time,400);r.playback.activate();r.step(200);assert.equal(r.playback.state().time,600);
 // A frame can share the activation timestamp. Reversing from the end must
 // keep running until time actually moves away from that endpoint.
 r.step(400);r.playback.activate();r.step(0);assert.equal(r.playback.state().playing,true);r.step(1000);assert.equal(r.playback.state().time,0);
 const restart=player();restart.playback.activate();restart.step(400);restart.playback.activate();assert.equal(restart.playback.state().time,0);
 const c=player({onClick:'continue'});c.playback.activate();c.step(400);c.playback.activate();assert.equal(c.playback.state().time,400);c.step(600);c.playback.activate();assert.equal(c.playback.state().playing,true);
});
test('hover leave policies pause, reset, reverse once, or continue looping',()=>{
 for(const action of ['pause','reset','reverse','continue']){const p=player({loop:true,onLeave:action});p.playback.enter();p.step(1400);assert.equal(p.playback.state().time,400);p.playback.leave();p.step(500);assert.equal(p.playback.state().time,{pause:400,reset:0,reverse:0,continue:900}[action]);if(action!=='continue')assert.equal(p.playback.state().playing,false);p.playback.enter();p.step(100);assert.equal(p.playback.state().playing,true);p.playback.destroy();assert.equal(p.pending.size,0);}
});
