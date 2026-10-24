import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {textSize,resizeText,layoutText} from '../web/typography.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const list=e=>JSON.parse(e.snapshot()).shapes;
const get=(e,id)=>list(e).find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const measure=t=>[...t].length*10;
const style={font_size:10,font_family:'monospace',font_weight:400,line_height:1.5,align:'left',wrap:true,sizing:'width'};
function setup(){const e=new Editor();e.set_text_measurer(json=>JSON.stringify(textSize(JSON.parse(json),measure)));const t=e.add('text',0,0);edit(e,t,{text:'hello world',typography:style});return{e,t};}
test('auto width follows hard lines; auto height wraps and edits preserve atomic history',()=>{
 const {e,t}=setup();assert.deepEqual([get(e,t).width,get(e,t).height],[110,10]);
 edit(e,t,{text:'one\n\nlongest'});assert.deepEqual([get(e,t).width,get(e,t).height],[70,40]);
 edit(e,t,{width:30,typography:{...style,sizing:'height'}});assert.equal(get(e,t).height,70);
 const before=e.snapshot();edit(e,t,{text:'hello world again'});assert.equal(get(e,t).height,85);e.undo();assert.equal(e.snapshot(),before);e.redo();
 const copy=new Editor();copy.set_text_measurer(json=>JSON.stringify(textSize(JSON.parse(json),measure)));copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());e.free();copy.free();
});
test('fill-width text rewraps after parent resize and propagates through nested hugged frames',()=>{
 const {e,t}=setup(),inner=e.add('frame',0,0),outer=e.add('frame',0,0);
 const l={direction:'vertical',gap:0,padding_top:10,padding_bottom:10,padding_left:10,padding_right:10,align:'start',justify:'start',hug_width:false,hug_height:true};
 edit(e,inner,{width:130,auto_layout:l});e.reparent_many(JSON.stringify([t]),inner);edit(e,t,{layout_item:{fill_width:true,fill_height:false,absolute:false}});
 edit(e,outer,{width:150,auto_layout:l});e.reparent_many(JSON.stringify([inner]),outer);edit(e,inner,{layout_item:{fill_width:true,fill_height:false,absolute:false}});
 assert.equal(get(e,t).typography.sizing,'height');assert.equal(get(e,outer).height,50);
 const before=e.snapshot();const preview=JSON.parse(e.preview_update_many(JSON.stringify([{...get(e,outer),width:100}])));assert.equal(preview.shapes.find(s=>s.id===outer).height,65);assert.equal(e.snapshot(),before);
 edit(e,outer,{width:100});assert.deepEqual([get(e,t).width,get(e,t).height,get(e,inner).height,get(e,outer).height],[60,25,45,65]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('invalid measurements reject edits; fixed mode and explicit resizing retain chosen dimensions',()=>{
 const {e,t}=setup();const before=e.snapshot();e.set_text_measurer(()=>JSON.stringify([0,10]));assert.throws(()=>edit(e,t,{text:'bad'}));assert.equal(e.snapshot(),before);
 const resized=resizeText({...get(e,t),width:50},true,false);assert.equal(resized.typography.sizing,'height');assert.equal(resizeText(resized,false,true).typography.sizing,'fixed');
 edit(e,t,{typography:{...style,sizing:'fixed'},width:22,height:33});assert.deepEqual([get(e,t).width,get(e,t).height],[22,33]);assert.throws(()=>edit(e,t,{typography:{...style,sizing:'invalid'}}));e.free();
});
