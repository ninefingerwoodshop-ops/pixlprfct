import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutArrowOrder} from '../web/layout-keyboard.js';
test('arrow reordering follows parent flow, preserves selection, and leaves absolute layers to nudging',()=>{
 const parent={id:1,auto_layout:{direction:'horizontal'}},a={id:2,parent_id:1},b={id:3,parent_id:1},all=[parent,a,b];
 assert.deepEqual(layoutArrowOrder([a,b],all,'ArrowRight'),{ids:[2,3],direction:'forward'});
 assert.deepEqual(layoutArrowOrder([b],all,'ArrowLeft'),{ids:[3],direction:'backward'});
 assert.deepEqual(layoutArrowOrder([b],all,'ArrowDown').ids,[]);
 parent.auto_layout.direction='vertical';
 assert.deepEqual(layoutArrowOrder([b],all,'ArrowDown'),{ids:[3],direction:'forward'});
 assert.equal(layoutArrowOrder([{...a,layout_item:{absolute:true}}],all,'ArrowDown'),null);
 assert.equal(layoutArrowOrder([parent],all,'ArrowRight'),null);
 const child={id:4,parent_id:2};assert.deepEqual(layoutArrowOrder([a,child],[...all,child],'ArrowUp').ids,[2]);
});
test('flow reordering changes layout positions and undoes in one step',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {default:init,Editor}=await import('../web/pkg/pixlprfct_core.js');
 await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
 const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('rectangle',200,0);
 const frame=e.auto_layout_selection(JSON.stringify([a,b]));
 const before=e.snapshot(),doc=JSON.parse(before),s=doc.shapes.find(s=>s.id===a);
 const parent=doc.shapes.find(s=>s.id===frame),key=parent.auto_layout.direction==='horizontal'?'ArrowRight':'ArrowDown';
 const plan=layoutArrowOrder([s],doc.shapes,key);e.arrange_many(JSON.stringify(plan.ids),plan.direction);
 const next=JSON.parse(e.snapshot()).shapes;
 assert.deepEqual(next.filter(s=>s.parent_id===frame).map(s=>s.id),[b,a]);
 const axis=key==='ArrowRight'?'x':'y';
 assert.ok(next.find(s=>s.id===a)[axis]>next.find(s=>s.id===b)[axis]);
 e.undo();assert.equal(e.snapshot(),before);e.free();
});
