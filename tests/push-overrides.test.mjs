import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),edit=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v}));
function fixture(){const e=new Editor(),m=e.add('frame',0,0),t=e.add('text',10,10);e.reparent_many(JSON.stringify([t]),m);e.create_component(m);const a=e.create_instance(m,500,0),b=e.create_instance(m,900,0);return {e,m,t,a,b};}
const child=(e,id)=>all(e).find(s=>s.parent_id===id);
test('pushing text/styles updates the main and other instances, retains geometry and independent overrides, and undoes once',()=>{
 const {e,m,t,a,b}=fixture(),at=child(e,a).id,bt=child(e,b).id;edit(e,at,{text:'New default',fill:'#ff0000',width:275});edit(e,bt,{fill:'#0000ff'});const before=e.snapshot(),mainWidth=get(e,t).width;
 e.push_style_overrides(at);assert.equal(get(e,t).text,'New default');assert.equal(get(e,t).fill,'#ff0000');assert.equal(get(e,t).width,mainWidth);assert.equal(get(e,at).width,275);assert.ok(get(e,at).component.overrides.includes('width'));assert.ok(!get(e,at).component.overrides.includes('text'));assert.equal(get(e,bt).text,'New default');assert.equal(get(e,bt).fill,'#0000ff');assert.equal(get(e,a).x,500);assert.equal(get(e,m).x,0);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(e,t).text,'New default');e.free();
});
test('pushing through an outer instance records an override on its nested source without changing the inner main',()=>{
 const {e,m,t,a}=fixture(),outer=e.create_component_selection(JSON.stringify([a])),copy=e.create_instance(outer,1400,0),nested=child(e,copy),text=child(e,nested.id),sourceText=child(e,a);
 edit(e,text.id,{text:'Outer default'});e.push_style_overrides(copy);assert.equal(get(e,sourceText.id).text,'Outer default');assert.ok(get(e,sourceText.id).component.overrides.includes('text'));assert.notEqual(get(e,t).text,'Outer default');edit(e,t,{fill:'#00ff00'});assert.equal(get(e,text.id).text,'Outer default');assert.equal(get(e,text.id).fill,'#00ff00');e.free();
});
test('pushing without eligible overrides is a no-op and invalid selections reject atomically',()=>{
 const {e,m,a}=fixture();edit(e,a,{width:500});e.clear_history();const before=e.snapshot();e.push_style_overrides(a);assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);assert.throws(()=>e.push_style_overrides(m),/instance/i);assert.equal(e.snapshot(),before);e.free();
});
