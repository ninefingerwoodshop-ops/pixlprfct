import test from 'node:test';
import assert from 'node:assert/strict';
import {morphPath} from '../web/svg-animation-morph.js';
import {joinTransformedPaths,continuePath} from '../web/svg-animation-drawing-model.js';
const identity={a:1,b:0,c:0,d:1,e:0,f:0};
test('separate-path joining transforms anchors and handles and retains unrelated subpaths and mirroring',()=>{
 const left=morphPath('M0 0L10 10M-20 -20L-10 -10'),right=morphPath('M5 5C6 8 9 6 10 10C12 14 15 15 20 20M30 30L40 40');right[0].mirroring=['n','a','n'];
 const before=structuredClone({left,right}),matrix={a:0,b:2,c:-3,d:0,e:30,f:40},next=joinTransformedPaths(left,[0,1],right,[0,0],matrix);
 assert.deepEqual(next.selection,[0,1]);assert.equal(next.value.length,3);assert.deepEqual(next.value[1],left[1]);
 const transform=point=>point.flatMap((_,i)=>i%2?[]:[-3*point[i+1]+30,2*point[i]+40]);
 assert.deepEqual(next.value[0].points[3],transform(right[0].points[1]));assert.deepEqual(next.value[2].points,right[1].points.map(transform));assert.deepEqual(next.value[0].mirroring,['n','n','n','a','n']);assert.deepEqual({left,right},before);
});
test('separate-path joining preserves cubic geometry for all endpoint orientations and coincident seams',()=>{
 const first=morphPath('M0 0C20 40 70 -10 100 0'),second=morphPath('M0 0C20 -40 70 10 100 0'),matrix={...identity,e:100};
 const expected=joinTransformedPaths(first,[0,1],second,[0,0],matrix).value;
 for(const reverseFirst of [false,true])for(const reverseSecond of [false,true]){
  const a=reverseFirst?continuePath(first,0,0):first,b=reverseSecond?continuePath(second,0,0):second;
  assert.deepEqual(joinTransformedPaths(a,[0,reverseFirst?0:1],b,[0,reverseSecond?1:0],matrix).value,expected);
 }
 assert.equal(expected[0].points.length,3);assert.deepEqual(expected[0].points[1],[100,0,70,-10,120,-40]);
});
test('failed separate-path joins are atomic for singular transforms, coordinate limits and combined topology limits',()=>{
 const left=morphPath('M0 0L10 10'),right=morphPath('M20 20L30 30'),before=structuredClone({left,right});
 for(const matrix of [{...identity,a:0},{...identity,e:NaN},{...identity,e:100000}])assert.throws(()=>joinTransformedPaths(left,[0,1],right,[0,0],matrix));
 const many=Array.from({length:64},()=>right[0]);assert.throws(()=>joinTransformedPaths([...left,...left],[0,1],many,[0,0],identity),/2–512/);
 const dense=[{closed:false,points:Array.from({length:512},(_,i)=>[i,0,i,0,i,0])}];assert.throws(()=>joinTransformedPaths(dense,[0,511],right,[0,0],identity),/2–512/);assert.deepEqual({left,right},before);
});
