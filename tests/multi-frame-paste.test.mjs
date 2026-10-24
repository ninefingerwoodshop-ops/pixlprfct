import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>shapes(e).find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('multi-frame paste creates independently remapped trees and links in one undo step',()=>{
 const source=new Editor(),a=source.add('frame',10,20),b=source.add('frame',200,20),text=source.add('text',30,40);source.reparent_many(JSON.stringify([text]),a);edit(source,a,{prototype:{action:'navigate',target:b}});source.group_many(JSON.stringify([a,b]));const payload=source.copy_layers(JSON.stringify([a,b]));
 const e=new Editor(),f=e.add('frame',100,100),g=e.add('frame',700,300),before=e.snapshot(),roots=JSON.parse(e.paste_into_frames(payload,JSON.stringify([f,g])));assert.equal(roots.length,4);
 assert.deepEqual(roots.map(id=>[get(e,id).x,get(e,id).y,get(e,id).parent_id]),[[116,116,f],[306,116,f],[716,316,g],[906,316,g]]);
 assert.equal(get(e,roots[0]).prototype.target,roots[1]);assert.equal(get(e,roots[2]).prototype.target,roots[3]);assert.equal(get(e,roots[0]).group_id,get(e,roots[1]).group_id);assert.notEqual(get(e,roots[0]).group_id,get(e,roots[2]).group_id);
 assert.equal(shapes(e).filter(s=>s.parent_id===roots[0]).length,1);const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);source.free();e.free();
});
test('a protected or invalid later destination prevents every paste and preserves history',()=>{
 const e=new Editor(),f=e.add('frame',0,0),g=e.add('frame',500,0),c=e.add('rectangle',10,10),payload=e.copy_layers(JSON.stringify([c]));edit(e,g,{locked:true});let before=e.snapshot();assert.throws(()=>e.paste_into_frames(payload,JSON.stringify([f,g])));assert.equal(e.snapshot(),before);assert.throws(()=>e.paste_into_frames(payload,JSON.stringify([f,c])));assert.equal(e.snapshot(),before);
 edit(e,g,{locked:false});e.create_component(g);const i=e.create_instance(g,900,0);before=e.snapshot();assert.throws(()=>e.paste_into_frames(payload,JSON.stringify([f,i])),/Detach/);assert.equal(e.snapshot(),before);assert.throws(()=>e.paste_into_frames('{}',JSON.stringify([f])));assert.equal(e.snapshot(),before);e.free();
});
test('pasting into main components synchronizes instances without reusing IDs',()=>{
 const e=new Editor(),f=e.add('frame',0,0),g=e.add('frame',500,0);e.create_component(f);const instance=e.create_instance(f,900,0),r=e.add('rectangle',30,40),payload=e.copy_layers(JSON.stringify([r]));const roots=JSON.parse(e.paste_into_frames(payload,JSON.stringify([f,g])));assert.equal(roots.length,2);assert.ok(shapes(e).some(s=>s.parent_id===instance&&s.component.source===roots[0]));e.add('ellipse',1000,100);assert.equal(new Set(shapes(e).map(s=>s.id)).size,shapes(e).length);e.free();
});
