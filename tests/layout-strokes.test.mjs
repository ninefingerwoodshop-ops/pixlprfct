import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {appearance} from '../web/appearance.js';import {spacingHandles} from '../web/layout-spacing.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>shapes(e).find(s=>s.id===id),set=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v}));
const layout={direction:'horizontal',gap:10,padding_top:10,padding_right:10,padding_bottom:10,padding_left:10,align:'start',justify:'start',hug_width:true,hug_height:true,strokes_included:true};
function frame(e,x=100,y=100){const id=e.add('frame',x,y);set(e,id,{stroke_width:8,appearance:{...appearance(get(e,id)),stroke_enabled:true,stroke_alignment:'inside'},auto_layout:layout});return id;}
function child(e,f,w=50,h=30){const id=e.add('rectangle',0,0);set(e,id,{width:w,height:h});e.reparent_many(JSON.stringify([id]),f);return id;}
test('included inside border affects hug, origin, handles and undo; centered/outside/disabled borders do not',()=>{
 const e=new Editor(),f=frame(e),c=child(e,f);assert.equal(get(e,f).width,86);assert.equal(get(e,f).height,66);assert.equal(get(e,c).x,118);assert.equal(get(e,c).y,118);
 const left=spacingHandles(get(e,f),shapes(e)).find(h=>h.key==='padding_left');assert.equal(left.x,118);assert.equal(left.area.x,108);assert.equal(left.value,10);
 const before=e.snapshot();set(e,f,{auto_layout:{...layout,strokes_included:false}});assert.equal(get(e,f).width,70);assert.equal(get(e,c).x,110);e.undo();assert.equal(e.snapshot(),before);
 for(const alignment of ['center','outside']){set(e,f,{appearance:{...get(e,f).appearance,stroke_alignment:alignment}});assert.equal(get(e,f).width,70);assert.equal(get(e,c).x,110);}
 set(e,f,{appearance:{...get(e,f).appearance,stroke_alignment:'inside',stroke_enabled:false}});assert.equal(get(e,f).width,70);const copy=new Editor();copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());copy.free();e.free();
});
test('nested frame inclusion is independent and fill shares equal content areas',()=>{
 const e=new Editor(),p=frame(e,0,0),a=frame(e),b=frame(e);e.reparent_many(JSON.stringify([a,b]),p);set(e,p,{width:300,height:100,auto_layout:{...layout,hug_width:false,hug_height:false}});
 for(const id of [a,b])set(e,id,{layout_item:{...get(e,id).layout_item,fill_width:true,fill_height:true}});
 set(e,b,{stroke_width:18});const ca=child(e,a,1,1),cb=child(e,b,1,1);let sa=get(e,a),sb=get(e,b);assert.ok(Math.abs((sa.width-36)-(sb.width-56))<1e-6);assert.equal(sa.height,64);assert.equal(get(e,ca).x,sa.x+18);assert.equal(get(e,cb).x,sb.x+28);
 set(e,p,{auto_layout:{...get(e,p).auto_layout,strokes_included:false}});sa=get(e,a);assert.equal(sa.x,10);assert.equal(get(e,ca).x,sa.x+18);
 set(e,a,{auto_layout:{...get(e,a).auto_layout,strokes_included:false}});assert.equal(get(e,ca).x,get(e,a).x+10);e.free();
});
test('border and padding minimum wins over max size; wrapping uses interior width in both directions',()=>{
 const e=new Editor(),f=frame(e);set(e,f,{layout_item:{...get(e,f).layout_item,max_width:20,max_height:20}});assert.equal(get(e,f).width,36);assert.equal(get(e,f).height,36);
 set(e,f,{layout_item:{...get(e,f).layout_item,max_width:null,max_height:null},width:140,auto_layout:{...layout,wrap:true,hug_width:false}});const a=child(e,f),b=child(e,f);assert.ok(get(e,b).y>get(e,a).y);assert.equal(get(e,f).height,106);
 set(e,f,{height:100,auto_layout:{...layout,direction:'vertical',wrap:true,hug_width:true,hug_height:false}});assert.ok(get(e,b).x>get(e,a).x);assert.equal(get(e,f).width,146);e.free();
});
test('legacy frames omit inclusion without shifting; new auto-layout frames opt in',()=>{
 const e=new Editor(),f=frame(e),c=child(e,f);const old={...layout};delete old.strokes_included;set(e,f,{auto_layout:old});assert.equal(get(e,c).x,110);assert.equal(get(e,f).auto_layout.strokes_included,false);const fresh=e.add('frame',500,0);e.auto_layout_selection(JSON.stringify([fresh]));assert.equal(get(e,fresh).auto_layout.strokes_included,true);e.free();
});
test('component instances preserve individual stroke inclusion overrides and reset them',()=>{
 const e=new Editor(),f=frame(e);child(e,f);e.create_component(f);const i=e.create_instance(f,300,0);set(e,i,{auto_layout:{...get(e,i).auto_layout,strokes_included:false}});set(e,f,{auto_layout:{...get(e,f).auto_layout,gap:24}});assert.equal(get(e,i).auto_layout.strokes_included,false);assert.equal(get(e,i).auto_layout.gap,24);e.reset_override(i,'auto_layout.strokes_included');assert.equal(get(e,i).auto_layout.strokes_included,true);e.free();
});
