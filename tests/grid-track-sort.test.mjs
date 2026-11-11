import test from 'node:test';
import assert from 'node:assert/strict';
import {bindGridTrackSort} from '../web/grid-track-sort.js';

function setup(count=4,selected=null){
 const node=()=>{
  const handlers={},classes=new Set();
  return {handlers,classes,classList:{add:(...values)=>values.forEach(v=>classes.add(v)),remove:(...values)=>values.forEach(v=>classes.delete(v))},addEventListener:(type,fn)=>handlers[type]=fn};
 };
 const section=node(),moves=[],shifts=[];
 section.contains=target=>target===section;
 const cards=Array.from({length:count},(_,i)=>{
  const card=node(),heading=node(),grip=node();
  grip.getAttribute=()=>`Reorder column ${i+1}`;grip.closest=()=>grip;heading.closest=()=>null;
  card.heading=heading;card.grip=grip;card.querySelector=selector=>selector==='.grid-track-heading'?heading:grip;
  card.getBoundingClientRect=()=>({top:100+i*100,height:80});return card;
 });
 const selections=[],groupMoves=[];
 bindGridTrackSort(section,cards,(...args)=>moves.push(args),(...args)=>shifts.push(args),selected&&{indices:selected,select:(index,event)=>selections.push([index,!!event.shiftKey,!!(event.ctrlKey||event.metaKey)]),move:(...args)=>groupMoves.push(args)});
 const fire=(target,type,extra={})=>{
  const event={target,clientY:110,relatedTarget:null,dataTransfer:{setData(){},setDragImage(){}},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};
  target.handlers[type]?.(event);return event;
 };
 const start=index=>fire(cards[index].heading,'dragstart',{target:cards[index].grip});
 return {cards,section,moves,shifts,fire,start,selections,groupMoves};
}
test('dragging previews an insertion position and commits exactly once only on drop',()=>{
 const p=setup();p.start(0);p.fire(p.section,'dragover',{clientY:490});
 assert.deepEqual(p.moves,[]);assert.ok(p.cards[3].classes.has('grid-drop-after'));
 p.fire(p.section,'drop',{clientY:490});p.fire(p.cards[0].heading,'dragend');
 assert.deepEqual(p.moves,[[0,4]]);assert.ok(p.cards.every(c=>c.classes.size===0));
});
test('reverse moves insert before the target; returning to the original position is a no-op',()=>{
 const p=setup();p.start(3);p.fire(p.section,'drop',{clientY:110});assert.deepEqual(p.moves,[[3,0]]);
 for(const clientY of [210,260]){const q=setup();q.start(1);q.fire(q.section,'drop',{clientY});assert.deepEqual(q.moves,[]);}
});
test('Escape and dropping outside clear every preview without changing the document',()=>{
 for(const cancel of ['escape','outside']){
  const p=setup();p.start(0);p.fire(p.section,'dragover',{clientY:390});
  if(cancel==='escape')p.fire(p.section,'keydown',{key:'Escape'});else p.fire(p.cards[0].heading,'dragend');
  p.fire(p.section,'drop',{clientY:390});assert.deepEqual(p.moves,[]);assert.ok(p.cards.every(c=>c.classes.size===0));
 }
});
test('another track section and unrelated dragged content are never accepted',()=>{
 const columns=setup(),rows=setup();columns.start(0);
 assert.equal(rows.fire(rows.section,'dragover').prevented,undefined);
 rows.fire(rows.section,'drop');columns.fire(columns.cards[0].heading,'dragend');
 assert.deepEqual(columns.moves,[]);assert.deepEqual(rows.moves,[]);
});
test('fields and action buttons do not start sorting, and keyboard handles retain adjacent moves',()=>{
 const p=setup();const otherButton={closest(){return this;}};
 assert.equal(p.fire(p.cards[0].heading,'dragstart',{target:otherButton}).prevented,true);
 p.fire(p.section,'drop',{clientY:490});assert.deepEqual(p.moves,[]);
 const event=p.fire(p.cards[1].grip,'keydown',{key:'ArrowDown'});assert.equal(event.prevented,true);assert.equal(event.stopped,true);assert.deepEqual(p.shifts,[[1,1]]);
 const single=setup(1);assert.equal(single.cards[0].grip.disabled,true);assert.equal(single.cards[0].heading.draggable,false);
});

test('dragging a selected card carries the whole selection in one grouped move',()=>{
 const p=setup(4,[2,0]);
 assert.deepEqual(p.cards.map(c=>c.classes.has('grid-track-selected')),[true,false,true,false]);
 p.start(2);assert.ok(p.cards[0].classes.has('grid-track-dragging')&&p.cards[2].classes.has('grid-track-dragging'));
 // A boundary beside the grabbed card still gathers a split selection.
 p.fire(p.section,'dragover',{clientY:310});assert.ok(p.cards[2].classes.has('grid-drop-before'));
 p.fire(p.section,'drop',{clientY:310});p.fire(p.cards[2].heading,'dragend');
 assert.deepEqual(p.groupMoves,[[[0,2],2]]);assert.deepEqual(p.moves,[]);
 assert.ok(p.cards.every(c=>!c.classes.has('grid-track-dragging')&&!c.classes.has('grid-drop-before')));
});
test('dragging an unselected card moves only that card and leaves the selection alone',()=>{
 const p=setup(4,[0,1]);p.start(3);p.fire(p.section,'drop',{clientY:110});
 assert.deepEqual(p.moves,[[3,0]]);assert.deepEqual(p.groupMoves,[]);
});
test('modifier clicks on a heading edit the selection; plain clicks and other buttons do not',()=>{
 const p=setup(4,[]);
 p.fire(p.cards[1].heading,'click');assert.deepEqual(p.selections,[]);
 const shift=p.fire(p.cards[1].heading,'click',{shiftKey:true});assert.equal(shift.prevented,true);
 p.fire(p.cards[3].heading,'click',{metaKey:true});
 p.fire(p.cards[2].heading,'click',{ctrlKey:true,target:{closest:()=>({})}});
 assert.deepEqual(p.selections,[[1,true,false],[3,false,true]]);
});
