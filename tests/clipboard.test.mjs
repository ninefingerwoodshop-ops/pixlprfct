import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {layerPayload,pasteOffset,createPasteContext} from '../web/clipboard.js';
import {drawnShape,fromPoints} from '../web/vectors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
function clipboardHarness(e){
 const context=createPasteContext();let ids=[],text='';
 const select=next=>{ids=next;context.select(ids);};
 return{context,select,copy(next){select(next);text=e.copy_layers(JSON.stringify(ids));context.copy(text,ids);},paste(options){
  const placement=context.placement(text,layerPayload(text),shapes(e),ids,options);
  const result=JSON.parse(placement.frames?e.paste_into_frames(text,JSON.stringify(placement.frames)):e.paste_layers(text,placement.offset.x,placement.offset.y,placement.parent));
  select(result);context.paste(text,result,placement.frames);return result;
 }};
}

test('copy and repeated paste keep every object kind beside its source; selecting a container or background changes the parent',()=>{
 for(const kind of ['rectangle','ellipse','text','line','arrow','star','polygon','pen','pencil','image','frame','group']){
  const e=new Editor(),outer=e.add('frame',0,0),destination=e.add('frame',600,100);
  let source;
  if(kind==='group'){const child=e.add('text',20,30);source=e.group_many(JSON.stringify([child]));}
  else if(['line','arrow','star','polygon'].includes(kind))source=e.insert(JSON.stringify(drawnShape(kind,{x:20,y:30},{x:120,y:130})));
  else if(['pen','pencil'].includes(kind))source=e.insert(JSON.stringify(fromPoints(kind,[{x:20,y:30},{x:70,y:80},{x:120,y:30}])));
  else if(kind==='image')source=e.insert(JSON.stringify({id:0,kind,name:'Image',x:20,y:30,width:100,height:100,fill:'#ffffff',text:'',hidden:false,image:{data_url:'data:image/png;base64,AAAA',width:1,height:1,mode:'fill',zoom:1,offset_x:.5,offset_y:.5}}));
  else source=e.add(kind,20,30);
  e.reparent_many(JSON.stringify([source]),outer);
  if(kind==='frame'){const child=e.add('text',30,40);e.reparent_many(JSON.stringify([child]),source);}
  const clipboard=clipboardHarness(e);clipboard.copy([source]);
  const before=e.snapshot(),[first]=clipboard.paste(),[second]=clipboard.paste();
  for(const id of [first,second])assert.equal(shapes(e).find(s=>s.id===id).parent_id,outer,kind);
  assert.equal(shapes(e).find(s=>s.id===second).x,shapes(e).find(s=>s.id===first).x+24,kind);
  if(['frame','group'].includes(kind))assert.equal(shapes(e).filter(s=>s.parent_id===first).length,1,kind);
  e.undo();e.undo();assert.equal(e.snapshot(),before,kind);e.redo();e.redo();
  clipboard.select([destination]);const [inside]=clipboard.paste(),[again]=clipboard.paste();
  for(const id of [inside,again])assert.equal(shapes(e).find(s=>s.id===id).parent_id,destination,kind);
  assert.equal(shapes(e).find(s=>s.id===inside).x,616,kind);
  assert.equal(shapes(e).find(s=>s.id===again).x,640,kind);
  clipboard.select([]);const [root]=clipboard.paste();assert.equal(shapes(e).find(s=>s.id===root).parent_id,0,kind);
  e.free();
 }
});

test('a newly selected leaf anchors siblings in its own group and a newly selected group accepts children',()=>{
 const e=new Editor(),frame=e.add('frame',0,0),leaf=e.add('ellipse',520,120),group=e.group_many(JSON.stringify([leaf])),source=e.add('text',20,30);
 e.reparent_many(JSON.stringify([group,source]),frame);
 const clipboard=clipboardHarness(e);clipboard.copy([source]);clipboard.select([leaf]);
 const [sibling]=clipboard.paste();assert.equal(shapes(e).find(s=>s.id===sibling).parent_id,group);
 clipboard.select([group]);const [child]=clipboard.paste();assert.equal(shapes(e).find(s=>s.id===child).parent_id,group);
 e.free();
});

