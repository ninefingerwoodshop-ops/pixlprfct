import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {appearance} from '../web/appearance.js';
import {addEffect,editEffect,effectEntries,removeEffect,convertEffect,moveShadow} from '../web/effect-editor.js';
import {newLayoutGuide,guideLabel} from '../web/guide-controls.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shape=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
test('zero blur stays present through hide, save, clipboard and history; removal is separate',()=>{
 const e=new Editor(),other=new Editor(),id=e.add('frame',0,0);
 try{for(const type of ['layer_blur','backdrop_blur']){
  let a=addEffect(appearance(shape(e,id)),type);a=editEffect(a,type,{blur:0,visible:false});
  e.update(JSON.stringify({...shape(e,id),appearance:a}));const saved=e.snapshot();
  other.load(saved);assert.ok(effectEntries(appearance(shape(other,id))).some(x=>x.key===type&&x.value.blur===0&&!x.value.visible));
  const copy=JSON.parse(other.paste_layers(e.copy_layers(JSON.stringify([id])),400,0,0))[0];assert.ok(effectEntries(appearance(shape(other,copy))).some(x=>x.key===type));
  e.update(JSON.stringify({...shape(e,id),appearance:removeEffect(a,type)}));assert.ok(!effectEntries(appearance(shape(e,id))).some(x=>x.key===type));
  e.undo();assert.equal(e.snapshot(),saved);e.redo();assert.ok(!effectEntries(appearance(shape(e,id))).some(x=>x.key===type));
 }}finally{e.free();other.free();}
});
test('effect conversions preserve applicable values without overwriting another blur',()=>{
 let a=addEffect({},'drop');a=editEffect(a,'shadow-0',{x:-12,y:9,spread:3,blur:24,color:'#123456',visible:false});
 const inner=convertEffect(a,'shadow-0','inner');assert.deepEqual(inner.style.shadows[0],{...a.shadows[0],kind:'inner'});
 const blur=convertEffect(inner.style,'shadow-0','layer_blur');assert.equal(blur.key,'layer_blur');assert.equal(blur.style.layer_blur,24);assert.equal(blur.style.layer_blur_enabled,false);assert.equal(blur.style.shadows.length,0);
 const both=addEffect(blur.style,'backdrop_blur');assert.deepEqual(convertEffect(both,'layer_blur','backdrop_blur'),{style:both,key:'layer_blur'});
 assert.equal(convertEffect(editEffect(a,'shadow-0',{blur:1000}),'shadow-0','backdrop_blur').style.backdrop_blur,200);
});
test('shadow reordering moves every saved field and respects stack limits',()=>{
 let a={};for(let i=0;i<8;i++){a=addEffect(a,i%2?'inner':'drop');a=editEffect(a,'shadow-'+i,{x:i});}assert.equal(addEffect(a,'drop'),a);
 const moved=moveShadow(a,0,7);assert.deepEqual(moved.shadows.map(x=>x.x),[1,2,3,4,5,6,7,0]);assert.equal(moveShadow(a,0,-1),a);assert.equal(a.shadows[0].x,0);
});
test('guide UI defaults and summaries match grid, stretched and fixed rows',()=>{
 const g=newLayoutGuide();assert.equal(guideLabel(g),'Grid 10px');assert.equal(g.color,'#ff0000');assert.equal(g.opacity,.1);
 assert.equal(guideLabel({...g,kind:'columns'}),'5 columns');assert.equal(guideLabel({...g,kind:'rows',alignment:'center'}),'5 rows (10px)');
});
test('zero blur presence is inherited and protected on component instances',()=>{
 const e=new Editor(),id=e.add('frame',0,0);try{e.update(JSON.stringify({...shape(e,id),appearance:editEffect(addEffect(appearance(shape(e,id)),'layer_blur'),'layer_blur',{blur:0})}));e.create_component(id);const copy=e.create_instance(id,400,0);assert.equal(shape(e,copy).appearance.layer_blur_present,true);const saved=e.snapshot();assert.throws(()=>e.update(JSON.stringify({...shape(e,copy),appearance:removeEffect(appearance(shape(e,copy)),'layer_blur')})),/protected/);assert.equal(e.snapshot(),saved);}finally{e.free();}
});
