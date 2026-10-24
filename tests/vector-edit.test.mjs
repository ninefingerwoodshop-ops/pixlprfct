import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {anchors,fromPoints,vectorSvg} from '../web/vectors.js';
import {cubicPoint,insertAnchor,deleteAnchor,convertAnchor,nearestSegment} from '../web/vector-edit.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const near=(a,b)=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,JSON.stringify({a,b}));
const curve=()=>fromPoints('pen',[{x:10,y:20,out:{x:160,y:-90}},{x:300,y:90,in:{x:100,y:240},out:{x:400,y:130}},{x:420,y:200,in:{x:390,y:180}}]);
test('inserting a cubic anchor preserves the entire curve and unrelated segments',()=>{
 const shape=curve(),original=anchors(shape),t=.37,changed=insertAnchor(shape,0,t),nodes=anchors(changed);assert.equal(nodes.length,4);
 for(let i=0;i<=100;i++){const u=i/100;near(cubicPoint(original[0],original[1],u),u<=t?cubicPoint(nodes[0],nodes[1],u/t):cubicPoint(nodes[1],nodes[2],(u-t)/(1-t)));near(cubicPoint(original[1],original[2],u),cubicPoint(nodes[2],nodes[3],u));}
 const p=cubicPoint(original[0],original[1],.6),nearest=nearestSegment(shape,p);assert.equal(nearest.segment,0);assert.ok(nearest.distance<.001);assert.ok(Math.abs(nearest.t-.6)<.0001);
});
test('closed seam insertion preserves closure and deletion respects minimum counts',()=>{
 const shape={...curve(),closed:true},old=anchors(shape),changed=insertAnchor(shape,2,.5),nodes=anchors(changed);
 assert.equal(changed.closed,true);near(cubicPoint(old[2],old[0],.25),cubicPoint(nodes[2],nodes[3],.5));near(cubicPoint(old[2],old[0],.75),cubicPoint(nodes[3],nodes[0],.5));
 assert.equal(deleteAnchor(changed,3).points.length,3);assert.throws(()=>deleteAnchor(shape,0));assert.throws(()=>deleteAnchor(fromPoints('line',[{x:0,y:0},{x:20,y:20}]),0));assert.match(vectorSvg(changed),/ Z/);
});
test('corner and smooth conversion preserve anchor positions, and topology edits undo and roundtrip',()=>{
 const s=curve(),smooth=convertAnchor(s,1,true),a=anchors(smooth)[1];near(a,anchors(s)[1]);const u={x:a.in.x-a.x,y:a.in.y-a.y},v={x:a.out.x-a.x,y:a.out.y-a.y};assert.ok(Math.abs(u.x*v.y-u.y*v.x)<1e-8);assert.ok(u.x*v.x+u.y*v.y<0);
 const corner=anchors(convertAnchor(smooth,1,false))[1];near(corner,corner.in);near(corner,corner.out);
 const e=new Editor();e.insert(JSON.stringify(s));const initial=e.snapshot(),shape=JSON.parse(initial).shapes[0];e.update(JSON.stringify(insertAnchor(shape,0,.5)));const added=e.snapshot();e.undo();assert.equal(e.snapshot(),initial);e.redo();assert.equal(e.snapshot(),added);
 const copy=new Editor();copy.load(added);assert.equal(copy.snapshot(),added);e.free();copy.free();
});
