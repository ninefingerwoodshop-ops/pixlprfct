import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeScene,prototypeState} from '../web/prototype.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
function setup(){const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0),button=e.add('rectangle',20,20);edit(e,a,{width:300,height:200});e.reparent_many(JSON.stringify([button]),a);return{e,a,b,button};}
test('prototype actions persist, reject invalid targets atomically, and clear on target removal with undo',()=>{
 const {e,a,b,button}=setup();edit(e,button,{prototype:{action:'navigate',target:b}});const before=e.snapshot();
 for(const prototype of [{action:'navigate',target:9999},{action:'navigate',target:button},{action:'back',target:b},{action:'bad',target:0}]){assert.throws(()=>edit(e,button,{prototype}));assert.equal(e.snapshot(),before);}
 const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);e.remove(b);assert.equal(get(e,button).prototype,null);e.undo();assert.equal(e.snapshot(),before);copy.free();e.free();
});
test('prototype hit testing ignores locks, crops viewport, respects hidden layers and bubbles child clicks',()=>{
 const {e,a,b,button}=setup();edit(e,button,{prototype:{action:'navigate',target:b},locked:true,width:100,height:60});const text=e.add('text',30,30);edit(e,text,{width:60,height:20});
 // A frame interaction handles clicks on its ordinary child layers.
 edit(e,a,{prototype:{action:'back',target:0},locked:true});e.reparent_many(JSON.stringify([text]),a);
 assert.equal(e.hit_test(25,25),0);assert.equal(e.prototype_hit_test(a,25,25),button);assert.equal(e.prototype_hit_test(a,35,35),a);
 edit(e,button,{hidden:true});assert.equal(e.prototype_hit_test(a,25,25),a);assert.equal(e.prototype_hit_test(a,400,100),0);e.free();
});
test('duplicating connected frames remaps internal targets while clipboard drops external links',()=>{
 const {e,a,b,button}=setup();edit(e,button,{prototype:{action:'navigate',target:b}});
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([a,b]))),newButton=doc(e).shapes.find(s=>ids.includes(s.id)&&s.kind==='rectangle'),newB=doc(e).shapes.find(s=>ids.includes(s.id)&&s.name===get(e,b).name);assert.equal(newButton.prototype.target,newB.id);
 const single=JSON.parse(e.copy_layers(JSON.stringify([a])));assert.equal(single.shapes.find(s=>s.id===button).prototype,null);
 const payload=e.copy_layers(JSON.stringify([a,b])),copy=new Editor(),roots=JSON.parse(copy.paste_layers(payload,0,0,0));assert.equal(doc(copy).shapes.find(s=>s.kind==='rectangle').prototype.target,roots[1]);copy.free();e.free();
});
test('presentation scene isolates a frame and navigation history does not mutate the document',()=>{
 const {e,a,b}=setup(),d=doc(e),before=e.snapshot(),state=prototypeState(d,a);assert.equal(state.current,a);assert.equal(state.canBack,false);assert.equal(state.navigate(b),true);state.back();assert.equal(state.current,a);assert.equal(state.navigate(999),false);state.navigate(b);state.restart();assert.equal(state.current,a);assert.equal(e.snapshot(),before);
 const scene=prototypeScene(d,a);assert.equal(scene[0].clip_content,true);assert.ok(!scene.some(s=>s.id===b));e.free();
});
test('links to synchronized instance child frames clear when their source is removed',()=>{
 const {e,a,b,button}=setup(),nested=e.add('frame',0,0);e.reparent_many(JSON.stringify([nested]),a);e.create_component(a);const instance=e.create_instance(a,800,0),target=doc(e).shapes.find(s=>s.parent_id===instance&&s.kind==='frame');edit(e,b,{prototype:{action:'navigate',target:target.id}});const before=e.snapshot();e.remove(nested);assert.equal(get(e,b).prototype,null);e.undo();assert.equal(e.snapshot(),before);e.free();
});

