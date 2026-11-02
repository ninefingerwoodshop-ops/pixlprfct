import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lassoSelection} from '../web/svg-animation-lasso.js';
const outline=points=>points.map(([x,y])=>({x,y}));
const anchors=points=>points.map(([x,y],index)=>({x,y,path:index%2,index}));

test('lasso uses the concave region, includes its boundary, and closes either winding',()=>{
 const shape=outline([[0,0],[100,0],[100,30],[30,30],[30,100],[0,100]]),points=anchors([[15,15],[70,15],[15,70],[70,70],[30,60],[0,0],[101,15]]),expected=[[0,0],[1,1],[0,2],[0,4],[1,5]],before=structuredClone(shape);
 assert.deepEqual(lassoSelection(points,shape),expected);assert.deepEqual(lassoSelection(points,[...shape].reverse()),expected);assert.deepEqual(shape,before);
});
test('self-crossing lobes use even/odd fill; repeated points and straight traces create no false region',()=>{
 const bow=outline([[0,0],[100,100],[0,100],[100,0]]),points=anchors([[50,20],[50,80],[10,50],[50,50]]);assert.deepEqual(lassoSelection(points,bow),[[0,0],[1,1],[1,3]]);
 const square=outline([[0,0],[0,0],[100,0],[100,100],[0,100],[0,0]]);assert.deepEqual(lassoSelection(anchors([[50,50],[100,100],[110,50]]),square),[[0,0],[1,1]]);
 for(const trace of [[],[[0,0]],[[0,0],[100,100]],[[0,0],[30,30],[60,60],[0,0]],[[4,4],[4,4],[4,4]]])assert.deepEqual(lassoSelection(points,outline(trace)),[]);
});
test('lasso membership is preserved through rotation, skew, reflection and fractional scale',()=>{
 const shape=outline([[0,0],[100,0],[100,30],[30,30],[30,100],[0,100]]),points=anchors([[15,15],[70,15],[15,70],[70,70],[30,60]]),expected=lassoSelection(points,shape);
 for(const m of [{a:.22,b:.4,c:-1.2,d:.6,e:500.3,f:200.7},{a:-2,b:0,c:.5,d:1.2,e:300,f:100}]){
  const map=p=>({...p,x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f});assert.deepEqual(lassoSelection(points.map(map),shape.map(map)),expected);
 }
});
