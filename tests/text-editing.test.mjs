import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {textEditSession,drawnText,editableText,textWordRange} from '../web/text-editing.js';
import {textSize} from '../web/typography.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
function setup(){
 const e=new Editor();e.set_text_measurer(json=>JSON.stringify(textSize(JSON.parse(json),s=>[...s].length*10)));
 const id=e.insert(JSON.stringify({...drawnText({x:20,y:30},{x:20,y:30}),text:'Original'}));
 e.clear_history();return {e,id,get:()=>shapes(e).find(s=>s.id===id)};
}
test('live text, multiline sizing and layout previews become one undo step',()=>{
 const {e,get}=setup(),before=e.snapshot(),session=textEditSession(e,get());
 session.preview('First');session.preview('First\r\n\r\nSecond 👩🏽‍💻');
 assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);
 const preview=session.document.shapes.find(s=>s.id===get().id);
 assert.equal(preview.text,'First\n\nSecond 👩🏽‍💻');assert.ok(preview.height>get().height);
 session.commit();const after=e.snapshot();assert.equal(get().text,preview.text);
 e.undo();assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);
 e.redo();assert.equal(e.snapshot(),after);e.free();
});
test('unchanged edits preserve redo; invalid text never corrupts the document',()=>{
 const {e,get}=setup(),session=textEditSession(e,get()),before=e.snapshot();
 session.preview('Changed');session.commit();e.undo();
 assert.equal(textEditSession(e,get()).commit(),false);assert.equal(e.can_redo(),true);
 const invalid=textEditSession(e,get());assert.throws(()=>invalid.preview('😀'.repeat(3000)));
 assert.equal(invalid.text,'Original');assert.equal(e.snapshot(),before);e.free();
});
test('deleting all text removes the layer and Undo restores its contents',()=>{
 const {e,get}=setup(),before=e.snapshot(),session=textEditSession(e,get());
 session.preview('');session.commit();assert.equal(get(),undefined);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('a live inspector reference cannot mutate the text session baseline',()=>{
 const {e,get}=setup(),source=get(),before=e.snapshot(),session=textEditSession(e,source);
 source.text='Inspector copy';session.preview('Typed text');session.commit();
 assert.equal(get().text,'Typed text');e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('typing in auto height relayouts a hugged parent; fixed dimensions stay fixed',()=>{
 const {e,id,get}=setup();const parent=e.add('frame',0,0);
 e.update(JSON.stringify({...shapes(e).find(s=>s.id===parent),width:100,auto_layout:{direction:'vertical',gap:0,padding_top:10,padding_bottom:10,padding_left:10,padding_right:10,align:'start',justify:'start',hug_width:false,hug_height:true}}));
 e.reparent_many(JSON.stringify([id]),parent);e.update(JSON.stringify({...get(),layout_item:{fill_width:true,fill_height:false,absolute:false}}));
 const before=e.snapshot(),session=textEditSession(e,get());session.preview('Words that wrap onto several lines');
 assert.ok(session.document.shapes.find(s=>s.id===parent).height>shapes(e).find(s=>s.id===parent).height);
 session.commit();e.undo();assert.equal(e.snapshot(),before);
 e.update(JSON.stringify({...get(),width:90,height:50,typography:{...get().typography,sizing:'fixed'},layout_item:{fill_width:false,fill_height:false,absolute:false}}));
 const fixed=textEditSession(e,get());fixed.preview('A long line\nwith a break');fixed.commit();
 assert.deepEqual([get().width,get().height],[90,50]);e.free();
});
test('click and drag creation distinguish auto width from fixed area, at any zoom',()=>{
 assert.equal(drawnText({x:10,y:20},{x:12,y:21},1).typography.sizing,'width');
 const box=drawnText({x:110,y:120},{x:10,y:20},.5);
 assert.deepEqual([box.x,box.y,box.width,box.height,box.typography.sizing],[10,20,100,100,'fixed']);
 assert.equal(drawnText({x:0,y:0},{x:2,y:1},3).typography.sizing,'fixed');
});
const text=value=>({nodeType:3,nodeName:'#text',nodeValue:value});
const node=(name,...children)=>({nodeType:1,nodeName:name,childNodes:children.map((c,i)=>({...c,nextSibling:children[i+1]??null}))});
test('plain text extraction retains blank lines, literal markup and trailing paragraphs',()=>{
 assert.equal(editableText(node('DIV',text('Hello\n\nworld\n'))),'Hello\n\nworld\n');
 assert.equal(editableText(node('DIV',text('Hello'),node('DIV',node('BR')),node('DIV',text('<b>world</b>')),node('DIV',node('BR')))),'Hello\n\n<b>world</b>\n');
 assert.equal(editableText(node('DIV',node('BR'))),'');
 assert.equal(editableText(node('DIV',text('a'),node('BR'),text('b'))),'a\nb');
});
test('word selection respects Unicode boundaries',()=>{
 assert.deepEqual(textWordRange('Hello world',8),[6,11]);
 const value='a 👩🏽‍💻 b',[a,b]=textWordRange(value,3);assert.equal(value.slice(a,b),'👩🏽‍💻');
 assert.deepEqual(textWordRange('',0),[0,0]);
});