test('prototype device chrome fits the stage and retains portrait and landscape',async()=>{
 const {prototypeViewport}=await import('../web/prototype.js');
 for(const type of ['iphone','iphone-notch','ipad','phone','tablet','surface','desktop'])for(const [width,height] of [[393,852],[852,393]]){
  const f={width,height,device_chrome:type},v=prototypeViewport(f,900,600);
  assert.ok(v.chromeX>=15.999&&v.chromeY>=15.999);
  assert.ok(v.chromeX+v.outerWidth*v.scale<=884.001);
  assert.ok(v.chromeY+v.outerHeight*v.scale<=584.001);
  assert.ok(v.x>=v.chromeX&&v.y>=v.chromeY);
  assert.ok(v.x+width*v.scale<=900&&v.y+height*v.scale<=600);
  assert.match(v.svg,/fill-rule="evenodd"/);
  if(type==='iphone'||type==='ipad')assert.equal(v.svg.includes('rotate(90)'),width>height);
  const center={x:v.x+width*v.scale/2,y:v.y+height*v.scale/2};
  assert.ok(Math.abs((center.x-v.x)/v.scale-width/2)<1e-8);
  assert.ok(Math.abs((center.y-v.y)/v.scale-height/2)<1e-8);
 }
});
test('prototype navigation uses each frame’s saved chrome without adding shells to overlays',async()=>{
 const {prototypeViewport}=await import('../web/prototype.js');
 const {e,a,b}=setup();edit(e,a,{width:852,height:393,device_chrome:'iphone'});edit(e,b,{width:834,height:1194,device_chrome:'ipad',device_chrome_hidden:true});
 const d=doc(e),before=e.snapshot(),state=prototypeState(d,a),view=()=>prototypeViewport(prototypeScene(d,state.current)[0],900,600);
 assert.match(view().svg,/rotate\(90\)/);const phone=view();
 state.open({target:b});assert.deepEqual(view(),phone);state.close();state.navigate(b);
 assert.equal(view().svg,'');assert.equal(view().outerWidth,834);assert.equal(view().outerHeight,1194);
 state.back();assert.deepEqual(view(),phone);assert.equal(e.snapshot(),before);e.free();
});

test('preview orientation reflows content and hit targets without changing the source document',async()=>{
 const {prototypeOrientationDocument}=await import('../web/prototype.js');
 const {e,a,b,button}=setup();edit(e,a,{width:393,height:852,device_chrome:'iphone'});
 edit(e,button,{x:20,y:20,width:353,height:60,constraints:{horizontal:'stretch',vertical:'min'},prototype:{action:'navigate',target:b}});
 const original=doc(e),before=e.snapshot(),preview=new Editor();
 const landscape=prototypeOrientationDocument(preview,original,a,'landscape'),frame=landscape.shapes.find(s=>s.id===a),child=landscape.shapes.find(s=>s.id===button);
 assert.equal(frame.width,852);assert.equal(frame.height,393);assert.equal(child.width,812);
 assert.equal(preview.prototype_hit_test(a,800,40),button);
 assert.equal(e.prototype_hit_test(a,800,40),0);assert.equal(e.snapshot(),before);
 const portrait=prototypeOrientationDocument(preview,original,a,'portrait');assert.equal(portrait.shapes.find(s=>s.id===button).width,353);
 assert.equal(portrait.shapes.find(s=>s.id===a).height,852);
 const saved=prototypeOrientationDocument(preview,original,a);assert.equal(saved.shapes.find(s=>s.id===a).width,393);
 preview.free();e.free();
});


test('preview chrome visibility overrides saved settings without changing orientation or source',async()=>{
 const {prototypeViewport}=await import('../web/prototype.js');
 const frame={width:852,height:393,device_chrome:'iphone',device_chrome_hidden:false},before=JSON.stringify(frame);
 const shown=prototypeViewport(frame,900,600),hidden=prototypeViewport(frame,900,600,false),restored=prototypeViewport(frame,900,600,true);
 assert.equal(hidden.svg,'');assert.equal(hidden.screenRadius,0);assert.equal(hidden.outerWidth,852);assert.equal(hidden.outerHeight,393);
 assert.deepEqual(restored,shown);assert.match(restored.svg,/rotate\(90\)/);assert.equal(JSON.stringify(frame),before);
 const savedHidden={...frame,device_chrome_hidden:true};assert.equal(prototypeViewport(savedHidden,900,600).svg,'');
 assert.equal(prototypeViewport(savedHidden,900,600,true).svg,shown.svg);assert.equal(savedHidden.device_chrome_hidden,true);
 assert.ok(prototypeViewport({width:1440,height:900},900,600,true).svg); // Custom frames use browser chrome.
});
