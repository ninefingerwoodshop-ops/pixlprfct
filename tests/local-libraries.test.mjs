import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {libraryPackage,parseLibraryPackage} from '../web/local-libraries.js';
import {librarySnapshot,mergeLibrary} from '../web/library-model.js';
import {libraryCatalog} from '../web/library-catalog.js';
import {emptyPattern} from '../web/paint-textures.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('portable releases round trip identity and reject malformed packages',()=>{
 const r={id:'local:test',workspace:'local',name:'Design system',revision:2,body:{pages:[],shapes:[],libraries:[]}};
 assert.deepEqual(parseLibraryPackage(libraryPackage(r)),r);
 for(const text of ['{}','{',libraryPackage({...r,revision:0}),libraryPackage({...r,id:'a\nb'}),libraryPackage({...r,workspace:'a\nb'}),libraryPackage({...r,body:{pages:[],shapes:[],libraries:[{}]}})])assert.throws(()=>parseLibraryPackage(text));
});
test('pattern dependencies publish and remap for both layer paints and color styles',()=>{
 const source=new Editor(),target=new Editor();try{
  const tile=source.add('rectangle',100,100),main=source.add('frame',300,100);
  source.create_component(main);const pattern={...emptyPattern(),source_id:tile};
  source.save_color_style(JSON.stringify({id:0,name:'Pattern',paints:[{id:1,visible:true,color:'#345678',opacity:1,pattern}]}),main,false);
  const library=librarySnapshot(JSON.parse(source.snapshot()));assert(library.shapes.some(s=>s.id===tile));
  target.add('rectangle',0,0);target.load(JSON.stringify(mergeLibrary(JSON.parse(target.snapshot()),{id:'patterns',workspace:'local',name:'Patterns',revision:1,body:library})));
  const doc=JSON.parse(target.snapshot()),map=doc.libraries[0].maps;assert.notEqual(map.shapes[tile],tile);assert.equal(doc.shapes.find(s=>s.id===map.shapes[main]).appearance.fills[0].pattern.source_id,map.shapes[tile]);assert.equal(doc.color_styles[0].paints[0].pattern.source_id,map.shapes[tile]);
 }finally{source.free();target.free();}
});
test('library discovery paginates available releases and assets without oversized variant arrays',()=>{
 const doc={pages:[{id:1,name:'Page'}],shapes:Array.from({length:125},(_,i)=>({id:i+1,name:'Component '+i,page_id:1,component:{type:'master'}})),libraries:[]};
 const catalog=doc.shapes.map(s=>({id:String(s.id),workspace:'local',name:s.name,revision:1,device:true}));
 const pages=[0,50,100].map(offset=>libraryCatalog(doc,catalog,{id:'source'},null,{offset}));
 assert.deepEqual(pages.map(p=>p.available.length),[50,50,25]);assert.deepEqual(pages.map(p=>p.assets.length),[50,50,25]);assert.equal(pages[2].pagination.hasMore,false);assert.equal(new Set(pages.flatMap(p=>p.available.map(l=>l.id))).size,125);
 doc.component_sets=[{name:'Many variants',properties:['State'],variants:doc.shapes.map(s=>({component_id:s.id,values:[s.name]}))}];const result=libraryCatalog(doc,catalog,null,null,{query:'Many variants'});assert.equal(result.assets[0].variants.length,10);assert.equal(result.assets[0].variantCount,125);assert.equal(result.partial,true);assert.throws(()=>libraryCatalog(doc,catalog,null,null,{limit:201}),/pagination/);
});
test('styles-only libraries publish and merge without replacing destination content',()=>{
 const e=new Editor(),target=new Editor();try{
  e.save_color_style(JSON.stringify({id:0,name:'Brand',paints:[{id:1,visible:true,color:'#345678',opacity:1}]}),0,false);
  const source=librarySnapshot(JSON.parse(e.snapshot()));assert.equal(source.shapes.length,0);assert.equal(source.color_styles.length,1);
  const id=target.add('rectangle',100,120),before=JSON.parse(target.snapshot()),release={id:'local:style',workspace:'local',name:'Brand library',revision:1,body:source};target.load(JSON.stringify(mergeLibrary(before,release)));const after=JSON.parse(target.snapshot());assert.deepEqual(after.shapes.find(s=>s.id===id),before.shapes[0]);assert.equal(after.active_page,before.active_page);assert.equal(after.color_styles[0].name,'Brand');
  assert.throws(()=>librarySnapshot(after),/Create a main component, style or variable/);
 }finally{e.free();target.free();}
});
