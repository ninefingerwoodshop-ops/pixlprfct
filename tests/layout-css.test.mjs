import test from 'node:test';import assert from 'node:assert/strict';
import {parseLayoutCss,formatLayoutCss,responsiveLayoutShapes,layoutMediaSource} from '../web/layout-css.js';
const shape={id:1,name:'Layout',width:1000,auto_layout:{direction:'horizontal',gap:16,cross_gap:8,padding_top:12,padding_right:12,padding_bottom:12,padding_left:12,align:'center',justify:'start',align_content:'start',hug_width:false,hug_height:false,wrap:false}};
test('Flex formatting round trips and changes shared visual properties',()=>{const next=parseLayoutCss(formatLayoutCss(shape),shape);assert.equal(next.auto_layout.gap,16);assert.equal(next.auto_layout.cross_gap,8);const edited=parseLayoutCss('.layout {display: flex; flex-direction: column; gap: 10px 20px; padding: 4px 8px;}',shape);assert.equal(edited.auto_layout.direction,'vertical');assert.equal(edited.auto_layout.gap,10);assert.equal(edited.auto_layout.cross_gap,20);assert.equal(edited.auto_layout.padding_left,8);});
test('Grid supports tracks, repeat, minmax and rectangular named areas',()=>{const next=parseLayoutCss('.layout {display:grid; grid-template-columns:repeat(2, 1fr); grid-template-rows:60px auto; grid-template-areas:"header header" "left right"; gap:8px;}',shape);assert.equal(next.auto_layout.grid.columns.length,2);assert.equal(next.auto_layout.grid.areas[0].column_span,2);assert.equal(parseLayoutCss(formatLayoutCss(next),next).auto_layout.grid.columns.length,2);});
test('media queries cascade at outer frame width without mutating base',()=>{const next=parseLayoutCss('.layout { display:flex; } @media (max-width: 768px) {.layout {flex-direction:column;gap:4px;}}',shape);assert.equal(responsiveLayoutShapes([next])[0].auto_layout.direction,'horizontal');assert.equal(responsiveLayoutShapes([{...next,width:600}])[0].auto_layout.direction,'vertical');assert.equal(next.auto_layout.direction,'horizontal');assert.equal(parseLayoutCss(formatLayoutCss(next),shape).layout_media.length,1);const child={...next,id:2,parent_id:1,width:100};assert.equal(responsiveLayoutShapes([shape,child])[1].auto_layout.direction,'horizontal');});
test('responsive context follows the nearest ancestor and respects a layer’s own queries',()=>{
 const parent=parseLayoutCss('.layout {display:grid;} @media (max-width:500px){.layout {gap:8px;}}',shape);
 const child={id:2,parent_id:1},nested={id:3,parent_id:2};
 assert.equal(layoutMediaSource(nested,[parent,child,nested]),parent);
 const own={...child,layout_media:parent.layout_media};
 assert.equal(layoutMediaSource(nested,[parent,own,nested]),own);
 assert.equal(layoutMediaSource(undefined,[]),null);
 assert.equal(layoutMediaSource(child,[{...shape,parent_id:2},child]),null);
});
test('invalid or unrepresentable CSS fails rather than being silently discarded',()=>{for(const css of ['.layout {color:red;}','.layout {display:block;}','.layout {grid-template-columns:banana;}','@media (orientation:portrait){.layout {gap:1px;}} .layout {display:flex;}','.layout {padding:2rem;}'])assert.throws(()=>parseLayoutCss(css,shape));});
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {compileCssScene,cssExport} from '../web/css-renderer.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('responsive CSS survives save/load, previews without history, exports and undoes',()=>{
 const e=new Editor(),id=e.add('frame',0,0);const get=()=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(),auto_layout:shape.auto_layout}));const before=e.snapshot();
 const next=parseLayoutCss('.layout {display:flex;gap:20px;} @media (max-width:768px){.layout {gap:4px;flex-direction:column;}}',get());
 const preview=JSON.parse(e.preview_update_many(JSON.stringify([next])));assert.equal(e.snapshot(),before);assert.equal(preview.shapes.find(s=>s.id===id).layout_media.length,1);
 e.update(JSON.stringify(next));assert.equal(get().layout_media.length,1);
 assert.match(compileCssScene([{...get(),width:600}]).css,/flex-direction:column/);
 assert.match(cssExport([get()]).css,/@media \(max-width:768px\)/);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(JSON.parse(copy.snapshot()).shapes[0].layout_media.length,1);copy.free();
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('masonry Grid switches to Flex at 768px and restores columns above it repeatedly',()=>{
 const base=parseLayoutCss('.layout {display:grid;grid-template-columns:1fr 1fr;gap:24px;} @media (max-width:768px){.layout {display:flex;flex-direction:column;gap:12px;}}',shape);
 base.auto_layout.grid.masonry=true;
 const child={...shape,id:2,parent_id:1,name:'Cell',x:0,y:80,height:50,layout_item:{fill_width:true},auto_layout:null};
 for(const width of [1000,768,600,769,1200,600,1000]){
  const scene=[{...base,width},child],result=compileCssScene(scene),small=width<=768;
  assert.equal(responsiveLayoutShapes(scene)[0].auto_layout.direction,small?'vertical':'grid');
  assert.equal(result.html.includes('data-masonry=""'),!small);
  assert.equal(result.html.includes('data-masonry-item=""'),!small);
  assert.match(result.css,small?/display:flex;flex-direction:column/:/display:grid/);
  if(small)assert.doesNotMatch(result.css,/top:80px/);
 }
 assert.equal(base.auto_layout.direction,'grid');
});
test('active media indicator follows outer frame preview width and cascading queries',async()=>{
 const {layoutMediaState}=await import('../web/layout-css.js');
 const child=parseLayoutCss('.layout {display:grid;grid-template-columns:1fr 1fr;} @media (max-width:768px){.layout {display:flex;flex-direction:column;}} @media (max-width:500px){.layout {gap:8px;}}',{...shape,id:2,parent_id:1});
 for(const [width,count,direction] of [[900,0,'grid'],[768,1,'vertical'],[500,2,'vertical'],[769,0,'grid']]){
  const state=layoutMediaState(child,[{...shape,width},child]);
  assert.equal(state.width,width);assert.equal(state.rules.length,count);assert.equal(state.shape.auto_layout.direction,direction);
 }
 assert.equal(child.auto_layout.direction,'grid');
});

