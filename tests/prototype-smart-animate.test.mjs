import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {easeProgress,mix,mixColor,matchLayers,smartScene} from '../web/prototype-smart-animate.js';
import {smartSpec,transitionSpec,canvasTransitions} from '../web/prototype-transition.js';
import {prototypeScene} from '../web/prototype.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-3,`${a} ≈ ${b}`);

// Two frames: a card that moves, grows and recolors; a badge only in the first; a note only in the second.
function screens(){
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',1000,200),add=(frame,kind,name,x,y,width,height,extra={})=>{const id=e.add(kind,x,y);edit(e,id,{name,width,height,...extra});e.reparent_many(JSON.stringify([id]),frame);return id;};
 edit(e,a,{name:'One',width:400,height:300,fill:'#000000'});edit(e,b,{name:'Two',width:400,height:300,fill:'#ffffff'});
 const badge=add(a,'rectangle','Badge',10,10,20,20),cardA=add(a,'rectangle','Card',20,40,100,50,{fill:'#ff0000'}),titleA=add(a,'text','Title',20,100,100,20);
 const cardB=add(b,'rectangle','Card',1200,300,200,100,{fill:'#0000ff',rotation:90}),note=add(b,'rectangle','Note',1010,210,30,30),titleB=add(b,'text','Title',1020,400,100,20);
 const d=doc(e);return {e,a,b,badge,cardA,titleA,cardB,note,titleB,from:prototypeScene(d,a),to:prototypeScene(d,b)};
}
test('easing follows the CSS curves and color mixing keeps alpha only when present',()=>{
 for(const name of ['linear','ease-in','ease-out','ease-in-out','unknown']){assert.equal(easeProgress(name,0),0);assert.equal(easeProgress(name,1),1);assert.equal(easeProgress(name,-1),0);assert.equal(easeProgress(name,2),1);}
 assert.equal(easeProgress('linear',.25),.25);near(easeProgress('ease-in-out',.5),.5);near(easeProgress('ease-in',.5),.3154);near(easeProgress('ease-out',.5),.6846);
 let last=0;for(let t=0;t<=1;t+=.05){const v=easeProgress('ease-in-out',t);assert.ok(v>=last-1e-9);last=v;}
 assert.equal(mix(10,20,.25),12.5);assert.equal(mixColor('#000000','#ffffff',.5),'#808080');assert.equal(mixColor('#ff000000','#ff0000',.5),'#ff000080');
 assert.equal(mixColor('red','#00ff00',.5),'#00ff00');assert.equal(mixColor(undefined,'#00ff00',.5),'#00ff00');
});
test('layers pair by name, order and kind under paired parents; the rest arrive or depart whole',()=>{
 const {e,a,b,badge,cardA,titleA,cardB,note,titleB,from,to}=screens(),match=matchLayers(from,to);
 assert.deepEqual([...match.pairs].map(([id,s])=>[id,s.id]),[[b,a],[cardB,cardA],[titleB,titleA]]);
 assert.deepEqual([...match.added],[note]);assert.deepEqual(match.removed.map(r=>[r.shape.id,r.parent,r.before]),[[badge,b,cardB]]);e.free();
});
test('same-named siblings pair in order, a kind change breaks the pair, and children follow their parent',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',600,0),put=(frame,kind,name,parent=frame)=>{const id=e.add(kind,0,0);edit(e,id,{name});e.reparent_many(JSON.stringify([id]),parent);return id;};
 const a1=put(a,'rectangle','Dot'),a2=put(a,'rectangle','Dot'),aBox=put(a,'frame','Box'),aIn=put(a,'rectangle','Inner',aBox),aIcon=put(a,'rectangle','Icon');
 const b1=put(b,'rectangle','Dot'),b2=put(b,'rectangle','Dot'),b3=put(b,'rectangle','Dot'),bBox=put(b,'rectangle','Box'),bIcon=put(b,'text','Icon');
 const d=doc(e),match=matchLayers(prototypeScene(d,a),prototypeScene(d,b));
 assert.deepEqual([...match.pairs].map(([id,s])=>[id,s.id]),[[b,a],[b1,a1],[b2,a2]]);assert.deepEqual([...match.added],[b3,bBox,bIcon]);
 // Box changed kind, so it and its child depart together; neither pairs.
 assert.deepEqual(match.removed.map(r=>r.shape.id),[aBox,aIcon]);assert.ok(![...match.pairs.values()].some(s=>s.id===aIn));e.free();
});
test('the blended scene starts on the old frame, ends on the new one and stays in the destination space',()=>{
 const {e,a,b,badge,cardB,note,titleB,from,to}=screens(),match=matchLayers(from,to),at=(t,id)=>smartScene(from,to,t,match).find(s=>s.id===id);
 // The destination frame sits 1000,200 away; the old card is carried into its space.
 const start=at(0,cardB);assert.deepEqual([start.x,start.y,start.width,start.height,start.rotation,start.fill],[1020,240,100,50,0,'#ff0000']);
 const half=at(.5,cardB);assert.deepEqual([half.x,half.y,half.width,half.height,half.rotation,half.fill],[1110,270,150,75,45,'#800080']);
 const end=smartScene(from,to,1,match);assert.deepEqual(end.filter(s=>s.id>0).map(s=>({...s,appearance:null})),to.map(s=>({...s,appearance:null})));
 for(const id of [cardB,titleB])assert.deepEqual(at(1,id),to.find(s=>s.id===id));
 // The frame keeps the destination geometry and blends its fill.
 const root=at(.5,b);assert.deepEqual([root.x,root.y,root.width,root.fill,root.id],[1000,200,400,'#808080',b]);
 assert.equal(at(.25,note).appearance.opacity,.25);assert.equal(at(1,note).appearance.opacity,1);
 const gone=at(.25,-badge);assert.deepEqual([gone.x,gone.y,gone.parent_id,gone.appearance.opacity],[1010,210,b,.75]);assert.equal(at(1,-badge).appearance.opacity,0);
 // The departing badge keeps its place in the stack, just under the card.
 const order=smartScene(from,to,.5,match).map(s=>s.id);assert.equal(order.indexOf(-badge)+1,order.indexOf(cardB));
 assert.equal(get(e,cardB).x,1200);assert.equal(get(e,a).fill,'#000000');e.free();
});
test('a departing subtree moves as one, and appearance and type sizes blend between paired layers',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0),group=e.add('frame',10,10),inner=e.add('rectangle',20,20),boxA=e.add('rectangle',0,100),boxB=e.add('rectangle',500,100);
 edit(e,group,{name:'Panel'});edit(e,inner,{name:'Inner'});e.reparent_many(JSON.stringify([group,boxA]),a);e.reparent_many(JSON.stringify([inner]),group);e.reparent_many(JSON.stringify([boxB]),b);
 const look=get(e,boxA).appearance??{opacity:1,corner_radius:0,fill_enabled:true,stroke_enabled:false,stroke_color:'#000000'};
 edit(e,boxA,{name:'Box',appearance:{...look,opacity:1,corner_radius:0}});edit(e,boxB,{name:'Box',appearance:{...get(e,boxA).appearance,opacity:.5,corner_radius:20}});
 const d=doc(e),from=prototypeScene(d,a),to=prototypeScene(d,b),scene=smartScene(from,to,.5);
 const panel=scene.find(s=>s.id===-group),child=scene.find(s=>s.id===-inner);assert.equal(panel.parent_id,b);assert.equal(child.parent_id,-group);assert.equal(child.x,get(e,inner).x+500);
 assert.equal(panel.appearance.opacity,.5);assert.equal(child.appearance,get(e,inner).appearance);
 const box=scene.find(s=>s.id===boxB);assert.equal(box.appearance.opacity,.75);assert.equal(box.appearance.corner_radius,10);assert.deepEqual(scene.map(s=>s.id),[b,-group,-inner,boxB]);e.free();
});
test('smart animate is a saved transition for navigate and back, and not for overlays',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0);
 edit(e,a,{prototype:{action:'navigate',target:b,transition:'smart-animate',duration:400,easing:'ease-out'}});edit(e,b,{prototype:{action:'back',target:0,transition:'smart-animate'}});
 const saved=e.snapshot();assert.equal(get(e,a).prototype.transition,'smart-animate');const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);copy.free();
 for(const action of ['overlay','swap'])assert.throws(()=>edit(e,a,{prototype:{...get(e,a).prototype,action}}),/Invalid prototype transition/);
 assert.throws(()=>edit(e,b,{prototype:{action:'close',target:0,transition:'smart-animate'}}));assert.equal(e.snapshot(),saved);e.undo();assert.equal(get(e,b).prototype,null);e.free();
});
test('the tween spec respects duration and reduced motion, and leaves snapshot transitions alone',()=>{
 assert.deepEqual(smartSpec({transition:'smart-animate',duration:450,easing:'linear'}),{duration:450,easing:'linear'});assert.deepEqual(smartSpec({transition:'smart-animate'}),{duration:300,easing:'ease-in-out'});
 assert.equal(smartSpec({transition:'smart-animate'},true),null);assert.equal(smartSpec({transition:'smart-animate',duration:0}),null);assert.equal(smartSpec({transition:'dissolve'}),null);assert.equal(smartSpec(),null);
 assert.equal(transitionSpec({transition:'smart-animate',duration:400}),null);
});
test('the tween draws eased frames to exactly 1, blocks input while running and cancels cleanly',async()=>{
 const queue=[],attrs=new Map(),area={setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),append(){}},saved={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};
 globalThis.requestAnimationFrame=f=>{queue.push(f);return queue.length;};globalThis.cancelAnimationFrame=id=>{queue[id-1]=null;};
 try{
  const animator=canvasTransitions({},area),frames=[],done=animator.tween(t=>frames.push(t),{duration:100,easing:'linear'});
  assert.equal(animator.running,true);assert.equal(attrs.get('aria-busy'),'true');
  const step=now=>queue.splice(0).forEach(f=>f?.(now));step(1000);step(1050);step(1100);await done;
  assert.deepEqual(frames,[0,.5,1]);assert.equal(animator.running,false);assert.equal(attrs.has('aria-busy'),false);assert.equal(queue.length,0);
  // Cancelling mid-way resolves the promise and stops further frames.
  const partial=[],pending=animator.tween(t=>partial.push(t),{duration:100,easing:'linear'});step(2000);animator.cancel();step(2050);await pending;
  assert.deepEqual(partial,[0]);assert.equal(animator.running,false);
  await animator.tween(()=>{throw new Error('must not draw');},null);
 }finally{globalThis.requestAnimationFrame=saved.raf;globalThis.cancelAnimationFrame=saved.caf;}
});
