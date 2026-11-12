import test from 'node:test';
import assert from 'node:assert/strict';
import {trackPill,trackChip,trackSizeLabel,hoveredTracks,trackHandles,trackHandleHit,nearTrackHandles,selectTrack,validTrackSelection,trackDropBoundary,trackDropMoves,trackDropLine,trackSelectionLabel} from '../web/grid-track-selection.js';

const frame={id:7,x:100,y:200,width:500,height:300,auto_layout:{direction:'grid',gap:10,cross_gap:20,padding_left:10,padding_top:10,padding_right:10,padding_bottom:10}};
const plan={columns:[100,120,140],rows:[50,60],column_gap:10,row_gap:20,placements:[]};

test('a pill sits 34 px outside the frame, centred on its track, at any zoom',()=>{
 // Columns start at x=110 (frame 100 + padding 10): 110-210, 220-340, 350-490. Rows: 210-260, 280-340.
 const column=trackPill(frame,plan,'columns',1,1),row=trackPill(frame,plan,'rows',0,1);
 assert.deepEqual([column.x,column.y,column.width,column.height],[280-11,200-34-5,22,10]);
 assert.deepEqual([row.x,row.y,row.width,row.height],[100-34-5,235-11,10,22]);
 // Screen size is constant: at 200% everything is half as large in document units.
 const zoomed=trackPill(frame,plan,'columns',1,2);assert.deepEqual([zoomed.width,zoomed.height,zoomed.y],[11,5,200-17-2.5]);
 assert.equal(trackPill(frame,plan,'columns',3,1),null);assert.equal(trackPill(frame,{...plan,rows:[]},'rows',0,1),null);
});

test('a chip shows the track size with a grip and a chevron',()=>{
 const sized={...frame,auto_layout:{...frame.auto_layout,grid:{columns:[{mode:'fr',value:1},{mode:'fixed',value:120.456},{mode:'hug'}],rows:[{mode:'percent',value:50}]}}};
 const chip=trackChip(sized,plan,'columns',0,1);
 // "1fr": 17 px grip + 22 px text + 16 px chevron = 55 px, 16 px high, centred over the column.
 assert.deepEqual([chip.label,chip.width,chip.height,chip.x,chip.y,chip.grip,chip.chevron],['1fr',55,16,160-27.5,200-34-8,17,16]);
 assert.equal(trackChip(sized,plan,'columns',1,1).label,'120.46');assert.equal(trackChip(sized,plan,'columns',2,1).label,'Hug');
 // Row chips grow away from the frame: their right edge is 8 px past the pill's centre.
 const row=trackChip(sized,plan,'rows',0,1);assert.equal(row.label,'50%');assert.equal(row.x+row.width,100-34+8);assert.equal(row.y,235-8);
 // Implicit rows have no track record.
 assert.equal(trackChip(sized,plan,'rows',1,1).label,'Auto');
 for(const [track,text] of [[{mode:'em',value:2},'2em'],[{mode:'auto'},'Auto'],[{mode:'min-content'},'Min'],[{mode:'max-content'},'Max'],[{mode:'minmax',value:1},'Min/max'],[null,'Auto']])assert.equal(trackSizeLabel(track),text);
});

test('the hovered cell decides which pills show; selected and hovered handles are chips',()=>{
 assert.deepEqual(hoveredTracks(frame,plan,{x:230,y:300}),{column:1,row:1});
 // Gaps and padding belong to the nearest following track; outside the frame is nothing.
 assert.deepEqual(hoveredTracks(frame,plan,{x:215,y:205}),{column:1,row:0});assert.deepEqual(hoveredTracks(frame,plan,{x:590,y:490}),{column:2,row:1});
 assert.equal(hoveredTracks(frame,plan,{x:99,y:300}),null);assert.equal(hoveredTracks({...frame,auto_layout:{...frame.auto_layout,direction:'horizontal'}},plan,{x:230,y:300}),null);
 const kinds=state=>trackHandles(frame,plan,1,state).map(h=>h.kind+':'+h.axis+h.index);
 assert.deepEqual(kinds({}),[]);
 assert.deepEqual(kinds({hover:{column:1,row:0,chip:null}}),['pill:columns1','pill:rows0']);
 assert.deepEqual(kinds({hover:{column:1,row:0,chip:{axis:'columns',index:1}}}),['chip:columns1','pill:rows0']);
 // A selected track keeps its chip, and is not drawn twice when it is also hovered.
 assert.deepEqual(kinds({selection:{axis:'columns',indices:[0,1]},hover:{column:1,row:1,chip:null}}),['chip:columns0','chip:columns1','pill:rows1']);
 assert.deepEqual(trackHandles(frame,null,1,{hover:{column:0,row:0}}),[]);
});

test('hits report the handle and which part of a chip was pressed',()=>{
 const hover={column:0,row:0,chip:null},hit=(p,state={hover})=>{const h=trackHandleHit(frame,plan,p,1,state);return h&&[h.axis,h.index,h.kind,h.part];};
 assert.deepEqual(hit({x:160,y:166}),['columns',0,'pill','pill']);assert.deepEqual(hit({x:66,y:235}),['rows',0,'pill','pill']);
 // A little slack around the pill, nothing further out, and nothing where no handle is shown.
 assert.deepEqual(hit({x:160,y:173}),['columns',0,'pill','pill']);assert.equal(hit({x:160,y:176}),null);assert.equal(hit({x:280,y:166}),null);assert.equal(hit({x:160,y:166},{}),null);
 const selected={selection:{axis:'columns',indices:[0]}},chip=trackChip(frame,plan,'columns',0,1);
 assert.deepEqual(hit({x:chip.x+4,y:166},selected),['columns',0,'chip','grip']);assert.deepEqual(hit({x:chip.x+28,y:166},selected),['columns',0,'chip','size']);assert.deepEqual(hit({x:chip.x+50,y:166},selected),['columns',0,'chip','chevron']);
 // Pills stay reachable while the pointer crosses from the frame to them.
 assert.equal(nearTrackHandles(frame,{x:160,y:170},1),true);assert.equal(nearTrackHandles(frame,{x:70,y:300},1),true);assert.equal(nearTrackHandles(frame,{x:160,y:150},1),false);assert.equal(nearTrackHandles(frame,{x:601,y:300},1),false);
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
 assert.deepEqual(trackDropLine(frame,plan,'rows',1),{x1:66,y1:270,x2:490,y2:270});
});
test('selection labels name one track or count several',()=>{
 assert.equal(trackSelectionLabel({axis:'columns',indices:[2]}),'Column 3 selected');
 assert.equal(trackSelectionLabel({axis:'rows',indices:[0,1]}),'2 rows selected');
 assert.equal(trackSelectionLabel(null),'');
});
