import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {paintAttributes} from '../web/appearance.js';
import {scaleShapes} from '../web/scaling.js';
import {paintBounds} from '../web/scene.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const style={opacity:1,corner_radius:0,fill_enabled:false,stroke_enabled:true,stroke_color:'#123456',stroke_dash:[12,6,2,6],stroke_dash_offset:-4,stroke_cap:'square',stroke_join:'bevel'};
test('dash patterns, caps and joins persist through history, files and scaling',()=>{
 const e=new Editor(),id=e.add('rectangle',0,0),before=e.snapshot();edit(e,id,{appearance:style,stroke_width:4});const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);
 const copy=new Editor();copy.load(after);assert.equal(copy.snapshot(),after);const scaled=scaleShapes([get(e,id)],{x:0,y:0},2)[0];assert.deepEqual(scaled.appearance.stroke_dash,[24,12,4,12]);assert.equal(scaled.appearance.stroke_dash_offset,-8);
 assert.match(paintAttributes(get(e,id)),/stroke-linecap="square" stroke-linejoin="bevel"/);assert.match(paintAttributes(get(e,id)),/stroke-dasharray="12 6 2 6" stroke-dashoffset="-4"/);e.free();copy.free();
});
test('invalid stroke edits are atomic and older files retain round solid strokes',()=>{
 const e=new Editor(),id=e.add('rectangle',0,0);edit(e,id,{appearance:style});const before=e.snapshot();
 for(const patch of [{stroke_dash:[0,0]},{stroke_dash:[-1,2]},{stroke_dash:Array(17).fill(1)},{stroke_dash:[100001]},{stroke_dash_offset:1e7},{stroke_cap:'triangle'},{stroke_join:'bad'}]){assert.throws(()=>edit(e,id,{appearance:{...style,...patch}}));assert.equal(e.snapshot(),before);}
 const legacy={...style};for(const key of ['stroke_dash','stroke_dash_offset','stroke_cap','stroke_join'])delete legacy[key];edit(e,id,{appearance:legacy});assert.deepEqual(get(e,id).appearance.stroke_dash,[]);assert.equal(get(e,id).appearance.stroke_cap,'round');assert.equal(get(e,id).appearance.stroke_join,'round');assert.doesNotMatch(paintAttributes(get(e,id)),/dasharray/);e.free();
});
test('stroke overrides preserve unrelated main edits and reset independently',()=>{
 const e=new Editor(),f=e.add('frame',0,0);edit(e,f,{appearance:style});e.create_component(f);const i=e.create_instance(f,300,0);edit(e,i,{appearance:{...get(e,i).appearance,stroke_dash:[2,8]}});edit(e,f,{appearance:{...style,stroke_cap:'butt',stroke_color:'#ff0000'}});
 assert.deepEqual(get(e,i).appearance.stroke_dash,[2,8]);assert.equal(get(e,i).appearance.stroke_cap,'butt');assert.equal(get(e,i).appearance.stroke_color,'#ff0000');e.reset_override(i,'appearance.stroke_dash');assert.deepEqual(get(e,i).appearance.stroke_dash,style.stroke_dash);e.free();
});
test('export bounds include miter reach and diagonal square caps',()=>{
 const s={id:1,parent_id:0,kind:'pen',x:0,y:0,width:100,height:100,points:[[0,1],[.5,0],[1,1]],stroke_width:10,appearance:{...style,stroke_join:'miter'}};
 assert.deepEqual(paintBounds(s,[s]),{...s,x:-50,y:-50,width:200,height:200});const square={...s,appearance:{...style,stroke_join:'bevel'}};assert.ok(paintBounds(square,[square]).x < -7);
});
