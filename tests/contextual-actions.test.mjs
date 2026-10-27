import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {appearance,sceneSvg} from '../web/appearance.js';
import {ratioSize,swapEndpoints,blendModes,canvasBlend} from '../web/contextual-actions.js';
import {layoutText,textSvg} from '../web/typography.js';
import {compileCssScene} from '../web/css-renderer.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
test('all offered blend modes persist and propagate, invalid modes reject atomically, instances inherit blend modes and reject instance overrides',()=>{
 const e=new Editor(),id=e.add('frame',0,0);const set=(id,mode)=>{const s=get(e,id);e.update(JSON.stringify({...s,appearance:{...appearance(s),blend_mode:mode}}));};
 for(const [mode] of blendModes){set(id,mode);assert.equal(get(e,id).appearance.blend_mode,mode);}const saved=e.snapshot();assert.throws(()=>set(id,'invalid'));assert.equal(e.snapshot(),saved);e.create_component(id);const instance=e.create_instance(id,400,0);assert.equal(get(e,instance).appearance.blend_mode,'luminosity');const before=e.snapshot();assert.throws(()=>set(instance,'multiply'),/protected/);assert.equal(e.snapshot(),before);set(id,'screen');assert.equal(get(e,instance).appearance.blend_mode,'screen');e.undo();assert.equal(get(e,instance).appearance.blend_mode,'luminosity');e.free();
});
test('blend mode output agrees between isolated SVG groups, CSS layers and canvas compositing names',()=>{
 const shape={id:1,parent_id:0,kind:'rectangle',x:0,y:0,width:100,height:100,fill:'#ff0000',appearance:{opacity:1,fill_enabled:true,corner_radius:0,blend_mode:'multiply'}};
 assert.match(sceneSvg([shape],()=>'<rect/>'),/isolation:isolate;mix-blend-mode:multiply/);assert.match(compileCssScene([shape]).css,/mix-blend-mode:multiply/);assert.equal(canvasBlend('plus-lighter'),'lighter');assert.equal(canvasBlend('pass-through'),'source-over');assert.equal(canvasBlend('multiply'),'multiply');
});
test('aspect-ratio sizing respects both axes of min/max limits and reports impossible bounds',()=>{
 const s={width:200,height:100,layout_item:{min_height:60,max_width:300}};assert.deepEqual(ratioSize(s,'height',120),{width:240,height:120});assert.deepEqual(ratioSize(s,'width',50),{width:120,height:60});assert.deepEqual(ratioSize(s,'height',400),{width:300,height:150});assert.throws(()=>ratioSize({...s,layout_item:{min_height:200,max_width:300}},'width',200),/conflict/);
 const e=new Editor(),id=e.add('rectangle',0,0),shape=get(e,id);e.update(JSON.stringify({...shape,aspect_ratio_locked:true}));const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(get(copy,id).aspect_ratio_locked,true);e.undo();assert.equal(get(e,id).aspect_ratio_locked,false);e.free();copy.free();
});
test('swapping arrow endpoints materializes tool defaults and swaps back without changing geometry',()=>{
 const arrow={id:1,kind:'arrow',x:0,y:0,width:100,height:1,points:[{x:0,y:0},{x:1,y:0}],fill:'#000000'},once=swapEndpoints(arrow);assert.equal(once.appearance.stroke_start,'line');assert.equal(once.appearance.stroke_end,'none');const twice=swapEndpoints(once);assert.equal(twice.appearance.stroke_start,'none');assert.equal(twice.appearance.stroke_end,'line');assert.deepEqual(twice.points,arrow.points);
});
test('vertical text alignment offsets every line without changing intrinsic height; persists and exports',()=>{
 const e=new Editor(),id=e.add('text',0,0),s=get(e,id);e.update(JSON.stringify({...s,height:200,text:'One\nTwo',typography:{...s.typography,sizing:'fixed',font_size:20,line_height:1.2,vertical_align:'bottom'}}));const shape=get(e,id),layout=layoutText(shape,s=>s.length*10);assert.equal(layout.height,44);assert.equal(layout.lines[0].y,shape.y+156);assert.equal(layout.lines[1].y,shape.y+180);assert.match(textSvg(shape,layout),/y="156"/);assert.match(compileCssScene([shape]).css,/justify-content:flex-end/);const saved=e.snapshot();assert.throws(()=>e.update(JSON.stringify({...shape,typography:{...shape.typography,vertical_align:'unknown'}})));assert.equal(e.snapshot(),saved);e.free();
});
