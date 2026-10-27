import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),set=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('text background promotes paint, radius, stroke and effects to auto-layout frame atomically',()=>{
 const e=new Editor(),bg=e.add('rectangle',100,100);set(e,bg,{width:200,height:80,fill:'#123456',stroke_width:3,appearance:{...get(e,bg).appearance,corner_radius:12,opacity:.7,fill_enabled:true,stroke_enabled:true,stroke_color:'#ff0000',shadows:[{kind:'drop',x:2,y:3,blur:4,spread:0,color:'#000000',opacity:.3,visible:true}]}});
 const t=e.add('text',120,115);set(e,t,{width:140,height:40,text:'Button',typography:{...get(e,t).typography,sizing:'fixed'}});
 const g=e.group_many(JSON.stringify([bg,t])),before=e.snapshot(),paint=get(e,bg).appearance;
 e.auto_layout_selection(JSON.stringify([g]));const f=get(e,g);assert.equal(get(e,bg),undefined);assert.equal(f.kind,'frame');assert.equal(f.fill,'#123456');assert.equal(f.stroke_width,3);assert.deepEqual(f.appearance,paint);assert.deepEqual([f.x,f.y,f.width,f.height],[100,100,200,80]);assert.deepEqual([f.auto_layout.padding_left,f.auto_layout.padding_top,f.auto_layout.padding_right,f.auto_layout.padding_bottom],[20,15,40,25]);assert.equal(get(e,t).layout_item.absolute,false);
 const after=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);e.free();
});
test('separate rectangles beside text remain real layout children',()=>{
 const e=new Editor(),bg=e.add('rectangle',100,100),t=e.add('text',500,100),g=e.group_many(JSON.stringify([bg,t]));e.auto_layout_selection(JSON.stringify([g]));assert.ok(get(e,bg));assert.equal(get(e,bg).parent_id,g);e.free();
});
