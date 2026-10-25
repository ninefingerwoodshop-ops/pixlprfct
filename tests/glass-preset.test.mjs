import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {glassPreset} from '../web/glass-controls.js';
import {cssExport} from '../web/css-renderer.js';
import {drawnShape} from '../web/vectors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('glass preset applies in one undo step and exports real backdrop blur on frames and shapes',()=>{
 for(const kind of ['frame','rectangle','ellipse','polygon','star']){
  const e=new Editor(),id=['polygon','star'].includes(kind)?e.insert(JSON.stringify(drawnShape(kind,{x:30,y:40},{x:130,y:140}))):e.add(kind,30,40),before=e.snapshot(),shape=JSON.parse(before).shapes.find(s=>s.id===id);
  e.update(JSON.stringify(glassPreset(shape)));const glass=JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
  assert.equal(glass.appearance.backdrop_blur,20);assert.equal(glass.appearance.fill_opacity,.18);assert.equal(glass.x,shape.x);
  const exported=cssExport([glass]);assert.match(exported.css,/backdrop-filter:blur\(20px\)/);
  const loaded=new Editor();loaded.load(e.snapshot());assert.equal(loaded.snapshot(),e.snapshot());e.undo();assert.equal(e.snapshot(),before);e.free();loaded.free();
 }
});
