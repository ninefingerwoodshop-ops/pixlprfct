import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {selectionRoots,selectionTarget,selectedGroup,childSelection,parentSelection,canvasSelection} from '../web/selection.js';
import {svgDocument} from '../web/export.js';
import {compileCssScene} from '../web/css-renderer.js';
import {scaleShapes} from '../web/scaling.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>shapes(e).find(s=>s.id===id),ids=(...values)=>JSON.stringify(values),edit=(e,id,changes)=>e.update(JSON.stringify({...get(e,id),...changes}));
function pair(e,x=0){const a=e.add('rectangle',x,0),b=e.add('text',x+200,30);return {a,b,g:e.group_many(ids(a,b))};}

test('groups are named container layers; group/ungroup each undo atomically and roundtrip',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('text',200,30),before=e.snapshot(),g=e.group_many(ids(a,b));
 assert.equal(get(e,g).kind,'group');assert.deepEqual(shapes(e).filter(s=>s.parent_id===g).map(s=>s.id),[a,b]);
 e.undo();assert.equal(e.snapshot(),before);e.redo();e.rename_group(g,'Button');const saved=e.snapshot();
 const restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);
 assert.deepEqual(JSON.parse(e.ungroup_many(ids(g))),[a,b]);assert.equal(get(e,g),undefined);assert.ok(shapes(e).every(s=>s.parent_id===0));
 e.undo();assert.equal(e.snapshot(),saved);e.free();restored.free();
});
test('nesting, single-layer grouping and ungrouping preserve inner groups and paint order',()=>{
 const e=new Editor(),{a,b,g}=pair(e),c=e.add('ellipse',500,0),outer=e.group_many(ids(g,c));
 assert.equal(get(e,g).parent_id,outer);assert.equal(get(e,a).parent_id,g);
 const saved=e.snapshot();assert.deepEqual(JSON.parse(e.ungroup_many(ids(outer))),[g,c]);assert.equal(get(e,b).parent_id,g);e.undo();assert.equal(e.snapshot(),saved);
 const single=e.group_many(ids(outer));assert.equal(get(e,outer).parent_id,single);e.free();
});
test('moving a child fits every ancestor without moving siblings; groups move their entire subtree once',()=>{
 const e=new Editor(),{a,b,g}=pair(e),outer=e.group_many(ids(g)),oldB=get(e,b),before=e.snapshot();
 edit(e,a,{x:-50,y:-20});assert.equal(get(e,g).x,-50);assert.equal(get(e,outer).x,-50);assert.equal(get(e,outer).y,-20);assert.deepEqual(get(e,b),oldB);
 edit(e,outer,{x:50,y:80});assert.equal(get(e,a).x,50);assert.equal(get(e,a).y,80);assert.equal(get(e,b).x,oldB.x+100);
 e.undo();e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('group resize scales geometry through nested groups and frames without scaling font, stroke or effects',()=>{
 const e=new Editor(),{a,b,g}=pair(e),outer=e.group_many(ids(g)),before=shapes(e),box=get(e,outer);
 edit(e,outer,{width:box.width*2,height:box.height*3});
 for(const id of [a,b,g]){const old=before.find(s=>s.id===id),now=get(e,id);assert.equal(now.x,box.x+(old.x-box.x)*2);assert.equal(now.y,box.y+(old.y-box.y)*3);assert.equal(now.width,old.width*2);assert.equal(now.height,old.height*3);assert.equal(now.stroke_width,old.stroke_width);}
 assert.equal(get(e,b).typography.font_size,before.find(s=>s.id===b).typography.font_size);
 const scaled=scaleShapes(shapes(e),{x:box.x,y:box.y},2);e.update_many(JSON.stringify(scaled));assert.equal(get(e,b).typography.font_size,before.find(s=>s.id===b).typography.font_size*2);e.free();
});
test('copy, paste, duplicate and delete operate on nested trees with independent identities',()=>{
 const e=new Editor(),{a,b,g}=pair(e),outer=e.group_many(ids(g)),copies=JSON.parse(e.duplicate_many(ids(outer))),copy=shapes(e).find(s=>copies.includes(s.id)&&s.parent_id===0);
 assert.equal(copy.kind,'group');assert.notEqual(copy.id,outer);assert.equal(shapes(e).filter(s=>copies.includes(s.id)).length,4);
 const other=new Editor(),pasted=JSON.parse(other.paste_layers(e.copy_layers(ids(outer)),100,200,0));assert.equal(pasted.length,1);assert.equal(shapes(other).length,4);assert.equal(get(other,pasted[0]).x,get(e,outer).x+100);
 const child=e.duplicate(a);assert.equal(get(e,child).parent_id,g);assert.equal(get(e,b).parent_id,g);
 const before=e.snapshot();e.remove(outer);assert.equal(get(e,a),undefined);assert.ok(get(e,copy.id));e.undo();assert.equal(e.snapshot(),before);e.free();other.free();
});
test('layer-panel drops move individual children or entire groups, and reject cycles atomically',()=>{
 const e=new Editor(),{a,b,g}=pair(e),c=e.add('ellipse',600,0),h=e.group_many(ids(c));
 e.drop_layer(a,h,'inside');assert.equal(get(e,a).parent_id,h);assert.equal(get(e,b).parent_id,g);
 e.drop_layer(g,h,'inside');const before=e.snapshot();assert.throws(()=>e.drop_layer(h,g,'inside'));assert.equal(e.snapshot(),before);
 e.drop_layer(b,c,'before');assert.equal(get(e,b).parent_id,h);assert.equal(get(e,g),undefined);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('deleting the last child prunes empty group ancestors in the same undo step',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),g=e.group_many(ids(a)),outer=e.group_many(ids(g)),before=e.snapshot();e.remove(a);assert.equal(shapes(e).length,0);e.undo();assert.equal(e.snapshot(),before);assert.ok(get(e,outer));e.free();
});
test('selection distinguishes groups, direct children, drilling, siblings, marquee and deep selection',()=>{
 const e=new Editor(),{a,b,g}=pair(e),outer=e.group_many(ids(g)),scene=shapes(e);
 assert.equal(selectionTarget(scene,a),outer);assert.equal(selectionTarget(scene,a,[outer],{drill:true}),g);assert.equal(selectionTarget(scene,a,[g],{drill:true}),a);
 assert.equal(selectionTarget(scene,b,[a]),b);assert.equal(selectionTarget(scene,a,[],{deep:true}),a);
 assert.deepEqual(childSelection(scene,[g]),[a,b]);assert.deepEqual(parentSelection(scene,[a,b]),[g]);assert.deepEqual(selectionRoots(scene,[outer,g,a]),[outer]);
 assert.deepEqual(canvasSelection(scene,[a,b]),[outer]);assert.deepEqual(canvasSelection(scene,[a],{deep:true}),[a]);assert.equal(selectedGroup(scene,[a,b]),0);assert.equal(selectedGroup(scene,[g]),g);e.free();
});
test('groups align and distribute as units, including nested descendants',()=>{
 const e=new Editor(),one=pair(e),two=pair(e,700),three=pair(e,1700);e.align_many(ids(one.g,two.g,three.g),'top');const old=get(e,two.a).x-get(e,two.g).x;e.distribute_many(ids(one.g,two.g,three.g),'horizontal');assert.equal(get(e,two.a).x-get(e,two.g).x,old);assert.equal(get(e,two.g).x,850);e.free();
});
test('grouping interleaved siblings occupies the top selected stacking position',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('ellipse',0,0),c=e.add('text',0,0),before=e.snapshot(),g=e.group_many(ids(a,c));assert.deepEqual(shapes(e).map(s=>s.id),[b,g,a,c]);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('group visibility and locking inherit; group empty space is not painted or hit',()=>{
 const e=new Editor(),{a,b,g}=pair(e);assert.equal(e.hit_test(180,10),0);edit(e,g,{hidden:true});assert.equal(e.hit_test(20,20),0);edit(e,g,{hidden:false,locked:true});assert.equal(e.hit_test(20,20),0);edit(e,g,{locked:false});assert.equal(e.hit_test(20,20),a);
 const html=compileCssScene(shapes(e),{}).html;assert.match(html,new RegExp(`data-px-id="${g}"`));
 const svg=svgDocument(shapes(e),get(e,g),1,null,s=>({style:{font_size:20,font_family:'Arial',font_weight:400,line_height:1.2,align:'left'},lines:[]}));assert.doesNotMatch(svg,new RegExp(`width="${get(e,g).width}" height="${get(e,g).height}" rx=`));assert.ok(get(e,b));e.free();
});
test('invalid nesting, locked hierarchy and cross-page grouping leave state intact',()=>{
 const e=new Editor(),{a,g}=pair(e);let before=e.snapshot();assert.throws(()=>e.reparent_many(ids(g),a));assert.equal(e.snapshot(),before);edit(e,g,{locked:true});before=e.snapshot();assert.throws(()=>e.group_many(ids(a)));assert.equal(e.snapshot(),before);
 e.add_page();const c=e.add('ellipse',0,0);before=e.snapshot();assert.throws(()=>e.group_many(ids(g,c)));assert.throws(()=>e.rename_group(g,'Other page'));assert.equal(e.snapshot(),before);e.free();
});
test('groups participate as a single auto-layout child and retain descendant offsets',()=>{
 const e=new Editor(),f=e.add('frame',0,0),{a,b,g}=pair(e);e.reparent_many(ids(g),f);e.auto_layout_selection(ids(f));assert.equal(get(e,a).x-get(e,g).x,0);assert.equal(get(e,b).x-get(e,g).x,200);e.free();
});

test('multiple layers can be dropped into groups and out again in one undo step',()=>{
 const e=new Editor(),{a,b,g}=pair(e),c=e.add('ellipse',600,0),d=e.add('rectangle',800,0),before=e.snapshot();
 e.drop_layers(ids(c,d),g,'inside');assert.deepEqual(shapes(e).filter(s=>s.parent_id===g).map(s=>s.id),[a,b,c,d]);e.undo();assert.equal(e.snapshot(),before);
 e.drop_layers(ids(a,b),d,'before');assert.equal(get(e,g),undefined);assert.deepEqual(shapes(e).filter(s=>!s.parent_id).map(s=>s.id),[c,d,a,b]);e.undo();assert.equal(e.snapshot(),before);
 e.drop_layers(ids(a,b),d,'after');assert.deepEqual(shapes(e).filter(s=>!s.parent_id).map(s=>s.id),[c,a,b,d]);e.free();
});
test('group to auto layout converts the existing container without an extra group wrapper',()=>{
 const e=new Editor(),{a,b,g}=pair(e),before=e.snapshot();assert.equal(e.auto_layout_selection(ids(g)),g);assert.equal(get(e,g).kind,'frame');assert.ok(get(e,g).auto_layout);assert.equal(get(e,a).parent_id,g);assert.equal(get(e,b).parent_id,g);assert.equal(shapes(e).length,3);e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('grouping across nested parents uses the nearest common container and keeps world geometry',()=>{
 const e=new Editor(),f=e.add('frame',0,0),{a,b,g}=pair(e),c=e.add('ellipse',700,0);e.reparent_many(ids(g,c),f);const before=get(e,a),outer=e.group_many(ids(a,c));assert.equal(get(e,outer).parent_id,f);assert.equal(get(e,b).parent_id,g);assert.equal(get(e,a).parent_id,outer);assert.equal(get(e,a).x,before.x);assert.equal(get(e,a).width,before.width);e.free();
});
test('groups in components synchronize nested structure and fitted bounds',()=>{
 const e=new Editor(),f=e.add('frame',0,0),{a,b,g}=pair(e);e.reparent_many(ids(g),f);e.create_component(f);const instance=e.create_instance(f,800,0),copy=shapes(e).find(s=>s.parent_id===instance),copyA=shapes(e).find(s=>s.component?.source===a&&s.id!==a);
 assert.equal(copy.kind,'group');edit(e,a,{x:-30});assert.equal(get(e,copyA.id).x,770);assert.equal(get(e,copy.id).x,770);assert.equal(shapes(e).filter(s=>s.parent_id===copy.id).length,2);e.ungroup_many(ids(g));assert.equal(get(e,copy.id),undefined);assert.equal(get(e,copyA.id).parent_id,instance);assert.ok(get(e,b));e.free();
});

test('resizing a group in the main component keeps instance descendant geometry scaled through component synchronization',()=>{
 const e=new Editor(),f=e.add('frame',0,0),{a,b,g}=pair(e);e.reparent_many(ids(g),f);e.create_component(f);const instance=e.create_instance(f,800,0),copy=shapes(e).find(s=>s.parent_id===instance),copyA=shapes(e).find(s=>s.component?.source===a&&s.id!==a),copyB=shapes(e).find(s=>s.component?.source===b&&s.id!==b),before=e.snapshot();
 assert.throws(()=>edit(e,copy.id,{width:copy.width*2}),/protected/);assert.equal(e.snapshot(),before);
 edit(e,g,{width:copy.width*2});assert.equal(get(e,copy.id).width,copy.width*2);assert.equal(get(e,copyA.id).width,copyA.width*2);assert.equal(get(e,copyB.id).x,copy.x+(copyB.x-copy.x)*2);assert.equal(get(e,copyB.id).typography.font_size,copyB.typography.font_size);e.undo();assert.equal(e.snapshot(),before);e.free();
});

// Measurements from the live Figma reference file AsBSQYyd3KZLGRi0QM1VPg.
test('Figma parity: hidden children do not contribute to group bounds, including all-hidden groups',()=>{
 const e=new Editor(),a=e.add('rectangle',100,100),b=e.add('rectangle',300,140);
 edit(e,a,{width:100,height:80});edit(e,b,{width:80,height:40});const g=e.group_many(ids(a,b)),before=e.snapshot();
 assert.equal(get(e,g).width,280);edit(e,b,{hidden:true});assert.equal(get(e,g).width,100);assert.equal(get(e,g).height,80);
 edit(e,a,{hidden:true});assert.equal(get(e,g).width,0);assert.equal(get(e,g).height,0);
 const saved=e.snapshot(),restored=new Editor();restored.load(saved);assert.equal(restored.snapshot(),saved);
 edit(e,g,{x:150,y:150});assert.equal(get(e,a).x,150);assert.equal(get(e,b).x,350);
 edit(e,a,{hidden:false});assert.equal(get(e,g).width,100);edit(e,b,{hidden:false});assert.equal(get(e,g).width,280);
 for(let i=0;i<5;i++)e.undo();assert.equal(e.snapshot(),before);e.free();restored.free();
});
test('Figma parity: resizing a group scales nested frames but respects their child constraints',()=>{
 const e=new Editor(),f=e.add('frame',600,100),a=e.add('rectangle',620,110),b=e.add('rectangle',850,100);
 edit(e,f,{width:200,height:100});edit(e,a,{width:40,height:20});edit(e,b,{width:50,height:100});e.reparent_many(ids(a),f);
 const g=e.group_many(ids(f,b));edit(e,g,{width:600,height:200});
 assert.equal(get(e,f).width,400);assert.equal(get(e,f).height,200);assert.equal(get(e,b).x,1100);
 assert.equal(get(e,a).x,620);assert.equal(get(e,a).y,110);assert.equal(get(e,a).width,40);assert.equal(get(e,a).height,20);
 edit(e,a,{constraints:{horizontal:'max',vertical:'max'}});edit(e,g,{width:900,height:300});assert.equal(get(e,a).x,820);assert.equal(get(e,a).y,210);e.free();
});
test('Figma parity: nested frame constraints also survive main group resizing in component instances',()=>{
 const e=new Editor(),root=e.add('frame',0,0),f=e.add('frame',20,20),a=e.add('rectangle',40,30);
 edit(e,f,{width:200,height:100});edit(e,a,{width:40,height:20});e.reparent_many(ids(a),f);const g=e.group_many(ids(f));e.reparent_many(ids(g),root);e.create_component(root);
 const instance=e.create_instance(root,800,0),copy=shapes(e).find(s=>s.parent_id===instance),copyA=shapes(e).find(s=>s.id!==a&&s.component?.source===a),copyF=shapes(e).find(s=>s.id!==f&&s.component?.source===f);
 const before=e.snapshot();assert.throws(()=>edit(e,copy.id,{width:400,height:200}),/protected/);assert.equal(e.snapshot(),before);
 edit(e,g,{width:400,height:200});assert.equal(get(e,copyF.id).width,400);assert.equal(get(e,copyF.id).height,get(e,f).height);assert.equal(get(e,copyA.id).width,40);assert.equal(get(e,copyA.id).x,copyA.x);assert.equal(get(e,copyA.id).y,copyA.y);e.free();
});
test('Figma parity: enclosing frame constraints pass through nested groups',()=>{
 const e=new Editor(),f=e.add('frame',1400,100),a=e.add('rectangle',1420,120),b=e.add('rectangle',1600,200);
 edit(e,f,{width:300,height:200});edit(e,a,{width:40,height:30});edit(e,b,{width:40,height:30,constraints:{horizontal:'max',vertical:'max'}});e.reparent_many(ids(a,b),f);
 const g=e.group_many(ids(a,b)),outer=e.group_many(ids(g)),before=e.snapshot();edit(e,f,{width:500,height:400});
 assert.equal(get(e,a).x,1420);assert.equal(get(e,a).y,120);assert.equal(get(e,b).x,1800);assert.equal(get(e,b).y,400);assert.equal(get(e,b).width,40);assert.equal(get(e,g).width,420);assert.equal(get(e,g).height,310);assert.equal(get(e,outer).width,420);e.undo();assert.equal(e.snapshot(),before);
 e.create_component(f);const instance=e.create_instance(f,2200,100),copyB=shapes(e).find(s=>s.id!==b&&s.component?.source===b),copyG=shapes(e).find(s=>s.id!==g&&s.component?.source===g),locked=e.snapshot();
 assert.throws(()=>edit(e,instance,{width:500,height:400}),/protected/);assert.throws(()=>edit(e,copyG.id,{width:600}),/protected/);assert.equal(e.snapshot(),locked);edit(e,f,{width:500,height:400});assert.equal(get(e,copyB.id).x,2600);assert.equal(get(e,copyB.id).y,400);assert.equal(get(e,copyB.id).width,40);e.free();
});
