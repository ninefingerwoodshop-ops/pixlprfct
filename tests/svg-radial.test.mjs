import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {svgLayers} from '../web/svg-import.js';
import {radialGeometry,gradientSvg,moveGradientPoint} from '../web/gradients.js';
import {parseTransform,multiply,transformPoint} from '../web/svg-path.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const n=(tag,attrs={},children=[])=>({tag,attrs,children});
const scene=(attrs={},transform='')=>n('svg',{width:'400',height:'200'},[n('defs',{},[n('radialGradient',{id:'g',...attrs},[n('stop',{offset:'0','stop-color':'red'}),n('stop',{offset:'1','stop-color':'blue'})])]),n('rect',{x:'20',y:'30',width:'200',height:'100',fill:'url(#g)',transform})]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('radial import preserves affine geometry and off-center focal circles through Rust history',()=>{
 const transform='translate(10 15) skewX(20) scale(1.2 .8)',gt='rotate(25 .5 .5)',payload=svgLayers(scene({gradientTransform:gt,fx:'.3',fy:'.4',fr:'.1'},transform)),s=payload.shapes[1],g=s.appearance.gradient,r=radialGeometry(g);
 const m=multiply(multiply(parseTransform(transform),[200,0,0,100,20,30]),parseTransform(gt));
 for(const q of [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:-.3,y:.6}]){const expected=transformPoint({x:.5+.5*q.x,y:.5+.5*q.y},m),actual=transformPoint(q,r.matrix);near(s.x+actual.x*s.width,expected.x);near(s.y+actual.y*s.height,expected.y);}
 near(r.focal[0],-.4);near(r.focal[1],-.2);near(r.focalRadius,.2);
 const e=new Editor();e.paste_layers(JSON.stringify(payload),0,0,0);const saved=e.snapshot();e.undo();e.redo();assert.equal(e.snapshot(),saved);const other=new Editor();other.load(saved);assert.equal(other.snapshot(),saved);e.free();other.free();
});
test('radial user-space percentages use normalized viewport diagonal and zero radius is solid',()=>{
 const s=svgLayers(scene({gradientUnits:'userSpaceOnUse',cx:'100',cy:'60',r:'50%'})).shapes[1],m=radialGeometry(s.appearance.gradient).matrix;near(m[0]*s.width,Math.hypot(400,200)/Math.SQRT2*.5);near(m[3]*s.height,m[0]*s.width);
 const zero=svgLayers(scene({r:'0'})).shapes[1];assert.ok(zero.appearance.gradient.stops.every(x=>x.color==='#0000ff'));
 assert.throws(()=>svgLayers(scene({r:'-.2'})));assert.throws(()=>svgLayers(scene({fr:'.8',r:'.5'})));
});
test('SVG export retains affine/focal geometry and endpoint editing rotates the radial basis',()=>{
 const s=svgLayers(scene({gradientTransform:'skewX(20)',fx:'.25'})).shapes[1],g=s.appearance.gradient,svg=gradientSvg(s);assert.match(svg,/fx="-0.5"/);assert.match(svg,/matrix\(/);
 const edited=moveGradientPoint(g,'end',[g.start[0],g.start[1]+.8]),m=radialGeometry(edited).matrix;near(m[0],0);near(m[1],.8);assert.deepEqual(edited.focal,g.focal);
});
test('invalid radial matrices reject without mutating documents',()=>{
 const payload=svgLayers(scene()),e=new Editor();e.paste_layers(JSON.stringify(payload),0,0,0);const saved=e.snapshot(),s=JSON.parse(saved).shapes.find(s=>s.appearance?.gradient);
 for(const patch of [{radial_transform:[1,0,2,0]},{focal_radius:-1},{focal:[100,0]}]){assert.throws(()=>e.update(JSON.stringify({...s,appearance:{...s.appearance,gradient:{...s.appearance.gradient,...patch}}})));assert.equal(e.snapshot(),saved);}e.free();
});
