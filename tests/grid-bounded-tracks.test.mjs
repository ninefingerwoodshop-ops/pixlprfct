import test from 'node:test';
import assert from 'node:assert/strict';
import {gridTrackCss} from '../web/grid-model.js';
import {formatLayoutCss,parseLayoutCss} from '../web/layout-css.js';

const frame=track=>({id:1,name:'Grid',auto_layout:{direction:'grid',gap:12,cross_gap:12,padding_top:16,padding_right:16,padding_bottom:16,padding_left:16,grid:{columns:[track],rows:[]}}});

test('bounded lengths preserve their preferred size and limits through CSS editing',()=>{
 for(const [mode,value] of [['fixed',160],['percent',25],['em',10]]){
  const track={mode,value,min:100,max:220},source=frame(track),css=formatLayoutCss(source);
  const next=parseLayoutCss(css,source).auto_layout.grid.columns[0];
  assert.deepEqual(next,track);
  assert.match(gridTrackCss(track),/^clamp\(/);
 }
});

test('one-sided bounds preserve size rather than stretching to a minimum or maximum',()=>{
 for(const track of [{mode:'fixed',value:160,min:100},{mode:'fixed',value:160,max:220}]){
  const source=frame(track),next=parseLayoutCss(formatLayoutCss(source),source).auto_layout.grid.columns[0];
  assert.equal(next.value,160);assert.equal(next.min,track.min??0);assert.equal(next.max,track.max??1000000);
 }
 assert.equal(gridTrackCss({mode:'minmax',min:100,min_unit:'px',value:220,max_unit:'px'}),'minmax(100px,220px)');
});

test('bounded track CSS rejects invalid ranges and fractional preferred sizes',()=>{
 for(const value of ['clamp(220px,160px,100px)','clamp(100px,1fr,220px)','clamp(20%,160px,220px)']){
  assert.throws(()=>parseLayoutCss(`.layout { display: grid; grid-template-columns: ${value}; }`,frame({mode:'fixed',value:100})));
 }
});
