import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {editorShape,textOnPath,pathGlyphs,artworkShapes} from '../web/canvas-tools.js';
import {neutralKeyframe,motionValue,motionScene,motionCss,moveMotionKeys,removeMotionKeys,motionMoveDelta} from '../web/motion.js';
import {exportJobs} from '../web/batch-export.js';
import {svgDocument,exportShapes} from '../web/export.js';
import {cssExport} from '../web/css-renderer.js';
import {textStyle,layoutText} from '../web/typography.js';
import {toolGroups} from '../web/toolbelt.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const scene=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>scene(e).find(s=>s.id===id),textLayout=s=>layoutText(s,t=>t.length*textStyle(s).font_size*.6);
test('toolbar inventory contains the inspected Figma tools, without plugins',()=>{
 const names=toolGroups.flatMap(([,items])=>items.map(([key])=>key));
 for(const name of ['select','hand','scale','frame','section','slice','rectangle','line','arrow','ellipse','polygon','star','media','pen','pencil','text','text-path','code','spec','comment','annotation','measurement'])assert.ok(names.includes(name),name);
 assert.ok(!names.includes('plugins'));
});
test('review tools persist, duplicate, undo and redo without entering artwork exports',()=>{
 const e=new Editor(),copy=new Editor();try{
 for(const role of ['section','slice','comment','annotation','measurement','spec']){const id=e.insert(JSON.stringify(editorShape(role,{x:10,y:10},{x:120,y:80}))),s=get(e,id);e.update(JSON.stringify({...s,editor_meta:{...s.editor_meta,body:'Review <script>',replies:['Reply'],resolved:true}}));const saved=e.snapshot();copy.load(saved);assert.equal(get(copy,id).editor_meta.body,'Review <script>');const ids=JSON.parse(e.paste_layers(e.copy_layers(JSON.stringify([id])),10,10,0));assert.equal(get(e,ids[0]).editor_meta.role,role);e.undo();assert.equal(e.snapshot(),saved);e.redo();assert.equal(get(e,ids[0]).editor_meta.resolved,true);}
 assert.equal(exportShapes(scene(e),[],'page').length,0);
 const before=e.snapshot(),s=scene(e)[0];for(const editor_meta of [{role:'invalid'},{role:'comment',body:'x'.repeat(10001)},{text_path:{points:[[0,0]],offset:0}}]){assert.throws(()=>e.update(JSON.stringify({...s,editor_meta})));assert.equal(e.snapshot(),before);}
 }finally{e.free();copy.free();}
});
test('sections retain children on export; slices use the exact selected region',()=>{
 const e=new Editor();try{const section=e.insert(JSON.stringify(editorShape('section',{x:0,y:0},{x:600,y:400}))),id=e.add('rectangle',40,50);e.update(JSON.stringify({...get(e,id),parent_id:section,fill:'#ff0000'}));const slice=e.insert(JSON.stringify(editorShape('slice',{x:30,y:40},{x:130,y:140})));const exported=artworkShapes(scene(e));assert.equal(exported.length,1);assert.equal(exported[0].parent_id,0);const jobs=exportJobs(scene(e),[slice],{scope:'selection',format:'svg',scale:1},'Slice');assert.deepEqual(jobs[0].box,{x:30,y:40,width:100,height:100});const svg=svgDocument(jobs[0].shapes,jobs[0].box,1,null,textLayout);assert.match(svg,/viewBox="30 40 100 100"/);assert.match(svg,/#ff0000/);assert.doesNotMatch(svg,/Review/);
 }finally{e.free();}
});
test('path text follows curved geometry and survives independent copying and export',()=>{
 const e=new Editor();try{const s={x:0,y:0,width:240,height:120,kind:'ellipse'},id=e.insert(JSON.stringify(textOnPath(s))),shape=get(e,id);assert.ok(pathGlyphs(shape,()=>12).some(g=>Math.abs(g.angle)>.1));const svg=svgDocument([shape],shape,1,null,textLayout);assert.match(svg,/<textPath/);assert.match(svg,/Text on path/);assert.match(cssExport([shape],{textLayout}).html,/<textPath/);const ids=JSON.parse(e.paste_layers(e.copy_layers(JSON.stringify([id])),100,100,0));assert.deepEqual(get(e,ids[0]).editor_meta.text_path,shape.editor_meta.text_path);
 }finally{e.free();}
});
test('motion interpolates and previews without mutating documents, and exports real keyframes',()=>{
 const e=new Editor();try{const id=e.add('rectangle',10,20),shape=get(e,id),motion={duration:2000,looping:true,keyframes:[neutralKeyframe(0),{time:2000,x:100,y:40,rotation:90,scale:2,opacity:.2}]};e.update(JSON.stringify({...shape,editor_meta:{motion}}));const original=scene(e),before=JSON.stringify(original),value=motionValue(motion,1000);assert.equal(value.x,50);assert.equal(value.opacity,.6);const preview=motionScene(original,1000).find(s=>s.id===id);assert.equal(preview.x,60);assert.equal(preview.width,shape.width*1.5);assert.equal(JSON.stringify(original),before);assert.match(motionCss(get(e,id)),/@keyframes/);assert.match(cssExport(original).css,/animation:px-motion-/);const snapshot=e.snapshot();assert.throws(()=>e.update(JSON.stringify({...get(e,id),editor_meta:{motion:{...motion,keyframes:[neutralKeyframe(0),neutralKeyframe(0)]}}})));assert.equal(e.snapshot(),snapshot);
 }finally{e.free();}
});

test('property keyframes interpolate independently and preserve base appearance',()=>{
 const shape={id:1,x:10,y:20,width:100,height:80,appearance:{opacity:.4,corner_radius:6}},motion={duration:2000,keyframes:[
  {...neutralKeyframe(0,shape),x:0,properties:['x']},
  {...neutralKeyframe(500,shape),opacity:.2,properties:['opacity']},
  {...neutralKeyframe(1500,shape),opacity:.8,properties:['opacity']},
  {...neutralKeyframe(2000,shape),x:100,width:200,scale_y:2,properties:['x','width','scale_y']},
 ]};
 assert.equal(motionValue(motion,1000,shape).x,50);
 assert.equal(motionValue(motion,1000,shape).opacity,.5);
 assert.equal(motionValue(null,0,shape).opacity,.4);
 const preview=motionScene([{...shape,editor_meta:{motion}}],1000)[0];
 assert.equal(preview.appearance.opacity,.5);
 assert.equal(preview.width,200);
 assert.equal(preview.height,160);
 assert.match(motionCss({...shape,editor_meta:{motion}}),/opacity:0.2/);
});

test('keyframe edits move only selected properties, merge disjoint tracks and reject collisions',()=>{
 const motion={duration:2000,keyframes:[
  {...neutralKeyframe(0),x:10,opacity:.2,properties:['x','opacity']},
  {...neutralKeyframe(500),opacity:.5,properties:['opacity']},
  {...neutralKeyframe(1000),x:100,properties:['x']},
 ]},selection=[{time:0,properties:['x']}],before=JSON.stringify(motion);
 const moved=moveMotionKeys(motion,selection,500);
 assert.deepEqual(moved.keyframes[0].properties,['opacity']);
 assert.deepEqual(moved.keyframes[1].properties,['opacity','x']);
 assert.equal(moved.keyframes[1].x,10);
 assert.equal(moved.keyframes[1].opacity,.5);
 assert.equal(JSON.stringify(motion),before);
 assert.equal(moveMotionKeys(motion,selection,1000),motion);
 assert.equal(moveMotionKeys(motion,selection,-500),motion);
 assert.equal(motionMoveDelta(motion,[1000],5000),1000);
 assert.equal(moveMotionKeys(motion,[1000],5000).keyframes.at(-1).time,2000);
 assert.deepEqual(removeMotionKeys(motion,selection).keyframes[0].properties,['opacity']);
 assert.equal(removeMotionKeys(motion,[0]).keyframes[0].time,500);
});

test('independent property edits persist through the engine and undo as one operation',()=>{
 const e=new Editor();try{const id=e.add('rectangle',0,0),shape=get(e,id),motion={duration:2000,looping:false,keyframes:[{...neutralKeyframe(0,shape),properties:['x','opacity']},{...neutralKeyframe(2000,shape),x:100,opacity:.5,properties:['x','opacity']}]};
 e.update(JSON.stringify({...shape,editor_meta:{motion}}));const before=e.snapshot();
 const moved=moveMotionKeys(motion,[{time:2000,properties:['x']}],-500);
 e.update(JSON.stringify({...shape,editor_meta:{motion:moved}}));
 assert.deepEqual(get(e,id).editor_meta.motion.keyframes.map(k=>[k.time,k.properties]),[[0,['x','opacity']],[1500,['x']],[2000,['opacity']]]);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(e,id).editor_meta.motion.keyframes[1].time,1500);
 }finally{e.free();}
});
