import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {dropParent,fullyEncloses} from '../web/scene.js';
import {worldShape} from '../web/rotation.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes;
const get=(e,id)=>all(e).find(s=>s.id===id);
const set=(e,id,patch)=>e.update(JSON.stringify({...get(e,id),...patch}));
function add(e,kind,x,y,width=30,height=30,patch={}){const id=e.add(kind,x,y);set(e,id,{width,height,...patch});return id;}
const templateEditor=new Editor(),templateId=templateEditor.add('frame',0,0),template=get(templateEditor,templateId);templateEditor.free();
const frame=(e,x,y,width,height,patch={})=>e.insert_enclosing_frame(JSON.stringify({...template,x,y,width,height,...patch}));
const pose=(e,id)=>{const s=worldShape(get(e,id),all(e));return [s.x,s.y,s.rotation,s.width,s.height];};
const close=(actual,expected)=>actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<1e-7,`${actual} != ${expected}`));

test('drawing a frame adopts fully enclosed sibling trees in one undo step',()=>{
 const e=new Editor(),a=add(e,'rectangle',20,20),b=add(e,'text',65,25),partial=add(e,'rectangle',190,20),locked=add(e,'rectangle',20,90,30,30,{locked:true}),hidden=add(e,'rectangle',70,90,30,30,{hidden:true});
 const inner=add(e,'frame',110,90,60,60),child=add(e,'rectangle',120,100,10,10);e.reparent_many(JSON.stringify([child]),inner);
 const before=e.snapshot(),f=frame(e,0,0,200,180);
 for(const id of [a,b,inner])assert.equal(get(e,id).parent_id,f);
 for(const id of [partial,locked,hidden])assert.equal(get(e,id).parent_id,0);
 assert.equal(get(e,child).parent_id,inner);assert.deepEqual([get(e,a).x,get(e,a).y],[20,20]);
 const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);
 const restored=new Editor();restored.load(after);assert.equal(restored.snapshot(),after);restored.free();e.free();
});

test('moving a frame carries its children once and captures stationary components and groups',()=>{
 const e=new Editor(),f=add(e,'frame',0,0,240,180),existing=add(e,'rectangle',10,10,20,20);e.reparent_many(JSON.stringify([existing]),f);
 const master=add(e,'frame',800,0,40,40),label=add(e,'text',805,5,20,20);e.reparent_many(JSON.stringify([label]),master);e.create_component(master);
 const instance=e.create_instance(master,330,30),instanceChild=all(e).find(s=>s.parent_id===instance).id;
 const a=add(e,'rectangle',400,30,20,20),b=add(e,'rectangle',430,60,20,20),group=e.group_many(JSON.stringify([a,b]));
 const stationary=[instance,instanceChild,group,a,b].map(id=>[id,pose(e,id)]),before=e.snapshot();
 e.move_and_enclose(JSON.stringify([{...get(e,f),x:300}]),0,true);
 assert.equal(get(e,existing).x,310);
 for(const id of [instance,group])assert.equal(get(e,id).parent_id,f);
 assert.equal(get(e,instanceChild).parent_id,instance);assert.equal(get(e,a).parent_id,group);
 for(const [id,original] of stationary)close(pose(e,id),original);
 const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);e.free();
});

test('rotated enclosure preserves the visible pose of nested trees and rejects protruding corners',()=>{
 const e=new Editor(),inner=add(e,'frame',420,380,35,35,{rotation:15}),child=add(e,'rectangle',425,385,10,10);e.reparent_many(JSON.stringify([child]),inner);
 const outside=add(e,'rectangle',390,400,30,30),before=[inner,child,outside].map(id=>[id,pose(e,id)]);
 const f=frame(e,400,400,200,200,{rotation:45});
 assert.equal(get(e,inner).parent_id,f);assert.equal(get(e,outside).parent_id,0);
 for(const [id,original] of before)close(pose(e,id),original);
 e.free();
});

test('enclosure stays within the parent and page and does not dismantle overlapping groups',()=>{
 const e=new Editor(),outer=add(e,'frame',0,0,500,500),a=add(e,'rectangle',50,50),b=add(e,'rectangle',400,400),group=e.group_many(JSON.stringify([a,b]));e.reparent_many(JSON.stringify([group]),outer);
 const sibling=add(e,'rectangle',70,70);e.reparent_many(JSON.stringify([sibling]),outer);
 const root=add(e,'rectangle',90,90),page=e.add_page('Other'),other=add(e,'rectangle',70,70);e.select_page(1);
 const f=frame(e,20,20,200,200,{parent_id:outer});
 assert.equal(get(e,sibling).parent_id,f);assert.equal(get(e,a).parent_id,group);assert.equal(get(e,group).parent_id,outer);assert.equal(get(e,root).parent_id,0);assert.equal(get(e,other).page_id,page);assert.equal(get(e,other).parent_id,0);e.free();
});

test('moving protected component roots never captures unrelated layers; captured mains stay linked',()=>{
 const e=new Editor(),master=add(e,'frame',0,0,100,100);e.create_component(master);const instance=e.create_instance(master,400,0),a=add(e,'rectangle',220,20),b=add(e,'rectangle',620,20);
 e.move_and_enclose(JSON.stringify([{...get(e,master),x:200}]),0,true);assert.equal(get(e,a).parent_id,0);
 e.move_and_enclose(JSON.stringify([{...get(e,instance),x:600}]),0,true);assert.equal(get(e,b).parent_id,0);
 const f=frame(e,190,-10,520,130);assert.equal(get(e,master).parent_id,f);assert.equal(get(e,instance).parent_id,f);assert.equal(get(e,master).component.type,'master');assert.equal(get(e,instance).component.master,master);e.free();
});

test('co-dragged frames keep their relationship and frontmost frame wins shared candidates',()=>{
 const e=new Editor(),a=add(e,'frame',0,0,200,200),b=add(e,'frame',20,20,140,140),target=add(e,'rectangle',340,40);
 e.move_and_enclose(JSON.stringify([{...get(e,a),x:300},{...get(e,b),x:320}]),0,true);
 assert.equal(get(e,a).parent_id,0);assert.equal(get(e,b).parent_id,0);assert.equal(get(e,target).parent_id,b);e.free();
});

test('a click or programmatic insert/move does not trigger canvas enclosure',()=>{
 const e=new Editor(),f=add(e,'frame',0,0,200,200),a=add(e,'rectangle',20,20),before=e.snapshot();
 e.move_and_enclose(JSON.stringify([get(e,f)]),0,true);assert.equal(e.snapshot(),before);
 e.move_into(JSON.stringify([{...get(e,f),x:1}]),0);assert.equal(get(e,a).parent_id,0);
 const snapshot=e.snapshot();assert.throws(()=>e.insert_enclosing_frame(JSON.stringify({...template,kind:'rectangle'})));assert.equal(e.snapshot(),snapshot);e.free();
});

test('drop targets never put an enclosing frame inside its captured frame',()=>{
 const e=new Editor(),outer=add(e,'frame',0,0,800,800),small=add(e,'frame',320,320,60,60),moved=add(e,'frame',1000,0,200,200);e.reparent_many(JSON.stringify([small]),outer);
 const preview={...get(e,moved),x:250,y:250};assert.ok(fullyEncloses(preview,get(e,small)));
 assert.equal(dropParent(all(e),[preview],[moved]),outer);
 assert.equal(fullyEncloses({...preview,rotation:45},get(e,small)),false);e.free();
});
