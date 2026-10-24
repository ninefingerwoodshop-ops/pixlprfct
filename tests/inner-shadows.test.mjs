import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {appearance} from '../web/appearance.js';
import {shadowBounds,shadowFilter} from '../web/shadows.js';
import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),effect={x:8,y:-4,blur:16,spread:3,color:'#334455',opacity:.5,visible:true};
const set=(e,id,shadows)=>{const s=get(e,id);e.update(JSON.stringify({...s,appearance:{...appearance(s),shadows}}));};
test('legacy effects default to drop; inner kinds persist, scale and validate atomically',()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,[effect]);assert.equal(get(e,f).appearance.shadows[0].kind,'drop');set(e,f,[{...effect,kind:'inner'}]);const saved=e.snapshot();assert.throws(()=>set(e,f,[{...effect,kind:'bad'}]));assert.equal(e.snapshot(),saved);
 set(e,f,[{...effect,kind:'drop'}]);e.undo();assert.equal(e.snapshot(),saved);const restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);const scaled=scaleShapes([get(e,f)],{x:0,y:0},2)[0].appearance.shadows[0];assert.equal(scaled.kind,'inner');assert.equal(scaled.spread,6);e.free();restored.free();
});
test('inner effects never expand export bounds, including large offsets and negative spread',()=>{
 const box={x:30,y:50,width:100,height:80};assert.deepEqual(shadowBounds(box,[{...effect,kind:'inner',x:5000,spread:-500}]),box);assert.deepEqual(shadowBounds(box,[{...effect,kind:'inner'},{...effect,kind:'drop'}]),shadowBounds(box,[effect]));
});
test('SVG inner masks reverse spread and composite atop artwork without changing its alpha',()=>{
 const box={x:0,y:0,width:100,height:100},svg=shadowFilter('fx',box,[{...effect,kind:'inner'},effect]);assert.match(svg,/operator="erode" radius="3"/);assert.match(svg,/operator="dilate" radius="3"/);assert.match(svg,/in2="shadow-0-offset" operator="out"/);assert.match(svg,/in2="SourceGraphic" operator="atop"/);assert.match(svg,/<feMergeNode in="shadow-1"\/><feMergeNode in="shadow-0-artwork"\/>/);assert.match(svg,/x="-35" y="-35" width="170" height="170"/);
});
test('inner kinds synchronize with components while instance effects remain independently overridable',()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,[{...effect,kind:'inner'}]);e.create_component(f);const i=e.create_instance(f,400,0);assert.equal(get(e,i).appearance.shadows[0].kind,'inner');set(e,i,[{...effect,kind:'drop'}]);set(e,f,[{...effect,kind:'inner',blur:40}]);assert.equal(get(e,i).appearance.shadows[0].kind,'drop');e.reset_override(i,'appearance.shadows');assert.equal(get(e,i).appearance.shadows[0].blur,40);e.free();
});
