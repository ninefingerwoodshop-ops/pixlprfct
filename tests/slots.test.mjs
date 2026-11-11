import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),children=(e,id)=>doc(e).shapes.filter(s=>s.parent_id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
function fixture(){const e=new Editor(),master=e.add('frame',0,0),frame=e.add('frame',20,20),label=e.add('text',30,30);edit(e,frame,{width:200,height:100});e.reparent_many(JSON.stringify([frame]),master);e.reparent_many(JSON.stringify([label]),frame);e.create_component(master);const slot=e.wrap_in_slot(JSON.stringify([frame]),'Content'),instance=e.create_instance(master,800,0),copy=children(e,instance)[0].id;return {e,master,slot,label,instance,copy};}
test('slot defaults follow the main until customized; customization survives main edits, movement and reload',()=>{const {e,master,slot,label,instance,copy}=fixture();const child=children(e,copy)[0].id;assert.equal(get(e,child).component,null);edit(e,label,{text:'New default'});assert.equal(get(e,child).text,'New default');edit(e,child,{text:'Custom',fill:'#ff0000',width:70});assert.equal(get(e,copy).slot.modified,true);edit(e,label,{text:'Changed again'});edit(e,master,{fill:'#123456'});assert.equal(get(e,instance).fill,'#123456');assert.equal(get(e,child).text,'Custom');const x=get(e,child).x;edit(e,instance,{x:900});assert.equal(get(e,child).x,x+100);const reload=new Editor();reload.load(e.snapshot());assert.equal(get(reload,child).text,'Custom');e.reset_slot(copy);assert.equal(children(e,copy)[0].text,'Changed again');assert.equal(get(e,copy).slot.modified,false);reload.free();e.free();});
test('slots accept arbitrary content and nested linked instances; clear and reset are atomic undo steps',()=>{const {e,slot,copy}=fixture();const rect=e.add('rectangle',850,40);e.reparent_many(JSON.stringify([rect]),copy);const nested=e.add('frame',1200,0);e.create_component(nested);const nestedInstance=e.place_instance(nested,830,30,copy);edit(e,nested,{fill:'#123456'});assert.equal(get(e,nestedInstance).fill,'#123456');const before=e.snapshot();e.clear_slot(copy);assert.equal(children(e,copy).length,0);assert.equal(get(e,copy).slot.modified,true);e.undo();assert.equal(e.snapshot(),before);e.redo();e.reset_slot(copy);assert.equal(children(e,copy).length,children(e,slot).length);e.free();});
test('ordinary instance structure stays protected and slot frame layout remains main-controlled',()=>{const {e,instance,copy}=fixture();const rect=e.add('rectangle',800,0),before=e.snapshot();assert.throws(()=>e.reparent_many(JSON.stringify([rect]),instance),/Detach/);assert.equal(e.snapshot(),before);assert.throws(()=>edit(e,copy,{x:999}),/protected/);edit(e,copy,{fill:'#ff0000'});assert.equal(get(e,copy).fill,'#ff0000');assert.throws(()=>edit(e,copy,{slot:{property:999,modified:true}}),/slot actions/);e.free();});
test('slot properties can be unbound and have advisory limits; wrapping selections creates one undo entry',()=>{const e=new Editor(),master=e.add('frame',0,0);e.create_component(master);const property=e.save_component_property(JSON.stringify({id:0,component_id:master,name:'Content',kind:'slot',targets:[],slot_settings:{min_children:1,max_children:2}}));assert.equal(doc(e).component_properties[0].id,property);const a=e.add('text',10,10),b=e.add('rectangle',20,20);e.reparent_many(JSON.stringify([a,b]),master);const before=e.snapshot();const slot=e.wrap_in_slot(JSON.stringify([a,b]),'Body');assert.equal(children(e,slot).length,2);e.undo();assert.equal(e.snapshot(),before);e.redo();assert.ok(get(e,slot).slot);e.free();});
test('duplicated mains remap slot bindings and instances retain independent custom content',()=>{const {e,master,copy,instance}=fixture();edit(e,children(e,copy)[0].id,{text:'Mine'});const duplicate=JSON.parse(e.duplicate_many(JSON.stringify([instance])))[0];const ds=children(e,duplicate)[0];assert.equal(children(e,ds.id)[0].text,'Mine');edit(e,children(e,ds.id)[0].id,{text:'Other'});assert.equal(children(e,copy)[0].text,'Mine');const m=JSON.parse(e.duplicate_many(JSON.stringify([master])))[0],p=doc(e).component_properties.find(p=>p.component_id===m);assert.ok(p);assert.equal(get(e,p.targets[0]).slot.property,p.id);e.free();});
import {mergeLibrary,librarySnapshot,protectedInstanceError,importedContentError} from '../web/library-model.js';
import {slotWarnings} from '../web/slots.js';
import {selectionTarget} from '../web/selection.js';
import {frameAt} from '../web/scene.js';
test('published slots remap, allow content customization, and keep library structure protected',()=>{const {e,master,slot}=fixture(),target=new Editor();target.add('rectangle',0,0);target.load(JSON.stringify(mergeLibrary(doc(target),{id:'slot-library',workspace:'personal',name:'Cards',revision:1,body:librarySnapshot(doc(e))})));const before=doc(target),mapped=before.libraries[0].maps.shapes[master],instance=target.create_instance(mapped,800,0),copy=children(target,instance)[0].id;assert.equal(protectedInstanceError(before,doc(target)),null);target.set_write_guard((a,b)=>importedContentError(JSON.parse(a),JSON.parse(b))||protectedInstanceError(JSON.parse(a),JSON.parse(b))||'');const child=children(target,copy)[0].id;edit(target,child,{text:'Library content'});const rect=target.add('rectangle',850,50);target.reparent_many(JSON.stringify([rect]),copy);assert.equal(protectedInstanceError(before,doc(target)),null);assert.throws(()=>target.reparent_many(JSON.stringify([rect]),instance),/Detach/);target.reset_slot(copy);assert.equal(children(target,copy)[0].text,children(e,slot)[0].text);target.free();e.free();});
test('same-file copy and paste retain customized slots, cross-file paste retains editable visual content',()=>{const {e,copy,instance}=fixture();edit(e,children(e,copy)[0].id,{text:'Copied content'});const payload=e.copy_layers(JSON.stringify([instance])),pasted=JSON.parse(e.paste_layers(payload,24,24,0))[0];assert.equal(children(e,children(e,pasted)[0].id)[0].text,'Copied content');const other=new Editor(),foreign=JSON.parse(other.paste_layers(payload,0,0,0))[0];assert.equal(children(other,children(other,foreign)[0].id)[0].text,'Copied content');assert.ok(doc(other).shapes.every(s=>!s.slot));other.free();e.free();});
test('slot limits warn without blocking content and slot canvas hit targets stay editable',()=>{const {e,copy,slot}=fixture(),p=doc(e).component_properties[0];e.save_component_property(JSON.stringify({...p,slot_settings:{max_children:0,only_preferred_instances:true,preferred_instances:[]}}));assert.equal(slotWarnings(doc(e),get(e,copy)).length,2);assert.equal(frameAt(doc(e).shapes,{x:830,y:50}),copy);const child=children(e,copy)[0];assert.equal(selectionTarget(doc(e).shapes,child.id),child.id);assert.equal(selectionTarget(doc(e).shapes,copy),copy);e.clear_slot(copy);assert.deepEqual(slotWarnings(doc(e),get(e,copy)),[]);e.free();});
test('removing a slot property resets content to ordinary protected instance children and supports undo',()=>{const {e,copy,label}=fixture(),p=doc(e).component_properties[0];edit(e,children(e,copy)[0].id,{text:'Custom'});const before=e.snapshot();e.remove_component_property(p.id);assert.equal(get(e,copy).slot,undefined);assert.equal(children(e,copy)[0].text,get(e,label).text);assert.equal(children(e,copy)[0].component.type,'instance');e.undo();assert.equal(e.snapshot(),before);e.free();});
test('matching slot properties carry customized content through variant swaps',()=>{const {e,master,copy,instance}=fixture();edit(e,children(e,copy)[0].id,{text:'Keep me'});const target=JSON.parse(e.duplicate_many(JSON.stringify([master])))[0],targetSlot=children(e,target).find(s=>s.slot);edit(e,targetSlot.id,{name:'Renamed target frame'});e.swap_instance(instance,target);assert.equal(children(e,children(e,instance).find(s=>s.slot).id)[0].text,'Keep me');e.free();});
test('reset all restores slot defaults even when nested instances contain overrides',()=>{const {e,copy,instance}=fixture(),master=e.add('frame',1200,0),label=e.add('text',1210,10);e.reparent_many(JSON.stringify([label]),master);e.create_component(master);const nested=e.place_instance(master,820,20,copy);edit(e,children(e,nested)[0].id,{text:'Override'});e.reset_instance(instance);assert.equal(get(e,copy).slot.modified,false);assert.equal(children(e,copy).length,1);assert.ok(!get(e,nested));e.free();});
test('slot defaults reject host property bindings, and detaching the host preserves nested content instances',()=>{const {e,copy,instance,master,label}=fixture();assert.throws(()=>e.save_component_property(JSON.stringify({id:0,component_id:master,name:'Bad',kind:'text',targets:[label]})),/slot contents/);const inner=e.add('frame',1200,0);e.create_component(inner);const nested=e.place_instance(inner,820,20,copy);e.detach_instance(instance);assert.equal(get(e,instance).component,null);assert.equal(get(e,nested).component.master,inner);e.free();});
test('font-layout refresh preserves generated CSS identities of default slot content',()=>{
 const {e,copy}=fixture();try{const ids=children(e,copy).map(s=>({id:s.id,layout_class:s.layout_class}));e.refresh_text_layout();assert.deepEqual(children(e,copy).map(s=>({id:s.id,layout_class:s.layout_class})),ids);assert.equal(get(e,copy).slot.modified,false);}finally{e.free();}
});
// A two- or three-variant set whose variants are structural copies of one card.
function variantFixture(count=2){
 const e=new Editor(),master=e.add('frame',0,0),body=e.add('frame',20,20),footer=e.add('frame',20,140),label=e.add('text',30,30);
 edit(e,master,{name:'Card',width:300,height:240});edit(e,body,{name:'Body area',width:200,height:100});edit(e,footer,{name:'Footer area',width:200,height:60});
 e.reparent_many(JSON.stringify([body,footer]),master);e.reparent_many(JSON.stringify([label]),body);e.create_component(master);
 const masters=[master];for(let i=1;i<count;i++)masters.push(JSON.parse(e.duplicate_many(JSON.stringify([master])))[0]);
 e.save_component_set(JSON.stringify({id:0,name:'Card',properties:['State'],variants:masters.map((component_id,i)=>({component_id,values:['State '+i]}))}));
 const part=(m,name)=>children(e,m).find(s=>s.name===name)?.id,slots=m=>doc(e).component_properties.filter(p=>p.component_id===m&&p.kind==='slot');
 return {e,masters,body,footer,part,slots};
}
const acrossVariants=(e,p)=>JSON.parse(e.save_slot_across_variants(JSON.stringify(p)));
test('a new slot is authored in every variant in one undo step, matched by name or position',()=>{
 const {e,masters,body,part,slots}=variantFixture(3),before=e.snapshot();
 const settings={description:'**Main** content',min_children:1,max_children:4,preferred_instances:[],only_preferred_instances:false,display_empty:true,fill_counter_axis:false};
 const report=acrossVariants(e,{id:0,component_id:masters[0],name:'Body',kind:'slot',targets:[body],slot_settings:settings});
 assert.deepEqual([report.created,report.updated,report.unchanged,report.skipped],[2,0,0,[]]);
 for(const m of masters){const [p]=slots(m);assert.equal(p.name,'Body');assert.deepEqual(p.slot_settings,settings);assert.equal(p.targets.length,1);assert.equal(get(e,p.targets[0]).parent_id,m);assert.equal(get(e,p.targets[0]).slot.property,p.id);}
 // New slot frames take the slot name, as when wrapping a selection.
 assert.equal(get(e,slots(masters[1])[0].targets[0]).name,'Body');assert.equal(get(e,part(masters[1],'Footer area')).slot,undefined);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(slots(masters[2]).length,1);
 const reload=new Editor();reload.load(e.snapshot());assert.equal(reload.snapshot(),e.snapshot());reload.free();e.free();
});
test('saving again updates settings everywhere, keeps each variant\'s own targets, and reports no change when equal',()=>{
 const {e,masters,body,part,slots}=variantFixture();
 acrossVariants(e,{id:0,component_id:masters[0],name:'Body',kind:'slot',targets:[body],slot_settings:{}});
 // The second variant also exposes its footer through the same slot.
 const other=slots(masters[1])[0],extra=part(masters[1],'Footer area');
 e.save_component_property(JSON.stringify({...other,targets:[...other.targets,extra]}));
 const source=slots(masters[0])[0],report=acrossVariants(e,{...source,slot_settings:{...source.slot_settings,description:'Use for *content*',max_children:3}});
 assert.deepEqual([report.created,report.updated,report.unchanged],[0,1,0]);
 assert.equal(slots(masters[1])[0].slot_settings.max_children,3);assert.deepEqual(slots(masters[1])[0].targets,[...other.targets,extra]);
 const settled=e.snapshot(),again=acrossVariants(e,slots(masters[0])[0]);
 assert.deepEqual([again.created,again.updated,again.unchanged],[0,0,1]);assert.equal(e.snapshot(),settled);e.free();
});
test('renaming a slot follows it into the other variants instead of creating a second property',()=>{
 const {e,masters,body,slots}=variantFixture(3);
 acrossVariants(e,{id:0,component_id:masters[0],name:'Body',kind:'slot',targets:[body],slot_settings:{}});
 const report=acrossVariants(e,{...slots(masters[0])[0],name:'Content'});
 assert.equal(report.created,0);for(const m of masters)assert.deepEqual(slots(m).map(p=>p.name),['Content']);e.free();
});
test('variants without a matching layer or with a clashing property are skipped with a reason, never failed',()=>{
 const {e,masters,body,part,slots}=variantFixture(3),label=children(e,part(masters[2],'Body area'))[0].id;
 // Variant 1 loses its layers; variant 2 already has a text property named Body.
 e.remove_many(JSON.stringify(children(e,masters[1]).map(s=>s.id)));
 e.save_component_property(JSON.stringify({id:0,component_id:masters[2],name:'Body',kind:'text',targets:[label]}));
 const report=acrossVariants(e,{id:0,component_id:masters[0],name:'Body',kind:'slot',targets:[body],slot_settings:{}});
 assert.equal(report.created,0);assert.deepEqual(report.skipped.map(s=>[s.component_id,s.reason]),[[masters[1],'no matching layer'],[masters[2],'another property already uses this name']]);
 assert.equal(slots(masters[0]).length,1);assert.equal(slots(masters[1]).length,0);assert.equal(slots(masters[2]).length,0);e.free();
});
test('a layer already bound to another slot, or nested inside one, is not taken over',()=>{
 const {e,masters,body,part,slots}=variantFixture();
 e.save_component_property(JSON.stringify({id:0,component_id:masters[1],name:'Existing',kind:'slot',targets:[part(masters[1],'Body area')],slot_settings:{}}));
 const report=acrossVariants(e,{id:0,component_id:masters[0],name:'Body',kind:'slot',targets:[body],slot_settings:{}});
 assert.deepEqual(report.skipped.map(s=>s.reason),['no matching layer']);assert.deepEqual(slots(masters[1]).map(p=>p.name),['Existing']);e.free();
});
test('across-variant commands reject non-slot properties and components outside a set, leaving the document alone',()=>{
 const {e,master,slot}=fixture(),p=doc(e).component_properties[0],before=e.snapshot();
 assert.throws(()=>acrossVariants(e,p),/inside a component set/);assert.throws(()=>acrossVariants(e,{...p,kind:'text'}),/Only slot properties/);
 assert.throws(()=>e.save_slot_across_variants('not json'));assert.throws(()=>e.remove_slot_across_variants(999),/not found/);
 assert.equal(e.snapshot(),before);assert.ok(get(e,slot).slot);assert.ok(master);
 // Outside a set, removal still removes the one property.
 assert.equal(e.remove_slot_across_variants(p.id),1);assert.equal(doc(e).component_properties.length,0);e.free();
});
test('removing across variants clears the same-named slots in one undo step and resets instance content',()=>{
 const {e,masters,body,slots}=variantFixture(3);
 acrossVariants(e,{id:0,component_id:masters[0],name:'Body',kind:'slot',targets:[body],slot_settings:{}});
 e.save_component_property(JSON.stringify({id:0,component_id:masters[1],name:'Other',kind:'slot',targets:[],slot_settings:{}}));
 const instance=e.create_instance(masters[2],900,0),copy=children(e,instance).find(s=>s.slot).id;edit(e,children(e,copy)[0].id,{text:'Custom'});
 const before=e.snapshot();assert.equal(e.remove_slot_across_variants(slots(masters[0])[0].id),3);
 assert.deepEqual(doc(e).component_properties.map(p=>p.name),['Other']);assert.equal(get(e,copy).slot,undefined);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
