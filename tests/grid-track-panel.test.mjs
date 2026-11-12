import test from 'node:test';
import assert from 'node:assert/strict';
import {trackValueText,parseTrackValue} from '../web/grid-track-panel.js';

test('the value field shows the size with its unit and is editable only for numeric sizing',()=>{
 assert.deepEqual(trackValueText({mode:'fr',value:1}),{text:'1fr',editable:true});
 assert.deepEqual(trackValueText({mode:'fr'}),{text:'1fr',editable:true});
 assert.deepEqual(trackValueText({mode:'fixed',value:154.666}),{text:'154.67',editable:true});
 assert.deepEqual(trackValueText({mode:'percent',value:25}),{text:'25%',editable:true});
 assert.deepEqual(trackValueText({mode:'em',value:2}),{text:'2em',editable:true});
 assert.deepEqual(trackValueText({mode:'hug'}),{text:'Hug',editable:false});
 for(const [mode,text] of [['auto','Auto'],['min-content','Min content'],['max-content','Max content'],['minmax','Min / max'],['unknown','Auto']])assert.deepEqual(trackValueText({mode}),{text,editable:false});
});

test('typed values keep the unit and reject anything that is not a usable size',()=>{
 const fr={mode:'fr',value:1,min:null,max:null},fixed={mode:'fixed',value:100,min:10,max:null};
 assert.deepEqual(parseTrackValue(fr,'2.5fr'),{...fr,value:2.5});assert.deepEqual(parseTrackValue(fr,' 3 '),{...fr,value:3});
 // A decimal comma is accepted; limits are kept.
 assert.deepEqual(parseTrackValue(fixed,'120,5'),{...fixed,value:120.5});assert.deepEqual(parseTrackValue(fixed,'0'),{...fixed,value:0});
 for(const bad of ['','wide','fr','-4','1000001','NaN','Infinity'])assert.equal(parseTrackValue(fixed,bad),null,bad);
 // A share of zero would collapse the track.
 assert.equal(parseTrackValue(fr,'0'),null);assert.equal(parseTrackValue(fr,'0.0001'),null);assert.deepEqual(parseTrackValue(fr,'0.001'),{...fr,value:.001});
});
