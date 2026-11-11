import test from 'node:test';
import assert from 'node:assert/strict';
import {parseInline,parseDescription,plainDescription,hasFormatting,renderDescription,formatSelection} from '../web/rich-description.js';

// Enough of a document to observe the tree renderDescription builds.
const fakeDocument={
 createDocumentFragment:()=>node('#fragment'),createElement:tag=>node(tag),createTextNode:text=>({text}),
};
function node(tag){return {tag,children:[],append(...items){this.children.push(...items);}};}
const html=n=>n.text!==undefined?n.text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]):(n.tag==='#fragment'?'':`<${n.tag}${n.href?` href="${n.href}"`:''}>`)+n.children.map(html).join('')+(n.tag==='#fragment'||n.tag==='br'?'':`</${n.tag}>`);
const render=text=>html(renderDescription(text,fakeDocument));

test('inline emphasis, code and links become styled runs',()=>{
 assert.deepEqual(parseInline('Use **bold**, *italic*, _also_ and `code`.'),[{text:'Use '},{text:'bold',bold:true},{text:', '},{text:'italic',italic:true},{text:', '},{text:'also',italic:true},{text:' and '},{text:'code',code:true},{text:'.'}]);
 assert.deepEqual(parseInline('**outer *inner* text**'),[{text:'outer ',bold:true},{text:'inner',bold:true,italic:true},{text:' text',bold:true}]);
 assert.deepEqual(parseInline('See [the **guide**](https://example.com/a?b=1).'),[{text:'See '},{text:'the ',href:'https://example.com/a?b=1'},{text:'guide',href:'https://example.com/a?b=1',bold:true},{text:'.'}]);
});
test('ordinary punctuation and unmatched markers stay literal',()=>{
 for(const text of ['5 * 3 * 2 = 30','snake_case_name and file_name.txt','a * b','**unclosed','trailing *','`unclosed','[label](not a url)','[label]','2 ** 3'])assert.deepEqual(parseInline(text),[{text}],text);
 assert.deepEqual(parseInline('\\*not italic\\* and \\[x\\]'),[{text:'*not italic* and [x]'}]);
 // Markers inside code are not interpreted.
 assert.deepEqual(parseInline('`**raw**`'),[{text:'**raw**',code:true}]);
});
test('only http, https and mailto links are created',()=>{
 assert.equal(parseInline('[m](mailto:a@example.com)')[0].href,'mailto:a@example.com');
 for(const url of ['javascript:alert(1)','JaVaScRiPt:alert(1)','data:text/html,<b>x</b>','file:///etc/passwd','//example.com','https://example.com/"onclick="x','https://exa mple.com'])
  assert.ok(parseInline(`[x](${url})`).every(run=>!run.href),url);
});
test('lines become paragraphs, line breaks and bulleted or numbered lists',()=>{
 const blocks=parseDescription('First line\nsecond line\n\n- one\n- **two**\n1. first\n2) second\n\nLast');
 assert.deepEqual(blocks.map(b=>b.type==='list'?[b.ordered,b.items.length]:['p',b.lines.length]),[['p',2],[false,2],[true,2],['p',1]]);
 assert.deepEqual(parseDescription(''),[]);assert.deepEqual(parseDescription(null),[]);assert.deepEqual(parseDescription('  \n\n '),[]);
 assert.equal(parseDescription('-not a list')[0].type,'paragraph');assert.equal(parseDescription('1.5 rem')[0].type,'paragraph');
});
test('rendering builds elements from text only, so markup in a description is inert',()=>{
 assert.equal(render('Add **one** [icon](https://example.com).\nThen stop.\n\n- a\n- `b`'),'<p>Add <strong>one</strong> <a href="https://example.com">icon</a>.<br>Then stop.</p><ul><li>a</li><li><code>b</code></li></ul>');
 assert.equal(render('<img src=x onerror=alert(1)> & **<b>**'),'<p>&lt;img src=x onerror=alert(1)&gt; &amp; <strong>&lt;b&gt;</strong></p>');
 assert.equal(render('1. one\n2. two'),'<ol><li>one</li><li>two</li></ol>');assert.equal(render(''),'');
 const link=renderDescription('[x](https://example.com)',fakeDocument).children[0].children[0];
 assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
});
test('plain text drops the markers and keeps the reading order',()=>{
 assert.equal(plainDescription('Use **bold** and [docs](https://example.com).\n\n- one\n- two\n\n1. first'),'Use bold and docs.\n\n• one\n• two\n\n1. first');
 assert.equal(plainDescription('Plain text stays as written.'),'Plain text stays as written.');
 assert.equal(hasFormatting('Plain text, 5 * 3.'),false);assert.equal(hasFormatting('A `b`'),true);assert.equal(hasFormatting('- item'),true);
});
test('toolbar edits wrap, unwrap and keep a useful selection',()=>{
 assert.deepEqual(formatSelection('make this bold',5,9,'bold'),{value:'make **this** bold',start:7,end:11});
 // Selecting the wrapped word again, with or without its markers, removes them.
 assert.deepEqual(formatSelection('make **this** bold',7,11,'bold'),{value:'make this bold',start:5,end:9});
 assert.deepEqual(formatSelection('make **this** bold',5,13,'bold'),{value:'make this bold',start:5,end:9});
 assert.deepEqual(formatSelection('x',1,1,'italic'),{value:'x*italic text*',start:2,end:13});
 assert.deepEqual(formatSelection('a **b** c',4,5,'italic'),{value:'a ***b*** c',start:5,end:6});
 assert.deepEqual(formatSelection('use code here',4,8,'code'),{value:'use `code` here',start:5,end:9});
 const link=formatSelection('read docs now',5,9,'link');assert.equal(link.value,'read [docs](https://) now');assert.equal(link.value.slice(link.start,link.end),'https://');
});
test('list buttons prefix every selected line and toggle off again',()=>{
 const text='intro\none\ntwo\n\nthree\nend',from=text.indexOf('one'),to=text.indexOf('three')+5;
 const bulleted=formatSelection(text,from,to,'bulleted');assert.equal(bulleted.value,'intro\n- one\n- two\n\n- three\nend');
 assert.equal(formatSelection(bulleted.value,bulleted.start,bulleted.end,'bulleted').value,text);
 const numbered=formatSelection(bulleted.value,bulleted.start,bulleted.end,'numbered');assert.equal(numbered.value,'intro\n1. one\n2. two\n\n3. three\nend');
 assert.equal(formatSelection('solo',2,2,'bulleted').value,'- solo');
 assert.deepEqual(formatSelection('same',0,4,'unknown'),{value:'same',start:0,end:4});
});
