import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {paints,addPaint,updatePaint,removePaint,movePaint,paintLayers,paintEdit,commitPaintEdit,reconcilePaints} from '../web/paints.js';
import {defaultGradient} from '../web/gradients.js';
import {svgDocument,exportBounds} from '../web/export.js';
import {drawScene} from '../web/appearance.js';
import {compileCssScene} from '../web/css-renderer.js';
import {moveGradientHandle} from '../web/gradient-edit.js';
import {transformRectangle} from '../web/rectangle-actions.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
const save=(e,s)=>{e.update(JSON.stringify(s));return get(e,s.id);};
const stacked=s=>{s=addPaint(s,'fill');s=updatePaint(s,'fill',2,{color:'#ff0000',opacity:.5});s=addPaint(s,'stroke');s=addPaint(s,'stroke');return updatePaint(s,'stroke',2,{color:'#00ff00',opacity:.4,gradient:defaultGradient('#00ff00')});};

test('paint stacks survive save, copy/paste, undo/redo and component propagation',()=>{
 const e=new Editor(),copy=new Editor();try{const id=e.add('frame',0,0);const s=save(e,stacked(get(e,id)));e.create_component(id);const instance=e.create_instance(id,400,0);const before=e.snapshot();
 const changed=save(e,movePaint(updatePaint(get(e,id),'fill',2,{visible:false}),'fill',2,1));assert.deepEqual(get(e,instance).appearance.fills,changed.appearance.fills);assert.deepEqual(get(e,instance).appearance.strokes,changed.appearance.strokes);assert.throws(()=>save(e,removePaint(get(e,instance),'fill',2)),/protected/);
 e.undo();assert.equal(e.snapshot(),before);e.redo();const saved=e.snapshot();copy.load(saved);assert.equal(copy.snapshot(),saved);
 const pasted=JSON.parse(copy.paste_layers(e.copy_layers(JSON.stringify([id])),0,500,0))[0];assert.deepEqual(get(copy,pasted).appearance.fills,changed.appearance.fills);assert.deepEqual(get(copy,pasted).appearance.strokes,s.appearance.strokes);
 }finally{e.free();copy.free();}
});

test('top rows render last, every paint has unique SVG IDs, hidden paints do not render',()=>{
 const e=new Editor();try{const s=stacked(get(e,e.add('rectangle',0,0)));const layers=paintLayers(s);assert.deepEqual(layers.map(s=>s.id),[`${s.id}-fill-1`,`${s.id}-fill-2`,`${s.id}-stroke-1`,`${s.id}-stroke-2`]);
 const calls=[],ctx={save(){},restore(){}};drawScene([s],ctx,p=>calls.push(p.id));assert.deepEqual(calls,layers.map(p=>p.id));
 const svg=svgDocument([s],exportBounds([s]),1,null,()=>({lines:[],style:{}}));assert.match(svg,/stroke-gradient-1-stroke-2/);assert.match(svg,/fill="#ff0000"[^>]*fill-opacity="0.5"/);assert.ok(svg.indexOf('fill="#ffffff"')<svg.indexOf('fill="#ff0000"'));
 const hidden=updatePaint(s,'fill',2,{visible:false});assert.equal(paintLayers(hidden).length,3);assert.ok(!svgDocument([hidden],exportBounds([hidden]),1,null,()=>[]).includes('fill="#ff0000"'));
 const css=compileCssScene([s]);assert.match(css.html,/stroke-gradient-1-stroke-2/);assert.match(css.html,/fill="#ff0000"/);
 }finally{e.free();}
});

test('editing a lower gradient or legacy color does not replace neighboring paints',()=>{
 const e=new Editor();try{let s=stacked(get(e,e.add('rectangle',0,0)));s=updatePaint(s,'fill',1,{gradient:defaultGradient('#123456')});
 const edit=paintEdit(s,'fill',1),moved=moveGradientHandle(edit,{part:'end'},{x:s.x+80,y:s.y+20},false,'gradient').shape,next=commitPaintEdit(moved);
 assert.deepEqual(next.appearance.fills[0],s.appearance.fills[0]);assert.notDeepEqual(next.appearance.fills[1].gradient,s.appearance.fills[1].gradient);assert.deepEqual(next.appearance.strokes,s.appearance.strokes);
 const legacy=reconcilePaints({...s,fill:'#abcdef'},s);assert.equal(legacy.appearance.fills[0].color,'#abcdef');assert.equal(legacy.appearance.fills[1].color,s.appearance.fills[1].color);
 const flipped=transformRectangle(s,'horizontal');assert.deepEqual(flipped.appearance.fills[1].gradient.start,[1,.5]);assert.deepEqual(flipped.appearance.strokes[0].gradient.start,[1,.5]);
 }finally{e.free();}
});

