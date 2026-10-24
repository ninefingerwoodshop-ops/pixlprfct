import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {svgLayers} from '../web/svg-import.js';
import {pathBounds} from '../web/svg-gradients.js';
import {parsePath,parseTransform,transformPoint} from '../web/svg-path.js';
import {gradientGeometry} from '../web/gradients.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const n=(tag,attrs={},children=[])=>({tag,attrs,children}),stop=(offset,color,opacity='1')=>n('stop',{offset,'stop-color':color,'stop-opacity':opacity});
const gradient=(attrs={},stops=[stop('0','#ff0000'),stop('100%','#0000ff')])=>n('linearGradient',{id:'g',...attrs},stops);
const tree=(g,shape)=>n('svg',{width:'400',height:'200'},[n('defs',{},Array.isArray(g)?g:[g]),shape]);
const rect=(attrs={})=>n('rect',{x:'20',y:'30',width:'200',height:'100',fill:'url(#g)',...attrs});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('SVG object bounding gradients use curve extrema and preserve stops through Rust history',()=>{
 const paths=parsePath('M0 0 C0 100 100 100 100 0 Z');assert.deepEqual(pathBounds(paths),{x:0,y:0,width:100,height:75});
 const payload=svgLayers(tree(gradient({x2:'0%',y2:'100%'},[stop('0','#ff0000','.25'),stop('.6','#00ff00'),stop('100%','#0000ff','.8')]),n('path',{d:'M0 0 C0 100 100 100 100 0 Z',fill:'url(#g)'})));
 const shape=payload.shapes[1],g=shape.appearance.gradient;close(g.end[1],.75);assert.equal(g.stops[0].opacity,.25);
 const e=new Editor(),before=e.snapshot();e.paste_layers(JSON.stringify(payload),0,0,0);const saved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),saved);const loaded=new Editor();loaded.load(saved);assert.equal(loaded.snapshot(),saved);e.free();loaded.free();
});
test('nonuniform and skew transforms preserve gradient color parameters, not just endpoints',()=>{
 const transform='translate(15 10) skewX(25) scale(1.4 .8)';
 const payload=svgLayers(tree(gradient({x1:'0',y1:'0',x2:'1',y2:'1',gradientTransform:'rotate(15 .5 .5)'}),rect({transform}))),s=payload.shapes[1],p=gradientGeometry(s,s.appearance.gradient);
 const matrix=parseTransform(transform),gm=parseTransform('rotate(15 .5 .5)');
 for(const q of [{x:.2,y:.3},{x:.9,y:.1},{x:.4,y:.8}]){
  const local=transformPoint(q,gm),world=transformPoint({x:20+200*local.x,y:30+100*local.y},matrix),dx=p.end[0]-p.start[0],dy=p.end[1]-p.start[1];
  const t=((world.x-p.start[0])*dx+(world.y-p.start[1])*dy)/(dx*dx+dy*dy);close(t,(q.x+q.y)/2);
 }
});
test('gradient references inherit geometry and stops while resolving colors from the definition',()=>{
 const base=gradient({id:'base',color:'red'},[n('stop',{offset:'0','stop-color':'currentColor'}),stop('1','blue')]);
 const copy=gradient({href:'#base',color:'green',gradientUnits:'userSpaceOnUse',x1:'20',y1:'30',x2:'220',y2:'30'},[]);
 const s=svgLayers(tree([base,copy],rect({color:'pink'}))).shapes[1],g=s.appearance.gradient;
 assert.equal(g.stops[0].color,'#008000');assert.deepEqual(g.start,[0,0]);assert.deepEqual(g.end,[1,0]);
});
test('single stops, offset clamping, zero-length vectors and invalid references are explicit',()=>{
 const s=svgLayers(tree(gradient({},[stop('80%','red'),stop('20%','blue')]),rect())).shapes[1];assert.deepEqual(s.appearance.gradient.stops.map(s=>s.position),[.8,.8]);
 const single=svgLayers(tree(gradient({},[stop('.4','red','.5')]),rect())).shapes[1];assert.deepEqual(single.appearance.gradient.stops.map(s=>s.opacity),[.5,.5]);
 const zero=svgLayers(tree(gradient({x1:'0',y1:'0',x2:'0',y2:'0'}),rect())).shapes[1];assert.ok(zero.appearance.gradient.stops.every(s=>s.color==='#0000ff'));
 for(const g of [gradient({href:'#g'}),gradient({href:'https://example.com/a.svg#g'}),gradient({spreadMethod:'repeat'}),gradient({gradientTransform:'scale(0)'}),gradient({},Array(17).fill(stop('0','red'))),n('radialGradient',{id:'g'},[])])assert.throws(()=>svgLayers(tree(g,rect())));
});
