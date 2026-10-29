import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {worldShape,worldPoint,shapeToLocal,rotateFromDrag} from '../web/rotation.js';
import {compileCssScene} from '../web/css-renderer.js';
import {svgDocument,exportBounds} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),set=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const kind of ['frame','group'])test(`${kind} rotates contents, retains local geometry and round trips undo/save`,()=>{
 const e=new Editor(),a=e.add('rectangle',40,50);set(e,a,{width:80,height:30});
 let p;if(kind==='frame'){p=e.add('frame',20,20);set(e,p,{width:200,height:150});e.reparent_many(JSON.stringify([a]),p);}else p=e.group_many(JSON.stringify([a]));
 const child=get(e,a),before=e.snapshot();set(e,p,{rotation:90});
 const scene=all(e),pose=worldShape(get(e,a),scene),center=worldPoint(pose,{x:pose.x+40,y:pose.y+15});
 near(get(e,a).x,child.x);near(get(e,a).y,child.y);assert.equal(e.hit_test(center.x,center.y),a);
 const css=compileCssScene(scene);assert.match(css.css,/transform:rotate\(-90deg\)/);
 const svg=svgDocument(scene,exportBounds(scene),1,null,()=>({lines:[],style:{}}));assert.match(svg,/rotate\(-90/);
 const saved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),saved);const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);e.free();copy.free();
});
test('nested rotation composes once and converts edits back to parent space',()=>{
 const shapes=[{id:1,parent_id:0,x:30,y:40,width:200,height:100,rotation:30},{id:2,parent_id:1,x:50,y:60,width:100,height:50,rotation:-15},{id:3,parent_id:2,x:70,y:80,width:30,height:20,rotation:10}];
 const pose=worldShape(shapes[2],shapes);assert.equal(pose.rotation,25);const back=shapeToLocal(pose,shapes);near(back.x,70);near(back.y,80);near(back.rotation,10);
 const rotated=rotateFromDrag(pose,{x:200,y:80},{x:100,y:180},true);const local=shapeToLocal(rotated,shapes);near(worldShape(local,shapes).rotation,rotated.rotation);
});
test('auto-layout frame rotation retains flow and local sizing on resize',()=>{
 const e=new Editor(),a=e.add('rectangle',40,50),b=e.add('rectangle',200,50),p=e.auto_layout_selection(JSON.stringify([a,b]));
 const before=all(e).filter(s=>s.parent_id===p).map(s=>[s.id,s.width,s.height]);set(e,p,{rotation:45});assert.deepEqual(all(e).filter(s=>s.parent_id===p).map(s=>[s.id,s.width,s.height]),before);
 set(e,p,{width:500,auto_layout:{...get(e,p).auto_layout,hug_width:false}});assert.equal(get(e,p).rotation,45);assert.equal(get(e,p).width,500);e.free();
});

test('inspector quarter turns preserve the visual center and dimensions for every layer kind',async()=>{
 const {rotateQuarterTurn}=await import('../web/rotation.js');
 for(const kind of ['rectangle','frame','group','text','image','ellipse','pen']){
  const original={kind,x:70,y:90,width:140,height:60,rotation:33,layout_item:{fill_width:true,fill_height:true}};
  let shape=original;const center=worldPoint(original,{x:140,y:120});
  for(let turn=0;turn<4;turn++){
   shape=rotateQuarterTurn(shape);const next=worldPoint(shape,{x:shape.x+70,y:shape.y+30});
   near(next.x,center.x);near(next.y,center.y);assert.equal(shape.width,140);assert.equal(shape.height,60);
   assert.equal(shape.layout_item.fill_width,false);assert.equal(shape.layout_item.fill_height,false);
  }
  near(shape.x,original.x);near(shape.y,original.y);near(shape.rotation,original.rotation);
 }
});

test('inspector frame rotation retains child geometry through undo and save',async()=>{
 const {rotateQuarterTurn}=await import('../web/rotation.js');const e=new Editor();
 const frame=e.add('frame',50,70),child=e.add('rectangle',80,100);e.reparent_many(JSON.stringify([child]),frame);
 const before=e.snapshot(),s=get(e,frame),center=worldPoint(s,{x:s.x+s.width/2,y:s.y+s.height/2});
 e.update(JSON.stringify(rotateQuarterTurn(s)));const next=get(e,frame),after=e.snapshot();
 const actual=worldPoint(next,{x:next.x+next.width/2,y:next.y+next.height/2});near(center.x,actual.x);near(center.y,actual.y);
 assert.equal(get(e,child).parent_id,frame);assert.equal(get(e,child).width,JSON.parse(before).shapes.find(s=>s.id===child).width);
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);const copy=new Editor();copy.load(after);assert.equal(copy.snapshot(),after);e.free();copy.free();
});
