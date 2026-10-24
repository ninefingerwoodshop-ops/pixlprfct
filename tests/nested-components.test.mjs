import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),edit=(e,id,change)=>e.update(JSON.stringify({...get(e,id),...change}));
function fixture(){const e=new Editor(),main=e.add('frame',0,0),text=e.add('text',10,10);e.reparent_many(JSON.stringify([text]),main);edit(e,text,{text:'Original'});e.create_component(main);return {e,main,text};}
const descendants=(e,id)=>{const shapes=all(e),ids=new Set([id]);for(let changed=true;changed;){changed=false;for(const s of shapes)if(ids.has(s.parent_id)&&!ids.has(s.id)){ids.add(s.id);changed=true;}}return shapes.filter(s=>ids.has(s.id));};
test('nested linked instances propagate through three levels independent of document paint order',()=>{
 const {e,main,text}=fixture(),inner=e.create_instance(main,500,0),outer=e.create_component_selection(JSON.stringify([inner])),copy=e.create_instance(outer,900,0),third=e.create_component_selection(JSON.stringify([copy])),last=e.create_instance(third,1500,0);
 e.arrange_many(JSON.stringify([main]),'front');const before=e.snapshot();edit(e,text,{text:'Changed'});
 assert.equal(descendants(e,last).find(s=>s.kind==='text').text,'Changed');assert.equal(get(e,inner).component.master,main);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(descendants(e,last).find(s=>s.kind==='text').text,'Changed');
 const loaded=new Editor();loaded.load(e.snapshot());assert.equal(descendants(loaded,last).find(s=>s.kind==='text').text,'Changed');loaded.free();e.free();
});
test('inner overrides, outer overrides, structural changes and detach remain independent',()=>{
 const {e,main,text}=fixture(),inner=e.create_instance(main,500,0),innerText=descendants(e,inner).find(s=>s.kind==='text').id;
 edit(e,innerText,{text:'Nested override'});const outer=e.create_component_selection(JSON.stringify([inner])),copy=e.create_instance(outer,900,0),copyText=descendants(e,copy).find(s=>s.kind==='text').id;
 assert.equal(get(e,copyText).text,'Nested override');edit(e,copyText,{text:'Outer override'});edit(e,text,{fill:'#ff0000'});assert.equal(get(e,copyText).text,'Outer override');assert.equal(get(e,copyText).fill,'#ff0000');
 e.reset_instance(copy);assert.equal(get(e,copyText).text,'Nested override');e.reset_instance(inner);assert.equal(get(e,copyText).text,'Original');
 const child=e.add('ellipse',30,30);e.reparent_many(JSON.stringify([child]),main);assert.ok(descendants(e,copy).some(s=>s.kind==='ellipse'));
 e.detach_instance(inner);edit(e,text,{text:'Later'});assert.equal(get(e,copyText).text,'Original');e.free();
});
test('direct and indirect component cycles fail atomically without consuming history',()=>{
 const {e,main}=fixture(),inner=e.create_instance(main,500,0);let before=e.snapshot();assert.throws(()=>e.reparent_many(JSON.stringify([inner]),main),/cycle/i);assert.equal(e.snapshot(),before);
 const outer=e.create_component_selection(JSON.stringify([inner])),recursive=e.create_instance(outer,900,0);before=e.snapshot();assert.throws(()=>e.reparent_many(JSON.stringify([recursive]),main),/cycle/i);assert.equal(e.snapshot(),before);e.free();
});
test('nested source swaps propagate and deleting an inner main preserves the outer artwork',()=>{
 const {e,main,text}=fixture(),inner=e.create_instance(main,500,0),outer=e.create_component_selection(JSON.stringify([inner])),copy=e.create_instance(outer,900,0);
 const replacement=e.add('frame',0,500),label=e.add('text',10,510);e.reparent_many(JSON.stringify([label]),replacement);edit(e,label,{name:get(e,text).name,text:'Replacement'});e.create_component(replacement);
 e.swap_instance(inner,replacement);assert.equal(descendants(e,copy).find(s=>s.kind==='text').text,'Replacement');
 const before=e.snapshot();e.remove_many(JSON.stringify([replacement]));assert.equal(get(e,inner).component,null);assert.equal(descendants(e,copy).find(s=>s.kind==='text').text,'Replacement');e.undo();assert.equal(e.snapshot(),before);e.free();
});
