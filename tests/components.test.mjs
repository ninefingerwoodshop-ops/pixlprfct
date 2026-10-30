import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
const get=(e,id)=>shapes(e).find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const children=(e,id)=>shapes(e).filter(s=>s.parent_id===id);
function fixture(){const e=new Editor(),f=e.add('frame',10,20),t=e.add('text',30,40);e.reparent_many(JSON.stringify([t]),f);edit(e,f,{width:300,height:160,name:'Card'});e.create_component(f);return {e,f,t};}

test('instances propagate main edits across pages and preserve/reset text overrides with protected paint atomically',()=>{
 const {e,f,t}=fixture();const i=e.create_instance(f,400,20),c=children(e,i)[0].id;
 assert.throws(()=>edit(e,c,{fill:'#ff0000'}),/protected/);edit(e,c,{text:'Custom'});const p=e.add_page();const j=e.create_instance(f,100,100);e.select_page(1);
 edit(e,t,{text:'Main update',fill:'#0000ff',height:80});assert.equal(get(e,c).text,'Custom');assert.equal(get(e,c).fill,'#0000ff');assert.equal(get(e,c).height,80);assert.equal(children(e,j)[0].text,'Main update');assert.equal(get(e,j).page_id,p);
 const before=e.snapshot();e.reset_instance(c);assert.equal(get(e,c).text,'Main update');assert.equal(get(e,c).fill,'#0000ff');assert.equal(get(e,i).x,400);e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(e,c).text,'Main update');e.free();
});
test('main structure changes synchronize stable instance IDs; instance structure requires detach',()=>{
 const {e,f,t}=fixture();const i=e.create_instance(f,400,20),c=children(e,i)[0].id;
 const r=e.add('rectangle',50,60);e.reparent_many(JSON.stringify([r]),f);assert.equal(children(e,i).length,2);assert.equal(children(e,i)[0].id,c);
 const state=e.snapshot();assert.throws(()=>e.remove(c),/Detach/);assert.equal(e.snapshot(),state);assert.throws(()=>e.reorder(c,1),/Detach/);
 assert.throws(()=>e.reparent_many(JSON.stringify([r]),i),/Detach/);assert.equal(e.snapshot(),state);
 e.remove(t);assert.equal(children(e,i).length,1);assert.equal(children(e,i)[0].component.source,r);e.undo();assert.equal(e.snapshot(),state);
 e.detach_instance(c);assert.ok([get(e,i),...children(e,i)].every(s=>s.component===null));e.remove(c);assert.equal(children(e,i).length,1);e.free();
});
test('instance geometry respects constraints, placement, main-driven resizing, duplication and portable clipboard',()=>{
 const {e,f,t}=fixture();edit(e,t,{constraints:{horizontal:'max',vertical:'min'}});const i=e.create_instance(f,400,20),c=children(e,i)[0].id;
 assert.throws(()=>edit(e,i,{height:400}),/protected/);edit(e,f,{width:400});assert.equal(get(e,c).x,520);edit(e,f,{fill:'#123456'});assert.equal(get(e,i).width,400);assert.equal(get(e,c).x,520);
 edit(e,i,{x:600});assert.equal(get(e,c).x,720);
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([i])));assert.equal(get(e,ids[0]).component.master,f);assert.equal(children(e,ids[0])[0].x,744);
 const clone=new Editor();clone.paste_layers(e.copy_layers(JSON.stringify([i])),0,0,0);assert.ok(shapes(clone).every(s=>s.component===null));clone.load(e.snapshot());assert.equal(clone.snapshot(),e.snapshot());
 e.remove(f);assert.ok(shapes(e).every(s=>s.component===null));e.undo();assert.equal(get(e,i).component.master,f);e.free();clone.free();
});
test('main auto layout and new children propagate, instance text measurement can hug independently',()=>{
 const {e,f,t}=fixture();e.auto_layout_selection(JSON.stringify([f]));edit(e,t,{layout_item:{...get(e,t).layout_item,fill_width:false},typography:{...get(e,t).typography,sizing:'width'}});edit(e,f,{auto_layout:{...get(e,f).auto_layout,direction:'horizontal',hug_width:true,padding_left:16,padding_right:16}});
 e.set_text_measurer(json=>{const s=JSON.parse(json);return JSON.stringify([s.text.length*10,30]);});e.refresh_text_layout();const i=e.create_instance(f,500,100),c=children(e,i)[0].id;
 edit(e,c,{text:'Hi'});assert.equal(get(e,i).width,52);assert.notEqual(get(e,f).width,52);assert.equal(get(e,c).x,516);
 const r=e.add('rectangle',20,20);e.move_into(JSON.stringify([get(e,r)]),f);assert.equal(children(e,i).length,2);assert.equal(get(e,c).text,'Hi');
 const next=e.add('ellipse',800,100);assert.equal(new Set(shapes(e).map(s=>s.id)).size,shapes(e).length);assert.ok(get(e,next));e.free();
});
test('nested components and malformed links fail without changing the document',()=>{
 const {e,f}=fixture();const inner=e.add('frame',20,30);e.reparent_many(JSON.stringify([inner]),f);const before=e.snapshot();assert.throws(()=>e.create_component(inner),/Nested/);assert.equal(e.snapshot(),before);
 const bad=JSON.parse(before);bad.shapes[0].component={type:'instance',master:0,source:0,overrides:[]};assert.throws(()=>e.load(JSON.stringify(bad)),/Invalid component/);assert.equal(e.snapshot(),before);
 assert.throws(()=>e.reparent_many(JSON.stringify([f]),inner),/cycle/);assert.equal(e.snapshot(),before);
 const malformed=JSON.parse(before);for(const s of malformed.shapes)s.component={type:'instance',master:999,source:s.id,overrides:[]};malformed.shapes.reverse();assert.throws(()=>e.load(JSON.stringify(malformed)),/Invalid instance ancestry|Detach/);assert.equal(e.snapshot(),before);e.free();
});

