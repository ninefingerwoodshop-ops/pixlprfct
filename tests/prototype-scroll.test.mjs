import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {scrolls,scrollExtent,clampScroll,scrolledScene,scrollJson,scrollBy,keyboardScrollFrame,keyScrollDelta} from '../web/prototype-scroll.js';
import {prototypeScene} from '../web/prototype.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
// A 300 × 200 screen holding a 200 × 100 list at (50,50). The list has a pinned header and
// three 80 px rows, so its content runs 160 px past its bottom edge. `other` is a second screen.
function setup(direction='vertical'){
 const e=new Editor(),screen=e.add('frame',0,0),other=e.add('frame',600,0),list=e.add('frame',50,50),header=e.add('rectangle',50,50),rows=[0,1,2].map(i=>e.add('rectangle',50,60+i*80));
 edit(e,screen,{name:'Screen',width:300,height:200});edit(e,list,{name:'List',width:200,height:100});e.reparent_many(JSON.stringify([list]),screen);
 edit(e,header,{name:'Header',width:200,height:20});rows.forEach((id,i)=>edit(e,id,{name:'Row '+(i+1),width:200,height:80}));e.reparent_many(JSON.stringify([header,...rows]),list);
 edit(e,list,{overflow_scroll:direction});edit(e,header,{scroll_fixed:true});
 return {e,screen,other,list,header,rows,scene:()=>prototypeScene(doc(e),screen)};
}
test('overflow scrolling and pinned layers persist, validate and leave other documents unchanged',()=>{
 const plain=new Editor(),f=plain.add('frame',0,0);plain.add('rectangle',0,0);
 // Documents that do not use scrolling carry no new keys.
 assert.ok(!plain.snapshot().includes('overflow_scroll'));assert.ok(!plain.snapshot().includes('scroll_fixed'));const untouched=plain.snapshot();
 const {e,list,header,rows}=setup(),saved=e.snapshot();assert.equal(get(e,list).overflow_scroll,'vertical');assert.equal(get(e,header).scroll_fixed,true);assert.equal(get(e,rows[0]).scroll_fixed,undefined);
 const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();
 for(const bad of ['diagonal','','NONE'])assert.throws(()=>edit(e,list,{overflow_scroll:bad}),/Overflow scrolling/);
 assert.throws(()=>edit(e,rows[0],{overflow_scroll:'vertical'}),/Overflow scrolling requires a frame/);assert.equal(e.snapshot(),saved);
 for(const ok of ['horizontal','both','none'])edit(e,list,{overflow_scroll:ok});assert.equal(get(e,list).overflow_scroll,undefined);
 e.undo();assert.equal(get(e,list).overflow_scroll,'both');
 edit(plain,f,{overflow_scroll:'none'});assert.equal(plain.snapshot(),untouched);plain.free();e.free();
});
test('component instances inherit scrolling settings from their main component',()=>{
 const {e,screen,list}=setup();e.create_component(screen);const instance=e.create_instance(screen,900,0),shapes=()=>doc(e).shapes,inList=()=>shapes().find(s=>s.parent_id===instance&&s.name==='List');
 assert.equal(inList().overflow_scroll,'vertical');assert.equal(shapes().find(s=>s.parent_id===inList().id&&s.name==='Header').scroll_fixed,true);
 edit(e,list,{overflow_scroll:'both'});assert.equal(inList().overflow_scroll,'both');e.free();
});
test('scroll extent follows the content past the frame on the allowed axes only',()=>{
 const {e,list,rows,scene}=setup(),frame=()=>scene().find(s=>s.id===list);
 assert.equal(scrolls(frame()),true);assert.equal(scrolls(scene()[0]),false);assert.equal(scrolls(null),false);
 // Rows end at y 300; the list ends at 150.
 assert.deepEqual(scrollExtent(scene(),frame()),{x:0,y:150});
 edit(e,rows[2],{width:260});assert.deepEqual(scrollExtent(scene(),frame()),{x:0,y:150});
 edit(e,list,{overflow_scroll:'both'});assert.deepEqual(scrollExtent(scene(),frame()),{x:60,y:150});
 edit(e,list,{overflow_scroll:'horizontal'});assert.deepEqual(scrollExtent(scene(),frame()),{x:60,y:0});
 // Hidden rows and the pinned header do not extend the content.
 edit(e,list,{overflow_scroll:'vertical'});edit(e,rows[2],{hidden:true});assert.deepEqual(scrollExtent(scene(),frame()),{x:0,y:70});
 edit(e,rows[1],{hidden:true});edit(e,rows[0],{hidden:true});assert.deepEqual(scrollExtent(scene(),frame()),{x:0,y:0});
 assert.deepEqual(scrollExtent(scene(),scene()[0]),{x:0,y:0});
 assert.deepEqual(clampScroll({x:10,y:20},{x:-5,y:99}),{x:0,y:20});assert.deepEqual(clampScroll({x:10,y:20},undefined),{x:0,y:0});e.free();
});
test('the shown scene moves scrolling content, keeps pinned layers and clips the frame',()=>{
 const {e,list,header,rows,scene}=setup(),original=scene();
 const still=scrolledScene(original,new Map());assert.equal(still.find(s=>s.id===rows[0]).y,60);assert.equal(still.find(s=>s.id===list).clip_content,true);
 const shown=scrolledScene(original,new Map([[list,{x:0,y:90}]])),at=id=>shown.find(s=>s.id===id);
 assert.deepEqual(rows.map(id=>at(id).y),[-30,50,130]);assert.equal(at(header).y,50);assert.equal(at(list).y,50);assert.equal(original.find(s=>s.id===rows[0]).y,60);
 // The pinned header is drawn last among the list's children, above the rows.
 assert.deepEqual(shown.map(s=>s.id).slice(-4),[...rows,header]);assert.deepEqual(still.map(s=>s.id).at(-1),header);
 // Offsets beyond the content are clamped.
 assert.equal(scrolledScene(original,new Map([[list,{x:40,y:999}]])).find(s=>s.id===rows[2]).y,220-150);
 assert.equal(scrollJson(original,new Map([[list,{x:0,y:999}]])),JSON.stringify({[list]:[0,150]}));assert.equal(scrollJson(original,new Map()),'{}');assert.equal(scrollJson(original,null),'{}');
 // A scene with no scrolling frame is returned as is.
 const flat=original.filter(s=>s.id!==list).map(s=>({...s,overflow_scroll:undefined}));assert.equal(scrolledScene(flat,new Map()),flat);e.free();
});
test('nested scrolling frames move together and pass on what the inner one cannot use',()=>{
 const {e,screen,list,rows,scene}=setup();edit(e,screen,{overflow_scroll:'vertical'});
 const tall=e.add('rectangle',0,400);edit(e,tall,{name:'Footer',width:300,height:100});e.reparent_many(JSON.stringify([tall]),screen);
 const s=scene(),inList={x:100,y:100},outside={x:20,y:20};
 assert.deepEqual(scrollExtent(s,s[0]),{x:0,y:300});
 // The list takes the wheel first.
 let offsets=scrollBy(s,new Map(),inList,0,100);assert.deepEqual([...offsets],[[list,{x:0,y:100}]]);
 // 50 px remain in the list; the other 50 scroll the screen.
 offsets=scrollBy(s,offsets,inList,0,100);assert.deepEqual(offsets.get(list),{x:0,y:150});assert.deepEqual(offsets.get(screen),{x:0,y:50});
 // Both offsets apply to a row: the list moved 150, the screen 50.
 assert.equal(scrolledScene(s,offsets).find(x=>x.id===rows[0]).y,60-200);assert.equal(scrolledScene(s,offsets).find(x=>x.id===list).y,0);
 // Outside the list only the screen scrolls; horizontal wheel does nothing here.
 assert.deepEqual([...scrollBy(s,new Map(),outside,0,80)],[[screen,{x:0,y:80}]]);assert.equal(scrollBy(s,new Map(),outside,80,0),null);
 assert.equal(scrollBy(s,new Map(),outside,0,-10),null);assert.equal(scrollBy(s,new Map(),{x:900,y:900},0,50),null);
 // Once the list has scrolled out of view under the pointer, the point no longer reaches it.
 const away=scrollBy(s,new Map([[screen,{x:0,y:300}]]),inList,0,-20);assert.deepEqual([...away],[[screen,{x:0,y:280}]]);e.free();
});
test('keyboard scrolling picks the outermost frame with room and maps keys to distances',()=>{
 const {e,screen,list,scene}=setup();assert.equal(keyboardScrollFrame(scene()).id,list);
 edit(e,list,{overflow_scroll:'none'});assert.equal(keyboardScrollFrame(scene()),null);edit(e,list,{overflow_scroll:'vertical',hidden:true});assert.equal(keyboardScrollFrame(scene()),null);
 const frame={height:100},extent={x:60,y:150};
 assert.deepEqual(['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','PageDown','PageUp','End','Home'].map(k=>keyScrollDelta(k,frame,extent)),[{x:0,y:40},{x:0,y:-40},{x:40,y:0},{x:-40,y:0},{x:0,y:90},{x:0,y:-90},{x:60,y:150},{x:-60,y:-150}]);
 assert.equal(keyScrollDelta('a',frame,extent),null);assert.equal(keyScrollDelta('PageDown',{height:10},extent).y,40);assert.ok(screen);e.free();
});
test('hit testing follows scrolled content, respects the clip and leaves pinned layers in place',()=>{
 const {e,screen,other,list,header,rows}=setup();
 rows.forEach(id=>edit(e,id,{prototype:{action:'navigate',target:other}}));edit(e,header,{prototype:{trigger:'mousedown',action:'navigate',target:other}});
 const hit=(x,y,offsets)=>JSON.parse(offsets?e.prototype_pointer_hits_scrolled(screen,x,y,JSON.stringify(offsets)):e.prototype_pointer_hits(screen,x,y));
 // Unscrolled: the point (100,120) is over row 1; row 3 is clipped out of the list.
 assert.equal(hit(100,120).click,rows[0]);assert.equal(hit(100,120,{}).click,rows[0]);assert.equal(hit(100,120,{[list]:[0,0]}).click,rows[0]);
 // Scrolled 150: row 3 now occupies y 70–150 on screen.
 assert.equal(hit(100,120,{[list]:[0,150]}).click,rows[2]);assert.equal(hit(100,120,{[list]:[0,90]}).click,rows[1]);
 // The header stays at the top of the list whatever the offset, above the rows.
 assert.equal(hit(100,60,{[list]:[0,150]}).mousedown,header);assert.equal(hit(100,60).mousedown,header);
 // Scrolled content never leaks outside the list.
 assert.equal(hit(100,170,{[list]:[0,40]}).click,0);assert.equal(hit(100,30,{[list]:[0,150]}).click,0);
 // Unknown frames, non-scrolling frames and bad input are ignored.
 assert.equal(hit(100,120,{999:[0,50],[screen]:[0,50]}).click,rows[0]);assert.equal(JSON.parse(e.prototype_pointer_hits_scrolled(screen,100,120,'not json')).click,rows[0]);
 const before=e.snapshot();hit(100,120,{[list]:[0,150]});assert.equal(e.snapshot(),before);e.free();
});
