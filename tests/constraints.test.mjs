import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
const get=(e,id)=>shapes(e).find(s=>s.id===id);
const edit=(e,id,patch)=>e.update(JSON.stringify({...get(e,id),...patch}));
const setup=()=>{const e=new Editor(),f=e.add('frame',100,100),c=e.add('rectangle',120,130);edit(e,f,{width:200,height:200});edit(e,c,{width:40,height:20});e.reparent_many(JSON.stringify([c]),f);return{e,f,c};};
test('all constraint modes preserve the intended edges or proportions on both axes',()=>{
 for(const [mode,expected] of Object.entries({min:[170,110,40,20],max:[370,210,40,20],center:[270,160,40,20],stretch:[170,110,240,120],scale:[190,125,80,30]})){
  const {e,f,c}=setup();edit(e,c,{constraints:{horizontal:mode,vertical:mode}});
  const before=e.snapshot(),update=JSON.stringify([{...get(e,f),x:150,y:80,width:400,height:300}]);
  const preview=e.preview_update_many(update);assert.equal(e.snapshot(),before);
  e.update_many(update);assert.equal(e.snapshot(),preview);const s=get(e,c);assert.deepEqual([s.x,s.y,s.width,s.height],expected);
  e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),preview);
  const copy=new Editor();copy.load(preview);assert.equal(copy.snapshot(),preview);copy.free();e.free();
 }
});
test('nested frames propagate resized dimensions and explicit subtree edits take precedence',()=>{
 const {e,f,c}=setup();edit(e,c,{kind:'frame',constraints:{horizontal:'stretch',vertical:'stretch'}});
 const t=e.add('text',130,135);edit(e,t,{width:10,height:10,constraints:{horizontal:'max',vertical:'center'}});e.reparent_many(JSON.stringify([t]),c);
 edit(e,f,{width:300,height:250});assert.deepEqual([get(e,t).x,get(e,t).y],[230,160]);
 const all=shapes(e).map(s=>({...s,x:s.x*2,y:s.y*2,width:s.width*2,height:s.height*2}));e.update_many(JSON.stringify(all));assert.deepEqual(shapes(e),all);e.free();
});
test('legacy constraints default to top-left, invalid modes fail atomically and shrinking clamps size',()=>{
 const {e,f,c}=setup();const old=JSON.parse(e.snapshot());old.shapes.forEach(s=>delete s.constraints);e.load(JSON.stringify(old));assert.deepEqual(get(e,c).constraints,{horizontal:'min',vertical:'min'});
 const before=e.snapshot();assert.throws(()=>edit(e,c,{constraints:{horizontal:'unknown',vertical:'min'}}));assert.equal(e.snapshot(),before);
 edit(e,c,{constraints:{horizontal:'stretch',vertical:'scale'}});edit(e,f,{width:1,height:1});assert.equal(get(e,c).width,1);assert.equal(get(e,c).height,1);e.free();
});