test('invalid paint IDs, opacity, colors and gradients reject atomically',()=>{
 const e=new Editor();try{const id=e.add('rectangle',0,0),s=save(e,stacked(get(e,id))),before=e.snapshot();
 for(const patch of [{id:0},{id:1},{opacity:2},{color:'red'},{gradient:{...defaultGradient('#ffffff'),stops:[]}}]){const bad=structuredClone(s);Object.assign(bad.appearance.fills[0],patch);assert.throws(()=>save(e,bad));assert.equal(e.snapshot(),before);}
 const empty=save(e,removePaint(removePaint(s,'fill',1),'fill',2));assert.deepEqual(paints(empty,'fill'),[]);assert.equal(empty.appearance.fill_enabled,false);
 }finally{e.free();}
});

test('color variables follow paint identity through reorder and direct edits detach only that paint',()=>{
 const e=new Editor();try{const id=e.add('rectangle',0,0);e.save_variables(JSON.stringify({collections:[{id:1,name:'Colors',default_mode:1,modes:[{id:1,name:'Light'},{id:2,name:'Dark'}]}],values:[{id:1,collection_id:1,name:'Brand',kind:'color',values:{1:'#123456',2:'#abcdef'}}]}));e.bind_variable(id,'fill',1);
 const migrated=save(e,addPaint(get(e,id),'fill'));assert.equal(migrated.variable_bindings['appearance.fills.1.color'],1);assert.equal(migrated.appearance.fills[1].color,'#123456');
 save(e,movePaint(migrated,'fill',1,0));e.set_variable_mode(id,1,2);assert.equal(get(e,id).appearance.fills[0].color,'#abcdef');assert.equal(get(e,id).appearance.fills[1].color,'#d9d9d9');
 e.bind_variable(id,'appearance.fills.2.color',1);const edited=save(e,updatePaint(get(e,id),'fill',1,{color:'#ff0000'}));assert.equal(edited.variable_bindings['appearance.fills.1.color'],undefined);assert.equal(edited.variable_bindings['appearance.fills.2.color'],1);
 }finally{e.free();}
});

test('image base is drawn once, followed by additional paints with independent opacity',()=>{
 const s={id:1,kind:'image',fill:'#ffffff',appearance:{opacity:1,corner_radius:0,fill_enabled:true,fill_opacity:.6,stroke_enabled:false,stroke_color:'#000000'}};
 let next=addPaint(s,'fill');next=updatePaint(next,'fill',1,{opacity:.3});next=addPaint(next,'stroke');const layers=paintLayers(next);assert.deepEqual(layers.map(p=>p.kind),['image','rectangle','rectangle']);assert.equal(layers[0].appearance.fill_opacity,.6);assert.equal(layers[1].appearance.fill_opacity,.3);
});

test('detaching a bound paint preserves color; removing a bound paint clears its binding and stays removed',()=>{
 const e=new Editor();try{const id=e.add('rectangle',0,0);e.save_variables(JSON.stringify({collections:[{id:1,name:'Colors',default_mode:1,modes:[{id:1,name:'Default'}]}],values:[{id:1,collection_id:1,name:'Brand',kind:'color',values:{1:'#123456'}}]}));
 e.bind_variable(id,'fill',1);const legacy=get(e,id);e.bind_variable(id,'fill',0);assert.equal(get(e,id).fill,'#123456');assert.deepEqual(get(e,id).variable_bindings,{});e.undo();assert.equal(get(e,id).variable_bindings.fill,1);
 const removed=save(e,removePaint(get(e,id),'fill',1));assert.equal(paints(removed,'fill').length,0);assert.deepEqual(removed.variable_bindings,{});assert.equal(removed.appearance.fill_enabled,false);e.undo();assert.deepEqual(get(e,id),legacy);
 let s=save(e,addPaint(get(e,id),'fill'));e.bind_variable(id,'appearance.fills.2.color',1);const before=get(e,id);e.bind_variable(id,'appearance.fills.1.color',0);s=get(e,id);assert.equal(paints(s,'fill').find(p=>p.id===1).color,'#123456');assert.equal(s.variable_bindings['appearance.fills.2.color'],1);e.undo();assert.deepEqual(get(e,id),before);
 const hidden=save(e,updatePaint(get(e,id),'fill',1,{visible:false}));assert.equal(paints(hidden,'fill').find(p=>p.id===1).visible,false);assert.equal(hidden.variable_bindings['appearance.fills.1.color'],1);
 }finally{e.free();}
});
