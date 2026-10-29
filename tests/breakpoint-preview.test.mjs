import test from 'node:test';import assert from 'node:assert/strict';
import {createBreakpointPreview} from '../web/breakpoint-preview.js';
import {parseLayoutCss,formatLayoutCss,layoutMediaState} from '../web/layout-css.js';
import {editAreaTrack} from '../web/grid-area-track-values.js';
test('restores starting width after multiple previews without reverting unrelated edits',()=>{
 let root={id:1,width:1200,height:900,auto_layout:{direction:'grid',hug_width:true,gap:12},layout_item:{fill_width:false}};
 const previews=createBreakpointPreview(next=>root=next);
 previews.preview(root,768);previews.preview(root,769);
 assert.equal(previews.original(root).width,1200);assert.equal(root.auto_layout.hug_width,false);
 root={...root,height:1000,auto_layout:{...root.auto_layout,gap:24}};
 previews.restore(root);assert.equal(root.width,1200);assert.equal(root.height,1000);assert.equal(root.auto_layout.gap,24);assert.equal(root.auto_layout.hug_width,true);assert.equal(previews.original(root),undefined);
 root.width=1400;previews.preview(root,768);assert.equal(previews.original(root).width,1400);
});
test('failed changes leave the saved baseline unchanged',()=>{
 let root={id:1,width:1200},fail=false;
 const previews=createBreakpointPreview(next=>{if(fail)throw Error('Failed');root=next;});
 previews.preview(root,1200);assert.equal(previews.original(root),undefined);
 previews.preview({...root,locked:true},768);assert.equal(previews.original(root),undefined);
 fail=true;assert.throws(()=>previews.preview(root,768));assert.equal(previews.original(root),undefined);
 fail=false;previews.preview(root,768);assert.equal(previews.original(root).width,1200);
 fail=true;assert.throws(()=>previews.restore(root));assert.equal(previews.original(root).width,1200);
});

import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('original widths survive frame selection changes, page switches and fresh document snapshots',()=>{
 const editor=new Editor();
 const snapshot=()=>JSON.parse(editor.snapshot());
 const get=id=>snapshot().shapes.find(s=>s.id===id);
 const page1=snapshot().active_page;
 const a=editor.add('frame',0,0),b=editor.add('frame',300,0);
 editor.update(JSON.stringify({...get(a),width:1200}));editor.update(JSON.stringify({...get(b),width:1000}));
 const page2=editor.add_page(),c=editor.add('frame',0,0);
 editor.update(JSON.stringify({...get(c),width:1440}));
 const previews=createBreakpointPreview(next=>editor.update(JSON.stringify(next)));
 editor.select_page(page1);let selected=a;
 previews.preview(get(selected),768);
 selected=b;previews.preview(get(selected),640);
 selected=null;editor.select_page(page2);selected=c;previews.preview(get(selected),500);
 editor.select_page(page1);selected=a;
 assert.equal(previews.original(get(selected)).width,1200);
 previews.preview(get(selected),769);previews.restore(get(selected));assert.equal(get(a).width,1200);
 selected=b;assert.equal(previews.original(get(selected)).width,1000);previews.restore(get(selected));assert.equal(get(b).width,1000);
 editor.select_page(page2);selected=c;assert.equal(previews.original(get(selected)).width,1440);previews.restore(get(selected));assert.equal(get(c).width,1440);
 editor.free();
});
test('autosaved snapshot reload retains baseline and restore clears it durably',()=>{
 const editor=new Editor(),id=editor.add('frame',0,0);
 const get=e=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 editor.update(JSON.stringify({...get(editor),width:1200}));
 createBreakpointPreview(next=>editor.update(JSON.stringify(next))).preview(get(editor),768);
 const loaded=new Editor();loaded.load(editor.snapshot());loaded.clear_history();
 const preview=createBreakpointPreview(next=>loaded.update(JSON.stringify(next)));
 assert.equal(get(loaded).width,768);assert.equal(preview.original(get(loaded)).width,1200);
 preview.preview(get(loaded),769);assert.equal(preview.original(get(loaded)).width,1200);
 preview.restore(get(loaded));assert.equal(get(loaded).width,1200);assert.equal(preview.original(get(loaded)),undefined);
 const restored=new Editor();restored.load(loaded.snapshot());assert.equal(preview.original(get(restored)),undefined);
 loaded.undo();assert.equal(get(loaded).width,769);assert.equal(preview.original(get(loaded)).width,1200);
 loaded.redo();assert.equal(get(loaded).width,1200);assert.equal(preview.original(get(loaded)),undefined);
 editor.free();loaded.free();restored.free();
});
test('restore all spans pages, preserves other edits, and uses a single undo step',async()=>{
 const {restoreAllBreakpointWidths}=await import('../web/breakpoint-preview.js');
 const editor=new Editor(),snapshot=()=>JSON.parse(editor.snapshot()),get=id=>snapshot().shapes.find(s=>s.id===id);
 const a=editor.add('frame',0,0);editor.update(JSON.stringify({...get(a),width:1200}));
 editor.add_page();const b=editor.add('frame',0,0);editor.update(JSON.stringify({...get(b),width:1440}));
 const untouched=editor.add('frame',0,0),unchanged=JSON.stringify(get(untouched));
 const previews=createBreakpointPreview(s=>editor.update(JSON.stringify(s)));
 editor.select_page(get(a).page_id);previews.preview(get(a),768);editor.select_page(get(b).page_id);previews.preview(get(b),769);
 editor.update(JSON.stringify({...get(b),locked:true,name:'Keep this name'}));
 const before=editor.snapshot();let calls=0;
 assert.equal(restoreAllBreakpointWidths(snapshot().shapes,updates=>{calls++;editor.update_across_pages(JSON.stringify(updates));}),2);
 assert.equal(calls,1);assert.equal(get(a).width,1200);assert.equal(get(b).width,1440);assert.equal(get(b).locked,true);assert.equal(get(b).name,'Keep this name');assert.equal(JSON.stringify(get(untouched)),unchanged);
 assert.equal(previews.original(get(a)),undefined);assert.equal(previews.original(get(b)),undefined);
 const after=editor.snapshot();editor.undo();assert.equal(editor.snapshot(),before);editor.redo();assert.equal(editor.snapshot(),after);
 restoreAllBreakpointWidths(snapshot().shapes,()=>calls++);assert.equal(calls,1);editor.free();
});

