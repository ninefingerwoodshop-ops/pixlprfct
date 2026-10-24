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
