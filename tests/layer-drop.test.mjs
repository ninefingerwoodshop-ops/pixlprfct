import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {layerDropPosition,installLayerDrop,layerAutoScrollSpeed,createLayerDragPreview,layerDropAllowed,layerDropReason,placeLayerDragPreview,visibleLayerPreviewCount,projectLayerDrop,layerDropDestination,layerDropParent} from '../web/layer-drop.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot());
test('row padding starts a layer drag but controls cannot start ancestor drags',()=>{
 const handlers={};const container={addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[]};installLayerDrop(container,()=>{});
 const row={dataset:{layerDrop:'42'},closest:selector=>selector==='[data-layer-drop]'?row:null};
 const control={closest:selector=>selector==='[data-layer-drop]'?row:control};
 let payload,prevented=false;
 const drag=()=>handlers.dragstart({target:row,preventDefault:()=>prevented=true,stopPropagation(){},dataTransfer:{setData:(type,value)=>payload=value}});
 handlers.pointerdown({target:row});drag();assert.equal(payload,'42');assert.equal(prevented,false);
 payload=null;handlers.pointerdown({target:control});drag();assert.equal(payload,null);assert.equal(prevented,true);
 prevented=false;handlers.pointerdown({target:row});drag();assert.equal(payload,'42');assert.equal(prevented,false);
});
test('layer drops reorder the reversed tree and undo as one action',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('rectangle',100,0),c=e.add('rectangle',200,0),before=e.snapshot();
 e.drop_layer(a,c,'before');assert.deepEqual(doc(e).shapes.map(s=>s.id),[b,c,a]);e.undo();assert.equal(e.snapshot(),before);
 e.drop_layer(c,a,'after');assert.deepEqual(doc(e).shapes.map(s=>s.id),[c,a,b]);e.free();
});
test('frame drops preserve geometry, descendants and persist; cyclic drops are atomic',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0),c=e.add('rectangle',30,40);
 e.drop_layer(c,a,'inside');const original=doc(e).shapes.find(s=>s.id===c);e.drop_layer(a,b,'inside');
 assert.deepEqual(doc(e).shapes.find(s=>s.id===c),original);assert.equal(doc(e).shapes.find(s=>s.id===a).parent_id,b);
 const before=e.snapshot();assert.throws(()=>e.drop_layer(b,a,'inside'));assert.equal(e.snapshot(),before);
 const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);e.drop_layer(c,b,'before');assert.equal(doc(e).shapes.find(s=>s.id===c).parent_id,0);e.free();copy.free();
});
test('drop zones distinguish frame nesting from edge sorting',()=>{
 const rect={top:100,height:40};assert.equal(layerDropPosition(rect,102,true),'before');assert.equal(layerDropPosition(rect,120,true),'inside');assert.equal(layerDropPosition(rect,138,true),'after');assert.equal(layerDropPosition(rect,115,false),'before');assert.equal(layerDropPosition(rect,125,false),'after');
});
test('instance structure rejects drops while main component order propagates',()=>{
 const e=new Editor(),m=e.add('frame',0,0),a=e.add('rectangle',0,0),b=e.add('ellipse',0,0);e.reparent_many(JSON.stringify([a,b]),m);e.create_component(m);const instance=e.create_instance(m,500,0),children=doc(e).shapes.filter(s=>s.parent_id===instance),before=e.snapshot();
 assert.throws(()=>e.drop_layer(children[0].id,children[1].id,'before'),/Detach/);assert.equal(e.snapshot(),before);
 e.drop_layer(a,b,'before');assert.deepEqual(doc(e).shapes.filter(s=>s.parent_id===instance).map(s=>s.component.source),[b,a]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('drag hover expands once after a dwell and cancels when leaving or ending',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const handlers={},expanded=[];
 const container={addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,bottom:500}),contains:node=>!!node};
 installLayerDrop(container,()=>{},{expand:row=>expanded.push(row.dataset.layerDrop)});
 const row=(id,collapsed=true)=>({dataset:{layerDrop:String(id),frame:'true'},isConnected:true,querySelector:()=>collapsed?{}:null,classList:{add(){}},getBoundingClientRect:()=>({top:100,height:32}),contains(node){return node===this;},closest(selector){return selector==='[data-layer-drop]'?this:null;}});
 const source=row(1),target=row(2),event=target=>({target,clientY:116,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){}}});
 handlers.pointerdown(event(source));handlers.dragstart(event(source));handlers.dragover(event(target));
 t.mock.timers.tick(400);handlers.dragover(event(target));t.mock.timers.tick(199);assert.deepEqual(expanded,[]);
 t.mock.timers.tick(1);assert.deepEqual(expanded,['2']);
 const other=row(3);handlers.dragover(event(other));handlers.dragleave({relatedTarget:null});t.mock.timers.tick(600);assert.deepEqual(expanded,['2']);
 handlers.dragover(event(other));handlers.dragend();t.mock.timers.tick(600);assert.deepEqual(expanded,['2']);
});
test('edge scroll speed increases toward each edge and stops outside the panel',()=>{
 const rect={top:100,bottom:500};
 assert.equal(layerAutoScrollSpeed(rect,300),0);
 assert.equal(layerAutoScrollSpeed(rect,99),0);
 assert.equal(layerAutoScrollSpeed(rect,501),0);
 assert.equal(layerAutoScrollSpeed(rect,100),-720);
 assert.equal(layerAutoScrollSpeed(rect,500),720);
 assert.ok(layerAutoScrollSpeed(rect,490)>layerAutoScrollSpeed(rect,460));
 assert.equal(layerAutoScrollSpeed(rect,110),-layerAutoScrollSpeed(rect,490));
});
test('edge scrolling continues without more drag events and stops on leaving',()=>{
 const handlers={},frames=new Map();let serial=0;
 const target={dataset:{layerDrop:'2',frame:'false'},classList:{add(){}},querySelector:()=>null,getBoundingClientRect:()=>({top:450,height:32}),closest(){return this;}};
 const source={...target,dataset:{layerDrop:'1',frame:'false'},closest(selector){return selector==='[data-layer-drop]'?this:null;}};
 const container={scrollTop:100,addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[],contains:n=>!!n,getBoundingClientRect:()=>({top:0,bottom:500}),ownerDocument:{elementFromPoint:()=>target}};
 installLayerDrop(container,()=>{},{requestFrame:fn=>{frames.set(++serial,fn);return serial;},cancelFrame:id=>frames.delete(id)});
 const event=target=>({target,clientX:20,clientY:490,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){}}});
 handlers.pointerdown(event(source));handlers.dragstart(event(source));handlers.dragover(event(target));
 const tick=time=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));};
 tick(0);tick(16);const first=container.scrollTop;tick(32);
 assert.ok(first>100);assert.ok(container.scrollTop>first);assert.equal(frames.size,1);
 handlers.dragleave({relatedTarget:null});assert.equal(frames.size,0);
});
test('multi-layer drag freezes the selection at drag start',()=>{
 const handlers={},drops=[];let selected=[1,2];
 const container={addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[]};
 installLayerDrop(container,(...args)=>drops.push(args),{selection:()=>selected});
 const row=id=>({dataset:{layerDrop:String(id),frame:'false'},setAttribute(){},getBoundingClientRect:()=>({top:100,height:32}),closest(selector){return selector==='[data-layer-drop]'?this:null;}});
 const event=target=>({target,clientY:101,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){}}});
 handlers.pointerdown(event(row(1)));handlers.dragstart(event(row(1)));selected=[3];handlers.drop(event(row(4)));
 assert.deepEqual(drops[0],[1,4,'before',[1,2],false]);
 handlers.pointerdown(event(row(5)));handlers.dragstart(event(row(5)));handlers.drop(event(row(4)));
 assert.deepEqual(drops[1],[5,4,'before',[5],false]);
 selected=[1,2];handlers.pointerdown(event(row(1)));handlers.dragstart(event(row(1)));handlers.drop({...event(row(1)),altKey:true});
 assert.deepEqual(drops[2],[1,1,'before',[1,2],true]);
 handlers.pointerdown(event(row(1)));handlers.dragstart({...event(row(1)),altKey:true});handlers.drop({...event(row(4)),altKey:false});
 assert.deepEqual(drops[3],[1,4,'before',[1,2],false]);
});
test('multiple selected layers keep relative order and undo in one step',()=>{
 for(const position of ['before','after','inside']){
  const e=new Editor(),a=e.add('rectangle',0,0),target=e.add('frame',300,0),b=e.add('ellipse',20,0),before=e.snapshot();
  e.drop_layers(JSON.stringify([b,a]),target,position);
  const shapes=doc(e).shapes;assert.ok(shapes.findIndex(s=>s.id===a)<shapes.findIndex(s=>s.id===b));
  if(position==='inside')assert.ok(shapes.filter(s=>[a,b].includes(s.id)).every(s=>s.parent_id===target));
  else if(position==='before')assert.ok(shapes.findIndex(s=>s.id===target)<shapes.findIndex(s=>s.id===a));
  else assert.ok(shapes.findIndex(s=>s.id===b)<shapes.findIndex(s=>s.id===target));
  e.undo();assert.equal(e.snapshot(),before);e.free();
 }
});
test('drag preview includes every selected layer in order with its own icon and name',()=>{
 const document={createElement:()=>({children:[],attributes:{},setAttribute(name,value){this.attributes[name]=value;},append(...nodes){this.children.push(...nodes);}})};
 const layers=[{name:'Frame',icon:'<svg>frame</svg>'},{name:'Hidden child',icon:'<svg>text</svg>'},{name:'<Example>',icon:'<svg>rectangle</svg>'}];
 const preview=createLayerDragPreview(document,layers);
 assert.equal(preview.attributes['aria-hidden'],'true');
 assert.equal(preview.children[0].children.length,3);
 assert.deepEqual(preview.children[0].children.map(row=>row.children[1].textContent),layers.map(l=>l.name));
 assert.deepEqual(preview.children[0].children.map(row=>row.children[0].innerHTML),layers.map(l=>l.icon));
 assert.equal(preview.children.at(-1).textContent,'3 layers');
});
test('copy-drop preserves originals, selects copied roots, and undoes atomically',()=>{
 const e=new Editor(),parent=e.add('frame',0,0),child=e.add('rectangle',30,40),target=e.add('frame',600,0);
 e.reparent_many(JSON.stringify([child]),parent);const before=e.snapshot(),original=doc(e).shapes;
 const ids=JSON.parse(e.duplicate_drop_layers(JSON.stringify([parent,child]),target,'inside'));
 assert.equal(ids.length,1);const after=doc(e).shapes,copy=after.find(s=>s.id===ids[0]);
 assert.equal(copy.parent_id,target);assert.ok(after.some(s=>s.parent_id===copy.id));
 for(const shape of original)assert.deepEqual(after.find(s=>s.id===shape.id),shape);
 const copiedChild=after.find(s=>s.parent_id===copy.id),oldChild=original.find(s=>s.id===child);
 assert.equal(copiedChild.x,oldChild.x);assert.equal(copiedChild.y,oldChild.y);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(doc(e).shapes.length,after.length);e.free();
});
test('invalid copy-drop leaves no copies or undo entry behind',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),target=e.add('ellipse',0,0),before=e.snapshot();
 assert.throws(()=>e.duplicate_drop_layers(JSON.stringify([a]),target,'inside'));
 assert.equal(e.snapshot(),before);e.free();
});
test('live drag preview toggles its copy badge as Alt is pressed and released',()=>{
 const handlers={},documentHandlers={},nodes=[];
 const document={addEventListener:(type,fn)=>documentHandlers[type]=fn,body:{append:node=>nodes.push(node)},createElement:()=>({children:[],style:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;},append(...n){this.children.push(...n);},remove(){this.removed=true;}})};
 const container={ownerDocument:document,addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[]};
 installLayerDrop(container,()=>{},{previewLayers:()=>[{name:'Rectangle',icon:'<svg/>'}]});
 const row={dataset:{layerDrop:'1'},closest(selector){return selector==='[data-layer-drop]'?this:null;}};
 let image;
 handlers.dragstart({target:row,altKey:false,clientX:20,clientY:40,stopPropagation(){},dataTransfer:{setData(){},setDragImage:node=>image=node}});
 const preview=nodes[0];assert.equal(preview.attributes['data-copy'],'false');assert.equal(image.width,1);
 documentHandlers.keydown({altKey:true});assert.equal(preview.attributes['data-copy'],'true');
 documentHandlers.dragover({altKey:true,clientX:100,clientY:120});assert.equal(preview.style.left,'116px');assert.equal(preview.style.top,'136px');
 documentHandlers.keyup({altKey:false});assert.equal(preview.attributes['data-copy'],'false');
 handlers.dragend();assert.equal(preview.removed,true);
});
test('Escape cancels move and copy drags, timers, and late drops without touching selection',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const altKey of [false,true]){
  const handlers={},keys={},frames=new Map(),selected=[1,2],drops=[],expansions=[];let serial=0,stopped=false;
  const row=id=>({dataset:{layerDrop:String(id),frame:'true'},isConnected:true,setAttribute(){},removeAttribute(){},classList:{add(){},remove(){}},querySelector:()=>({}),getBoundingClientRect:()=>({top:450,height:32}),closest(selector){return selector==='[data-layer-drop]'?this:null;}});
  const source=row(1),target=row(3);
  const container={scrollTop:0,ownerDocument:{addEventListener:(type,fn)=>keys[type]=fn},addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,bottom:500})};
  installLayerDrop(container,(...args)=>drops.push(args),{selection:()=>selected,expand:r=>expansions.push(r),requestFrame:fn=>{frames.set(++serial,fn);return serial;},cancelFrame:id=>frames.delete(id)});
  const event=target=>({target,altKey,clientX:20,clientY:490,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){}}});
  handlers.dragstart(event(source));handlers.dragover(event(target));assert.equal(frames.size,1);
  keys.keydown({key:'Escape',stopImmediatePropagation:()=>stopped=true});
  assert.ok(stopped);assert.equal(frames.size,0);
  handlers.drop(event(target));t.mock.timers.tick(1000);
  assert.deepEqual(drops,[]);assert.deepEqual(expansions,[]);assert.deepEqual(selected,[1,2]);
  handlers.dragend();
 }
});
test('drop validation rejects self and descendants across all selected ancestors',()=>{
 const shapes=[{id:1,parent_id:0,kind:'frame'},{id:2,parent_id:1,kind:'group'},{id:3,parent_id:2,kind:'rectangle'},{id:4,parent_id:0,kind:'frame'}];
 for(const position of ['before','after','inside']){
  assert.equal(layerDropAllowed(shapes,[1],1,position),false);
  assert.equal(layerDropAllowed(shapes,[1],2,position),false);
  assert.equal(layerDropAllowed(shapes,[4,1],3,position),false);
 }
 assert.equal(layerDropAllowed(shapes,[2],1,'after'),true);
 assert.equal(layerDropAllowed(shapes,[1],4,'inside'),true);
 assert.equal(layerDropAllowed(shapes,[1],2,'inside',true),true);
});
test('invalid drag target advertises none, hides indicators, and rejects a forced drop',()=>{
 const handlers={},drops=[],classes=[];
 const row=id=>({dataset:{layerDrop:String(id),frame:'true'},classList:{add:name=>classes.push(name)},querySelector:()=>null,getBoundingClientRect:()=>({top:100,height:32}),closest(selector){return selector==='[data-layer-drop]'?this:null;}});
 const container={addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,bottom:500})};
 installLayerDrop(container,(...args)=>drops.push(args),{canDrop:()=>false});
 const event=target=>({target,clientX:20,clientY:116,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){}}});
 handlers.dragstart(event(row(1)));const over=event(row(2));handlers.dragover(over);
 assert.equal(over.dataTransfer.dropEffect,'none');assert.deepEqual(classes,[]);
 handlers.drop(event(row(2)));assert.deepEqual(drops,[]);
});
test('locked sources and inherited locks reject move and copy drops',()=>{
 const shapes=[{id:1,parent_id:0,kind:'frame',locked:true},{id:2,parent_id:1,kind:'rectangle'},{id:3,parent_id:0,kind:'frame'},{id:4,parent_id:0,kind:'rectangle'}];
 for(const copy of [false,true]){
  for(const ids of [[1],[2],[4,2]])assert.equal(layerDropAllowed(shapes,ids,3,'inside',copy),false);
  assert.equal(layerDropAllowed(shapes,[4],1,'inside',copy),false);
  assert.equal(layerDropAllowed(shapes,[4],2,'before',copy),false);
  assert.equal(layerDropAllowed(shapes,[4],2,'after',copy),false);
  // A locked sibling does not lock its unlocked parent.
  assert.equal(layerDropAllowed(shapes,[4],1,'before',copy),true);
  assert.equal(layerDropAllowed(shapes,[4],3,'inside',copy),true);
 }
 shapes[0].locked=false;
 assert.equal(layerDropAllowed(shapes,[2],3,'inside'),true);
 assert.equal(layerDropAllowed(shapes,[4],1,'inside'),true);
});
test('drop explanations distinguish locks, self-nesting, and descendant nesting',()=>{
 const shapes=[{id:1,parent_id:0,kind:'frame'},{id:2,parent_id:1,kind:'group'},{id:3,parent_id:0,kind:'frame',locked:true},{id:4,parent_id:3,kind:'rectangle'}];
 assert.match(layerDropReason(shapes,[1],1,'inside'),/itself/);
 assert.match(layerDropReason(shapes,[1],2,'inside'),/children/);
 assert.match(layerDropReason(shapes,[3],1,'inside'),/selected layer before/);
 assert.match(layerDropReason(shapes,[4],1,'inside'),/parent/);
 assert.match(layerDropReason(shapes,[1],3,'inside'),/destination/);
 assert.equal(layerDropReason(shapes,[2],1,'inside'),'');
 assert.equal(layerDropReason(shapes,[1],1,'inside',true),'');
});
test('drag preview flips and clamps at every viewport edge including tooltip growth',()=>{
 const viewport={width:800,height:600},size={width:240,height:120};
 assert.deepEqual(placeLayerDragPreview({x:100,y:100},size,viewport),{x:116,y:116});
 assert.deepEqual(placeLayerDragPreview({x:790,y:590},size,viewport),{x:534,y:454});
 for(const point of [{x:0,y:0},{x:800,y:0},{x:0,y:600},{x:800,y:600},{x:-100,y:-100}]){
  const p=placeLayerDragPreview(point,size,viewport);
  assert.ok(p.x>=16&&p.x+size.width<=784);assert.ok(p.y>=16&&p.y+size.height<=584);
 }
 const grown=placeLayerDragPreview({x:400,y:450},{width:240,height:200},viewport);
 assert.ok(grown.y+200<=584);
 const offset=placeLayerDragPreview({x:500,y:500},{width:100,height:100},{left:100,top:200,width:300,height:300});
 assert.ok(offset.x>=116&&offset.x+100<=384);assert.ok(offset.y>=216&&offset.y+100<=484);
});
test('overflow preview counts only whole rows and handles growing or shrinking space',()=>{
 const heights=[32,33,33,33];
 assert.equal(visibleLayerPreviewCount(heights,131),4);
 assert.equal(visibleLayerPreviewCount(heights,130),3);
 assert.equal(visibleLayerPreviewCount(heights,64),1);
 assert.equal(visibleLayerPreviewCount(heights,65),2);
 assert.equal(visibleLayerPreviewCount(heights,0),0);
 assert.equal(visibleLayerPreviewCount(heights,200),4);
});
test('temporary expansions close on departure or cancellation and stay open only for inside drops',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const outcome of ['leave','cancel','inside','before','child']){
  const handlers={},collapsed=[],expanded=[];
  const makeRow=id=>({dataset:{layerDrop:String(id),frame:'true'},isConnected:true,open:false,querySelector(){return this.open?null:{};},classList:{add(){}},getBoundingClientRect:()=>({top:100,height:32}),closest(selector){return selector==='[data-layer-drop]'?this:null;}});
  const source=makeRow(1),target=makeRow(2),child=makeRow(3),other=makeRow(4);
  target.parentElement={contains:row=>row===target||row===child};
  const container={addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,bottom:500}),contains:n=>!!n};
  installLayerDrop(container,()=>{},{expand:r=>{r.open=true;expanded.push(r);},collapse:r=>{r.open=false;collapsed.push(r);}});
  const event=(target,y=116)=>({target,clientX:20,clientY:y,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){}}});
  handlers.dragstart(event(source));handlers.dragover(event(target));t.mock.timers.tick(600);assert.equal(target.open,true);
  if(outcome==='leave'){
   handlers.dragover(event(other));t.mock.timers.tick(300);assert.equal(target.open,true);
   handlers.dragover(event(child));t.mock.timers.tick(500);assert.equal(target.open,true);
   handlers.dragover(event(other));t.mock.timers.tick(399);assert.equal(target.open,true);
   handlers.dragover(event(other));t.mock.timers.tick(1);assert.equal(target.open,false);
  }
  if(outcome==='cancel')handlers.dragend();
  if(outcome==='inside')handlers.drop(event(target));
  if(outcome==='before')handlers.drop(event(target,101));
  if(outcome==='child'){handlers.dragover(event(child));assert.equal(target.open,true);handlers.drop(event(child,101));}
  assert.equal(target.open,['inside','child'].includes(outcome),outcome);
  handlers.dragend();assert.equal(target.open,['inside','child'].includes(outcome));
 }
});
test('horizontal drags project outdents and indents without disturbing vertical reordering',()=>{
 const shapes=[{id:5,parent_id:0,kind:'rectangle'},{id:1,parent_id:0,kind:'frame'},{id:2,parent_id:1,kind:'group'},{id:3,parent_id:2,kind:'rectangle'},{id:4,parent_id:2,kind:'rectangle'}];
 assert.deepEqual(projectLayerDrop(shapes,3,'before',10),{target:3,position:'before'});
 assert.deepEqual(projectLayerDrop(shapes,3,'after',-24),{target:2,position:'after'});
 assert.deepEqual(projectLayerDrop(shapes,3,'after',-40),{target:1,position:'after'});
 assert.deepEqual(projectLayerDrop(shapes,3,'after',-1000),{target:1,position:'after'});
 assert.deepEqual(projectLayerDrop(shapes,2,'inside',-24),{target:2,position:'after'});
 assert.deepEqual(projectLayerDrop(shapes,2,'before',24),{target:2,position:'inside'});
 assert.deepEqual(projectLayerDrop(shapes,5,'after',24,[5]),{target:1,position:'inside'});
 const projected=projectLayerDrop(shapes,3,'after',-24);
 assert.equal(layerDropAllowed(shapes,[4],projected.target,projected.position),true);
 shapes[0].locked=true;assert.equal(layerDropAllowed(shapes,[5],1,'inside'),false);
});
test('horizontal projection moves multiple layers out of a nested group with one undo',()=>{
 const e=new Editor(),frame=e.add('frame',0,0),group=e.add('frame',20,20),a=e.add('rectangle',30,30),b=e.add('ellipse',60,30);
 e.reparent_many(JSON.stringify([group]),frame);e.reparent_many(JSON.stringify([a,b]),group);
 const before=e.snapshot(),dest=projectLayerDrop(doc(e).shapes,a,'after',-24,[a,b]);
 e.drop_layers(JSON.stringify([a,b]),dest.target,dest.position);
 assert.ok(doc(e).shapes.filter(s=>[a,b].includes(s.id)).every(s=>s.parent_id===frame));
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('destination label names the projected parent for nesting and outdenting',()=>{
 const shapes=[{id:1,parent_id:0,kind:'frame',name:'Screen'},{id:2,parent_id:1,kind:'group',name:'Card'},{id:3,parent_id:2,kind:'rectangle',name:'Icon'}];
 assert.equal(layerDropDestination(shapes,2,'inside','Design'),'Design > Screen > Card');
 assert.equal(layerDropDestination(shapes,3,'before','Design'),'Design > Screen > Card');
 const out=projectLayerDrop(shapes,3,'after',-24);
 assert.equal(layerDropDestination(shapes,out.target,out.position,'Design'),'Design > Screen');
 const root=projectLayerDrop(shapes,3,'after',-40);
 assert.equal(layerDropDestination(shapes,root.target,root.position,'Design'),'Design');
 assert.equal(layerDropDestination(shapes,999,'inside'),'');
});
test('destination paths distinguish identically named groups and omit the sibling drop target',()=>{
 const shapes=[{id:1,parent_id:0,kind:'frame',name:'Desktop'},{id:2,parent_id:0,kind:'frame',name:'Mobile'},{id:3,parent_id:1,kind:'group',name:'Content'},{id:4,parent_id:2,kind:'group',name:'Content'},{id:5,parent_id:4,kind:'rectangle',name:'Title'}];
 assert.equal(layerDropDestination(shapes,3,'inside','Home'),'Home > Desktop > Content');
 assert.equal(layerDropDestination(shapes,4,'inside','Home'),'Home > Mobile > Content');
 assert.equal(layerDropDestination(shapes,5,'after','Home'),'Home > Mobile > Content');
 assert.equal(layerDropDestination(shapes,4,'before','Home'),'Home > Mobile');
});
test('destination parent highlight follows valid targets and clears on invalid targets and drag end',()=>{
 const handlers={},rows=new Map(),destinations=[];
 for(const id of [1,2,3,4,5,6]){const classes=new Set();rows.set(id,{dataset:{layerDrop:String(id),frame:'false'},classList:{add:c=>classes.add(c),remove:(...cs)=>cs.forEach(c=>classes.delete(c))},classes,querySelector:()=>null,getBoundingClientRect:()=>({top:100,height:32}),closest(selector){return selector==='[data-layer-drop]'?this:null;},removeAttribute(){}});}
 const shapes=[{id:3,parent_id:1},{id:4,parent_id:2},{id:5,parent_id:0}];
 const container={addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:selector=>selector==='[data-layer-drop]'?[...rows.values()]:[...rows.values()].filter(r=>[...r.classes].some(c=>selector.includes('.'+c))),querySelector:selector=>rows.get(Number(selector.match(/"(\d+)"/)[1])),getBoundingClientRect:()=>({top:0,bottom:500})};
 installLayerDrop(container,()=>{},{onDestinationChange:id=>destinations.push(id),destinationParent:(target,position)=>layerDropParent(shapes,target,position),canDrop:(_ids,target)=>target!==5});
 const event=id=>({target:rows.get(id),clientX:20,clientY:116,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){}}});
 handlers.dragstart(event(6));handlers.dragover(event(3));assert.ok(rows.get(1).classes.has('layer-drop-parent'));
 handlers.dragover(event(4));assert.equal(rows.get(1).classes.has('layer-drop-parent'),false);assert.ok(rows.get(2).classes.has('layer-drop-parent'));
 handlers.dragover(event(5));assert.equal(rows.get(2).classes.has('layer-drop-parent'),false);
 handlers.dragover(event(3));handlers.dragend();assert.equal(rows.get(1).classes.has('layer-drop-parent'),false);
 assert.deepEqual(destinations,[1,2,0,1,0]);
});
