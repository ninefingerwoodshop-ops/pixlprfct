import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {parsePath,arcCubics,parseTransform,transformPoint} from '../web/svg-path.js';
import {svgLayers} from '../web/svg-import.js';
import {anchors} from '../web/vectors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const node=(tag,attrs={},children=[])=>({tag,attrs,children});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('SVG path grammar preserves relative, repeated, cubic and quadratic commands',()=>{
 const [p]=parsePath('M1e1 20 l10-5 h20 v5 C50 30 60 30 70 20 s20-10 30 0 q15 30 30 0 t30 0');
 assert.deepEqual(p.points.slice(0,3).map(p=>[p.x,p.y]),[[10,20],[20,15],[40,15]]);
 assert.deepEqual(p.points[4].out,{x:80,y:10});
 assert.deepEqual(p.points[5].out,{x:110,y:40});
 assert.deepEqual(p.points[6].out,{x:140,y:0});
 assert.deepEqual(p.points.at(-1).in,{x:150,y:0});
 assert.equal(parsePath('M0 0 20 0 20 20z')[0].closed,true);
 const closed=parsePath('M0 0 C0 10 10 10 10 0 C10 -10 0 -10 0 0 Z')[0];assert.equal(closed.points.length,2);assert.deepEqual(closed.points[0].in,{x:0,y:-10});
 const reopened=parsePath('M0 0 C0 10 10 10 10 0 Z L20 20');assert.equal(reopened.length,2);assert.deepEqual(reopened[1].points[0],{x:0,y:0});
});
test('elliptical arcs become bounded cubic segments with accurate endpoints',()=>{
 const start={x:100,y:0},end={x:0,y:100},segments=arcCubics(start,100,100,0,0,1,end);assert.equal(segments.length,1);
 const {c1,c2}=segments[0];close(c1.x,100);close(c2.y,100);
 for(let i=0;i<=20;i++){const t=i/20,u=1-t,x=u*u*u*100+3*u*u*t*c1.x+3*u*t*t*c2.x,y=3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*100;assert.ok(Math.abs(Math.hypot(x,y)-100)<.028);}
 assert.deepEqual(segments[0].end,end);
 assert.equal(arcCubics(start,10,10,0,0,1,{x:-100,y:0}).length,2);
 const compact=parsePath('M100 0 A100 100 0 01100 100');assert.equal(compact[0].points.at(-1).x,100);
 assert.deepEqual(arcCubics(start,0,10,0,0,1,end),[{c1:start,c2:end,end}]);
});
test('SVG transforms compose in specification order and retain editable controls',()=>{
 const m=parseTransform('translate(10 20) rotate(90) scale(2)');const p=transformPoint({x:5,y:0},m);close(p.x,10);close(p.y,30);
 const center=transformPoint({x:20,y:30},parseTransform('rotate(45 20 30)'));close(center.x,20);close(center.y,30);
 const payload=svgLayers(node('svg',{viewBox:'0 0 100 100',width:'200',height:'200'},[node('g',{transform:'translate(10 10)',fill:'#f60',opacity:'.5'},[node('path',{d:'M0 0 Q10 20 20 0'})])]));
 const vector=payload.shapes.at(-1),points=anchors(vector);close(points[0].x,20);close(points[1].x,60);close(points[0].out.y,20+80/3);assert.equal(vector.fill,'#ff6600');assert.equal(payload.shapes[1].appearance.opacity,.5);
});
test('SVG import creates atomic editable frame trees with paints, clipping and history',()=>{
 const payload=svgLayers(node('svg',{viewBox:'10 20 200 100'},[node('rect',{id:'Card',x:'10',y:'20',width:'100',height:'80',rx:'10',fill:'#123456'}),node('g',{stroke:'blue',fill:'none','stroke-width':'2','stroke-linejoin':'round'},[node('circle',{cx:'160',cy:'60',r:'20'}),node('path',{d:'M20 30 L40 60 M60 30 L80 60'})])]),'Artwork');
 const e=new Editor(),before=e.snapshot(),ids=JSON.parse(e.paste_layers(JSON.stringify(payload),100,200,0));assert.equal(ids.length,1);
 const saved=e.snapshot(),doc=JSON.parse(saved);assert.equal(doc.shapes.length,6);assert.equal(doc.shapes[0].clip_content,true);assert.equal(doc.shapes[0].width,200);assert.equal(doc.shapes[1].kind,'pen');assert.equal(doc.shapes[1].fill,'#123456');assert.equal(doc.shapes[3].appearance.stroke_color,'#0000ff');
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),saved);const restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);e.free();restored.free();
});
test('unsupported artwork and malformed geometry fail before insertion',()=>{
 for(const child of [node('text'),node('path',{d:'M0 0 L10 0 Z M20 0 L30 0Z'}),node('rect',{width:'10',height:'10',fill:'url(#paint)'}),node('path',{d:'M0 0L10 10',onclick:'alert(1)'}),node('path',{d:'M0 0L10 10',stroke:'black',transform:'scale(2 1)'})])assert.throws(()=>svgLayers(node('svg',{},[child])));
 for(const data of ['L1 1','M0 0 L1','M0 0 A1 1 0 2 1 5 5','M0 0 X1 1','M0 0 L1e999 2'])assert.throws(()=>parsePath(data));
 assert.throws(()=>parsePath('M0 0 '+Array(4097).fill('L1 1').join(' ')));
 assert.throws(()=>parseTransform('translate(2) garbage'));
});
test('SVG default and inherited custom miter limits survive editable import',()=>{
 const payload=svgLayers(node('svg',{},[node('path',{d:'M0 80L10 0L20 80',fill:'none',stroke:'black'}),node('g',{'stroke-miterlimit':'2.5',stroke:'black',fill:'none'},[node('path',{d:'M30 80L40 0L50 80'})])]));
 const e=new Editor();e.paste_layers(JSON.stringify(payload),0,0,0);const shapes=JSON.parse(e.snapshot()).shapes;
 assert.equal(shapes[1].appearance.stroke_miter_limit,4);assert.equal(shapes[3].appearance.stroke_miter_limit,2.5);e.free();
});
