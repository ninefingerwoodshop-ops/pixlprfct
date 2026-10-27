import test from 'node:test';
import assert from 'node:assert/strict';
import {installPageDrop,pageAutoScrollSpeed} from '../web/page-drop.js';
test('page edge scrolling accelerates towards edges and stops outside or in the middle',()=>{
 const rect={top:100,bottom:380};
 assert.equal(pageAutoScrollSpeed(rect,240),0);
 assert.equal(pageAutoScrollSpeed(rect,99),0);
 assert.equal(pageAutoScrollSpeed(rect,381),0);
 assert.equal(pageAutoScrollSpeed(rect,100),-600);
 assert.equal(pageAutoScrollSpeed(rect,380),600);
 assert.ok(pageAutoScrollSpeed(rect,370)>pageAutoScrollSpeed(rect,350));
});
function fixture(defaultView){
 const handlers={},documentHandlers={},frames=new Map();let sequence=0,hit;
 const row=id=>({dataset:{pageId:String(id)},classList:{add(){},remove(){}},closest(){return this;},getBoundingClientRect:()=>({top:240,height:34})});
 const source=row(1),target=row(2),menu={scrollTop:100,scrollHeight:900,clientHeight:280,
  addEventListener:(type,fn)=>handlers[type]=fn,
  querySelectorAll:()=>[source,target].filter(r=>r.dataset.pageDrop),contains:r=>r===source||r===target,
  getBoundingClientRect:()=>({top:0,bottom:280,left:0,right:220}),ownerDocument:{defaultView,elementFromPoint:()=>hit,addEventListener:(type,fn)=>documentHandlers[type]=fn}};
 const drops=[];installPageDrop(menu,(...args)=>drops.push(args),{requestFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelFrame:id=>frames.delete(id)});
 const event=(row,y)=>({target:row,clientX:100,clientY:y,preventDefault(){},dataTransfer:{setData(){}}});
 handlers.dragstart(event(source,100));
 return {handlers,documentHandlers,frames,menu,source,target,drops,event,setHit:r=>hit=r,tick:t=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn(t);}};
}
test('stationary edge drag keeps scrolling and updates the drop destination; leaving stops it',()=>{
 const f=fixture();f.setHit(f.target);f.handlers.dragover(f.event(f.source,275));f.tick(0);
 assert.ok(f.menu.scrollTop>100);assert.equal(f.target.dataset.pageDrop,'after');
 const first=f.menu.scrollTop;f.tick(16);assert.ok(f.menu.scrollTop>first);
 f.handlers.dragleave({relatedTarget:null});assert.equal(f.frames.size,0);assert.equal(f.target.dataset.pageDrop,undefined);
});
test('drop, cancellation and scroll limits stop animation',()=>{
 for(const action of ['drop','dragend','keydown']){
  const f=fixture();f.setHit(f.target);f.handlers.dragover(f.event(f.target,275));f.tick(0);
  if(action==='keydown') f.documentHandlers.keydown({key:'Escape',stopImmediatePropagation(){}});
  else f.handlers[action](f.event(f.target,275));
  assert.equal(f.frames.size,0);assert.equal(f.target.dataset.pageDrop,undefined);
  assert.equal(f.drops.length,action==='drop'?1:0);
 }
 const f=fixture();f.menu.scrollTop=620;f.handlers.dragover(f.event(f.target,275));f.tick(0);assert.equal(f.frames.size,0);
 f.handlers.dragover(f.event(f.target,5));f.tick(16);assert.ok(f.menu.scrollTop<620);
});

test('Escape outside menu cancels drag, rejects late drops and allows the next drag',()=>{
 const f=fixture();f.setHit(f.target);f.handlers.dragover(f.event(f.target,275));
 let stopped=0;
 const escape={key:'Escape',stopImmediatePropagation(){stopped++;},preventDefault(){assert.fail('Native Escape must remain enabled');}};
 f.documentHandlers.keydown(escape);f.documentHandlers.keyup(escape);
 assert.equal(stopped,2);assert.equal(f.frames.size,0);assert.equal(f.target.dataset.pageDrop,undefined);
 f.handlers.dragover(f.event(f.target,275));f.handlers.drop(f.event(f.target,275));f.handlers.dragend();
 assert.deepEqual(f.drops,[]);assert.equal(f.frames.size,0);
 f.documentHandlers.keydown(escape);assert.equal(stopped,2);
 f.handlers.pointerdown();f.handlers.dragstart(f.event(f.source,100));
 f.handlers.dragover(f.event(f.target,275));f.handlers.drop(f.event(f.target,275));
 assert.deepEqual(f.drops,[[1,2,true,false]]);
});