test('canvas CSS and geometry share one cascade when overlapping Grid queries switch to Flex',()=>{
 const source=parseLayoutCss('.layout {display:grid;grid-template-columns:210px 1fr;} @media (max-width:500px){.layout {grid-template-columns:110px 1fr;}} @media (max-width:320px){.layout {display:flex;flex-direction:column;}}',shape);
 for(const [width,direction] of [[500,'grid'],[320,'vertical'],[321,'grid'],[600,'grid']]){
  const compiled=compileCssScene([{...source,width}]),resolved=compiled.shapes[0];
  assert.equal(resolved.auto_layout.direction,direction);
  assert.match(compiled.css,direction==='grid'?/display:grid/:/display:flex;flex-direction:column/);
  assert.equal(resolved.auto_layout.grid.columns[0].value,width<=500?110:210);
 }
 assert.equal(source.auto_layout.direction,'grid');assert.equal(source.auto_layout.grid.columns[0].value,210);
});
test('breakpoint width edits target outer frame, preserve Grid base, and undo',async()=>{
 const {layoutMediaState}=await import('../web/layout-css.js');const {fixedResize}=await import('../web/resizing.js');
 const e=new Editor(),id=e.add('frame',0,0);const get=()=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify(parseLayoutCss('.layout {display:grid;grid-template-columns:1fr 1fr;} @media (max-width:768px){.layout {display:flex;flex-direction:column;}}',{...get(),width:1000,auto_layout:shape.auto_layout})));
 const before=e.snapshot(),height=get().height;
 for(const [width,direction] of [[768,'vertical'],[769,'grid']]){
  const selected={...shape,id:99,parent_id:id},root=layoutMediaState(selected,[get(),selected]).root;
  assert.equal(root.id,id);e.update(JSON.stringify(fixedResize({...root,width},true,false)));
  assert.equal(get().width,width);assert.equal(get().height,height);assert.equal(get().auto_layout.direction,'grid');assert.equal(responsiveLayoutShapes([get()])[0].auto_layout.direction,direction);
 }
 e.undo();e.undo();assert.equal(e.snapshot(),before);e.free();
});
