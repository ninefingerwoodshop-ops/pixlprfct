import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {assetDragPayload,readAssetDrag,centeredPlacement} from '../web/asset-drag.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const all=e=>JSON.parse(e.snapshot()).shapes,get=(e,id)=>all(e).find(s=>s.id===id),edit=(e,id,v)=>e.update(JSON.stringify({...get(e,id),...v}));
function setup(){const e=new Editor(),m=e.add('frame',0,0),child=e.add('rectangle',5,5);edit(e,m,{width:50,height:30});edit(e,child,{width:20,height:10});e.reparent_many(JSON.stringify([child]),m);e.create_component(m);return{e,m,child};}
const layout={direction:'horizontal',gap:10,padding_top:10,padding_right:10,padding_bottom:10,padding_left:10,align:'start',justify:'start',hug_width:false,hug_height:false};
test('component placement preserves child offsets and links, parents correctly, and undoes once',()=>{
 const {e,m}=setup(),f=e.add('frame',400,200),before=e.snapshot(),id=e.place_instance(m,450,250,f);assert.equal(get(e,id).parent_id,f);assert.equal(get(e,id).component.master,m);const c=all(e).find(s=>s.parent_id===id);assert.deepEqual([c.x,c.y],[455,255]);e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(get(e,id).parent_id,f);e.free();
});
test('placement inserts into auto-layout order and reserves the pointed grid cell',()=>{
 const {e,m}=setup(),f=e.add('frame',100,100),a=e.add('rectangle',0,0);edit(e,a,{width:50,height:30});e.reparent_many(JSON.stringify([a]),f);edit(e,f,{width:400,height:200,auto_layout:layout});const id=e.place_instance(m,75,110,f);assert.deepEqual(all(e).filter(s=>s.parent_id===f).map(s=>s.id),[id,a]);assert.equal(get(e,id).x,110);
 const grid=e.add('frame',500,400);edit(e,grid,{width:400,height:300,auto_layout:{...layout,direction:'grid',grid:{columns:[{mode:'fixed',value:100},{mode:'fixed',value:100}],rows:[{mode:'fixed',value:100}],auto_rows:{mode:'fixed',value:100}}}});const placed=e.place_instance(m,625,425,grid),cell=get(e,placed).layout_item.grid_cell;assert.deepEqual([cell.column,cell.row],[2,1]);e.free();
});
test('invalid parents and recursive nesting fail without changing history or consuming IDs',()=>{
 const {e,m}=setup(),before=e.snapshot(),next=Math.max(...all(e).map(s=>s.id))+1;e.clear_history();assert.throws(()=>e.place_instance(m,50,50,999));assert.throws(()=>e.place_instance(m,0,0,m),/cycle/i);assert.equal(e.snapshot(),before);assert.equal(e.can_undo(),false);assert.equal(e.add('ellipse',500,500),next);e.free();
});
test('asset drags are scoped to their editor session and centered in document coordinates',()=>{
 assert.equal(readAssetDrag(assetDragPayload('one',42),'one'),42);assert.equal(readAssetDrag(assetDragPayload('one',42),'two'),0);for(const s of ['bad','null','{}','{"token":"one","master":-1}','{"token":"one","master":2.5}'])assert.equal(readAssetDrag(s,'one'),0);assert.deepEqual(centeredPlacement({width:80,height:30},{x:-100,y:45}),{x:-140,y:30});
});
