import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeState,overlayPlacement} from '../web/prototype.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('overlay stack preserves the base, closes one layer, and clears on navigation/restart',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0),c=e.add('frame',800,0),s=prototypeState(doc(e),a),action={action:'overlay',target:b,close_on_outside:true,overlay_position:'center'};
 assert.equal(s.open(action),true);assert.equal(s.current,a);assert.equal(s.active,b);assert.equal(s.canBack,true);s.open({...action,target:c});s.back();assert.equal(s.active,b);s.close();assert.equal(s.active,a);s.close();assert.equal(s.canBack,false);
 s.open(action);s.navigate(c);assert.equal(s.active,c);assert.deepEqual(s.overlays,[]);s.back();assert.equal(s.current,a);s.open(action);s.restart();assert.equal(s.active,a);
 for(let i=0;i<16;i++)assert.equal(s.open(action),true);assert.equal(s.open(action),false);assert.equal(s.open({...action,target:999}),false);e.free();
});
test('overlay positions use the base viewport rather than document coordinates',()=>{
 const base={x:300,y:200,width:400,height:300},overlay={x:1000,y:800,width:100,height:80};
 assert.deepEqual(overlayPlacement(base,overlay,'center'),{x:150,y:110});assert.deepEqual(overlayPlacement(base,overlay,'top-left'),{x:0,y:0});assert.deepEqual(overlayPlacement(base,overlay,'bottom-right'),{x:300,y:220});
});
test('overlay links validate, duplicate, clipboard-remap, delete and undo like navigation links',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0);edit(e,a,{prototype:{action:'overlay',target:b,overlay_position:'top-right',close_on_outside:true}});edit(e,b,{prototype:{action:'close',target:0}});const before=e.snapshot();
 assert.throws(()=>edit(e,a,{prototype:{...get(e,a).prototype,overlay_position:'bad'}}));assert.throws(()=>edit(e,b,{prototype:{action:'close',target:a}}));assert.equal(e.snapshot(),before);
 const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);const roots=JSON.parse(copy.paste_layers(e.copy_layers(JSON.stringify([a,b])),0,0,0));assert.equal(get(copy,roots[0]).prototype.target,roots[1]);assert.equal(get(copy,roots[0]).prototype.close_on_outside,true);
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([a,b])));assert.equal(get(e,ids[0]).prototype.target,ids[1]);e.remove(b);assert.equal(get(e,a).prototype,null);e.undo();assert.equal(get(e,a).prototype.target,b);copy.free();e.free();
});
