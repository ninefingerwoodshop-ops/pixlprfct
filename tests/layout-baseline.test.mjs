import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {textBaseline} from '../web/typography.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>shapes(e).find(s=>s.id===id),set=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v}));
const layout={direction:'horizontal',gap:10,cross_gap:20,padding_top:10,padding_right:10,padding_bottom:10,padding_left:10,align:'start',justify:'start',hug_width:true,hug_height:true,text_baseline:true};
const measure=json=>{const s=JSON.parse(json);return JSON.stringify([s.width,s.height,s.typography.font_size*.8]);};
function setup(){const e=new Editor();e.set_text_measurer(measure);const f=e.add('frame',100,100),a=e.add('text',0,0),b=e.add('text',0,0),icon=e.add('rectangle',0,0);for(const [id,size,height] of [[a,40,40],[b,15,50]])set(e,id,{width:100,height,typography:{...get(e,id).typography,font_size:size,sizing:'fixed'}});set(e,icon,{width:20,height:20});e.reparent_many(JSON.stringify([a,b,icon]),f);set(e,f,{auto_layout:layout});return{e,f,a,b,icon};}
test('measured first baselines align fixed text and icons, with full ascent/descent hug height',()=>{
 const {e,f,a,b,icon}=setup();assert.equal(get(e,a).y,110);assert.equal(get(e,b).y,130);assert.equal(get(e,icon).y,122);assert.equal(get(e,f).height,90);assert.equal(get(e,b).height,50);const old=e.snapshot();set(e,f,{auto_layout:{...layout,text_baseline:false}});assert.equal(get(e,b).y,110);assert.equal(get(e,f).height,70);e.undo();assert.equal(e.snapshot(),old);const copy=new Editor();copy.set_text_measurer(measure);copy.load(old);assert.equal(copy.snapshot(),old);assert.ok(!old.includes('measured_baseline'));e.free();copy.free();
});
test('wrapped rows align baselines independently; hidden and absolute children do not influence them',()=>{
 const {e,f,a,b,icon}=setup();set(e,f,{width:240,auto_layout:{...layout,wrap:true,hug_width:false}});assert.equal(get(e,b).y+12,get(e,a).y+32);assert.equal(get(e,icon).y,200);assert.equal(get(e,f).height,130);set(e,a,{hidden:true});assert.equal(get(e,b).y,118);assert.equal(get(e,icon).y,110);set(e,icon,{layout_item:{...get(e,icon).layout_item,absolute:true}});assert.equal(get(e,b).y,110);e.free();
});
test('baseline alignment ignores vertical flow and component instances inherit the toggle and reject overrides',()=>{
 const {e,f,a,b}=setup();e.create_component(f);const i=e.create_instance(f,500,100);const before=e.snapshot();assert.throws(()=>set(e,i,{auto_layout:{...get(e,i).auto_layout,text_baseline:false}}),/protected/);assert.equal(e.snapshot(),before);set(e,f,{auto_layout:{...layout,gap:30,text_baseline:false}});assert.equal(get(e,i).auto_layout.text_baseline,false);assert.equal(get(e,i).auto_layout.gap,30);set(e,f,{auto_layout:{...layout,direction:'vertical'}});assert.equal(get(e,i).auto_layout.text_baseline,true);assert.equal(get(e,a).x,110);assert.equal(get(e,b).x,110);e.free();
});
test('browser baseline helper measures the top-to-alphabetic difference and restores context',()=>{
 const ctx={font:'original',textBaseline:'middle',save(){this.saved=[this.font,this.textBaseline];},restore(){[this.font,this.textBaseline]=this.saved;},measureText(){return{actualBoundingBoxAscent:this.textBaseline==='alphabetic'?29:-3};}};
 const s={height:40,typography:{font_size:40,font_family:'Georgia',font_weight:400,sizing:'fixed'}};assert.equal(textBaseline(s,ctx),32);assert.equal(ctx.font,'original');assert.equal(ctx.textBaseline,'middle');ctx.measureText=()=>({});assert.equal(textBaseline(s,ctx),32);
});
test('invalid baseline measurements reject edits atomically',()=>{
 const {e,f}=setup(),saved=e.snapshot();e.set_text_measurer(json=>{const s=JSON.parse(json);return JSON.stringify([s.width,s.height,-1]);});assert.throws(()=>set(e,f,{width:500}),/baseline/);assert.equal(e.snapshot(),saved);e.free();
});
