import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const children=(e,id)=>doc(e).shapes.filter(s=>s.parent_id===id);
function main(e,name){const f=e.add('frame',0,0),t=e.add('text',16,16);edit(e,f,{name,width:200,height:100});edit(e,t,{name:'Label'});e.reparent_many(JSON.stringify([t]),f);e.create_component(f);return {f,t};}
const save=(e,set)=>e.save_component_set(JSON.stringify(set));

test('multi-property variants select exact matches and preserve instance overrides across pages',()=>{
 const e=new Editor(),a=main(e,'Default small'),b=main(e,'Pressed small');e.add_page();const c=main(e,'Pressed large');edit(e,c.t,{typography:{...get(e,c.t).typography,font_size:48}});
 const id=save(e,{id:0,name:'Button',properties:['State','Size'],variants:[{component_id:a.f,values:['Default','Small']},{component_id:b.f,values:['Pressed','Small']},{component_id:c.f,values:['Pressed','Large']}]});
 const i=e.create_instance(a.f,400,400),text=children(e,i)[0].id;edit(e,text,{text:'Send'});e.set_variant_property(i,'State','Pressed');assert.equal(get(e,i).component.master,b.f);assert.equal(get(e,text).text,'Send');
 const before=e.snapshot();e.set_variant_property(text,'Size','Large');assert.equal(get(e,i).component.master,c.f);assert.equal(get(e,text).typography.font_size,48);assert.equal(get(e,i).x,400);e.undo();assert.equal(e.snapshot(),before);e.redo();
 const restored=new Editor();restored.load(e.snapshot());assert.equal(restored.snapshot(),e.snapshot());assert.equal(doc(e).component_sets[0].id,id);e.free();restored.free();
});

test('sparse variant sets choose the closest remaining properties with stable tie breaking',()=>{
 const e=new Editor(),a=main(e,'A'),b=main(e,'B'),c=main(e,'C');save(e,{id:0,name:'Sparse',properties:['State','Size'],variants:[{component_id:a.f,values:['Default','Small']},{component_id:b.f,values:['Pressed','Large']},{component_id:c.f,values:['Pressed','Small']}]});
 const i=e.create_instance(a.f,400,0);e.set_variant_property(i,'State','Pressed');assert.equal(get(e,i).component.master,c.f);e.set_variant_property(i,'Size','Large');assert.equal(get(e,i).component.master,b.f);e.set_variant_property(i,'State','Default');assert.equal(get(e,i).component.master,a.f);
 const before=e.snapshot();assert.throws(()=>e.set_variant_property(i,'Unknown','x'),/property not found/);assert.throws(()=>e.set_variant_property(i,'Size','Missing'),/value not found/);assert.equal(e.snapshot(),before);e.free();
});

test('duplicate variant clones the frame tree and set membership in one undo step',()=>{
 const e=new Editor(),a=main(e,'Button');const id=save(e,{id:0,name:'Button',properties:['State'],variants:[{component_id:a.f,values:['Default']}]});const before=e.snapshot(),b=e.duplicate_variant(a.f);
 assert.equal(get(e,b).component.type,'master');assert.equal(children(e,b).length,1);assert.equal(get(e,b).x,240);assert.equal(doc(e).component_sets[0].variants.length,2);assert.deepEqual(doc(e).component_sets[0].variants[1].values,['Variant 2']);e.undo();assert.equal(e.snapshot(),before);e.redo();
 const c=e.duplicate_variant(b);assert.deepEqual(doc(e).component_sets[0].variants[2].values,['Variant 3']);assert.equal(new Set(doc(e).shapes.map(s=>s.id)).size,doc(e).shapes.length);
 e.remove(b);assert.equal(doc(e).component_sets[0].variants.length,2);e.undo();assert.equal(doc(e).component_sets[0].variants.length,3);
 e.remove_component_set(id);assert.equal(doc(e).component_sets.length,0);assert.equal(get(e,c).component.type,'master');e.undo();assert.equal(doc(e).component_sets[0].id,id);e.free();
});

test('invalid sets are atomic; deletion prunes membership and legacy files default to no sets',()=>{
 const e=new Editor(),a=main(e,'A'),b=main(e,'B'),before=e.snapshot();
 const set={id:0,name:'Set',properties:['State'],variants:[{component_id:a.f,values:['Default']},{component_id:b.f,values:['Default']}]};assert.throws(()=>save(e,set),/unique combination/);assert.equal(e.snapshot(),before);
 set.variants[1].values=['Pressed'];const id=save(e,set),saved=e.snapshot();assert.throws(()=>save(e,{...set,id:0}),/exactly one set/);assert.equal(e.snapshot(),saved);
 assert.throws(()=>save(e,{...set,id,properties:['State','State']}),/properties/);assert.equal(e.snapshot(),saved);
 const invalid=doc(e);invalid.component_sets[0].variants[0].component_id=99999;assert.throws(()=>e.load(JSON.stringify(invalid)),/main component/);assert.equal(e.snapshot(),saved);
 e.remove(a.f);assert.equal(doc(e).component_sets[0].variants.length,1);e.remove(b.f);assert.equal(doc(e).component_sets.length,0);e.undo();assert.equal(doc(e).component_sets[0].variants.length,1);
 const legacy=JSON.parse(saved);delete legacy.component_sets;e.load(JSON.stringify(legacy));assert.deepEqual(doc(e).component_sets,[]);e.free();
});

