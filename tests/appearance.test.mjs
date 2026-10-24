import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {appearance,paintAttributes,sceneSvg,roundedContains} from '../web/appearance.js';
import {scaleShapes} from '../web/scaling.js';
import {clipDefinitions,paintBounds,frameAt} from '../web/scene.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const shapes=e=>JSON.parse(e.snapshot()).shapes;
const style={opacity:.5,corner_radius:30,fill_enabled:true,stroke_enabled:true,stroke_color:'#ff0000'};
test('appearance roundtrips and invalid edits are atomic; scaling includes radius and stroke',()=>{
 const e=new Editor(),id=e.add('rectangle',0,0);const before=e.snapshot();e.update(JSON.stringify({...shapes(e)[0],appearance:style,stroke_width:6}));const after=e.snapshot();
 e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),after);const copy=new Editor();copy.load(after);assert.equal(copy.snapshot(),after);
 for(const patch of [{opacity:1.1},{corner_radius:-1},{stroke_color:'url(bad)'}]){assert.throws(()=>e.update(JSON.stringify({...shapes(e)[0],appearance:{...style,...patch}})));assert.equal(e.snapshot(),after);}
 const scaled=scaleShapes(shapes(e),{x:0,y:0},2)[0];assert.equal(scaled.appearance.corner_radius,60);assert.equal(scaled.stroke_width,12);assert.equal(scaled.appearance.opacity,.5);e.free();copy.free();
});
test('rounded frame clips hit testing and drop targeting at its corners',()=>{
 const e=new Editor(),f=e.add('frame',0,0),c=e.add('rectangle',0,0);let s=shapes(e)[0];e.update(JSON.stringify({...s,width:100,height:100,appearance:style,clip_content:true}));e.reparent_many(JSON.stringify([c]),f);
 assert.equal(e.hit_test(1,1),0);assert.equal(e.hit_test(50,50),c);assert.equal(frameAt(shapes(e),{x:1,y:1}),0);assert.equal(frameAt(shapes(e),{x:50,y:50}),f);assert.equal(roundedContains(shapes(e)[0],{x:1,y:1}),false);
 assert.match(clipDefinitions(shapes(e)),/rx="30"/);assert.equal(paintBounds(shapes(e)[0],shapes(e)).x,-1);e.free();
});
test('legacy vector paint is preserved, independent paints export, and opacity encloses descendants',()=>{
 const legacy={id:1,parent_id:0,kind:'pen',fill:'#123456',points:[[0,0],[1,1]],closed:false};assert.equal(appearance(legacy).stroke_color,'#123456');assert.equal(appearance(legacy).fill_enabled,false);
 const frame={...legacy,kind:'frame',points:[],clip_content:true,appearance:style};const child={...legacy,id:2,parent_id:1,appearance:{...style,opacity:.8,fill_enabled:false}};
 const svg=sceneSvg([frame,child],s=>`<path ${paintAttributes(s)}/>`);assert.match(svg,/^<g opacity="0.5">/);assert.match(svg,/clip-path="url\(#frame-clip-1\)"><g opacity="0.8">/);assert.match(svg,/fill="none" stroke="#ff0000"/);
});
