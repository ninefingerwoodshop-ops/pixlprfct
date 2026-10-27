import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {fixedResize} from '../web/resizing.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),ids=(...a)=>JSON.stringify(a),set=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
const box=s=>[s.x,s.y,s.width,s.height];
function rect(e,x,y,w,h){const id=e.add('rectangle',x,y);set(e,id,{width:w,height:h});return id;}
const l={direction:'horizontal',gap:20,padding_left:10,padding_right:10,padding_top:10,padding_bottom:10,align:'center',justify:'center',hug_width:false,hug_height:false};
// Exact measurements from live Figma file AsBSQYyd3KZLGRi0QM1VPg, 2026-10-25.
test('Figma Shift+A infers horizontal order, gap, zero padding and hug without painting a wrapper',()=>{
 const e=new Editor(),b=rect(e,2330,100,100,40),a=rect(e,2200,100,100,40),before=e.snapshot();const f=e.auto_layout_selection(ids(b,a)),s=get(e,f);
 assert.deepEqual(box(s),[2200,100,230,40]);assert.equal(s.auto_layout.direction,'horizontal');assert.equal(s.auto_layout.gap,30);assert.equal(s.auto_layout.align,'center');assert.equal(s.auto_layout.hug_width,true);assert.equal(s.clip_content,false);assert.equal(s.appearance.fill_enabled,false);
 assert.deepEqual(all(e).filter(s=>s.parent_id===f).map(s=>s.id),[a,b]);assert.equal(get(e,b).x,2330);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('Figma vertical conversion preserves unequal widths and fills only full-width children',()=>{
 const e=new Editor(),b=rect(e,3700,370,60,40),a=rect(e,3700,300,100,40),g=e.group_many(ids(a,b));assert.equal(e.auto_layout_selection(ids(g)),g);
 assert.deepEqual(box(get(e,g)),[3700,300,100,110]);assert.equal(get(e,g).auto_layout.direction,'vertical');assert.equal(get(e,g).auto_layout.gap,30);assert.equal(get(e,g).auto_layout.hug_width,false);assert.equal(get(e,a).layout_item.fill_width,true);assert.equal(get(e,b).layout_item.fill_width,false);assert.equal(get(e,b).width,60);
 set(e,g,{width:200});assert.equal(get(e,a).width,200);assert.equal(get(e,b).width,60);e.free();
});
test('Figma conversion derives paired padding from existing frames and preserves clipping',()=>{
 const e=new Editor(),f=e.add('frame',2600,100),a=rect(e,2630,140,80,40),b=rect(e,2750,140,80,40);set(e,f,{width:300,height:200});e.reparent_many(ids(a,b),f);e.auto_layout_selection(ids(f));const s=get(e,f);
 assert.deepEqual(box(s),[2600,100,260,120]);assert.deepEqual([s.auto_layout.padding_left,s.auto_layout.padding_right,s.auto_layout.padding_top,s.auto_layout.padding_bottom],[30,30,40,40]);assert.equal(s.auto_layout.gap,40);assert.equal(s.clip_content,true);assert.deepEqual(box(get(e,a)),[2630,140,80,40]);e.free();
});
test('Figma single rectangle wraps with ten-pixel padding and vertical fill sizing',()=>{
 const e=new Editor(),a=rect(e,3700,100,100,40),f=e.auto_layout_selection(ids(a));assert.deepEqual(box(get(e,f)),[3690,90,120,60]);assert.deepEqual(box(get(e,a)),[3700,100,100,40]);assert.equal(get(e,f).auto_layout.direction,'vertical');assert.equal(get(e,a).layout_item.fill_width,true);e.free();
});
test('Figma empty auto-layout frames keep their size instead of collapsing to padding',()=>{
 const e=new Editor(),f=e.add('frame',2600,400);set(e,f,{width:300,height:200});e.auto_layout_selection(ids(f));assert.deepEqual(box(get(e,f)),[2600,400,300,200]);assert.equal(get(e,f).auto_layout.gap,10);assert.equal(get(e,f).auto_layout.padding_left,10);
 const a=rect(e,0,0,80,40);e.reparent_many(ids(a),f);const before=box(get(e,f));set(e,a,{hidden:true});assert.deepEqual(box(get(e,f)),before);e.remove(a);assert.deepEqual(box(get(e,f)),before);const copy=new Editor();copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());copy.free();e.free();
});
test('Figma center/end overflow uses signed free space; space-between never adds negative gaps',()=>{
 const e=new Editor(),f=e.add('frame',3200,100),a=rect(e,0,0,80,100),b=rect(e,0,0,80,100);e.reparent_many(ids(a,b),f);set(e,f,{width:100,height:80,auto_layout:l});assert.deepEqual(box(get(e,a)),[3160,90,80,100]);assert.deepEqual(box(get(e,b)),[3260,90,80,100]);
 set(e,f,{auto_layout:{...l,align:'end',justify:'end'}});assert.equal(get(e,a).x,3110);assert.equal(get(e,b).x,3210);assert.equal(get(e,a).y,70);
 set(e,f,{auto_layout:{...l,align:'end',justify:'between'}});assert.equal(get(e,a).x,3210);assert.equal(get(e,b).x,3290);e.free();
});
test('manual dimension edits switch only edited axes from Hug/Fill to Fixed',()=>{
 const e=new Editor(),a=rect(e,0,0,100,40),b=rect(e,130,0,100,40),f=e.auto_layout_selection(ids(a,b)),before=e.snapshot();
 e.update(JSON.stringify(fixedResize({...get(e,f),width:500},true,false)));assert.equal(get(e,f).width,500);assert.equal(get(e,f).auto_layout.hug_width,false);assert.equal(get(e,f).auto_layout.hug_height,true);set(e,a,{height:80});assert.equal(get(e,f).height,80);e.undo();e.undo();assert.equal(e.snapshot(),before);
 const child=fixedResize({...get(e,a),layout_item:{fill_width:true,fill_height:true}},true,false);assert.equal(child.layout_item.fill_width,false);assert.equal(child.layout_item.fill_height,true);e.free();
});
test('new Figma frames clip by default; frame-selection wrappers preserve content outside child frames',()=>{
 const e=new Editor(),f=e.add('frame',0,0),a=rect(e,300,0,50,40);set(e,f,{width:100,height:100});e.reparent_many(ids(a),f);assert.equal(get(e,f).clip_content,true);assert.equal(e.hit_test(310,10),0);set(e,f,{clip_content:false});assert.equal(e.hit_test(310,10),a);const wrapper=e.frame_selection(ids(f));assert.equal(get(e,wrapper).clip_content,false);assert.equal(get(e,f).parent_id,wrapper);e.free();
});
test('Figma frame constraint matrix matches fixed, pinned, centered, stretch and scale geometry',()=>{
 const e=new Editor(),f=e.add('frame',4100,100);set(e,f,{width:300,height:200});const modes=['min','max','center','stretch','scale'],expected=[[20,20,40,30],[220,220,40,30],[120,120,40,30],[20,20,240,230],[100/3,40,200/3,60]];
 const children=modes.map(mode=>{const a=rect(e,4120,120,40,30);e.reparent_many(ids(a),f);set(e,a,{constraints:{horizontal:mode,vertical:mode}});return a;});set(e,f,{width:500,height:400});children.forEach((id,i)=>{const s=get(e,id);[s.x-4100,s.y-100,s.width,s.height].forEach((n,j)=>assert.ok(Math.abs(n-expected[i][j])<1e-6));});e.free();
});
test('CSS canvas preserves empty-frame dimensions and removes fixed gaps for automatic spacing',async()=>{
 const {compileCssScene}=await import('../web/css-renderer.js');const e=new Editor(),f=e.add('frame',0,0);set(e,f,{width:300,height:200});e.auto_layout_selection(ids(f));let css=compileCssScene(all(e)).css;assert.match(css,new RegExp(`\\.${get(e,f).layout_class}\\{[^}]*width:300px;[^}]*height:200px`));
 const a=rect(e,0,0,80,40),b=rect(e,0,0,80,40);e.reparent_many(ids(a,b),f);set(e,f,{auto_layout:{...l,justify:'between'}});css=compileCssScene(all(e)).css;assert.match(css,/gap:20px 0px/);set(e,f,{auto_layout:{...l,gap:-20,justify:'start'}});css=compileCssScene(all(e)).css;assert.match(css,new RegExp(`\\.${get(e,b).layout_class}\\{[^}]*margin-left:-20px`));e.free();
});
test('removing auto layout preserves frame and child geometry in one undo step',()=>{
 const e=new Editor(),a=rect(e,0,0,100,40),b=rect(e,0,70,60,40),f=e.auto_layout_selection(ids(a,b)),before=e.snapshot(),geometry=all(e).map(box);set(e,f,{auto_layout:null});assert.deepEqual(all(e).map(box),geometry);assert.equal(get(e,f).kind,'frame');e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('Figma regular two-dimensional conversion uses fixed grid tracks and Fill cells',()=>{
 const e=new Editor(),f=e.add('frame',4800,100);set(e,f,{width:340,height:220});
 const children=[[180,140],[20,20],[180,20],[20,140]].map(([x,y])=>rect(e,4800+x,100+y,120,60));e.reparent_many(ids(...children),f);const before=e.snapshot();e.auto_layout_selection(ids(f));
 const s=get(e,f);assert.equal(s.auto_layout.direction,'grid');assert.deepEqual(box(s),[4800,100,340,220]);assert.equal(s.auto_layout.gap,40);assert.equal(s.auto_layout.cross_gap,60);
 assert.deepEqual(children.map(id=>box(get(e,id))),[[4990,240,130,60],[4820,120,130,60],[4990,120,130,60],[4820,240,130,60]]);
 set(e,f,{width:440,height:320});assert.deepEqual(box(get(e,children[0])),[5040,290,180,110]);e.undo();e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('Figma nested row groups remain groups when their outer group becomes auto layout',()=>{
 const e=new Editor();const a=rect(e,5300,100,120,60),b=rect(e,5460,100,120,60),c=rect(e,5300,220,120,60),d=rect(e,5460,220,120,60);
 const row1=e.group_many(ids(a,b)),row2=e.group_many(ids(c,d)),outer=e.group_many(ids(row1,row2));e.auto_layout_selection(ids(outer));
 assert.equal(get(e,outer).auto_layout.direction,'vertical');assert.equal(get(e,outer).auto_layout.gap,60);assert.deepEqual(box(get(e,outer)),[5300,100,280,180]);assert.equal(get(e,row1).kind,'group');assert.equal(get(e,row2).kind,'group');assert.equal(get(e,a).parent_id,row1);e.free();
});
test('Figma nested Fill-width wrapped rows propagate Hug height through parent resize and visibility',()=>{
 const e=new Editor(),outer=e.add('frame',5800,100),inner=e.add('frame',5820,120);const children=[0,1,2].map(()=>rect(e,0,0,120,40));e.reparent_many(ids(...children),inner);e.reparent_many(ids(inner),outer);
 set(e,inner,{width:280,height:112,auto_layout:{...l,wrap:true,gap:12,cross_gap:12,hug_height:true,align:'start',justify:'start'},layout_item:{...get(e,inner).layout_item,fill_width:true}});
 set(e,outer,{width:320,auto_layout:{...l,direction:'vertical',padding_left:20,padding_right:20,padding_top:20,padding_bottom:20,hug_height:true,align:'start',justify:'start'}});
 assert.deepEqual(box(get(e,outer)),[5800,100,320,152]);assert.deepEqual(box(get(e,inner)),[5820,120,280,112]);assert.deepEqual(children.map(id=>box(get(e,id))),[[5830,130,120,40],[5962,130,120,40],[5830,182,120,40]]);
 const before=e.snapshot();set(e,outer,{width:220});assert.equal(get(e,outer).height,204);assert.equal(get(e,inner).height,164);assert.deepEqual(box(get(e,children[2])),[5830,234,120,40]);set(e,children[2],{hidden:true});assert.equal(get(e,outer).height,152);assert.equal(get(e,inner).height,112);e.undo();e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('Figma three-level Hug ancestors, Fill footer and absolute overlay follow nested wrapping',()=>{
 const e=new Editor(),shell=e.add('frame',6300,100),outer=e.add('frame',6320,120),inner=e.add('frame',6340,140),footer=rect(e,0,0,100,30),overlay=rect(e,6590,120,60,60),children=[0,1,2].map(()=>rect(e,0,0,120,40));
 e.reparent_many(ids(...children,overlay),inner);set(e,overlay,{layout_item:{...get(e,overlay).layout_item,absolute:true}});e.reparent_many(ids(inner),outer);e.reparent_many(ids(outer,footer),shell);
 const vertical={...l,direction:'vertical',align:'start',justify:'start',padding_left:20,padding_right:20,padding_top:20,padding_bottom:20,hug_height:true};
 set(e,inner,{width:280,auto_layout:{...l,align:'start',justify:'start',gap:12,cross_gap:12,wrap:true,hug_height:true},layout_item:{...get(e,inner).layout_item,fill_width:true}});
 set(e,outer,{width:320,auto_layout:vertical,layout_item:{...get(e,outer).layout_item,fill_width:true}});set(e,footer,{layout_item:{...get(e,footer).layout_item,fill_width:true}});set(e,shell,{width:360,auto_layout:{...vertical,gap:16}});
 assert.deepEqual(box(get(e,shell)),[6300,100,360,238]);assert.deepEqual(box(get(e,footer)),[6320,288,320,30]);const before=e.snapshot();set(e,shell,{width:260});assert.deepEqual(box(get(e,shell)),[6300,100,260,290]);assert.deepEqual(box(get(e,footer)),[6320,340,220,30]);assert.deepEqual(box(get(e,overlay)),[6590,120,60,60]);const copy=new Editor();copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());e.undo();assert.equal(e.snapshot(),before);copy.free();e.free();
});
for(const [name,boxes,gap,cross,expected] of [
 ['unequal cells',[[20,20,100,40],[160,20,160,60],[20,120,80,80],[160,120,120,40]],50,60,[[20,20,135,70],[205,20,135,70],[20,150,135,70],[205,150,135,70]]],
 ['missing cell',[[20,20,100,60],[160,20,100,60],[20,120,100,60]],40,40,[[20,20,140,80],[200,20,140,80],[20,140,140,80]]]
]) test(`Figma irregular grid inference: ${name}`,()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,{width:360,height:240});const children=boxes.map(b=>rect(e,...b));e.reparent_many(ids(...children),f);const before=e.snapshot();e.auto_layout_selection(ids(f));assert.equal(get(e,f).auto_layout.direction,'grid');assert.equal(get(e,f).auto_layout.gap,gap);assert.equal(get(e,f).auto_layout.cross_gap,cross);assert.deepEqual(children.map(id=>box(get(e,id))),expected);e.undo();assert.equal(e.snapshot(),before);e.free();
});
for(const [name,boxes,gap,align,expected] of [
 ['staggered',[[20,20,80,40],[130,50,100,60],[260,10,60,80]],30,'start',[[20,10,80,40],[130,10,100,60],[260,10,60,80]]],
 ['overlapping',[[20,20,100,60],[90,30,100,60],[160,20,100,60]],0,'center',[[20,20,100,60],[120,20,100,60],[220,20,100,60]]],
 ['uneven gaps',[[20,20,60,40],[100,20,100,40],[280,20,40,40]],50,'center',[[20,20,60,40],[130,20,100,40],[280,20,40,40]]]
]) test(`Figma irregular row inference: ${name}`,()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,{width:360,height:240});const children=boxes.map(b=>rect(e,...b));e.reparent_many(ids(...children),f);e.auto_layout_selection(ids(f));assert.equal(get(e,f).auto_layout.direction,'horizontal');assert.equal(get(e,f).auto_layout.gap,gap);assert.equal(get(e,f).auto_layout.align,align);assert.deepEqual(children.map(id=>box(get(e,id))),expected);e.free();
});
test('Figma contained overlays become absolute without affecting Hug bounds',()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,{width:360,height:280});const a=rect(e,20,20,240,180),b=rect(e,60,60,60,40),c=rect(e,160,130,60,40);e.reparent_many(ids(a,b,c),f);const before=e.snapshot();e.auto_layout_selection(ids(f));assert.deepEqual(box(get(e,f)),[0,0,280,220]);assert.equal(get(e,f).auto_layout.direction,'vertical');assert.equal(get(e,f).auto_layout.gap,10);assert.equal(get(e,a).layout_item.fill_width,true);assert.equal(get(e,b).layout_item.absolute,true);assert.equal(get(e,c).layout_item.absolute,true);assert.deepEqual(box(get(e,b)),[60,60,60,40]);assert.deepEqual(box(get(e,c)),[160,130,60,40]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('Figma rotated fixed children retain angles and use visual bounds for auto layout',async()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,{width:360,height:280});const a=rect(e,40,80,100,40),b=rect(e,210,80,100,40);set(e,a,{rotation:30});set(e,b,{rotation:-30});e.reparent_many(ids(a,b),f);const before=e.snapshot();e.auto_layout_selection(ids(f));const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} vs ${b}`);
 near(get(e,f).width,336.205078);near(get(e,f).height,144.641022);assert.equal(get(e,f).auto_layout.gap,43);near(get(e,a).x,40);near(get(e,a).y,80);near(get(e,b).x,209.602539);near(get(e,b).y,30);assert.equal(get(e,a).rotation,30);assert.equal(e.hit_test(90,65),a);assert.notEqual(e.hit_test(42,32),a);
 const {compileCssScene}=await import('../web/css-renderer.js');const css=compileCssScene(all(e));assert.match(css.html,/rotate\(-30 /);assert.match(css.css,/width:106\.602/);const copy=new Editor();copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());e.undo();assert.equal(e.snapshot(),before);copy.free();e.free();
});
for(const [name,boxes,frame,expected] of [
 ['overlapping 2 by 2',[[20,20,120,100],[100,20,120,100],[20,80,120,100],[100,80,120,100]],[0,0,360,520],[[20,260,320,120],[20,20,320,120],[20,380,320,120],[20,140,320,120]]],
 ['diagonal overlap',[[20,20,120,100],[90,80,120,100],[160,140,120,100]],[0,0,360,280],[[180,20,160,110],[20,20,160,110],[180,150,160,110]]]
])test(`Figma collision-aware grid conversion: ${name}`,()=>{
 const e=new Editor(),f=e.add('frame',0,0);set(e,f,{width:360,height:280});const children=boxes.map(b=>rect(e,...b));e.reparent_many(ids(...children),f);const before=e.snapshot();e.auto_layout_selection(ids(f));assert.equal(get(e,f).auto_layout.direction,'grid');assert.deepEqual(box(get(e,f)),frame);assert.deepEqual(children.map(id=>box(get(e,id))),expected);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('rotation contributes to groups and exported bounds',async()=>{
 const e=new Editor(),a=rect(e,40,80,100,40);set(e,a,{rotation:30});const g=e.group_many(ids(a)),s=get(e,g);assert.ok(Math.abs(s.y-30)<1e-6);assert.ok(Math.abs(s.width-106.602540378)<1e-6);const before=e.snapshot();set(e,g,{rotation:15});assert.equal(get(e,g).rotation,15);e.undo();assert.equal(e.snapshot(),before);
 const {exportBounds}=await import('../web/export.js'),{cssExport}=await import('../web/css-renderer.js');const bounds=exportBounds([{...get(e,a),parent_id:0}]);assert.ok(Math.abs(bounds.y-30)<1e-6);const result=cssExport([{...get(e,a),parent_id:0}]);assert.match(result.css,/min-height:84\.641/);assert.match(result.css,/top:0px/);e.free();
});
