import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
const get=(e,id)=>shapes(e).find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const children=(e,id)=>shapes(e).filter(s=>s.parent_id===id);
const paint=s=>s.appearance??{gradient:null,opacity:1,corner_radius:0,fill_enabled:true,stroke_enabled:false,stroke_color:'#000000'};
function main(e,name,x=0){const f=e.add('frame',x,0),t=e.add('text',x+16,16);edit(e,f,{name,width:300,height:120});edit(e,t,{name:'Label'});e.reparent_many(JSON.stringify([t]),f);e.create_component(f);return {f,t};}

test('instance style and constraint edits are rejected while main edits propagate',()=>{
 const e=new Editor(),{f,t}=main(e,'Card'),i=e.create_instance(f,400,0),c=children(e,i)[0].id;
 const before=e.snapshot();
 for(const [id,patch] of [[c,{typography:{...get(e,c).typography,align:'center'}}],[i,{appearance:{...paint(get(e,i)),opacity:.5}}],[i,{constraints:{horizontal:'max',vertical:'min'}}]]){
  assert.throws(()=>edit(e,id,patch),/protected/);assert.equal(e.snapshot(),before);
 }
 edit(e,t,{typography:{...get(e,t).typography,font_size:48}});edit(e,f,{appearance:{...paint(get(e,f)),corner_radius:20}});
 assert.equal(get(e,c).typography.font_size,48);assert.equal(get(e,i).appearance.corner_radius,20);e.free();
});

test('swapping retains matched overrides and IDs, inherits the replacement, and is one undo step',()=>{
 const e=new Editor(),a=main(e,'Primary'),b=main(e,'Secondary',800);edit(e,b.f,{fill:'#123456',width:240});edit(e,b.t,{text:'Secondary default',typography:{...get(e,b.t).typography,font_size:20}});
 const i=e.create_instance(a.f,400,200),c=children(e,i)[0].id;edit(e,c,{text:'Keep me',name:'Renamed locally'});assert.throws(()=>edit(e,i,{width:350}),/protected/);const before=e.snapshot();
 assert.equal(e.swap_instance(c,b.f),i);assert.equal(get(e,i).component.master,b.f);assert.equal(get(e,i).name,'Secondary');assert.equal(get(e,i).width,240);assert.equal(get(e,i).x,400);assert.equal(get(e,i).y,200);assert.equal(get(e,i).fill,'#123456');assert.equal(children(e,i)[0].id,c);assert.equal(get(e,c).name,'Renamed locally');assert.equal(get(e,c).text,'Keep me');assert.equal(get(e,c).typography.font_size,20);assert.equal(get(e,c).typography.align,'left');
 e.undo();assert.equal(e.snapshot(),before);e.redo();edit(e,b.t,{fill:'#abcdef'});assert.equal(get(e,c).fill,'#abcdef');edit(e,a.t,{fill:'#ffffff'});assert.equal(get(e,c).fill,'#abcdef');
 const restored=new Editor();restored.load(e.snapshot());assert.equal(restored.snapshot(),e.snapshot());e.free();restored.free();
});

test('swapping ignores unmatched hierarchy and handles repeated names, groups and new layer IDs',()=>{
 const e=new Editor(),a=main(e,'One'),b=main(e,'Two',800);
 const aa=e.add('text',16,60),bb=e.add('text',816,60);edit(e,aa,{name:'Label'});edit(e,bb,{name:'Label'});e.reparent_many(JSON.stringify([aa]),a.f);e.reparent_many(JSON.stringify([bb]),b.f);
 const extra=e.add('ellipse',820,80);edit(e,extra,{name:'Badge'});e.reparent_many(JSON.stringify([extra]),b.f);e.rename_group(e.group_many(JSON.stringify([a.t,aa])),'Labels');e.rename_group(e.group_many(JSON.stringify([b.t,bb])),'Labels');
 const i=e.create_instance(a.f,400,200),group=children(e,i)[0].id,[first,second]=children(e,group);edit(e,first.id,{text:'First'});edit(e,second.id,{text:'Second'});e.swap_instance(i,b.f);
 assert.equal(children(e,i).length,2);assert.equal(children(e,group).length,2);assert.equal(get(e,first.id).text,'First');assert.equal(get(e,second.id).text,'Second');assert.equal(get(e,first.id).parent_id,group);assert.equal(get(e,second.id).parent_id,group);assert.equal(get(e,group).kind,'group');
 const other=e.add('frame',1200,0),nested=e.add('frame',1220,20),label=e.add('text',1230,30);edit(e,nested,{name:'Content'});edit(e,label,{name:'Label'});e.reparent_many(JSON.stringify([nested]),other);e.reparent_many(JSON.stringify([label]),nested);e.create_component(other);e.swap_instance(i,other);
 assert.equal(get(e,first.id),undefined);assert.equal(get(e,second.id),undefined);assert.equal(children(e,children(e,i)[0].id)[0].text,get(e,label).text);assert.equal(new Set(shapes(e).map(s=>s.id)).size,shapes(e).length);e.free();
});

test('legacy whole-style overrides survive; invalid paths and swap targets reject atomically',()=>{
 const e=new Editor(),a=main(e,'One'),i=e.create_instance(a.f,400,0),c=children(e,i)[0].id;
 const legacy=JSON.parse(e.snapshot());const child=legacy.shapes.find(s=>s.id===c);child.component.overrides=['typography'];child.typography.font_size=24;e.load(JSON.stringify(legacy));edit(e,a.t,{typography:{...get(e,a.t).typography,font_size:50,align:'right'}});assert.equal(get(e,c).typography.font_size,24);assert.equal(get(e,c).typography.align,'left');
 const before=e.snapshot();assert.throws(()=>e.swap_instance(i,a.t),/Main component/);assert.throws(()=>e.reset_override(c,'typography.__proto__'),/Unknown/);assert.equal(e.snapshot(),before);
 const invalid=JSON.parse(before);invalid.shapes.find(s=>s.id===c).component.overrides=['appearance.unknown'];assert.throws(()=>e.load(JSON.stringify(invalid)),/Invalid component/);assert.equal(e.snapshot(),before);e.reset_override(c,'typography');assert.equal(get(e,c).typography.font_size,50);e.free();
});

test('child constraints and instance dimensions are protected',()=>{
 const e=new Editor(),{f,t}=main(e,'Card'),i=e.create_instance(f,400,0),c=children(e,i)[0].id;
 assert.throws(()=>edit(e,c,{constraints:{horizontal:'max',vertical:'min'}}),/protected/);
 assert.throws(()=>edit(e,i,{width:400}),/protected/);
 edit(e,t,{constraints:{horizontal:'max',vertical:'min'}});edit(e,f,{width:400});
 assert.equal(get(e,i).width,400);assert.equal(get(e,c).x,516);e.free();
});
