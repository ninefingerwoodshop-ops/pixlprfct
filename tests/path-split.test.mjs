import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {fromPoints,anchors} from '../web/vectors.js';import {cubicPoint} from '../web/vector-edit.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>shapes(e).find(s=>s.id===id);
const nodes=[{x:10,y:20,out:{x:25,y:0}},{x:100,y:70,in:{x:75,y:10},out:{x:120,y:100}},{x:200,y:20,in:{x:170,y:90},out:{x:190,y:-30}}];
function near(a,b){assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-8);}
test('open path splitting preserves both cubic segments and one-step history',()=>{
 const e=new Editor(),id=e.insert(JSON.stringify(fromPoints('pen',nodes))),original=anchors(get(e,id)),before=e.snapshot(),ids=JSON.parse(e.split_path(id,1));assert.equal(ids.length,2);assert.equal(ids[0],id);
 ids.forEach((id,i)=>{const p=anchors(get(e,id));for(let t=0;t<=1;t+=.05)near(cubicPoint(p[0],p[1],t),cubicPoint(original[i],original[i+1],t));});
 const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);const copy=new Editor();copy.load(after);for(const id of ids){const a=anchors(get(e,id)),b=anchors(get(copy,id));a.forEach((p,i)=>{near(p,b[i]);near(p.in,b[i].in);near(p.out,b[i].out);});}e.free();copy.free();
});
test('opening closed paths duplicates the seam anchor and preserves every curved segment',()=>{
 const e=new Editor(),id=e.insert(JSON.stringify(fromPoints('pen',nodes,true))),original=anchors(get(e,id));assert.deepEqual(JSON.parse(e.split_path(id,1)),[id]);const shape=get(e,id),p=anchors(shape);assert.equal(shape.closed,false);assert.equal(p.length,4);near(p[0],p.at(-1));assert.equal(shape.appearance.fill_enabled,true);
 for(let i=0;i<3;i++)for(let t=0;t<=1;t+=.1)near(cubicPoint(p[i],p[i+1],t),cubicPoint(original[(i+1)%3],original[(i+2)%3],t));e.free();
});
test('invalid cuts and locked paths leave document and undo intact',()=>{
 const e=new Editor(),id=e.insert(JSON.stringify(fromPoints('pencil',nodes))),before=e.snapshot();for(const index of [0,2,99]){assert.throws(()=>e.split_path(id,index));assert.equal(e.snapshot(),before);}e.update(JSON.stringify({...get(e,id),locked:true}));const locked=e.snapshot();assert.throws(()=>e.split_path(id,1));assert.equal(e.snapshot(),locked);e.undo();assert.equal(e.snapshot(),before);e.free();
});
