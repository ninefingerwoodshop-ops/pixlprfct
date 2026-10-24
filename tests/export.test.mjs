import test from 'node:test';
import assert from 'node:assert/strict';
import {exportShapes,exportBounds,exportSize,svgDocument} from '../web/export.js';
const style={opacity:.5,corner_radius:20,fill_enabled:true,stroke_enabled:true,stroke_color:'#112233'};
const frame={id:1,parent_id:0,kind:'frame',x:10,y:20,width:100,height:80,fill:'#ffffff',hidden:false,clip_content:true,appearance:style,stroke_width:4};
const child={id:2,parent_id:1,kind:'rectangle',x:80,y:30,width:100,height:30,fill:'#ff0000',hidden:false};
test('selection export includes descendants once and detaches unselected ancestors',()=>{
 const page=[frame,child,{...child,id:3,parent_id:0,x:300}];const tree=exportShapes(page,[1,2],'selection');assert.deepEqual(tree.map(s=>s.id),[1,2]);assert.equal(tree[1].parent_id,1);
 const single=exportShapes(page,[2],'selection');assert.equal(single[0].parent_id,0);assert.equal(exportBounds(single).width,100);
 assert.equal(exportShapes([{...frame,hidden:true},child],[2],'selection').length,0);assert.throws(()=>exportBounds([]));assert.equal(exportShapes(page,[],'page').length,3);
});
test('bounds include centered strokes and clipped descendants; scale limits avoid oversized raster allocations',()=>{
 const box=exportBounds([frame,child]);assert.deepEqual([box.x,box.y,box.width,box.height],[8,18,104,84]);assert.deepEqual(exportSize(box,2,'png',[frame,child]),{width:208,height:168});
 for(const scale of [0,Infinity,9])assert.throws(()=>exportSize(box,scale,'svg'));
 assert.throws(()=>exportSize({width:9000,height:10},1,'png'));assert.throws(()=>exportSize({width:5000,height:5000},1,'png'));assert.deepEqual(exportSize({width:9000,height:10},1,'svg'),{width:9000,height:10});
});
test('SVG keeps scene coordinates, composited opacity and clipping while scaling output dimensions',()=>{
 const shapes=[frame,child],box=exportBounds(shapes),svg=svgDocument(shapes,box,2,'#abcdef',()=>{});assert.match(svg,/width="208" height="168" viewBox="8 18 104 84"/);assert.match(svg,/fill="#abcdef"/);assert.match(svg,/<g opacity="0.5">/);assert.match(svg,/clip-path="url\(#frame-clip-1\)"/);assert.match(svg,/rx="20"/);assert.match(svg,/stroke="#112233"/);
 assert.throws(()=>svgDocument(shapes,box,1,'url(bad)',()=>{}));const transparent=svgDocument(shapes,box,1,null,()=>{});assert.ok(!transparent.includes('#abcdef'));
});
