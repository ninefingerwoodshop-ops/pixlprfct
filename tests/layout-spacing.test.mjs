import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {spacingHandles,spacingHit,changeSpacing} from '../web/layout-spacing.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const layout={direction:'horizontal',gap:20,cross_gap:30,wrap:false,padding_top:20,padding_right:20,padding_bottom:20,padding_left:20,align:'center',justify:'start',align_content:'start',hug_width:false,hug_height:false};
const list=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>list(e).find(s=>s.id===id),edit=(e,id,value)=>e.update(JSON.stringify({...get(e,id),...value}));
function setup(wrap=false){const e=new Editor(),f=e.add('frame',100,100),ids=[];edit(e,f,{width:400,height:250});for(let i=0;i<3;i++){const id=e.add('rectangle',0,0);ids.push(id);edit(e,id,{width:100,height:60});}e.reparent_many(JSON.stringify(ids),f);edit(e,f,{auto_layout:{...layout,wrap}});return{e,f,ids};}
test('spacing handles follow horizontal/vertical gaps, skip hidden and absolute children, and hide automatic spacing',()=>{
 const {e,f,ids}=setup();let handles=spacingHandles(get(e,f),list(e));assert.equal(handles.length,6);const gap=handles.find(h=>h.key==='gap');assert.equal(gap.axis,'x');assert.equal(gap.value,20);assert.equal(spacingHit(get(e,f),list(e),{x:gap.x+3,y:gap.y},2).key,'gap');assert.equal(spacingHit(get(e,f),list(e),{x:gap.x+6,y:gap.y},2),null);
 edit(e,f,{auto_layout:{...layout,direction:'vertical'}});handles=spacingHandles(get(e,f),list(e));assert.equal(handles.find(h=>h.key==='gap').axis,'y');edit(e,ids[1],{hidden:true});assert.equal(spacingHandles(get(e,f),list(e)).filter(h=>h.key==='gap').length,1);edit(e,ids[2],{layout_item:{absolute:true,fill_width:false,fill_height:false}});assert.equal(spacingHandles(get(e,f),list(e)).length,4);
 edit(e,f,{auto_layout:{...layout,justify:'between'}});assert.equal(spacingHandles(get(e,f),list(e)).length,4);e.free();
});
test('wrapped layouts expose a cross gap and retain row direction under center/end alignment',()=>{
 const {e,f}=setup(true);edit(e,f,{width:280});for(const align of ['start','center','end']){edit(e,f,{auto_layout:{...layout,wrap:true,align}});const handles=spacingHandles(get(e,f),list(e));assert.equal(handles.filter(h=>h.key==='gap').length,1);assert.equal(handles.filter(h=>h.key==='cross_gap').length,1);assert.equal(handles.find(h=>h.key==='cross_gap').axis,'y');}
 edit(e,f,{auto_layout:{...layout,wrap:true,align_content:'between'}});assert.ok(!spacingHandles(get(e,f),list(e)).some(h=>h.key==='cross_gap'));e.free();
});
test('drag changes clamp, snap, and link opposite padding without mutating the source',()=>{
 const frame={auto_layout:layout},h={key:'padding_right',sign:-1};const changed=changeSpacing(frame,h,-17,{altKey:true,shiftKey:true});assert.equal(changed.auto_layout.padding_right,40);assert.equal(changed.auto_layout.padding_left,40);assert.equal(frame.auto_layout.padding_left,20);assert.equal(changeSpacing(frame,h,100).auto_layout.padding_right,0);assert.equal(changeSpacing(frame,h,-1e9).auto_layout.padding_right,100000);
 assert.equal(changeSpacing({auto_layout:{...layout,cross_gap:null}},{key:'cross_gap',sign:1},5).auto_layout.cross_gap,25);
});
test('Rust spacing preview reflows descendants without history changes; commit is one reversible step',()=>{
 const {e,f,ids}=setup();edit(e,f,{auto_layout:{...layout,hug_width:true}});const before=e.snapshot(),frame=get(e,f),h=spacingHandles(frame,list(e)).find(h=>h.key==='gap'),changed=changeSpacing(frame,h,24);
 for(let i=0;i<10;i++)e.preview_update_many(JSON.stringify([changeSpacing(frame,h,i)]));assert.equal(e.snapshot(),before);
 const preview=JSON.parse(e.preview_update_many(JSON.stringify([changed])));assert.equal(preview.shapes.find(s=>s.id===ids[1]).x,get(e,ids[1]).x+24);assert.equal(preview.shapes.find(s=>s.id===f).width,frame.width+48);
 e.update(JSON.stringify(changed));assert.deepEqual(list(e),preview.shapes);e.undo();assert.equal(e.snapshot(),before);e.free();
});
