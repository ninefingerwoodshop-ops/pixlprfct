import test from 'node:test';import assert from 'node:assert/strict';
import {automaticLayoutClass,layoutClass,validateLayoutClass,renameLayoutSelector} from '../web/layout-class.js';
import {formatLayoutCss,parseLayoutCss} from '../web/layout-css.js';
import {cssExport} from '../web/css-renderer.js';
import {readFile} from 'node:fs/promises';import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const layout={direction:'horizontal',gap:16,padding_top:0,padding_right:0,padding_bottom:0,padding_left:0,align:'start',justify:'start',hug_width:false,hug_height:false};
test('generated classes are stable, valid and unique; invalid or duplicate custom names are rejected',()=>{
 assert.equal(layoutClass({id:3,name:'Primary Button'}),'primary-button-3');const shape={id:1,auto_layout:layout};
 assert.equal(validateLayoutClass('hero-grid',shape),'hero-grid');
 for(const name of ['two classes','1abc','px-scene','layout','layout-2','bad.name'])assert.throws(()=>validateLayoutClass(name,shape));
 assert.throws(()=>validateLayoutClass('hero',shape,[{id:2,auto_layout:layout,layout_class:'hero'}]));
});
test('renaming updates base and media selectors without altering declarations or longer class names',()=>{
 const css='.hero {grid-template-areas:"hero";} @media (max-width: 600px){.hero {gap:2px;}} .hero-other {}';
 assert.equal(renameLayoutSelector(css,'hero','content'),'.content {grid-template-areas:"hero";} @media (max-width: 600px){.content {gap:2px;}} .hero-other {}');
 const shape={id:1,auto_layout:layout,layout_class:'hero'};const result=parseLayoutCss('.hero {display:flex;gap:2px;} @media (max-width:600px){.hero{gap:1px;}}',shape);
 assert.match(formatLayoutCss(result),/\.hero \{/);assert.equal(result.layout_media.length,1);
});
test('classes persist, copies are unique, exports use the chosen class, and undo restores names',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',0,0);const get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(a),auto_layout:layout}));assert.equal(get(a).layout_class,automaticLayoutClass(get(a)));
 const before=e.snapshot();e.update(JSON.stringify({...get(a),layout_class:'hero-grid',layout_class_generated:false}));assert.equal(get(a).layout_class,'hero-grid');
 e.update(JSON.stringify({...get(b),auto_layout:layout,layout_class:'hero-grid',layout_class_generated:false}));assert.notEqual(get(b).layout_class,'hero-grid');
 const next=parseLayoutCss('.hero-grid {display:flex;} @media (max-width:600px){.hero-grid{gap:1px;}}',get(a));e.update(JSON.stringify(next));
 const exported=cssExport([get(a)]);assert.match(exported.html,/class="px-node px-node-\d+ hero-grid"/);assert.match(exported.css,/\.hero-grid\{/);assert.match(exported.css,/@media[^\n]+\.hero-grid/);
 const saved=e.snapshot(),copy=new Editor();copy.load(saved);assert.equal(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===a).layout_class,'hero-grid');copy.free();
 e.undo();e.undo();e.undo();assert.equal(e.snapshot(),before);e.free();
});
test('existing layers migrate by name on every page while custom classes survive',()=>{
 const e=new Editor(),a=e.add('rectangle',0,0),b=e.add('text',0,0),c=e.add('frame',0,0);
 const doc=JSON.parse(e.snapshot());doc.shapes.find(s=>s.id===a).name='Primary Button';doc.shapes.find(s=>s.id===a).layout_class=`layout-${a}`;doc.shapes.find(s=>s.id===a).layout_class_generated=false;
 doc.shapes.find(s=>s.id===b).name='Primary Button';delete doc.shapes.find(s=>s.id===b).layout_class;delete doc.shapes.find(s=>s.id===b).layout_class_generated;
 Object.assign(doc.shapes.find(s=>s.id===c),{name:'Custom container',layout_class:'my-container',layout_class_generated:false});
 e.load(JSON.stringify(doc));const migrated=JSON.parse(e.snapshot());assert.equal(migrated.shapes.find(s=>s.id===a).layout_class,`primary-button-${a}`);assert.equal(migrated.shapes.find(s=>s.id===b).layout_class,`primary-button-${b}`);assert.equal(migrated.shapes.find(s=>s.id===c).layout_class,'my-container');
 assert.equal(new Set(migrated.shapes.map(s=>s.layout_class)).size,3);
 const saved=e.snapshot();e.load(saved);assert.equal(e.snapshot(),saved);
 const layer=migrated.shapes.find(s=>s.id===a);e.update(JSON.stringify({...layer,name:'Submit Button'}));assert.equal(JSON.parse(e.snapshot()).shapes.find(s=>s.id===a).layout_class,`submit-button-${a}`);e.free();
});
test('unusual names produce safe CSS classes',()=>{assert.equal(automaticLayoutClass({id:4,name:'123 / Icon'}),'layer-123-icon-4');assert.equal(automaticLayoutClass({id:5,name:'💙'}),'layer-5');assert.equal(automaticLayoutClass({id:6,name:'px-scene'}),'layer-px-scene-6');});
test('instance CSS identity remains editable and survives updates from its main component',()=>{
 const e=new Editor(),master=e.add('frame',0,0);e.create_component(master);const id=e.create_instance(master,100,0),get=id=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(id),layout_class:'checkout-button',layout_class_generated:false}));assert.equal(get(id).layout_class,'checkout-button');
 e.update(JSON.stringify({...get(master),name:'New button name'}));assert.equal(get(id).layout_class,'checkout-button');assert.equal(get(id).component.type,'instance');e.free();
});