test('copied frame selections paste once as siblings; different destination frames still support multiple targets',()=>{
 const e=new Editor(),parent=e.add('frame',0,0),a=e.add('frame',20,30),b=e.add('frame',220,30),targetA=e.add('frame',600,100),targetB=e.add('frame',1000,100);
 e.reparent_many(JSON.stringify([a,b]),parent);
 const clipboard=clipboardHarness(e);clipboard.copy([a,b]);
 for(let i=0;i<2;i++){const ids=clipboard.paste();assert.equal(ids.length,2);assert.ok(ids.every(id=>shapes(e).find(s=>s.id===id).parent_id===parent));}
 clipboard.select([targetA,targetB]);const ids=clipboard.paste();assert.equal(ids.length,4);
 assert.deepEqual(ids.map(id=>shapes(e).find(s=>s.id===id).parent_id),[targetA,targetA,targetB,targetB]);
 const repeated=clipboard.paste();assert.deepEqual(repeated.map(id=>shapes(e).find(s=>s.id===id).parent_id),[targetA,targetA,targetB,targetB]);e.free();
});

test('reselecting a pasted container after leaving it makes it a destination, and new documents forget source IDs',()=>{
 const e=new Editor(),source=e.add('frame',0,0),clipboard=clipboardHarness(e);clipboard.copy([source]);
 const [pasted]=clipboard.paste();clipboard.select([]);clipboard.select([pasted]);
 const [child]=clipboard.paste();assert.equal(shapes(e).find(s=>s.id===child).parent_id,pasted);
 clipboard.context.reset();clipboard.select([source]);const [afterReset]=clipboard.paste();
 assert.equal(shapes(e).find(s=>s.id===afterReset).parent_id,source);e.free();
});

test('paste over selection retains its original alignment and nesting',()=>{
 const e=new Editor(),parent=e.add('frame',0,0),source=e.add('frame',20,30),target=e.add('rectangle',200,100);
 e.reparent_many(JSON.stringify([source,target]),parent);
 const clipboard=clipboardHarness(e);clipboard.copy([source]);clipboard.select([target]);
 const [id]=clipboard.paste({overSelection:true}),shape=shapes(e).find(s=>s.id===id);
 assert.deepEqual([shape.parent_id,shape.x,shape.y],[parent,200,100]);e.free();
});
test('clipboard transfers frame trees and groups across documents with fresh identities and atomic history',()=>{
 const source=new Editor(),f=source.add('frame',10,20),a=source.add('text',20,30),b=source.add('rectangle',30,50);source.reparent_many(JSON.stringify([a,b]),f);source.group_many(JSON.stringify([a,b]));
 const payload=source.copy_layers(JSON.stringify([f]));const dest=new Editor();dest.add('ellipse',400,400);const before=dest.snapshot();const ids=JSON.parse(dest.paste_layers(payload,100,200,0));assert.equal(ids.length,1);const copied=shapes(dest).filter(s=>s.id!==1);assert.equal(copied.length,4);assert.deepEqual(copied.map(s=>[s.x,s.y]),[[110,220],[120,230],[120,230],[130,250]]);assert.equal(copied[1].parent_id,copied[0].id);assert.equal(copied[1].kind,'group');assert.equal(copied[2].parent_id,copied[1].id);assert.equal(copied[3].parent_id,copied[1].id);assert.notEqual(copied[0].id,f);
 dest.undo();assert.equal(dest.snapshot(),before);dest.redo();const again=JSON.parse(dest.paste_layers(payload,0,0,0));assert.notEqual(again[0],ids[0]);const copy=new Editor();copy.load(dest.snapshot());assert.equal(copy.snapshot(),dest.snapshot());source.free();dest.free();copy.free();
});
test('copying a child detaches external parent; paste validates the entire payload and target atomically',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('rectangle',20,20);e.reparent_many(JSON.stringify([c]),f);const payload=e.copy_layers(JSON.stringify([c]));assert.equal(JSON.parse(payload).shapes[0].parent_id,0);
 const page=e.add_page(),target=e.add('frame',100,100),before=e.snapshot();
 for(const text of [JSON.stringify({...JSON.parse(payload),version:99}),JSON.stringify({...JSON.parse(payload),shapes:[{...JSON.parse(payload).shapes[0],parent_id:999}]}),JSON.stringify({...JSON.parse(payload),shapes:[...JSON.parse(payload).shapes,...JSON.parse(payload).shapes]})]){assert.throws(()=>e.paste_layers(text,0,0,target));assert.equal(e.snapshot(),before);}
 assert.throws(()=>e.paste_layers(payload,0,0,f));assert.equal(e.snapshot(),before);const roots=JSON.parse(e.paste_layers(payload,100,100,target));const pasted=shapes(e).find(s=>s.id===roots[0]);assert.equal(pasted.page_id,page);assert.equal(pasted.parent_id,target);e.free();
});
test('paste positioning supports frame inset, over selection, and repeated canvas offsets',()=>{
 const payload={format:'pixlprfct.layers',version:1,shapes:[{x:20,y:30,parent_id:0},{x:30,y:40,parent_id:1}]};assert.deepEqual(layerPayload(JSON.stringify(payload)),payload);assert.equal(layerPayload('hello'),null);
 assert.deepEqual(pasteOffset(payload,{x:100,y:200}),{x:96,y:186});assert.deepEqual(pasteOffset(payload,{x:100,y:200},true),{x:80,y:170});assert.deepEqual(pasteOffset(payload,null,false,3),{x:72,y:72});
});

