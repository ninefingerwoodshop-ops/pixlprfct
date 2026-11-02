import test from 'node:test';
import assert from 'node:assert/strict';
import {newSvgAnimation,putKey,trackValue,validateAnimation} from '../web/svg-animation-model.js';
import {validGradientStops} from '../web/svg-animation-gradient-model.js';
const stops=[{offset:0,color:'#ff0000',opacity:1},{offset:1,color:'#0000ff',opacity:.5}];
test('gradient stop interpolation includes color, position and opacity independently of object rotation',()=>{
 let a=newSvgAnimation().svg_animation;a=putKey(a,'pxv2','fillGradient',0,stops);const end=[{offset:.2,color:'#0000ff',opacity:.5},{offset:.8,color:'#ff0000',opacity:1}];a=putKey(a,'pxv2','fillGradient',3000,end);a=putKey(a,'pxv2','fillGradientRotation',3000,360);a=putKey(a,'pxv2','rotation',3000,90);
 assert.deepEqual(trackValue(a.tracks[0],1500),[{offset:.1,color:'#800080',opacity:.75},{offset:.9,color:'#800080',opacity:.75}]);assert.equal(trackValue(a.tracks[1],1500),180);assert.equal(trackValue(a.tracks[2],1500),45);assert.doesNotThrow(()=>validateAnimation({...newSvgAnimation(),svg_animation:a}));
});
test('gradient stop topology, ordering, colors and opacity are validated',()=>{
 let a=putKey(newSvgAnimation().svg_animation,'pxv2','fillGradient',0,stops);assert.throws(()=>putKey(a,'pxv2','fillGradient',1000,[stops[0]]),/same number/);for(const value of [[...stops].reverse(),[{...stops[0],opacity:2}], [{...stops[0],color:'url(#bad)'}],[]])assert.equal(validGradientStops(value),false);
 a.tracks[0].keys.push({time:3000,value:[stops[0]],easing:'linear'});assert.throws(()=>validateAnimation({...newSvgAnimation(),svg_animation:a}),/same number/);
});
