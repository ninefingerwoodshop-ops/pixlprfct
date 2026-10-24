import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {spacingHandles} from '../web/layout-spacing.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),set=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v})),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const l={direction:'horizontal',gap:0,padding_top:20,padding_right:20,padding_bottom:20,padding_left:20,align:'start',justify:'around',hug_width:false,hug_height:false};
function setup(n=3){const e=new Editor(),f=e.add('frame',100,100),ids=[];set(e,f,{width:340,height:340});for(let i=0;i<n;i++){const id=e.add('rectangle',0,0);set(e,id,{width:50,height:50});ids.push(id);}if(n)e.reparent_many(JSON.stringify(ids),f);set(e,f,{auto_layout:l});return{e,f,ids};}
test('around/evenly distribute on both axes and retain minimum gaps',()=>{
 const {e,f,ids}=setup();for(const direction of ['horizontal','vertical'])for(const mode of ['around','evenly'])for(const gap of [0,12]){set(e,f,{auto_layout:{...l,direction,justify:mode,gap}});const axis=direction==='horizontal'?'x':'y',spare=150-2*gap,step=mode==='around'?spare/3:spare/4,lead=mode==='around'?step/2:step;ids.forEach((id,i)=>near(get(e,id)[axis],120+lead+i*(50+gap+step)));assert.equal(spacingHandles(get(e,f),all(e)).filter(h=>h.key==='gap').length,0);}
 const saved=e.snapshot();set(e,f,{auto_layout:{...l,justify:'between'}});e.undo();assert.equal(e.snapshot(),saved);const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);e.free();copy.free();
});
test('single items center for around/evenly; empty and overflowing stacks remain stable',()=>{
 for(const n of [0,1,7]){const {e,f,ids}=setup(n);for(const mode of ['around','evenly']){set(e,f,{auto_layout:{...l,justify:mode}});if(n===1)near(get(e,ids[0]).x,245);if(n===7)ids.forEach((id,i)=>near(get(e,id).x,120+50*i));}e.free();}
});
test('wrapped rows distribute cross-axis space, while fill items consume main-axis space first',()=>{
 const {e,f,ids}=setup(4);for(const direction of ['horizontal','vertical'])for(const mode of ['around','evenly']){const h=direction==='horizontal';set(e,f,{width:h?160:340,height:h?340:160,auto_layout:{...l,direction,wrap:true,justify:'start',align_content:mode}});const axis=h?'y':'x',step=mode==='around'?100:200/3,lead=mode==='around'?50:200/3;near(get(e,ids[0])[axis],120+lead);near(get(e,ids[2])[axis],120+lead+50+step);assert.equal(spacingHandles(get(e,f),all(e)).filter(h=>h.key==='cross_gap').length,0);}
 set(e,f,{width:340,height:340,auto_layout:{...l,justify:'evenly'}});for(const id of ids)set(e,id,{layout_item:{...get(e,id).layout_item,fill_width:true}});ids.forEach((id,i)=>{near(get(e,id).width,75);near(get(e,id).x,120+i*75);});const before=e.snapshot();assert.throws(()=>set(e,f,{auto_layout:{...l,justify:'invalid'}}));assert.equal(e.snapshot(),before);e.free();
});
