import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {defaultGuide} from '../web/layout-guides.js';
import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),shape=(e,id)=>doc(e).shapes.find(s=>s.id===id);
const save=(e,id,name,grids,frame=0)=>e.save_guide_style(JSON.stringify({id,name,grids}),frame);
test('guide styles link across pages, update atomically, survive duplication and roundtrip',()=>{
 const e=new Editor(),a=e.add('frame',0,0),before=e.snapshot(),id=save(e,0,'  Desktop  ',[defaultGuide()],a);
 assert.equal(shape(e,a).guide_style,id);assert.equal(doc(e).guide_styles[0].name,'Desktop');
 e.undo();assert.equal(e.snapshot(),before);e.redo();
 const b=JSON.parse(e.duplicate_many(JSON.stringify([a])))[0];assert.equal(shape(e,b).guide_style,id);
 e.add_page();const c=e.add('frame',0,0);e.apply_guide_style(JSON.stringify([c]),id);
 const old=e.snapshot();save(e,id,'Desktop grid',[{...defaultGuide(),count:12}]);
 for(const s of doc(e).shapes)assert.equal(s.layout_grids[0].count,12);
 const updated=e.snapshot();e.undo();assert.equal(e.snapshot(),old);e.redo();assert.equal(e.snapshot(),updated);
 const restored=new Editor();restored.load(updated);assert.equal(restored.snapshot(),updated);restored.free();e.free();
});
test('detach, direct local edits and scaling preserve independent guide values',()=>{
 const e=new Editor(),a=e.add('frame',0,0),id=save(e,0,'Grid',[defaultGuide()],a);
 e.apply_guide_style(JSON.stringify([a]),0);assert.equal(shape(e,a).guide_style,0);assert.equal(shape(e,a).layout_grids.length,1);
 e.apply_guide_style(JSON.stringify([a]),id);e.update(JSON.stringify({...shape(e,a),layout_grids:[{...defaultGuide(),count:6}]}));assert.equal(shape(e,a).guide_style,0);
 save(e,id,'Grid',[{...defaultGuide(),count:10}]);assert.equal(shape(e,a).layout_grids[0].count,6);
 e.apply_guide_style(JSON.stringify([a]),id);e.update_many(JSON.stringify(scaleShapes([shape(e,a)],{x:0,y:0},2)));assert.equal(shape(e,a).guide_style,0);assert.equal(shape(e,a).layout_grids[0].size,128);
 e.free();
});
test('guide styles and component overrides keep binding and values together',()=>{
 const e=new Editor(),a=e.add('frame',0,0),one=save(e,0,'Grid',[defaultGuide()],a);e.create_component(a);const i=e.create_instance(a,400,0);
 assert.equal(shape(e,i).guide_style,one);
 const two=save(e,0,'Alternate',[{...defaultGuide(),count:6}]);e.apply_guide_style(JSON.stringify([i]),two);
 save(e,one,'Grid',[{...defaultGuide(),count:12}]);assert.equal(shape(e,i).layout_grids[0].count,6);
 save(e,two,'Alternate',[{...defaultGuide(),count:8}]);assert.equal(shape(e,i).layout_grids[0].count,8);
 e.reset_override(i,'layout_grids');assert.equal(shape(e,i).guide_style,one);assert.equal(shape(e,i).layout_grids[0].count,12);
 e.apply_guide_style(JSON.stringify([i]),0);save(e,one,'Grid',[{...defaultGuide(),count:4}]);assert.equal(shape(e,i).layout_grids[0].count,12);assert.equal(shape(e,i).guide_style,0);
 const old=e.snapshot();e.remove_guide_style(one);assert.equal(shape(e,a).guide_style,0);assert.equal(shape(e,a).layout_grids[0].count,4);e.undo();assert.equal(e.snapshot(),old);e.free();
});
test('clipboard detaches style references and invalid definitions are atomic',()=>{
 const e=new Editor(),a=e.add('frame',0,0),id=save(e,0,'Grid',[defaultGuide()],a),before=e.snapshot();
 for(const [name,grids] of [['',[]],['x'.repeat(129),[]],['Other',[{...defaultGuide(),size:0}]],['Other',Array(9).fill(defaultGuide())]]){assert.throws(()=>save(e,id,name,grids));assert.equal(e.snapshot(),before);}
 assert.throws(()=>save(e,0,'grid',[]));assert.equal(e.snapshot(),before);
 assert.throws(()=>e.apply_guide_style(JSON.stringify([a]),999));assert.equal(e.snapshot(),before);
 const corrupt=doc(e);corrupt.shapes[0].guide_style=999;assert.throws(()=>e.load(JSON.stringify(corrupt)));assert.equal(e.snapshot(),before);
 const other=new Editor();const pasted=JSON.parse(other.paste_layers(e.copy_layers(JSON.stringify([a])),0,0,0))[0];assert.equal(shape(other,pasted).guide_style,0);assert.deepEqual(shape(other,pasted).layout_grids,shape(e,a).layout_grids);
 const r=e.add('rectangle',400,0),old=e.snapshot();assert.throws(()=>e.apply_guide_style(JSON.stringify([a,r]),id));assert.equal(e.snapshot(),old);other.free();e.free();
});
