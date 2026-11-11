import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {svgLayers} from '../web/svg-import.js';
import {parseSvgCss,matchSvgCss} from '../web/svg-css.js';
import {parseSvgColor} from '../web/svg-colors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});

const node=(tag,attrs={},children=[])=>({tag,attrs,children});
const style=(text,attrs={})=>({tag:'style',attrs,children:[],text});
const rect=(attrs={})=>node('rect',{width:'10',height:'10',...attrs});
const svg=(...children)=>node('svg',{width:'100',height:'100'},children);
const layers=(...children)=>svgLayers(svg(...children)).shapes.slice(1);
const allowed=new Set(['fill','stroke','opacity']);

test('class, id, element and compound selectors apply their paint',()=>{
 const [a,b,c,d]=layers(style('.red{fill:#ff0000} #box{fill:blue;stroke:#00ff00;stroke-width:2} rect.wide.tall{fill:#123456} circle{fill:teal}'),
  rect({class:'red'}),rect({id:'box'}),rect({class:'tall other wide'}),node('circle',{r:'5'}));
 assert.equal(a.fill,'#ff0000');assert.equal(a.appearance.stroke_enabled,false);
 assert.equal(b.fill,'#0000ff');assert.equal(b.appearance.stroke_color,'#00ff00');assert.equal(b.stroke_width,2);assert.equal(b.appearance.stroke_enabled,true);
 assert.equal(c.fill,'#123456');assert.equal(d.fill,'#008080');
});

test('the cascade is attribute, then rules by specificity and order, then inline style',()=>{
 const sheet=style('rect{fill:#000001} .a{fill:#000002} .b{fill:#000003} #x{fill:#000004} *{stroke:#0000aa}');
 const fills=layers(sheet,rect({fill:'#ff0000'}),rect({fill:'#ff0000',class:'a'}),rect({class:'b a'}),rect({class:'a b'}),rect({class:'a',id:'x'}),node('circle',{r:'4',fill:'#ff0000'})).map(s=>s.fill);
 // A rule beats the presentation attribute; later equal-specificity rules win regardless of class order; id beats class; inline beats all.
 assert.deepEqual(fills,['#000001','#000002','#000003','#000003','#000004','#ff0000']);
 assert.equal(layers(sheet,rect({class:'a',id:'x',style:'fill:#000005'}))[0].fill,'#000005');
 // The universal rule has the lowest specificity, so it applies but loses to anything else.
 const [plain,own]=layers(sheet,rect(),rect({stroke:'#00ff00',style:'stroke:#111111'}));assert.equal(plain.appearance.stroke_color,'#0000aa');assert.equal(own.appearance.stroke_color,'#111111');
});

test('rules on groups inherit to children, and several style elements and selector lists combine',()=>{
 const shapes=layers(style('.brand , #two { fill : #ff00ff ; }'),node('g',{class:'brand'},[rect(),rect({fill:'#00ff00'})]),rect({id:'two'}),node('defs',{},[style('/* later sheet */ .brand{opacity:.5}')]));
 const group=shapes[0],inside=shapes.filter(s=>s.parent_id===group.id);
 assert.equal(group.appearance.opacity,.5);assert.deepEqual(inside.map(s=>s.fill),['#ff00ff','#00ff00']);
 assert.equal(shapes.at(-1).fill,'#ff00ff');
});

test('display and visibility rules hide artwork the same way attributes do',()=>{
 const shapes=layers(style('.gone{display:none} .ghost{visibility:hidden}'),rect({class:'gone'}),rect({class:'ghost'}),rect());
 assert.equal(shapes.length,2);assert.deepEqual(shapes.map(s=>s.hidden),[true,false]);
});

