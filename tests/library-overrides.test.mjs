import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {librarySnapshot,mergeLibrary,protectedInstanceError,importedContentError} from '../web/library-model.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot());
test('published author permissions allow exposed content, layout and variants while protecting styling, source and structure',()=>{
 const source=new Editor(),consumer=new Editor();try{
 const a=source.add('frame',0,0),t=source.add('text',10,10);source.reparent_many(JSON.stringify([t]),a);source.create_component(a);
 const policy={properties:true,sizing:true,variants:true};source.update(JSON.stringify({...doc(source).shapes.find(s=>s.id===a),editor_meta:{library_overrides:policy}}));
 const prop=source.save_component_property(JSON.stringify({id:0,component_id:a,name:'Label',kind:'text',targets:[t]}));const b=source.add_variant(a);
 const release={id:'22222222-2222-2222-2222-222222222222',workspace:'personal',name:'Approved overrides',revision:1,body:librarySnapshot(doc(source))};
 consumer.load(JSON.stringify(mergeLibrary(doc(consumer),release)));const map=doc(consumer).libraries[0].maps,i=consumer.create_instance(map.shapes[a],400,300);
 consumer.set_write_guard((a,b)=>importedContentError(JSON.parse(a),JSON.parse(b))||protectedInstanceError(JSON.parse(a),JSON.parse(b))||'');
 consumer.set_component_property(i,map.properties[prop],JSON.stringify('Approved label'));assert.equal(doc(consumer).shapes.find(s=>s.parent_id===i).text,'Approved label');
 consumer.update(JSON.stringify({...doc(consumer).shapes.find(s=>s.id===i),width:700}));assert.equal(doc(consumer).shapes.find(s=>s.id===i).width,700);
 const set=doc(consumer).component_sets.find(s=>s.variants.some(v=>v.component_id===map.shapes[b]));const variant=set.variants.find(v=>v.component_id===map.shapes[b]);consumer.set_variant_property(i,set.properties[0],variant.values[0]);
 assert.equal(doc(consumer).shapes.find(s=>s.id===i).component.master,map.shapes[b]);
 const child=doc(consumer).shapes.find(s=>s.parent_id===i);assert.throws(()=>consumer.update(JSON.stringify({...child,fill:'#ff0000'})),/protected/);assert.throws(()=>consumer.detach_instance(i),/detached/);assert.throws(()=>consumer.remove(child.id),/structure|Detach/);
 const saved=consumer.snapshot();consumer.set_write_guard(()=>null);consumer.load(saved);assert.equal(consumer.snapshot(),saved);assert.equal(protectedInstanceError(doc(consumer),doc(consumer)),null);
 const sourceLabel=doc(source).shapes.find(s=>s.parent_id===b);source.update(JSON.stringify({...sourceLabel,text:'New published default'}));
 consumer.load(JSON.stringify(mergeLibrary(doc(consumer),{...release,revision:2,body:librarySnapshot(doc(source))})));
 assert.equal(doc(consumer).shapes.find(s=>s.id===child.id).text,'Approved label');assert.equal(doc(consumer).shapes.find(s=>s.id===i).width,700);assert.equal(protectedInstanceError(doc(consumer),doc(consumer)),null);
 }finally{source.free();consumer.free();}
});
