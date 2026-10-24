import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {defaultGuide,guideGeometry} from '../web/layout-guides.js';
import {scaleShapes} from '../web/scaling.js';
import {svgDocument} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('columns and rows resolve stretch, fixed alignment, resize and hidden guides',()=>{
 const f={x:10,y:20,width:400,height:200},g={...defaultGuide(),count:4,gutter:20,margin:10};
 assert.deepEqual(guideGeometry(f,g).map(r=>[r.x,r.width]),[[20,80],[120,80],[220,80],[320,80]]);
 assert.equal(guideGeometry({...f,width:600},g)[0].width,130);
 assert.deepEqual(guideGeometry(f,{...g,kind:'rows',alignment:'end',size:20}).map(r=>r.y),[70,110,150,190]);
 assert.equal(guideGeometry(f,{...g,alignment:'center',size:20})[0].x,140);
 assert.deepEqual(guideGeometry(f,{...g,visible:false}),[]);assert.deepEqual(guideGeometry({...f,width:10},g),[]);
});
test('square grid geometry stays bounded at tiny spacing and low zoom',()=>{
 const f={x:0,y:0,width:100,height:80},g={...defaultGuide(),kind:'grid',size:20};assert.equal(guideGeometry(f,g).length,11);
 assert.deepEqual(guideGeometry(f,g,.1),[]);assert.deepEqual(guideGeometry({...f,width:1e6,height:1e6},{...g,size:1},10),[]);
});
test('guides persist, duplicate, scale, undo and stay out of SVG exports',()=>{
 const e=new Editor(),f=e.add('frame',0,0),before=e.snapshot();edit(e,f,{layout_grids:[defaultGuide()]});const saved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),saved);
 const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);const ids=JSON.parse(e.duplicate_many(JSON.stringify([f])));assert.deepEqual(get(e,ids[0]).layout_grids,get(e,f).layout_grids);
 const scaled=scaleShapes([get(e,f)],{x:0,y:0},2)[0];assert.equal(scaled.layout_grids[0].size,128);assert.equal(scaled.layout_grids[0].gutter,32);assert.equal(scaled.layout_grids[0].count,4);
 const s=get(e,f),without={...s,layout_grids:[]};assert.equal(svgDocument([s],s,1,null,()=>{}),svgDocument([without],without,1,null,()=>{}));copy.free();e.free();
});
test('guide validation is atomic and component overrides retain independent guides',()=>{
 const e=new Editor(),f=e.add('frame',0,0);edit(e,f,{layout_grids:[defaultGuide()]});e.create_component(f);const i=e.create_instance(f,400,0);edit(e,i,{layout_grids:[{...defaultGuide(),count:6}]});edit(e,f,{layout_grids:[{...defaultGuide(),color:'#0000ff'}]});assert.equal(get(e,i).layout_grids[0].count,6);e.reset_override(i,'layout_grids');assert.equal(get(e,i).layout_grids[0].color,'#0000ff');
 const before=e.snapshot();for(const patch of [{count:0},{count:257},{size:0},{opacity:2},{gutter:-1},{alignment:'other'},{color:'bad'},{kind:'other'}]){assert.throws(()=>edit(e,f,{layout_grids:[{...defaultGuide(),...patch}]}));assert.equal(e.snapshot(),before);}
 assert.throws(()=>edit(e,f,{layout_grids:Array(9).fill(defaultGuide())}));const r=e.add('rectangle',0,0);assert.throws(()=>edit(e,r,{layout_grids:[defaultGuide()]}));assert.deepEqual(get(e,r).layout_grids,[]);e.free();
});
