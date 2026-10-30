import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {defaultShadow} from '../web/effect-editor.js';
import {effectStyleValues} from '../web/effect-style-controls.js';
import {mergeLibrary,librarySnapshot,importedContentError,protectedInstanceError} from '../web/library-model.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),shape=(e,id)=>doc(e).shapes.find(s=>s.id===id);
const effects=(blur=8)=>effectStyleValues({shadows:[{...defaultShadow(),blur},{...defaultShadow('inner'),visible:false}],layer_blur:3,layer_blur_enabled:false,backdrop_blur:4});
const save=(e,id=0,name='Elevation / Card',layer=0,values=effects())=>e.save_effect_style(JSON.stringify({id,name,description:'Card elevation',effects:values}),layer);
test('effect styles propagate across pages and duplicates without changing paints or geometry; undo and files retain links',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),before=e.snapshot(),id=save(e,0,'  Elevation / Card  ',a);
 assert.equal(shape(e,a).effect_style,id);assert.equal(doc(e).effect_styles[0].name,'Elevation / Card');e.undo();assert.equal(e.snapshot(),before);e.redo();
 const b=JSON.parse(e.duplicate_many(JSON.stringify([a])))[0];e.add_page();const c=e.add('ellipse',200,0);e.apply_effect_style(JSON.stringify([c]),id);save(e,id,'Elevation / Card',a);assert.equal(doc(e).active_page,2);assert.equal(shape(e,a).effect_style,id);
 e.update(JSON.stringify({...shape(e,c),fill:'#abcdef',appearance:{...shape(e,c).appearance,opacity:.5,corner_radius:12}}));assert.equal(shape(e,c).effect_style,id);
 const old=e.snapshot();save(e,id,'Elevation / Raised',0,effects(24));for(const n of [a,b,c])assert.equal(shape(e,n).appearance.shadows[0].blur,24);
 assert.equal(shape(e,c).fill,'#abcdef');assert.equal(shape(e,c).appearance.opacity,.5);assert.equal(shape(e,c).appearance.corner_radius,12);
 const updated=e.snapshot();e.undo();assert.equal(e.snapshot(),old);e.redo();assert.equal(e.snapshot(),updated);const restored=new Editor();restored.load(updated);assert.equal(restored.snapshot(),updated);restored.free();e.free();
});
test('detaching, local effect edits, removing styles and clipboard preserve resolved effects',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),id=save(e,0,'Card',a);e.apply_effect_style(JSON.stringify([a]),0);assert.equal(shape(e,a).effect_style,0);assert.deepEqual(effectStyleValues(shape(e,a).appearance),effects());
 e.apply_effect_style(JSON.stringify([a]),id);e.update(JSON.stringify({...shape(e,a),appearance:{...shape(e,a).appearance,layer_blur:9}}));assert.equal(shape(e,a).effect_style,0);save(e,id,'Card',0,effects(32));assert.equal(shape(e,a).appearance.layer_blur,9);assert.equal(shape(e,a).appearance.shadows[0].blur,8);
 e.apply_effect_style(JSON.stringify([a]),id);const other=new Editor();const pasted=JSON.parse(other.paste_layers(e.copy_layers(JSON.stringify([a])),0,0,0))[0];assert.equal(shape(other,pasted).effect_style,0);assert.deepEqual(shape(other,pasted).appearance,shape(e,a).appearance);
 const old=e.snapshot();e.remove_effect_style(id);assert.equal(shape(e,a).effect_style,0);assert.equal(shape(e,a).appearance.shadows[0].blur,32);e.undo();assert.equal(e.snapshot(),old);other.free();e.free();
});
test('main component effect changes reach nested instances while direct instance styling is protected',()=>{
 const e=new Editor(),a=e.add('frame',0,0),id=save(e,0,'Card',a);e.create_component(a);const i=e.create_instance(a,400,0),outer=e.create_component_selection(JSON.stringify([i])),nested=e.create_instance(outer,800,0);
 const before=e.snapshot();for(const fn of [()=>e.apply_effect_style(JSON.stringify([i]),0),()=>save(e,0,'Other',i),()=>e.update(JSON.stringify({...shape(e,i),appearance:{...shape(e,i).appearance,shadows:[]}}))]){assert.throws(fn,/protected/);assert.equal(e.snapshot(),before);}
 save(e,id,'Card',0,effects(20));for(const s of doc(e).shapes.filter(s=>s.effect_style===id))assert.equal(s.appearance.shadows[0].blur,20);assert.ok(doc(e).shapes.some(s=>s.parent_id===nested&&s.effect_style===id));
 e.remove_effect_style(id);assert.ok(doc(e).shapes.every(s=>s.effect_style===0));assert.equal(shape(e,i).appearance.shadows[0].blur,20);e.free();
});
test('invalid styles, broken references and mixed protected selections fail atomically; old documents still load',()=>{
 const e=new Editor(),a=e.add('frame',0,0),id=save(e,0,'Card',a),before=e.snapshot();
 for(const [name,value] of [['',effects()],['x'.repeat(129),effects()],['Bad',{shadows:Array(9).fill(defaultShadow())}],['Bad',{shadows:[{...defaultShadow(),color:'red'}]}],['Bad',{layer_blur:-1}],['Bad',{backdrop_blur:201}]]){assert.throws(()=>save(e,id,name,0,value));assert.equal(e.snapshot(),before);}
 assert.throws(()=>save(e,0,'card'));assert.throws(()=>e.apply_effect_style(JSON.stringify([a]),999));assert.equal(e.snapshot(),before);
 const corrupt=doc(e);corrupt.shapes[0].effect_style=999;assert.throws(()=>e.load(JSON.stringify(corrupt)));assert.equal(e.snapshot(),before);
 e.create_component(a);const i=e.create_instance(a,400,0),b=e.add('rectangle',800,0),other=save(e,0,'Other'),current=e.snapshot();assert.throws(()=>e.apply_effect_style(JSON.stringify([b,i]),other),/protected/);assert.equal(e.snapshot(),current);
 const legacy=doc(e);delete legacy.effect_styles;for(const s of legacy.shapes)delete s.effect_style;e.load(JSON.stringify(legacy));assert.deepEqual(doc(e).effect_styles,[]);e.free();
});
test('shared libraries remap effect IDs and protect definitions and linked instances',()=>{
 const source=new Editor(),a=source.add('frame',0,0),id=save(source,0,'Source card',a);source.create_component(a);
 const target=new Editor();save(target,0,'Source card');const release={id:'effects',workspace:'local',name:'Effects',revision:1,body:librarySnapshot(doc(source))};target.load(JSON.stringify(mergeLibrary(doc(target),release)));
 const mapped=doc(target).libraries[0].maps,style=mapped.effects[id];assert.notEqual(style,id);assert.equal(shape(target,mapped.shapes[a]).effect_style,style);const i=target.create_instance(mapped.shapes[a],400,0),before=doc(target);
 assert.equal(shape(target,i).effect_style,style);assert.equal(protectedInstanceError(before,before),null);
 const tampered=structuredClone(before);tampered.effect_styles.find(s=>s.id===style).effects.shadows=[];assert.match(importedContentError(before,tampered),/protected/);
 save(source,id,'Source card',0,effects(30));target.load(JSON.stringify(mergeLibrary(before,{...release,revision:2,body:librarySnapshot(doc(source))})));assert.equal(shape(target,i).appearance.shadows[0].blur,30);assert.equal(doc(target).effect_styles.find(s=>s.id===1).effects.shadows[0].blur,8);
 source.remove_effect_style(id);target.load(JSON.stringify(mergeLibrary(doc(target),{...release,revision:3,body:librarySnapshot(doc(source))})));assert.equal(shape(target,i).effect_style,0);assert.equal(shape(target,i).appearance.shadows[0].blur,30);
 source.free();target.free();
});

test('applying styles replaces blur variable bindings; explicit blur bindings detach the style',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0);
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Metrics',modes:[{id:1,name:'Default'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Blur',kind:'number',values:{1:3}}]}));
 e.bind_variable(a,'appearance.layer_blur',1);const id=save(e,0,'Card',a);assert.equal(shape(e,a).variable_bindings['appearance.layer_blur'],undefined);
 e.bind_variable(a,'appearance.layer_blur',1);assert.equal(shape(e,a).effect_style,0);assert.equal(shape(e,a).variable_bindings['appearance.layer_blur'],1);
 save(e,id,'Card',0,effects(50));assert.equal(shape(e,a).appearance.shadows[0].blur,8);e.apply_effect_style(JSON.stringify([a]),id);assert.equal(shape(e,a).variable_bindings['appearance.layer_blur'],undefined);e.free();
});