test('pasting a main component creates a linked instance with children and atomic undo',()=>{
 const e=new Editor(),main=e.add('frame',0,0),text=e.add('text',8,8);e.reparent_many(JSON.stringify([text]),main);e.create_component(main);
 const payload=e.copy_layers(JSON.stringify([main])),before=e.snapshot();
 const [id]=JSON.parse(e.paste_layers(payload,200,0,0));
 assert.deepEqual(shapes(e).find(s=>s.id===id).component,{type:'instance',master:main,source:main,overrides:[]});
 const child=shapes(e).find(s=>s.parent_id===id);assert.equal(child.component.source,text);
 e.undo();assert.equal(e.snapshot(),before);e.redo();
 e.update(JSON.stringify({...shapes(e).find(s=>s.id===text),text:'Updated label'}));assert.equal(shapes(e).find(s=>s.id===child.id).text,'Updated label');
 const [again]=JSON.parse(e.paste_layers(e.copy_layers(JSON.stringify([id])),200,100,0));assert.equal(shapes(e).find(s=>s.id===again).component.master,main);
 e.add_page();const [otherPage]=JSON.parse(e.paste_layers(payload,0,0,0));assert.equal(shapes(e).find(s=>s.id===otherPage).component.master,main);
 e.free();
});
test('component paste into frames and replace retain links; cross-document IDs do not link',()=>{
 const e=new Editor(),main=e.add('frame',0,0);e.create_component(main);const payload=e.copy_layers(JSON.stringify([main]));
 const target=e.add('frame',300,0);const ids=JSON.parse(e.paste_into_frames(payload,JSON.stringify([target])));assert.equal(shapes(e).find(s=>s.id===ids[0]).component.master,main);
 const rect=e.add('rectangle',600,0);const replaced=JSON.parse(e.paste_replace(payload,JSON.stringify([rect])));assert.equal(shapes(e).find(s=>s.id===replaced[0]).component.master,main);
 const other=new Editor(),unrelated=other.add('frame',0,0);other.create_component(unrelated);const pasted=JSON.parse(other.paste_layers(payload,200,0,0));assert.equal(shapes(other).find(s=>s.id===pasted[0]).component,null);other.free();e.free();
});
