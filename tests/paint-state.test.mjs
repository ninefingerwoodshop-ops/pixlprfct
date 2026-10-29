import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {hasPaint,setPaintState} from '../web/paint-state.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(editor,id)=>JSON.parse(editor.snapshot()).shapes.find(s=>s.id===id);

test('hidden paints remain present across save, copy, undo and removal',()=>{
 const editor=new Editor(),restored=new Editor(),id=editor.add('rectangle',0,0);
 try{
  const original=get(editor,id);assert.equal(hasPaint(original,'fill'),true);assert.equal(hasPaint(original,'stroke'),false);
  editor.update(JSON.stringify(setPaintState(original,'fill','hide')));
  const hidden=get(editor,id),snapshot=editor.snapshot();assert.equal(hidden.appearance.fill_enabled,false);assert.equal(hasPaint(hidden,'fill'),true);assert.equal(hidden.fill,original.fill);
  restored.load(snapshot);assert.equal(restored.snapshot(),snapshot);
  const copy=JSON.parse(restored.paste_layers(editor.copy_layers(JSON.stringify([id])),400,0,0))[0];assert.equal(hasPaint(get(restored,copy),'fill'),true);assert.equal(get(restored,copy).appearance.fill_enabled,false);
  editor.update(JSON.stringify(setPaintState(hidden,'fill','remove')));assert.equal(hasPaint(get(editor,id),'fill'),false);
  editor.undo();assert.equal(editor.snapshot(),snapshot);editor.redo();assert.equal(hasPaint(get(editor,id),'fill'),false);
  editor.update(JSON.stringify(setPaintState(get(editor,id),'fill','add')));assert.equal(get(editor,id).appearance.fill_enabled,true);assert.equal(get(editor,id).fill,original.fill);
 }finally{editor.free();restored.free();}
});

test('stroke visibility preserves paint settings and follows component inheritance',()=>{
 const editor=new Editor(),id=editor.add('frame',0,0);
 try{
  let shape=setPaintState(get(editor,id),'stroke','add');shape.stroke_width=7;shape.appearance.stroke_color='#123456';shape.appearance.stroke_opacity=.4;editor.update(JSON.stringify(shape));
  editor.create_component(id);const instance=editor.create_instance(id,400,0);
  editor.update(JSON.stringify(setPaintState(get(editor,id),'stroke','hide')));
  const hidden=get(editor,instance);assert.equal(hasPaint(hidden,'stroke'),true);assert.equal(hidden.appearance.stroke_enabled,false);assert.equal(hidden.appearance.stroke_color,'#123456');assert.equal(hidden.appearance.stroke_opacity,.4);assert.equal(hidden.stroke_width,7);
  editor.update(JSON.stringify(setPaintState(get(editor,id),'stroke','remove')));assert.equal(hasPaint(get(editor,instance),'stroke'),false);
  editor.undo();assert.equal(hasPaint(get(editor,instance),'stroke'),true);assert.equal(get(editor,instance).appearance.stroke_enabled,false);
  editor.update(JSON.stringify(setPaintState(get(editor,id),'stroke','show')));assert.equal(get(editor,instance).appearance.stroke_enabled,true);
 }finally{editor.free();}
});