test('active-query track edits survive breakpoint switches, reload and width restoration',()=>{
 const editor=new Editor(),id=editor.add('frame',0,0);
 const get=()=>JSON.parse(editor.snapshot()).shapes.find(s=>s.id===id);
 const css='.layout {display:grid;grid-template-columns:160px 1fr;} @media (max-width:500px){.layout {grid-template-columns:90px 1fr;}} @media (min-width:701px){.layout {grid-template-columns:200px 1fr;}}';
 editor.update(JSON.stringify(parseLayoutCss(css,{...get(),width:600,auto_layout:{direction:'grid',gap:12,padding_top:16,padding_right:16,padding_bottom:16,padding_left:16,align:'start',justify:'start',hug_width:false,hug_height:false}})));
 const previews=createBreakpointPreview(next=>editor.update(JSON.stringify(next)));
 previews.preview(get(),500);
 editor.update(JSON.stringify(editAreaTrack(get(),'columns-1',210)));
 assert.equal(layoutMediaState(get(),[get()]).shape.auto_layout.grid.columns[0].value,90);
 editor.update(JSON.stringify(parseLayoutCss(formatLayoutCss(get()).replace('90px 1fr','110px 1fr'),get())));
 for(const [width,value] of [[501,210],[701,200],[700,210],[500,110]]){
  previews.preview(get(),width);
  assert.equal(layoutMediaState(get(),[get()]).shape.auto_layout.grid.columns[0].value,value);
  assert.equal(get().auto_layout.grid.columns[0].value,210);
  assert.equal(previews.original(get()).width,600);
 }
 const saved=editor.snapshot();editor.load(saved);editor.clear_history();
 previews.restore(get());
 assert.equal(get().width,600);assert.equal(get().auto_layout.grid.columns[0].value,210);
 assert.equal(get().layout_media[0].declarations['grid-template-columns'],'110px 1fr');
 assert.equal(previews.original(get()),undefined);
 editor.undo();assert.equal(editor.snapshot(),saved);
 editor.redo();assert.equal(get().width,600);editor.free();
});
