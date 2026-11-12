import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeRich} from '../web/rich-editor.js';
import {parseDescription,renderDescription} from '../web/rich-description.js';

// Just enough of a DOM for the serializer and for renderDescription to build into.
const text=value=>({nodeType:3,nodeValue:value,get textContent(){return value;}});
function h(tag,attrs={},...children){
 const node={nodeType:1,nodeName:tag.toUpperCase(),style:attrs.style??{},childNodes:[],attrs:{...attrs},getAttribute:name=>node.attrs[name]??null,
  append(...items){for(const item of items){if(item?.nodeName==='#FRAGMENT')node.childNodes.push(...item.childNodes);else node.childNodes.push(typeof item==='string'?text(item):item);}},
  set textContent(value){node.childNodes=[text(String(value))];},get textContent(){return node.childNodes.map(child=>child.textContent).join('');},
  set href(value){node.attrs.href=value;},set target(value){},set rel(value){}};
 node.append(...children);return node;
}
const fakeDocument={createDocumentFragment:()=>h('#fragment'),createElement:tag=>h(tag),createTextNode:text};
const root=(...children)=>h('div',{},...children);

test('an edited tree is saved as description markers',()=>{
 assert.equal(serializeRich(root(h('p',{},'Use ',h('b',{},'one'),' and ',h('i',{},'two'),' not ',h('strike',{},'three')))),'Use **one** and *two* not ~~three~~');
 // What browsers produce: bare text, div lines, styled spans, nested and spaced marks.
 assert.equal(serializeRich(root('first',h('div',{},'second'),h('div',{},h('br')),h('div',{},'third'))),'first\n\nsecond\n\nthird');
 assert.equal(serializeRich(root(h('span',{style:{fontWeight:'700',fontStyle:'italic'}},'both'))),'***both***');
 assert.equal(serializeRich(root(h('b',{},' padded '),'x')),' **padded** x');assert.equal(serializeRich(root(h('b',{},h('b',{},'once')))),'**once**');
 assert.equal(serializeRich(root(h('p',{},'a',h('br'),'b'))),'a\nb');
 assert.equal(serializeRich(root(h('h4',{},'Title ',h('em',{},'now')),h('ul',{},h('li',{},'one'),h('li',{},h('b',{},'two'))),h('ol',{},h('li',{},'x'),h('li',{},'y')))),'# Title *now*\n\n- one\n- **two**\n\n1. x\n2. y');
 assert.equal(serializeRich(root(h('pre',{},'a = *b*\n  c\n'),h('p',{},'see ',h('code',{},'x_y')))),'```\na = *b*\n  c\n```\n\nsee `x_y`');
 assert.equal(serializeRich(root(h('a',{href:'https://example.com/a'},'docs'),' ',h('a',{href:'javascript:alert(1)'},'bad'))),'[docs](https://example.com/a) bad');
 assert.equal(serializeRich(root(h('p',{},h('br')),h('ul',{}),h('h4',{},' '))),'');
});
test('typed characters that look like formatting stay text',()=>{
 const typed=['2 * 3 * 4 and a_b_c','# not a heading','- not a list','1. not a list','3) nor this','~~plain~~ `tick` [x](y)','back\\slash','• bullet'];
 for(const line of typed){
  const saved=serializeRich(root(h('p',{},line))),blocks=parseDescription(saved);
  assert.deepEqual(blocks,[{type:'paragraph',lines:[[{text:line}]]}],saved);
 }
});
test('rendering then saving a description gives the same description back',()=>{
 for(const source of ['Plain line\nsecond line','**bold** *italic* ~~gone~~ `code` [link](https://example.com)','# Heading\n\nBody\n\n- one\n- two\n\n1. first\n2. second','```\nlet x = 1;\n  indented\n```\n\nAfter','***both*** and \\*literal\\*']){
  const view=root();view.append(renderDescription(source,fakeDocument));
  assert.deepEqual(parseDescription(serializeRich(view)),parseDescription(source),source);
 }
});
