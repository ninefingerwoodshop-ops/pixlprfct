import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>shapes(e).find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('paste replace preserves each target position, parent, sibling order and layout settings in one history step',()=>{
 const source=new Editor(),copy=source.add('ellipse',10,20),payload=source.copy_layers(JSON.stringify([copy]));
 const e=new Editor(),frame=e.add('frame',100,100),a=e.add('rectangle',110,120),b=e.add('text',150,160),c=e.add('rectangle',180,200);e.reparent_many(JSON.stringify([a,b,c]),frame);edit(e,a,{layout_item:{fill_width:true,fill_height:false,absolute:true},constraints:{horizontal:'max',vertical:'center'}});
 const before=e.snapshot(),roots=JSON.parse(e.paste_replace(payload,JSON.stringify([c,a])));
 assert.equal(roots.length,2);assert.deepEqual(shapes(e).map(s=>s.id),[frame,roots[0],b,roots[1]]);
 assert.deepEqual(roots.map(id=>[get(e,id).x,get(e,id).y,get(e,id).parent_id]),[[110,120,frame],[180,200,frame]]);assert.equal(get(e,roots[0]).kind,'ellipse');assert.equal(get(e,roots[0]).layout_item.absolute,true);assert.equal(get(e,roots[0]).constraints.horizontal,'max');
 const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);source.free();e.free();
});
test('nested selection replaces the outer frame once; multiple copies remap links independently',()=>{
 const source=new Editor(),one=source.add('frame',10,20),two=source.add('frame',300,20);edit(source,one,{prototype:{action:'navigate',target:two}});const payload=source.copy_layers(JSON.stringify([one,two]));
 const e=new Editor(),f=e.add('frame',100,200),child=e.add('text',120,220),other=e.add('rectangle',700,800);e.reparent_many(JSON.stringify([child]),f);
 const roots=JSON.parse(e.paste_replace(payload,JSON.stringify([f,child,other])));assert.equal(roots.length,4);assert.equal(shapes(e).length,4);assert.equal(get(e,roots[0]).prototype.target,roots[1]);assert.equal(get(e,roots[2]).prototype.target,roots[3]);assert.deepEqual(roots.map(id=>[get(e,id).x,get(e,id).y]),[[100,200],[390,200],[700,800],[990,800]]);source.free();e.free();
});
test('replacement rejects locked ancestors and invalid payloads without changing document or undo',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('rectangle',10,10);e.reparent_many(JSON.stringify([c]),f);const payload=e.copy_layers(JSON.stringify([c]));edit(e,f,{locked:true});const before=e.snapshot();assert.throws(()=>e.paste_replace(payload,JSON.stringify([c])));assert.equal(e.snapshot(),before);
 edit(e,f,{locked:false});const valid=e.snapshot();for(const text of ['{}','not json',JSON.stringify({...JSON.parse(payload),version:3})]){assert.throws(()=>e.paste_replace(text,JSON.stringify([c])));assert.equal(e.snapshot(),valid);}assert.throws(()=>e.paste_replace(payload,'[]'));assert.equal(e.snapshot(),valid);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('replacement protects instance children and synchronizes replaced main children without ID collisions',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('text',10,10);e.reparent_many(JSON.stringify([c]),f);e.create_component(f);const instance=e.create_instance(f,400,0),child=shapes(e).find(s=>s.parent_id===instance).id;
 const payload=e.copy_layers(JSON.stringify([c])),before=e.snapshot();assert.throws(()=>e.paste_replace(payload,JSON.stringify([child])),/Detach/);assert.equal(e.snapshot(),before);
 const roots=JSON.parse(e.paste_replace(payload,JSON.stringify([c])));assert.equal(shapes(e).find(s=>s.parent_id===instance).component.source,roots[0]);const next=e.add('ellipse',800,0);assert.ok(get(e,next));assert.equal(new Set(shapes(e).map(s=>s.id)).size,shapes(e).length);e.free();
});