test('Alt at drop copies, releasing Alt moves, and a page can copy beside itself',()=>{
 for(const copy of [true,false]) {
  const f=fixture();const hover=f.event(f.target,275);hover.altKey=!copy;f.handlers.dragover(hover);
  assert.equal(hover.dataTransfer.dropEffect,!copy?'copy':'move');
  const drop=f.event(f.target,275);drop.altKey=copy;f.handlers.drop(drop);
  assert.deepEqual(f.drops,[[1,2,true,copy]]);
 }
 const f=fixture();const event=f.event(f.source,275);event.altKey=true;f.handlers.dragover(event);
 assert.equal(event.dataTransfer.dropEffect,'copy');f.handlers.drop(event);assert.deepEqual(f.drops,[[1,1,true,true]]);
});
test('live page preview toggles plus on modifier changes and clears on cancel or drop',()=>{
 const f=fixture(),nodes=[];
 const element=()=>({dataset:{},style:{},setAttribute(){},append(){},remove(){this.removed=true;},getBoundingClientRect:()=>({width:240,height:36})});
 f.menu.ownerDocument.createElement=element;
 f.menu.ownerDocument.body={append:node=>nodes.push(node)};
 f.menu.ownerDocument.defaultView={innerWidth:800,innerHeight:600};
 f.source.textContent='My page';
 const start=f.event(f.source,100);start.dataTransfer.setDragImage=()=>{};
 start.altKey=true;f.handlers.dragstart(start);
 assert.equal(nodes[0].dataset.copy,'true');
 f.documentHandlers.keyup({key:'Alt',altKey:false});assert.equal(nodes[0].dataset.copy,'false');
 f.documentHandlers.keydown({key:'Alt',altKey:true});assert.equal(nodes[0].dataset.copy,'true');
 f.documentHandlers.dragover({...f.event(f.target,275),altKey:false});assert.equal(nodes[0].dataset.copy,'false');
 f.documentHandlers.keydown({key:'Escape',stopImmediatePropagation(){}});assert.equal(nodes[0].removed,true);
 f.handlers.dragstart(start);f.handlers.dragover(f.event(f.target,275));f.handlers.drop(f.event(f.target,275));assert.equal(nodes[1].removed,true);
});

test('page preview and badge stay inside each edge and follow visible viewport changes',()=>{
 const events={},nodes=[];
 const visual={offsetLeft:50,offsetTop:40,width:180,height:120,addEventListener:(type,fn)=>events[type]=fn};
 const f=fixture({visualViewport:visual,addEventListener(){}});
 f.menu.ownerDocument.createElement=()=>({dataset:{},style:{},setAttribute(){},append(){},remove(){},getBoundingClientRect(){return {width:Math.min(240,parseFloat(this.style.maxWidth)||240),height:36};}});
 f.menu.ownerDocument.body={append:node=>nodes.push(node)};
 const start=f.event(f.source,100);start.dataTransfer.setDragImage=()=>{};start.altKey=true;f.handlers.dragstart(start);
 const preview=nodes[0];
 const check=()=>{
  const x=parseFloat(preview.style.left),y=parseFloat(preview.style.top),size=preview.getBoundingClientRect();
  assert.ok(x-10>=visual.offsetLeft);assert.ok(y-10>=visual.offsetTop);
  assert.ok(x+size.width<=visual.offsetLeft+visual.width);assert.ok(y+size.height<=visual.offsetTop+visual.height);
  assert.equal(preview.dataset.copy,'true');
 };
 for(const [x,y] of [[50,40],[230,40],[50,160],[230,160]]){
  f.documentHandlers.dragover({clientX:x,clientY:y,altKey:true});check();
 }
 visual.width=140;events.resize();check();
 visual.offsetLeft=80;visual.offsetTop=60;events.scroll();check();
});
test('preview names before/after destination, follows scrolling, and clears invalid destinations',()=>{
 const f=fixture(),nodes=[];
 f.menu.ownerDocument.defaultView={innerWidth:800,innerHeight:600};
 f.menu.ownerDocument.createElement=()=>({dataset:{},style:{},children:[],setAttribute(){},append(...children){this.children.push(...children);},remove(){},getBoundingClientRect:()=>({width:240,height:70})});
 f.menu.ownerDocument.body={append:node=>nodes.push(node)};
 f.source.textContent='Source';f.target.textContent='Destination <literal>';
 const start=f.event(f.source,100);start.dataTransfer.setDragImage=()=>{};f.handlers.dragstart(start);
 const label=nodes[0].children[1];assert.equal(label.hidden,true);
 f.handlers.dragover(f.event(f.target,245));assert.equal(label.textContent,'Before Destination <literal>');assert.equal(label.hidden,false);
 f.handlers.dragover(f.event(f.target,275));assert.equal(label.textContent,'After Destination <literal>');
 f.setHit(f.target);f.target.textContent='Newly visible page';f.tick(0);assert.equal(label.textContent,'After Newly visible page');
 f.handlers.dragover(f.event(f.source,275));assert.equal(label.hidden,true);assert.equal(label.textContent,'');
 f.setHit(f.source);f.documentHandlers.keydown({key:'Alt',altKey:true});assert.equal(label.textContent,'After Source');
 f.documentHandlers.keyup({key:'Alt',altKey:false});assert.equal(label.hidden,true);
 f.handlers.dragover(f.event(f.target,275));f.handlers.dragleave({relatedTarget:null});assert.equal(label.hidden,true);
});
