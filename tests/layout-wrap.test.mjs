import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {textSize} from '../web/typography.js';
import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p,...(p.layout_item?{layout_item:{fill_width:false,fill_height:false,absolute:false,...p.layout_item}}:{})}));
const layout={direction:'horizontal',gap:10,cross_gap:20,wrap:true,align_content:'start',padding_top:0,padding_right:0,padding_bottom:0,padding_left:0,align:'start',justify:'start',hug_width:false,hug_height:true};
function setup(){const e=new Editor(),f=e.add('frame',0,0),ids=[];edit(e,f,{width:210,height:200});for(let i=0;i<3;i++){const id=e.add('rectangle',0,0);edit(e,id,{width:100,height:30});ids.push(id);}e.reparent_many(JSON.stringify(ids),f);edit(e,f,{auto_layout:layout});return{e,f,ids};}
test('wrapping reflows with width, cross gaps, visibility, absolute children and atomic history',()=>{
 const {e,f,ids:[a,b,c]}=setup();assert.deepEqual([get(e,b).x,get(e,c).y,get(e,f).height],[110,50,80]);
 const before=e.snapshot();edit(e,f,{width:320});assert.deepEqual([get(e,c).x,get(e,c).y,get(e,f).height],[220,0,30]);e.undo();assert.equal(e.snapshot(),before);
 edit(e,b,{hidden:true});assert.deepEqual([get(e,c).x,get(e,c).y,get(e,f).height],[110,0,30]);
 edit(e,c,{layout_item:{absolute:true},x:400,y:400});assert.equal(get(e,c).y,400);assert.equal(get(e,f).height,30);
 const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();e.free();
});
test('vertical wrap and line distribution respond to fixed cross size',()=>{
 const {e,f,ids:[a,b,c]}=setup();edit(e,f,{width:300,height:70,auto_layout:{...layout,direction:'vertical',hug_height:false,align_content:'end'}});
 assert.deepEqual([get(e,a).x,get(e,b).y,get(e,c).x],[80,40,200]);
 edit(e,f,{auto_layout:{...get(e,f).auto_layout,align_content:'between'}});assert.deepEqual([get(e,a).x,get(e,c).x],[0,200]);e.free();
});
test('fill allocation respects unequal minima and maxima and invalid bounds reject atomically',()=>{
 const {e,f,ids:[a,b,c]}=setup();e.remove(c);edit(e,f,{width:310,auto_layout:{...layout,wrap:false,hug_height:false}});
 edit(e,a,{layout_item:{fill_width:true,min_width:100,max_width:120}});edit(e,b,{layout_item:{fill_width:true,min_width:20}});
 assert.equal(get(e,a).width,120);assert.ok(Math.abs(get(e,b).width-180)<1e-8);
 edit(e,a,{layout_item:{fill_width:true,min_width:100}});assert.deepEqual([get(e,a).width,get(e,b).width],[150,150]);
 const before=e.snapshot();assert.throws(()=>edit(e,a,{layout_item:{min_width:100,max_width:50}}));assert.equal(e.snapshot(),before);
 const scaled=scaleShapes([get(e,a),get(e,f)],{x:0,y:0},2);assert.equal(scaled[0].layout_item.min_width,200);assert.equal(scaled[1].auto_layout.cross_gap,40);e.free();
});
test('nested wrapping gets new fill width before measuring hugged height',()=>{
 const {e,f,ids:[a,b,c]}=setup();const outer=e.add('frame',0,0);edit(e,outer,{width:320,height:200});e.reparent_many(JSON.stringify([f]),outer);edit(e,f,{layout_item:{fill_width:true}});edit(e,outer,{auto_layout:{...layout,wrap:false,direction:'vertical',hug_height:true}});
 assert.deepEqual([get(e,f).width,get(e,f).height,get(e,outer).height],[320,30,30]);edit(e,outer,{width:210});assert.deepEqual([get(e,c).y,get(e,f).height,get(e,outer).height],[50,80,80]);e.free();
});
test('auto width text stops at max width and grows vertically with wrapped lines',()=>{
 const e=new Editor();e.set_text_measurer(raw=>JSON.stringify(textSize(JSON.parse(raw),s=>s.length*10)));const t=e.add('text',0,0);
 edit(e,t,{text:'Hello world hello',typography:{font_size:20,font_family:'Manrope',font_weight:400,align:'left',line_height:1.2,wrap:false,sizing:'width'},layout_item:{max_width:60}});
 assert.deepEqual([get(e,t).width,get(e,t).height],[60,68]);const before=e.snapshot();edit(e,t,{layout_item:{max_width:200}});assert.deepEqual([get(e,t).width,get(e,t).height],[170,20]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('drag reorder follows the targeted wrapped row or column and restores with undo',()=>{
 for(const direction of ['horizontal','vertical']){
  const {e,f,ids:[a,b,c]}=setup();if(direction==='vertical')edit(e,f,{width:240,height:70,auto_layout:{...layout,direction,hug_height:false}});
  const before=e.snapshot(),target=get(e,c),moving=get(e,a);
  const drop=direction==='horizontal'?{x:target.x+target.width+20,y:target.y}:{x:target.x,y:target.y+target.height+20};
  e.move_into(JSON.stringify([{...moving,...drop}]),f);
  assert.deepEqual(JSON.parse(e.snapshot()).shapes.filter(s=>s.parent_id===f).map(s=>s.id),[b,c,a]);
  e.undo();assert.equal(e.snapshot(),before);
  const first=get(e,a);e.move_into(JSON.stringify([{...get(e,c),x:first.x-20,y:first.y-20}]),f);
  assert.deepEqual(JSON.parse(e.snapshot()).shapes.filter(s=>s.parent_id===f).map(s=>s.id),[c,a,b]);e.free();
 }
});
