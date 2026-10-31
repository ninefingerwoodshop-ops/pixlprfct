import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),children=(e,id)=>doc(e).shapes.filter(s=>s.parent_id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const bind=(e,f,name,kind,targets)=>e.save_component_property(JSON.stringify({id:0,component_id:f,name,kind,targets}));
function main(e,name='Card'){const f=e.add('frame',0,0),a=e.add('text',16,16),b=e.add('text',16,80);edit(e,f,{name});edit(e,a,{name:'Title',text:'Hello'});edit(e,b,{name:'Subtitle',text:'Other'});e.reparent_many(JSON.stringify([a,b]),f);e.create_component(f);return {f,a,b};}

test('exposed text synchronizes multiple bindings, inspector edits, overrides and reset atomically',()=>{
 const e=new Editor(),{f,a,b}=main(e),p=bind(e,f,'Label','text',[a,b]);assert.equal(get(e,b).text,'Hello');const i=e.create_instance(f,700,0),[ia,ib]=children(e,i);
 const before=e.snapshot();e.set_component_property(i,p,JSON.stringify('Custom'));assert.equal(get(e,ia.id).text,'Custom');assert.equal(get(e,ib.id).text,'Custom');assert.equal(get(e,a).text,'Hello');e.undo();assert.equal(e.snapshot(),before);e.redo();
 edit(e,a,{text:'Main update'});assert.equal(get(e,b).text,'Main update');assert.equal(get(e,ia.id).text,'Custom');edit(e,ib.id,{text:'Child edit'});assert.equal(get(e,ia.id).text,'Child edit');
 e.reset_override(ia.id,'text');assert.equal(get(e,ia.id).text,'Main update');assert.equal(get(e,ib.id).text,'Main update');assert.ok(!get(e,ib.id).component.overrides.includes('text'));e.free();
});
test('visibility properties preserve layout, other overrides, saved files and legacy defaults',()=>{
 const e=new Editor(),{f,a,b}=main(e);e.auto_layout_selection(JSON.stringify([f]));const p=bind(e,f,'Show content','boolean',[a,b]),i=e.create_instance(f,700,0),[ia,ib]=children(e,i);assert.throws(()=>edit(e,ia.id,{fill:'#ff0000'}),/protected/);edit(e,ia.id,{text:'Custom label'});
 const previousHeight=get(e,i).height;e.set_component_property(i,p,'false');assert.equal(get(e,ia.id).hidden,true);assert.equal(get(e,ib.id).hidden,true);assert.equal(get(e,a).hidden,false);assert.equal(get(e,i).height,previousHeight);
 e.reset_component_property(ia.id,p);assert.equal(get(e,ia.id).hidden,false);assert.equal(get(e,ia.id).text,'Custom label');assert.equal(get(e,i).height,previousHeight);
 const restored=new Editor();restored.load(e.snapshot());assert.equal(restored.snapshot(),e.snapshot());const legacy=doc(e);delete legacy.component_properties;restored.load(JSON.stringify(legacy));assert.deepEqual(doc(restored).component_properties,[]);e.free();restored.free();
});
test('same named properties preserve overrides when swapping to different layer names and hierarchy',()=>{
 const e=new Editor(),one=main(e,'One'),two=main(e,'Two');edit(e,two.a,{name:'Different title'});edit(e,two.b,{name:'Different subtitle'});const p=bind(e,one.f,'Label','text',[one.a]),q=bind(e,two.f,'Label','text',[two.a,two.b]);
 const i=e.create_instance(one.f,700,0);e.set_component_property(i,p,JSON.stringify('Keep this'));const before=e.snapshot();e.swap_instance(i,two.f);assert.ok(children(e,i).every(s=>s.text==='Keep this'));e.undo();assert.equal(e.snapshot(),before);e.redo();e.reset_component_property(i,q);assert.ok(children(e,i).every(s=>s.text==='Hello'));e.free();
});
test('duplicating main components remaps definitions; deletion prunes bindings and undo restores them',()=>{
 const e=new Editor(),{f,a,b}=main(e);const p=bind(e,f,'Label','text',[a,b]);const copied=JSON.parse(e.duplicate_many(JSON.stringify([f]))),copy=doc(e).component_properties.find(p=>p.component_id===copied[0]);assert.ok(copy);assert.notEqual(copy.id,p);assert.deepEqual(copy.targets,copied.slice(1));
 e.set_component_property(copied[0],copy.id,JSON.stringify('Copy'));assert.equal(get(e,a).text,'Hello');assert.ok(children(e,copied[0]).every(s=>s.text==='Copy'));
 e.remove(a);assert.deepEqual(doc(e).component_properties.find(q=>q.id===p).targets,[b]);e.remove(b);assert.ok(!doc(e).component_properties.some(q=>q.id===p));e.undo();assert.deepEqual(doc(e).component_properties.find(q=>q.id===p).targets,[b]);e.free();
});
test('invalid bindings, values and conflicting bound-layer edits leave the document unchanged',()=>{
 const e=new Editor(),{f,a,b}=main(e),outside=e.add('text',1000,1000),p=bind(e,f,'Label','text',[a,b]);const before=e.snapshot();
 assert.throws(()=>bind(e,f,'Bad','text',[outside]),/inside/);assert.throws(()=>bind(e,f,'Bad','text',[f]),/compatible/);assert.throws(()=>bind(e,f,'Duplicate','text',[a]),/one compatible/);assert.throws(()=>e.set_component_property(f,p,'true'),/string/);
 assert.throws(()=>e.update_many(JSON.stringify([{...get(e,a),text:'One'},{...get(e,b),text:'Two'}])),/same property/);assert.equal(e.snapshot(),before);
 const invalid=doc(e);invalid.component_properties[0].targets=[outside];assert.throws(()=>e.load(JSON.stringify(invalid)),/inside/);assert.equal(e.snapshot(),before);
 e.remove_component_property(p);edit(e,a,{text:'Independent'});assert.equal(get(e,b).text,'Hello');e.free();
});

test('property bindings prune reparented descendants while preserving unrelated mains and undo',()=>{
 const e=new Editor(),one=main(e,'One'),two=main(e,'Two'),nested=e.add('frame',0,0);
 e.reparent_many(JSON.stringify([nested]),one.f);e.reparent_many(JSON.stringify([one.a]),nested);
 const p=bind(e,one.f,'Label','text',[one.a,one.b]),q=bind(e,two.f,'Label','text',[two.a]);
 const before=e.snapshot();e.reparent_many(JSON.stringify([nested]),two.f);
 assert.deepEqual(doc(e).component_properties.find(v=>v.id===p).targets,[one.b]);
 assert.deepEqual(doc(e).component_properties.find(v=>v.id===q).targets,[two.a]);
 e.undo();assert.equal(e.snapshot(),before);e.redo();e.remove(one.b);
 assert.ok(!doc(e).component_properties.some(v=>v.id===p));assert.ok(doc(e).component_properties.some(v=>v.id===q));e.free();
});