test('Add variant creates a visible set from one main in a single undo step',()=>{
 const e=new Editor(),a=main(e,'Button'),before=e.snapshot();const b=e.add_variant(a.f),set=doc(e).component_sets[0],frame=get(e,set.frame_id);
 assert.equal(frame.name,'Button');assert.equal(frame.component,null);assert.equal(frame.clip_content,false);assert.equal(frame.appearance.fill_enabled,false);
 assert.equal(get(e,a.f).parent_id,frame.id);assert.equal(get(e,b).parent_id,frame.id);assert.equal(get(e,b).y,120);assert.equal(get(e,a.t).x,16);assert.equal(frame.height,260);
 assert.equal(get(e,a.f).name,'Property 1=Default');assert.equal(get(e,b).name,'Property 1=Variant 2');
 e.undo();assert.equal(e.snapshot(),before);e.redo();const saved=e.snapshot(),restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);
 const i=e.create_instance(a.f,400,0),label=children(e,i)[0];edit(e,label.id,{text:'Send'});e.set_variant_property(i,'Property 1','Variant 2');assert.equal(get(e,i).component.master,b);assert.equal(get(e,label.id).text,'Send');
 const c=e.add_variant(set.frame_id);assert.equal(get(e,c).parent_id,set.frame_id);assert.equal(get(e,c).y,240);assert.equal(get(e,set.frame_id).height,380);
 e.free();restored.free();
});

test('Combine as variants infers shared names, preserves artwork and rejects invalid selections atomically',()=>{
 const e=new Editor(),a=main(e,'Button / Default'),b=main(e,'Button / Hover');edit(e,b.f,{x:300,y:50});const before=e.snapshot(),frame=e.combine_variants(JSON.stringify([a.f,b.f])),set=doc(e).component_sets[0];
 assert.equal(set.name,'Button');assert.equal(set.frame_id,frame);assert.deepEqual(set.variants.map(v=>v.values),[['Default'],['Hover']]);assert.equal(get(e,b.f).x,300);assert.equal(get(e,b.f).y,50);assert.equal(get(e,a.t).x,16);
 const combined=e.snapshot();assert.throws(()=>e.combine_variants(JSON.stringify([a.f,b.f])),/already belong/);assert.equal(e.snapshot(),combined);
 e.undo();assert.equal(e.snapshot(),before);assert.throws(()=>e.combine_variants(JSON.stringify([a.f,a.t])),/main components/);assert.equal(e.snapshot(),before);e.free();
});

test('property edits update variant layer names, reject duplicate combinations, and preserve instance links',()=>{
 const e=new Editor(),a=main(e,'Button'),b=e.add_variant(a.f),set=doc(e).component_sets[0],i=e.create_instance(b,400,0);
 set.properties=['State'];set.variants[1].values=['Hover'];save(e,set);assert.equal(get(e,b).name,'State=Hover');assert.equal(get(e,i).component.master,b);
 const saved=e.snapshot();set.variants[1].values=['Default'];assert.throws(()=>save(e,set),/unique combination/);assert.equal(e.snapshot(),saved);
 const frame=get(e,set.frame_id);edit(e,frame.id,{name:'Action button'});assert.equal(doc(e).component_sets[0].name,'Action button');
 e.remove(b);assert.equal(doc(e).component_sets[0].variants.length,1);e.undo();assert.equal(doc(e).component_sets[0].variants.length,2);e.free();
});

test('duplicating a component set or its page preserves independent variant definitions',()=>{
 const e=new Editor(),a=main(e,'Button');e.add_variant(a.f);const original=doc(e).component_sets[0],before=e.snapshot();const ids=JSON.parse(e.duplicate_many(JSON.stringify([original.frame_id]))),copy=doc(e).component_sets.find(s=>s.id!==original.id);
 assert.equal(copy.frame_id,ids[0]);assert.equal(copy.variants.length,2);assert(copy.variants.every(v=>get(e,v.component_id).parent_id===copy.frame_id));
 copy.properties=['State'];save(e,copy);assert.deepEqual(doc(e).component_sets.find(s=>s.id===original.id).properties,['Property 1']);e.undo();e.undo();assert.equal(e.snapshot(),before);
 e.duplicate_page(doc(e).active_page);assert.equal(doc(e).component_sets.length,2);assert(doc(e).component_sets.every(s=>get(e,s.frame_id)));e.free();
});

test('Add variant upgrades legacy sibling sets without changing their property choices',()=>{
 const e=new Editor(),a=main(e,'A'),b=main(e,'B');edit(e,b.f,{x:300});const id=save(e,{id:0,name:'Button',properties:['State'],variants:[{component_id:a.f,values:['Default']},{component_id:b.f,values:['Hover']}]});const before=e.snapshot();
 const c=e.add_variant(a.f),set=doc(e).component_sets.find(s=>s.id===id);assert(set.frame_id);assert.equal(get(e,c).parent_id,set.frame_id);assert.deepEqual(set.variants.slice(0,2).map(v=>v.values),[['Default'],['Hover']]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