test('main component children remain editable while instance children stay protected',()=>{
 const {e,f,t}=fixture();const i=e.create_instance(f,400,20),child=children(e,i)[0].id;
 edit(e,t,{text:'Updated label',fill:'#123456',typography:{font_size:24,font_family:'Manrope',font_weight:400,line_height:1.2,align:'left',vertical_align:'top',wrap:false,sizing:'fixed'}});
 assert.equal(get(e,child).text,'Updated label');assert.equal(get(e,child).typography.font_size,24);
 assert.throws(()=>edit(e,child,{fill:'#ffffff'}),/protected/);
 edit(e,f,{fill:'#abcdef'});assert.equal(get(e,i).fill,'#abcdef');e.free();
});
test('instances inherit no-fill settings from their main before and after creation',()=>{
 const {e,f}=fixture();const a={opacity:1,corner_radius:0,fill_enabled:false,stroke_enabled:false,stroke_color:'#000000'};
 edit(e,f,{appearance:a});const i=e.create_instance(f,400,20);assert.equal(get(e,i).appearance.fill_enabled,false);
 edit(e,f,{appearance:{...get(e,f).appearance,fill_enabled:true}});assert.equal(get(e,i).appearance.fill_enabled,true);
 edit(e,f,{appearance:{...get(e,f).appearance,fill_enabled:false}});assert.equal(get(e,i).appearance.fill_enabled,false);e.free();
});

test('canvas drag moves instance roots and protected children together, including reparenting',()=>{
 const {e,f}=fixture(),id=e.create_instance(f,400,20),child=children(e,id)[0],before=get(e,id);
 e.update_many(JSON.stringify([{...before,x:before.x+70,y:before.y+45}]));
 assert.equal(get(e,id).x,before.x+70);assert.equal(get(e,child.id).x,child.x+70);assert.equal(get(e,child.id).y,child.y+45);
 e.undo();assert.equal(get(e,id).x,before.x);assert.equal(get(e,child.id).x,child.x);
 const target=e.add('frame',800,300);
 e.move_into(JSON.stringify([{...get(e,id),x:820,y:320}]),target);
 assert.equal(get(e,id).parent_id,target);assert.equal(get(e,child.id).parent_id,id);
 assert.throws(()=>edit(e,child.id,{x:get(e,child.id).x+10}),/protected/);
});
