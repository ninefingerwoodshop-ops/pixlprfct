import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
const get=(e,id)=>shapes(e).find(s=>s.id===id);
const edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const layout={direction:'horizontal',gap:10,padding_top:10,padding_right:20,padding_bottom:10,padding_left:20,align:'center',justify:'start',hug_width:false,hug_height:false};
const setup=()=>{const e=new Editor(),f=e.add('frame',100,100),a=e.add('rectangle',0,0),b=e.add('rectangle',0,0);edit(e,f,{width:300,height:100});for(const id of [a,b])edit(e,id,{width:50,height:20});e.reparent_many(JSON.stringify([a,b]),f);edit(e,f,{auto_layout:layout});return{e,f,a,b};};
test('auto layout places children with padding, gap and alignment and reflows edits atomically',()=>{
 const {e,f,a,b}=setup();assert.deepEqual([get(e,a).x,get(e,a).y,get(e,b).x],[120,140,180]);
 const before=e.snapshot();edit(e,a,{width:80});assert.equal(get(e,b).x,210);e.undo();assert.equal(e.snapshot(),before);e.redo();
 edit(e,f,{auto_layout:{...layout,direction:'vertical',justify:'between'}});assert.deepEqual([get(e,a).y,get(e,b).y],[110,170]);
 const stable=e.snapshot();edit(e,a,{});assert.equal(e.snapshot(),stable);const copy=new Editor();copy.load(stable);assert.equal(copy.snapshot(),stable);copy.free();e.free();
});
test('hug sizes follow visible flow children; fill allocation disables parent hugging on that axis',()=>{
 const {e,f,a,b}=setup();edit(e,f,{auto_layout:{...layout,hug_width:true,hug_height:true}});assert.deepEqual([get(e,f).width,get(e,f).height],[150,40]);
 edit(e,b,{hidden:true});assert.equal(get(e,f).width,90);edit(e,b,{hidden:false});assert.equal(get(e,f).width,150);
 edit(e,a,{layout_item:{fill_width:true,fill_height:true,absolute:false}});assert.equal(get(e,f).auto_layout.hug_width,false);assert.equal(get(e,f).auto_layout.hug_height,false);
 edit(e,f,{width:400,height:120});assert.deepEqual([get(e,a).width,get(e,a).height,get(e,b).x],[300,100,430]);
 edit(e,b,{layout_item:{fill_width:true,fill_height:false,absolute:false}});assert.deepEqual([get(e,a).width,get(e,b).width],[175,175]);e.free();
});
test('nested layout, ignored children, duplication and deletion preserve layout invariants',()=>{
 const {e,f,a,b}=setup();edit(e,a,{kind:'frame',auto_layout:{...layout,hug_width:true,hug_height:true}});
 const text=e.add('text',0,0);edit(e,text,{width:70,height:30});e.reparent_many(JSON.stringify([text]),a);assert.equal(get(e,a).width,110);assert.equal(get(e,b).x,240);
 edit(e,b,{layout_item:{fill_width:false,fill_height:false,absolute:true},x:500,y:600});edit(e,f,{width:500});assert.deepEqual([get(e,b).x,get(e,b).y],[500,600]);
 const copy=JSON.parse(e.duplicate_many(JSON.stringify([a])));assert.equal(copy.length,2);assert.equal(get(e,copy[1]).parent_id,copy[0]);const before=e.snapshot();e.remove(a);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('wrapping and drag reordering are single undo steps; scaling scales layout gaps and padding',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('rectangle',100,0);const before=e.snapshot();const f=e.auto_layout_selection(JSON.stringify([a,b]));assert.equal(get(e,a).parent_id,f);e.undo();assert.equal(e.snapshot(),before);e.redo();
 const old=e.snapshot(),target={...get(e,a),x:get(e,b).x+get(e,b).width+10};e.move_into(JSON.stringify([target]),f);assert.ok(get(e,a).x>get(e,b).x);e.undo();assert.equal(e.snapshot(),old);
 const list=shapes(e),scaled=scaleShapes(list,{x:get(e,f).x,y:get(e,f).y},2);e.update_many(JSON.stringify(scaled));assert.equal(get(e,f).auto_layout.gap,32);assert.deepEqual(shapes(e),scaled);
  const stable=e.snapshot();assert.equal(e.auto_layout_selection(JSON.stringify([f])),f);assert.equal(e.snapshot(),stable);assert.throws(()=>edit(e,f,{auto_layout:{...layout,gap:-100001}}));assert.equal(e.snapshot(),stable);e.free();
});