test('rules reach symbol content through use, and Illustrator-style sheets import into the engine',()=>{
 const tree=node('svg',{width:'40',height:'40',viewBox:'0 0 40 40'},[node('defs',{},[style('<!-- .cls-1{fill:#fbb03b;}.cls-2{fill:none;stroke:#0071bc;stroke-miterlimit:10;stroke-width:3px;} -->',{type:'text/css'})]),
  node('g',{id:'Layer_1'},[rect({class:'cls-1',x:'2',y:'2'}),node('path',{class:'cls-2',d:'M5 30 L35 30'})])]);
 const payload=svgLayers(tree),[fill,line]=payload.shapes.slice(2);
 assert.equal(fill.fill,'#fbb03b');assert.equal(line.appearance.fill_enabled,false);assert.equal(line.appearance.stroke_color,'#0071bc');assert.equal(line.stroke_width,3);assert.equal(line.appearance.stroke_miter_limit,10);
 const e=new Editor();try{assert.equal(JSON.parse(e.paste_layers(JSON.stringify(payload),0,0,0)).length,1);const saved=JSON.parse(e.snapshot()).shapes;assert.ok(saved.some(s=>s.fill==='#fbb03b'));}finally{e.free();}
 const used=layers(style('.dot{fill:#ff0000}'),node('defs',{},[node('circle',{id:'c',class:'dot',r:'3'})]),node('use',{href:'#c',x:'10',y:'10'}));
 assert.equal(used.at(-1).fill,'#ff0000');
});

test('unsupported CSS is refused before anything is imported',()=>{
 const refuse=(css,pattern,attrs)=>assert.throws(()=>layers(style(css,attrs),rect()),pattern,css);
 refuse('g rect{fill:red}',/Unsupported SVG CSS selector/);refuse('g>rect{fill:red}',/Unsupported SVG CSS selector/);
 refuse('rect:hover{fill:red}',/Unsupported SVG CSS selector/);refuse('[fill]{fill:red}',/Unsupported SVG CSS selector/);refuse('{fill:red}',/Unsupported SVG CSS selector/);
 refuse('@media print{rect{fill:red}}',/Unsupported SVG CSS rule: @media/);refuse('@import url(x.css);',/@import/);refuse('@font-face{font-family:x}',/@font-face/);
 // Unknown properties are refused even when the rule matches nothing.
 refuse('.unused{font-family:Arial}',/Unsupported SVG style: font-family/);refuse('.unused{mix-blend-mode:multiply}',/Unsupported SVG style: mix-blend-mode/);
 refuse('rect{fill:red !important}',/!important/);refuse('rect{fill}',/Invalid SVG CSS declaration/);refuse('rect{fill:}',/Invalid SVG CSS declaration/);
 refuse('rect{fill:red',/Invalid SVG CSS/);refuse('rect{a{fill:red}}',/Invalid SVG CSS/);
 refuse('rect{fill:red}',/style sheet type or media/,{type:'text/less'});refuse('rect{fill:red}',/style sheet type or media/,{media:'print'});
 // A bad value in a matching rule fails like the same attribute would.
 refuse('rect{fill:lab(1 2 3)}',/Unsupported SVG paint/);refuse('rect{stroke-width:2em}',/pixels or unitless/);
 // Rules cannot silently miss gradient definitions.
 assert.throws(()=>layers(style('stop{opacity:.5}'),node('linearGradient',{id:'g'},[node('stop',{offset:'0','stop-color':'#000000'})]),rect()),/CSS rules on SVG gradients/);
 assert.throws(()=>layers(style('.s{stop-color:red}'),rect()),/Unsupported SVG style: stop-color/);
});

test('files without style rules import exactly as before',()=>{
 const tree=()=>svg(rect({fill:'#ff0000',class:'unstyled',id:'a'}),node('g',{opacity:'.5'},[rect({style:'fill:#00ff00'})]));
 assert.deepEqual(svgLayers({...tree(),children:[style('  /* nothing */ '),...tree().children]}),svgLayers(tree()));
});

