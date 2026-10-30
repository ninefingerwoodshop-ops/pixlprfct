import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutText, textStyle, textSvg } from '../web/typography.js';
const style = { font_size: 10, font_family: 'Manrope', font_weight: 600, align: 'left', line_height: 1.5, wrap: true };
const shape = { id: 1, x: 10, y: 20, width: 60, height: 45, text: 'hello world again', fill: '#111111', typography: style };
const measure = text => Array.from(text).length * 10;
test('word wrapping, hard breaks, and alignment produce deterministic positions', () => {
  const result = layoutText(shape, measure);
  assert.deepEqual(result.lines, [{text:'hello', x:10, y:20}, {text:'world', x:10, y:35}, {text:'again', x:10, y:50}]);
  assert.equal(result.height, 45);
  assert.equal(result.overflow, false);
  const centered = layoutText({...shape, text:'one\n\ntwo', typography:{...style, align:'center'}}, measure);
  assert.deepEqual(centered.lines.map(l => [l.text,l.x,l.y]), [['one',40,20],['',40,35],['two',40,50]]);
});
test('long words wrap without splitting a combining character or emoji sequence', () => {
  const result = layoutText({...shape, width:10, text:'a\u0301👩‍💻b'}, () => 20);
  assert.deepEqual(result.lines.map(l=>l.text), ['a\u0301','👩‍💻','b']);
  assert.equal(result.overflow, true);
});
test('legacy unwrapped layout and clipping remain detectable', () => {
  const legacy = {...shape, typography:null, height:30};
  assert.equal(textStyle(legacy).font_size, 19.8);
  assert.deepEqual(layoutText(legacy, measure).lines.map(l=>l.text), ['hello world again']);
  assert.equal(layoutText(legacy, measure).overflow, true);
  assert.equal(layoutText({...shape,height:10},measure).overflow,true);
});
test('SVG uses the same wrapped lines, positions, styles, and escaped text', () => {
  const s = {...shape, text:'<x> & y', typography:{...style,font_family:'Georgia',font_weight:700,align:'right'}};
  const layout = layoutText(s, measure), svg = textSvg(s, layout);
  assert.match(svg, /font-family="Georgia"/);
  assert.match(svg, /font-size="10" font-weight="700" text-anchor="end"/);
  assert.match(svg, /&lt;x&gt; &amp;/);
  assert.match(svg, /<tspan x="70" y="45\.5">y<\/tspan>/);
  assert.equal((svg.match(/<tspan /g)||[]).length, layout.lines.length);
});
test('complete line boxes preserve whitespace-only paragraphs and center or bottom align without clipping the last line',()=>{
 const s={...shape,height:100,text:'a\n          \nb'};
 for(const [vertical_align,offset] of [['top',0],['center',27.5],['bottom',55]]){
  const layout=layoutText({...s,typography:{...style,vertical_align}},measure,11);
  assert.equal(layout.height,45);assert.deepEqual(layout.lines.map(l=>l.text),['a','','b']);assert.equal(layout.lines[0].y,s.y+offset);assert.equal(layout.overflow,false);
  assert.ok(textSvg(s,layout).includes(`y="${s.y+offset+30+11}"`));
 }
});
