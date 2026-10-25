import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),set=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v}));
test('single frame aligns to its parent and carries descendants in one history step',()=>{
 const e=new Editor(),parent=e.add('frame',100,200),child=e.add('frame',130,240),nested=e.add('rectangle',140,250);set(e,parent,{width:600,height:400});set(e,child,{width:100,height:80});e.reparent_many(JSON.stringify([nested]),child);e.reparent_many(JSON.stringify([child]),parent);e.clear_history();const before=e.snapshot();
 const expected={left:[100,240],center:[350,240],right:[600,240],top:[130,200],middle:[130,360],bottom:[130,520]};
 for(const [mode,xy] of Object.entries(expected)){e.align_many(JSON.stringify([child]),mode);const c=get(e,child),n=get(e,nested);assert.deepEqual([c.x,c.y],xy);assert.deepEqual([n.x-c.x,n.y-c.y],[10,10]);e.undo();assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);}e.free();
});
test('root layers and auto-layout children reject manual parent alignment atomically',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('rectangle',20,30);const before=e.snapshot();assert.throws(()=>e.align_many(JSON.stringify([c]),'left'),/frame/);assert.equal(e.snapshot(),before);e.reparent_many(JSON.stringify([c]),f);set(e,f,{auto_layout:{direction:'horizontal',gap:10,padding_top:0,padding_right:0,padding_bottom:0,padding_left:0,align:'start',justify:'start',hug_width:false,hug_height:false}});const flow=e.snapshot();assert.throws(()=>e.align_many(JSON.stringify([c]),'right'),/auto-layout/);assert.equal(e.snapshot(),flow);set(e,c,{layout_item:{...get(e,c).layout_item,absolute:true}});e.align_many(JSON.stringify([c]),'right');assert.equal(get(e,c).x+get(e,c).width,get(e,f).x+get(e,f).width);e.free();
});
