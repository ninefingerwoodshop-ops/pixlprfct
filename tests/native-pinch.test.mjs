import test from 'node:test';
import assert from 'node:assert/strict';
import {installNativePinch} from '../web/native-pinch.js';
function setup(){
 const target=new EventTarget();let zoom=1,starts=0;
 const active=installNativePinch(target,{start:()=>starts++,scale:factor=>zoom*=factor,end:()=>{}});
 const send=(type,scale)=>{const event=new Event(type,{cancelable:true});event.scale=scale;target.dispatchEvent(event);return event;};
 return {send,active,zoom:()=>zoom,starts:()=>starts};
}
test('native cumulative scale is applied once, including the final sample',()=>{
 const s=setup();assert.ok(s.send('gesturestart',1).defaultPrevented);assert.ok(s.active());
 s.send('gesturechange',1.5);s.send('gesturechange',2);s.send('gestureend',2.5);
 assert.equal(s.zoom(),2.5);assert.equal(s.active(),false);
 s.send('gesturestart',1);s.send('gesturechange',.5);s.send('gestureend',.5);
 assert.equal(s.zoom(),1.25);
});
test('invalid scale cannot corrupt zoom and blur ends a gesture',()=>{
 const s=setup();s.send('gesturechange',2);s.send('gesturechange',NaN);s.send('gesturechange',0);
 assert.equal(s.zoom(),2);assert.equal(s.starts(),1);
 s.send('blur');assert.equal(s.active(),false);
});
