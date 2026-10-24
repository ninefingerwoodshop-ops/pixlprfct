import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {svgLayers} from '../web/svg-import.js';
import {anchors} from '../web/vectors.js';
import {gradientGeometry} from '../web/gradients.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const n=(tag,attrs={},children=[])=>({tag,attrs,children});
const root=(definitions,uses)=>n('svg',{width:'400',height:'200'},[n('defs',{},definitions),...uses]);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('SVG use clones shapes and groups with independent identity, inherited paints and transform order',()=>{
 const tree=root([n('g',{id:'mark'},[n('path',{d:'M0 0 L10 0 L10 10Z',fill:'currentColor'}),n('circle',{cx:'5',cy:'5',r:'2',fill:'white'})])],[n('use',{href:'#mark',x:'20',y:'30',color:'red',opacity:'.5'}),n('use',{'xlink:href':'#mark',x:'50',color:'blue',transform:'scale(2)'})]);
 const payload=svgLayers(tree),vectors=payload.shapes.filter(s=>s.kind==='pen');assert.equal(vectors.length,4);assert.equal(vectors[0].fill,'#ff0000');assert.equal(vectors[2].fill,'#0000ff');assert.equal(anchors(vectors[0])[0].x,20);assert.equal(anchors(vectors[2])[0].x,100);assert.equal(payload.shapes[1].appearance.opacity,.5);
 assert.equal(new Set(payload.shapes.map(s=>s.id)).size,payload.shapes.length);
 const e=new Editor(),before=e.snapshot();e.paste_layers(JSON.stringify(payload),0,0,0);const saved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),saved);const copy=new Editor();copy.load(saved);assert.equal(copy.snapshot(),saved);e.free();copy.free();
});
test('nested references compose translations without carrying source-ancestor paint',()=>{
 const tree=root([n('rect',{id:'tile',width:'10',height:'20'}),n('use',{id:'shifted',href:'#tile',x:'5',y:'7'})],[n('use',{href:'#shifted',x:'20',y:'30',fill:'green'}),n('use',{href:'#shifted',x:'80',fill:'purple'})]);
 const v=svgLayers(tree).shapes.filter(s=>s.kind==='pen');assert.equal(v[0].x,25);assert.equal(v[0].y,37);assert.equal(v[0].fill,'#008000');assert.equal(v[1].x,85);assert.equal(v[1].fill,'#800080');
});
test('symbol viewports retain meet/slice alignment, clipping, percentages and local gradients',()=>{
 const defs=[n('linearGradient',{id:'g',gradientUnits:'userSpaceOnUse',x1:'0%',x2:'100%'},[n('stop',{offset:'0','stop-color':'black'}),n('stop',{offset:'1','stop-color':'white'})]),n('symbol',{id:'tile',viewBox:'0 0 20 10'},[n('rect',{width:'20',height:'10',fill:'url(#g)'})])];
 const payload=svgLayers(root(defs,[n('use',{href:'#tile',x:'30',y:'20',width:'25%',height:'100'})]));
 const symbol=payload.shapes[2],s=payload.shapes[3];assert.equal(symbol.width,100);assert.equal(symbol.height,100);assert.equal(symbol.clip_content,true);close(s.x,30);close(s.y,45);close(s.width,100);close(s.height,50);
 const p=gradientGeometry(s,s.appearance.gradient);close(p.start[0],30);close(p.end[0],130);
 defs[1].attrs.preserveAspectRatio='xMidYMid slice';const sliced=svgLayers(root(defs,[n('use',{href:'#tile',width:'100',height:'100'})])).shapes;close(sliced[3].x,-50);close(sliced[3].width,200);assert.equal(sliced[2].clip_content,true);
 const e=new Editor();e.paste_layers(JSON.stringify({format:'pixlprfct.layers',version:1,shapes:sliced}),0,0,0);e.free();
});
test('use rejects missing, external, cyclic and oversized expansions before mutation',()=>{
 for(const tree of [root([],[n('use',{href:'#missing'})]),root([],[n('use',{href:'https://example.com/a.svg#x'})]),root([n('g',{id:'a'},[n('use',{href:'#a'})])],[n('use',{href:'#a'})]),root([n('symbol',{id:'s',viewBox:'0 0 10 10'},[n('rect',{width:'10',height:'10'})])],[n('use',{href:'#s',transform:'rotate(20)',width:'10',height:'10'})])])assert.throws(()=>svgLayers(tree));
 const defs=[n('rect',{id:'a0',width:'10',height:'10'})];for(let i=1;i<=14;i++)defs.push(n('g',{id:'a'+i},[n('use',{href:'#a'+(i-1)}),n('use',{href:'#a'+(i-1)})]));assert.throws(()=>svgLayers(root(defs,[n('use',{href:'#a14'})])),/too large/);
});
