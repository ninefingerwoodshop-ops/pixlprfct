import test from 'node:test';
import assert from 'node:assert/strict';
import {trackHeaders,trackHeaderHit,selectTrack,validTrackSelection,trackDropBoundary,trackDropMoves,trackDropLine,trackSelectionLabel} from '../web/grid-track-selection.js';

const frame={id:7,x:100,y:200,width:500,height:300,auto_layout:{direction:'grid',gap:10,cross_gap:20,padding_left:10,padding_top:10,padding_right:10,padding_bottom:10}};
const plan={columns:[100,120,140],rows:[50,60],column_gap:10,row_gap:20,placements:[]};

test('each explicit track gets a header above or left of the frame, scaled with zoom',()=>{
 const headers=trackHeaders(frame,plan,2);
 assert.deepEqual(headers.map(h=>[h.axis,h.index]),[['columns',0],['columns',1],['columns',2],['rows',0],['rows',1]]);
 assert.deepEqual(headers[1],{axis:'columns',index:1,x:220,y:180.5,width:120,height:5});
 assert.deepEqual(headers[4],{axis:'rows',index:1,x:90.5,y:280,width:5,height:60});
 // Automatic rows are not explicit tracks, and other layouts have no headers.
 assert.deepEqual(trackHeaders(frame,{...plan,rows:[]},1).map(h=>h.axis),['columns','columns','columns']);
 assert.deepEqual(trackHeaders({...frame,auto_layout:{...frame.auto_layout,direction:'horizontal'}},plan),[]);
 assert.deepEqual(trackHeaders(frame,null),[]);
});
test('header hits leave the trailing resize edge alone and tolerate a little slack',()=>{
 // Column headers sit 34 screen pixels above the frame, clear of its 26 px name label.
 assert.ok(trackHeaders(frame,plan,1)[0].y+10<=frame.y-26);
 assert.deepEqual(trackHeaderHit(frame,plan,{x:150,y:166},1)&&[trackHeaderHit(frame,plan,{x:150,y:166},1).axis,trackHeaderHit(frame,plan,{x:150,y:166},1).index],['columns',0]);
 assert.equal(trackHeaderHit(frame,plan,{x:205,y:166},1),null);
 assert.equal(trackHeaderHit(frame,plan,{x:150,y:176},1),null);
 assert.equal(trackHeaderHit(frame,plan,{x:150,y:173},1).index,0);
 assert.equal(trackHeaderHit(frame,plan,{x:86,y:300},1).axis,'rows');
 assert.equal(trackHeaderHit(frame,plan,{x:300,y:300},1),null);
});
test('click replaces, Shift extends from the anchor and toggle adds or removes on one axis',()=>{
 const one=selectTrack(null,'columns',1);assert.deepEqual(one,{axis:'columns',indices:[1],anchor:1});
 const range=selectTrack(one,'columns',3,{shiftKey:true});assert.deepEqual(range,{axis:'columns',indices:[1,2,3],anchor:1});
 assert.deepEqual(selectTrack(range,'columns',0,{shiftKey:true}).indices,[0,1]);
 const added=selectTrack(one,'columns',4,{toggle:true});assert.deepEqual(added,{axis:'columns',indices:[1,4],anchor:4});
 assert.deepEqual(selectTrack(added,'columns',4,{toggle:true}),{axis:'columns',indices:[1],anchor:1});
 assert.equal(selectTrack(one,'columns',1,{toggle:true}),null);
 // Changing axis always starts a new selection.
 assert.deepEqual(selectTrack(range,'rows',0,{shiftKey:true}),{axis:'rows',indices:[0],anchor:0});
 assert.deepEqual(selectTrack(range,'rows',1,{toggle:true}),{axis:'rows',indices:[1],anchor:1});
 assert.deepEqual(selectTrack(range,'columns',0),{axis:'columns',indices:[0],anchor:0});
});
test('a selection is dropped when its frame or tracks no longer exist',()=>{
 const selection={frameId:7,axis:'columns',indices:[1,2,5],anchor:1};
 assert.deepEqual(validTrackSelection(selection,frame,plan).indices,[1,2]);
 assert.equal(validTrackSelection(selection,{...frame,id:8},plan),null);
 assert.equal(validTrackSelection(selection,null,null),null);
 assert.equal(validTrackSelection({...selection,indices:[9]},frame,plan),null);
 assert.equal(validTrackSelection({...selection,axis:'rows',indices:[0]},frame,{...plan,rows:[]}),null);
 assert.equal(validTrackSelection(selection,{...frame,auto_layout:{direction:'vertical'}},plan),null);
});
test('drop boundaries follow track midpoints and report whether the order would change',()=>{
 assert.deepEqual([100,159,161,279,281,410,470,900].map(x=>trackDropBoundary(frame,plan,'columns',{x,y:0})),[0,0,1,1,2,2,3,3]);
 assert.deepEqual([0,234,236,309,400].map(y=>trackDropBoundary(frame,plan,'rows',{x:0,y})),[0,0,1,1,2]);
 assert.deepEqual([0,1,2,3].map(b=>trackDropMoves([1],b)),[true,false,false,true]);
 assert.deepEqual([0,1,2,3,4].map(b=>trackDropMoves([1,2],b)),[true,false,false,false,true]);
 // A split selection always gathers, even at a boundary beside one of its tracks.
 assert.deepEqual([0,1,2,3].map(b=>trackDropMoves([0,2],b)),[true,true,true,true]);
 assert.equal(trackDropMoves([],0),false);
});
test('the drop line sits in the gutter and spans the grid from the header lane',()=>{
 assert.deepEqual(trackDropLine(frame,plan,'columns',1),{x1:215,y1:166,x2:215,y2:340});
 assert.deepEqual(trackDropLine(frame,plan,'columns',0),{x1:110,y1:166,x2:110,y2:340});
 assert.deepEqual(trackDropLine(frame,plan,'columns',3),{x1:490,y1:166,x2:490,y2:340});
 assert.deepEqual(trackDropLine(frame,plan,'rows',1),{x1:86,y1:270,x2:490,y2:270});
});
test('selection labels name one track or count several',()=>{
 assert.equal(trackSelectionLabel({axis:'columns',indices:[2]}),'Column 3 selected');
 assert.equal(trackSelectionLabel({axis:'rows',indices:[0,1]}),'2 rows selected');
 assert.equal(trackSelectionLabel(null),'');
});
