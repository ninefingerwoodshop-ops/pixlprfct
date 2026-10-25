import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {codeExportFiles} from '../web/code-export.js';
import {zipFiles} from '../web/batch-export.js';
import {reactMarkup} from '../web/framework-export.js';
import {FRAME_PRESETS} from '../web/frame-tools.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const texts=files=>Object.fromEntries(files.map(f=>[f.name,new TextDecoder().decode(f.data)]));
test('framework project exports include bootstraps while page exports contain only reusable components',()=>{
 const e=new Editor();e.add('rectangle',0,0);e.add_page();e.add('ellipse',2,3);const doc=JSON.parse(e.snapshot());
 for(const target of ['react','vue','angular','rust']){
  const project=codeExportFiles(doc,{target}),out=texts(project),single=texts(codeExportFiles(doc,{target,scope:'page'}));
  assert.ok(out['index.html']);assert.ok(out[target==='rust'?'Cargo.toml':'package.json']);assert.equal(JSON.parse(out['project.json']).pages.length,2);assert.match(out['index.html'],/\?page=2/);
  assert.ok(!single['index.html']);assert.ok(!single['package.json']);assert.ok(!single['Cargo.toml']);assert.equal(JSON.parse(single['project.json']).pages.length,1);
  assert.match(out['page-1.css'],/\.page-1 \.px-scene/);assert.match(out['page-2.css'],/\.page-2 \.px-scene/);assert.ok(zipFiles(project).size>0);
 }
 assert.throws(()=>codeExportFiles(doc,{target:'unknown'}),/valid framework/);e.free();
});
test('React markup preserves literal text, SVG attributes and inline styles',()=>{
 const result=reactMarkup('<div class="a" data-layer="a &amp; b">{name} &lt;hi&gt;<svg viewBox="0 0 10 10"><path stroke-width="2" style="fill:red;stroke-width:2" /></svg></div>');
 assert.match(result,/className=\{"a"\}/);assert.match(result,/\{"\{name\} <hi>"\}/);assert.match(result,/strokeWidth=\{"2"\}/);assert.match(result,/style=\{\{"fill":"red","strokeWidth":"2"\}\}/);
});
test('every frame preset can be inserted with its exact dimensions',()=>{
 const e=new Editor();for(const [,presets] of FRAME_PRESETS)for(const [name,width,height] of presets){const id=e.insert(JSON.stringify({id:0,kind:'frame',name,width,height,x:0,y:0,fill:'#ffffff',text:'',hidden:false,clip_content:true}));const s=JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);assert.equal(s.width,width);assert.equal(s.height,height);}e.free();
});
test('whole project exports independent pages and linked CSS and JavaScript with stable layer hooks',()=>{
 const e=new Editor(),a=e.add('rectangle',10,20);e.add_page();const b=e.add('ellipse',30,40),doc=JSON.parse(e.snapshot()),files=codeExportFiles(doc),out=texts(files),manifest=JSON.parse(out['project.json']);
 assert.equal(manifest.pages.length,2);assert.ok(out['index.html'].includes(`data-px-id="${a}"`));assert.ok(!out['index.html'].includes(`data-px-id="${b}"`));
 for(const page of manifest.pages){assert.ok(out[page.html]);assert.ok(out[page.css]);assert.ok(out[page.html].includes(`href="${page.css}"`));assert.match(out[page.html],/src="script.js" defer/);}
 assert.match(out['script.js'],/pixlprfct:ready/);assert.ok(zipFiles(files).size>0);e.free();
});
test('one-page and selection exports exclude other pages and handle empty pages',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),first=JSON.parse(e.snapshot()).active_page;e.add_page();let doc=JSON.parse(e.snapshot());
 const out=texts(codeExportFiles(doc,{scope:'page',pageId:first}));assert.ok(out['styles.css']);assert.match(out['index.html'],new RegExp(`data-px-id="${a}"`));assert.equal(JSON.parse(out['project.json']).pages.length,1);
 const empty=texts(codeExportFiles(doc,{scope:'page'}));assert.ok(!empty['index.html'].includes('data-px-id='));assert.ok(!empty['styles.css'].includes('Infinity'));
 assert.throws(()=>codeExportFiles(doc,{scope:'selection',ids:[]}),/Select layers/);assert.throws(()=>codeExportFiles(doc,{scope:'page',pageId:999}),/Page not found/);e.free();
});