test('the CSS reader orders rules and matches elements',()=>{
 const rules=parseSvgCss('#i{fill:1} .c{fill:2} t{fill:3} t.c{fill:4} .c{stroke:5} *{opacity:6}',allowed);
 assert.deepEqual(rules.map(r=>r.specificity),[0,1,100,100,101,10000]);
 assert.deepEqual(matchSvgCss(rules,'t',{class:'c',id:'i'}),[['opacity','6'],['fill','3'],['fill','2'],['stroke','5'],['fill','4'],['fill','1']]);
 assert.deepEqual(matchSvgCss(rules,'u',{}),[['opacity','6']]);assert.deepEqual(matchSvgCss([],'t',{class:'c'}),[]);
 assert.deepEqual(parseSvgCss(' \n /* only a comment */ ',allowed),[]);
 assert.deepEqual(parseSvgCss('.A{FILL:Red}',allowed)[0].declarations,[['fill','Red']]);assert.deepEqual(matchSvgCss(parseSvgCss('.A{fill:red}',allowed),'t',{class:'a'}),[]);
});

test('colors: every CSS named color, hex with alpha, rgb and hsl in both syntaxes',()=>{
 const hex=v=>parseSvgColor(v)?.hex,alpha=v=>parseSvgColor(v)?.alpha;
 assert.equal(hex('RebeccaPurple'),'#663399');assert.equal(hex('cornflowerblue'),'#6495ed');assert.equal(hex('darkslategrey'),'#2f4f4f');
 assert.equal(hex('#ABC'),'#aabbcc');assert.equal(hex('#abcd'),'#aabbcc');assert.equal(alpha('#abcd'),0xdd/255);assert.equal(alpha('#11223380'),0x80/255);
 assert.equal(hex('rgb(255, 0, 0)'),'#ff0000');assert.equal(hex('rgb(100%,0%,50%)'),'#ff0080');assert.equal(hex('rgb(300 -5 12.4)'),'#ff000c');
 assert.deepEqual(parseSvgColor('rgba(0,128,255,.5)'),{hex:'#0080ff',alpha:.5});assert.deepEqual(parseSvgColor('rgb(0 128 255 / 25%)'),{hex:'#0080ff',alpha:.25});
 assert.equal(hex('hsl(0,100%,50%)'),'#ff0000');assert.equal(hex('hsl(120deg 100% 25%)'),'#008000');assert.equal(hex('hsl(-120,100%,50%)'),'#0000ff');assert.deepEqual(parseSvgColor('hsla(240,100%,50%,2)'),{hex:'#0000ff',alpha:1});
 assert.equal(parseSvgColor('none'),null);assert.equal(parseSvgColor('transparent'),null);assert.deepEqual(parseSvgColor('currentColor','Tomato'),{hex:'#ff6347',alpha:1});
 for(const bad of ['#12345','#1234567','rgb(1,2)','rgb(1 2 3 4)','rgb(1,2,3,4,5)','rgb(10%,2,3)','rgb(1 2 3 / 4 / 5)','rgb(a,b,c)','hsl(1,2,3)','hwb(0 0% 0%)','url(#g)','notacolor',''])assert.throws(()=>parseSvgColor(bad),/Unsupported SVG paint/,bad);
});

test('transparent colors fold into fill and stroke opacity',()=>{
 const [shape]=layers(rect({fill:'rgba(255,0,0,.5)','fill-opacity':'.5',stroke:'#0000ff80','stroke-opacity':'.5'}));
 assert.equal(shape.fill,'#ff0000');assert.equal(shape.appearance.fill_opacity,.25);assert.equal(shape.appearance.stroke_color,'#0000ff');assert.ok(Math.abs(shape.appearance.stroke_opacity-.5*0x80/255)<1e-12);
 const [clear]=layers(rect({fill:'transparent',stroke:'black'}));assert.equal(clear.appearance.fill_enabled,false);
 // Gradient stops keep requiring stop-opacity for transparency.
 const gradient=node('linearGradient',{id:'g'},[node('stop',{offset:'0','stop-color':'rgba(0,0,0,.5)'}),node('stop',{offset:'1','stop-color':'#ffffff'})]);
 assert.throws(()=>layers(gradient,rect({fill:'url(#g)'})),/Use stop-opacity/);
});
