import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {fromPoints,vectorSvg} from '../web/vectors.js';import {appearance} from '../web/appearance.js';import {strokeTips,strokePadding} from '../web/stroke-tips.js';import {exportBounds} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),set=(e,id,value)=>{const s=get(e,id);e.update(JSON.stringify({...s,appearance:{...appearance(s),...value}}));};
const line=()=>({...fromPoints('pen',[{x:0,y:0},{x:100,y:0}]),id:1,parent_id:0,stroke_width:10});
test('endpoint paint persists, validates atomically and both instance ends inherit main edits and reject overrides',()=>{
 const e=new Editor(),f=e.add('frame',0,0),id=e.insert(JSON.stringify(line()));e.reparent_many(JSON.stringify([id]),f);set(e,id,{stroke_start:'circle',stroke_end:'triangle'});e.create_component(f);const inst=e.create_instance(f,500,0),child=JSON.parse(e.snapshot()).shapes.find(s=>s.parent_id===inst).id;const before=e.snapshot();for(const patch of [{stroke_start:'diamond'},{stroke_end:'diamond'}]){assert.throws(()=>set(e,child,patch),/protected/);assert.equal(e.snapshot(),before);}set(e,id,{stroke_start:'line',stroke_end:'reverse_triangle'});assert.equal(get(e,child).appearance.stroke_start,'line');assert.equal(get(e,child).appearance.stroke_end,'reverse_triangle');
 const saved=e.snapshot();assert.throws(()=>set(e,id,{stroke_start:'script'}));assert.equal(e.snapshot(),saved);set(e,id,{stroke_end:'none'});e.undo();assert.equal(e.snapshot(),saved);const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();e.free();
});
test('tips follow cubic tangents, suppress closed paths and expand effect/export bounds',()=>{
 const s={...line(),handles:[[[0,0],[0,0]],[[1,1],[1,0]]],appearance:{...appearance(line()),stroke_end:'triangle'}};
 const tip=strokeTips(s).at(-1);assert.match(tip.d,/M100 0 L80 40 L120 40 Z/);assert.equal(strokeTips({...s,closed:true}).length,0);assert.ok(strokePadding(s)>=70);const box=exportBounds([s]);assert.ok(box.y<=-70&&box.y+box.height>=70);assert.match(vectorSvg(s),/mask id="tips-/);assert.doesNotMatch(vectorSvg({...s,appearance:{...s.appearance,stroke_enabled:false}}),/<mask/);
 const zero={...s,points:[[0,0],[0,0]],handles:[]};assert.equal(strokeTips(zero).length,0);
});
test('tip hit testing includes visible heads outside path bounds and respects clipping and locking',()=>{
 const e=new Editor(),id=e.insert(JSON.stringify(line()));set(e,id,{stroke_start:'circle',stroke_end:'triangle'});assert.equal(e.hit_test(-15,0),id);assert.equal(e.hit_test(70,12),id);assert.equal(e.hit_test(90,30),0);set(e,id,{stroke_end:'none'});assert.equal(e.hit_test(70,12),0);e.update(JSON.stringify({...get(e,id),locked:true}));assert.equal(e.hit_test(-15,0),0);e.free();
});
test('splitting removes newly exposed interior tips; joining preserves surviving physical endpoints',()=>{
 const e=new Editor(),a=e.insert(JSON.stringify({...fromPoints('pen',[{x:0,y:0},{x:50,y:0},{x:100,y:0}]),stroke_width:10}));set(e,a,{stroke_start:'circle',stroke_end:'triangle'});const ids=JSON.parse(e.split_path(a,1));assert.equal(get(e,ids[0]).appearance.stroke_start,'circle');assert.equal(get(e,ids[0]).appearance.stroke_end,'none');assert.equal(get(e,ids[1]).appearance.stroke_start,'none');assert.equal(get(e,ids[1]).appearance.stroke_end,'triangle');e.join_paths(JSON.stringify(ids));assert.equal(get(e,ids[0]).appearance.stroke_start,'circle');assert.equal(get(e,ids[0]).appearance.stroke_end,'triangle');e.free();
});
