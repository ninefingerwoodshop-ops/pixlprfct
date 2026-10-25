import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeState,overlayPlacement} from '../web/prototype.js';
import {connectedShape} from '../web/prototype-connections.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('swap replaces only the top overlay and retains modal settings and history',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0),c=e.add('frame',800,0),s=prototypeState(doc(e),a);
 assert.equal(s.swap(b),false);assert.equal(s.current,a);
 const settings={target:b,overlay_position:'manual',overlay_x:20,overlay_y:40,backdrop_color:'#123456',backdrop_opacity:.6,close_on_outside:true};
 s.open(settings);s.open({...settings,target:c});assert.equal(s.swap(b),true);assert.equal(s.current,a);assert.equal(s.overlays.length,2);assert.deepEqual(s.overlays[1],settings);
 assert.equal(s.swap(999),false);assert.equal(s.active,b);s.back();assert.equal(s.active,b);s.back();assert.equal(s.active,a);assert.equal(s.canBack,false);e.free();
});
test('swap links validate targets, remap copies, clear on deletion and keep their action on connection drag',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0);edit(e,a,{prototype:{action:'swap',target:b,transition:'dissolve'}});const before=e.snapshot(),p=get(e,a).prototype;
 assert.throws(()=>edit(e,a,{prototype:{...p,target:999}}));assert.throws(()=>edit(e,a,{prototype:{...p,transition:'slide-left'}}));assert.equal(e.snapshot(),before);
 assert.equal(connectedShape(get(e,a),a).prototype.action,'swap');
 const copy=new Editor();copy.load(before);const roots=JSON.parse(copy.paste_layers(e.copy_layers(JSON.stringify([a,b])),0,0,0));assert.equal(get(copy,roots[0]).prototype.target,roots[1]);assert.equal(get(copy,roots[0]).prototype.action,'swap');
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([a,b])));assert.equal(get(e,ids[0]).prototype.target,ids[1]);e.remove(b);assert.equal(get(e,a).prototype,null);e.undo();assert.deepEqual(get(e,a).prototype,p);copy.free();e.free();
});
test('overlay stack preserves the base, closes one layer, and clears on navigation/restart',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0),c=e.add('frame',800,0),s=prototypeState(doc(e),a),action={action:'overlay',target:b,close_on_outside:true,overlay_position:'center'};
 assert.equal(s.open(action),true);assert.equal(s.current,a);assert.equal(s.active,b);assert.equal(s.canBack,true);s.open({...action,target:c});s.back();assert.equal(s.active,b);s.close();assert.equal(s.active,a);s.close();assert.equal(s.canBack,false);
 s.open(action);s.navigate(c);assert.equal(s.active,c);assert.deepEqual(s.overlays,[]);s.back();assert.equal(s.current,a);s.open(action);s.restart();assert.equal(s.active,a);
 for(let i=0;i<16;i++)assert.equal(s.open(action),true);assert.equal(s.open(action),false);assert.equal(s.open({...action,target:999}),false);e.free();
});
test('overlay positions use the base viewport rather than document coordinates',()=>{
 const base={x:300,y:200,width:400,height:300},overlay={x:1000,y:800,width:100,height:80};
 assert.deepEqual(overlayPlacement(base,overlay,'center'),{x:150,y:110});assert.deepEqual(overlayPlacement(base,overlay,'top-left'),{x:0,y:0});assert.deepEqual(overlayPlacement(base,overlay,'bottom-right'),{x:300,y:220});
 assert.deepEqual(overlayPlacement(base,overlay,'manual',-20,45),{x:-20,y:45});
});
test('custom overlay offsets and backdrops round-trip, undo and reject invalid data atomically',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0);
 edit(e,a,{prototype:{action:'overlay',target:b}});const defaults=get(e,a).prototype;
 assert.equal(defaults.backdrop_color,'#000000');assert.equal(defaults.backdrop_opacity,.4);assert.equal(defaults.overlay_x,0);
 const settings={...defaults,overlay_position:'manual',overlay_x:-25,overlay_y:120,backdrop_color:'#17324f',backdrop_opacity:.65};
 edit(e,a,{prototype:settings});const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.deepEqual(get(copy,a).prototype,settings);
 for(const bad of [{overlay_x:1000001},{overlay_y:-1000001},{backdrop_opacity:1.01},{backdrop_opacity:-.1},{backdrop_color:'red'},{backdrop_color:'#gg0000'}]){assert.throws(()=>edit(e,a,{prototype:{...settings,...bad}}));assert.equal(e.snapshot(),saved);}
 e.undo();assert.deepEqual(get(e,a).prototype,defaults);e.redo();assert.deepEqual(get(e,a).prototype,settings);
 const roots=JSON.parse(copy.paste_layers(e.copy_layers(JSON.stringify([a,b])),0,0,0));assert.deepEqual(get(copy,roots[0]).prototype,{...settings,target:roots[1]});copy.free();e.free();
});
test('overlay links validate, duplicate, clipboard-remap, delete and undo like navigation links',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0);edit(e,a,{prototype:{action:'overlay',target:b,overlay_position:'top-right',close_on_outside:true}});edit(e,b,{prototype:{action:'close',target:0}});const before=e.snapshot();
 assert.throws(()=>edit(e,a,{prototype:{...get(e,a).prototype,overlay_position:'bad'}}));assert.throws(()=>edit(e,b,{prototype:{action:'close',target:a}}));assert.equal(e.snapshot(),before);
 const copy=new Editor();copy.load(before);assert.equal(copy.snapshot(),before);const roots=JSON.parse(copy.paste_layers(e.copy_layers(JSON.stringify([a,b])),0,0,0));assert.equal(get(copy,roots[0]).prototype.target,roots[1]);assert.equal(get(copy,roots[0]).prototype.close_on_outside,true);
 const ids=JSON.parse(e.duplicate_many(JSON.stringify([a,b])));assert.equal(get(e,ids[0]).prototype.target,ids[1]);e.remove(b);assert.equal(get(e,a).prototype,null);e.undo();assert.equal(get(e,a).prototype.target,b);copy.free();e.free();
});
