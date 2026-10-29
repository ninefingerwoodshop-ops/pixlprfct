import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {updatePaint,paints,paintLayers,clearPaintTypes,paintMode} from '../web/paints.js';
import {emptyMedia,emptyPattern,emptyShader,mediaLayout,textureSvg,resolvePatternPaints} from '../web/paint-textures.js';
import {colorChannels,channelsColor,contrastRatio} from '../web/paint-colors.js';
import {defaultGradient,gradientSvg} from '../web/gradients.js';
import {svgDocument} from '../web/export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const get=(e,id)=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id),save=(e,s)=>{e.update(JSON.stringify(s));return get(e,s.id);};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
test('all six paint modes persist, undo, and export without replacing neighboring paints',()=>{
 const e=new Editor(),copy=new Editor();try{const id=e.add('rectangle',0,0);let s=get(e,id);const variants=[{}, {gradient:defaultGradient('#ff0000')},{pattern:emptyPattern()},{media:{...emptyMedia('image'),data_url:png}},{media:{...emptyMedia('video'),data_url:'data:video/mp4;base64,AAAA',poster:png}},{shader:{...emptyShader('#ffffff'),snapshot:png}}];
 for(const patch of variants){const before=e.snapshot();s=save(e,updatePaint(s,'fill',1,{...clearPaintTypes,...patch}));const expected=paintMode(paints(s,'fill')[0]);copy.load(e.snapshot());assert.equal(paintMode(paints(get(copy,id),'fill')[0]),expected);const svg=svgDocument([s],s,1,null,()=>({lines:[],style:{}}));assert.match(svg,/<svg/);if(['image','video','shader'].includes(expected)){assert.match(svg,/fill-texture-/);assert.ok(svg.includes(png));}e.undo();assert.equal(e.snapshot(),before);e.redo();s=get(e,id);}
 }finally{e.free();copy.free();}
});
test('malformed media, shaders, mixed modes, and circular pattern sources reject atomically',()=>{
 const e=new Editor();try{const a=e.add('rectangle',0,0),b=e.add('rectangle',200,0);let s=save(e,updatePaint(get(e,a),'fill',1,{pattern:{...emptyPattern(),source_id:b}}));const before=e.snapshot();for(const patch of [{media:{...emptyMedia('image'),data_url:'javascript:alert(1)'}},{shader:{...emptyShader('#ffffff'),code:'x'.repeat(16001)}},{pattern:{...emptyPattern(),source_id:a}},{pattern:{...emptyPattern(),scale:0}},{blend_mode:'bad'}]){assert.throws(()=>save(e,updatePaint(s,'fill',1,{...clearPaintTypes,...patch})));assert.equal(e.snapshot(),before);}assert.throws(()=>save(e,updatePaint(get(e,b),'fill',1,{pattern:{...emptyPattern(),source_id:a}})),/circular/);assert.equal(e.snapshot(),before);
 }finally{e.free();}
});
test('pattern source edits update rendering and copied source references remap together',()=>{
 const e=new Editor();try{const a=e.add('rectangle',0,0),b=e.add('rectangle',200,0);save(e,updatePaint(get(e,a),'fill',1,{pattern:{...emptyPattern(),source_id:b}}));let shapes=JSON.parse(e.snapshot()).shapes;let resolved=resolvePatternPaints(shapes,source=>source.map(s=>s.fill).join(','));assert.match(resolved.find(s=>s.id===a).appearance.fills[0].pattern._svg,/#d9d9d9/);save(e,{...get(e,b),fill:'#ff0000'});shapes=JSON.parse(e.snapshot()).shapes;resolved=resolvePatternPaints(shapes,source=>source.map(s=>s.fill).join(','));assert.match(resolved.find(s=>s.id===a).appearance.fills[0].pattern._svg,/#ff0000/);const ids=JSON.parse(e.paste_layers(e.copy_layers(JSON.stringify([a,b])),0,200,0));assert.equal(get(e,ids[0]).appearance.fills[0].pattern.source_id,ids[1]);
 }finally{e.free();}
});
test('media fits, tiles and crops; all gradient types and stroke textures have SVG paint servers',()=>{
 const m={...emptyMedia('image'),width:200,height:100,data_url:png};assert.deepEqual(mediaLayout({...m,mode:'fit'},100,100),{x:0,y:25,width:100,height:50});assert.deepEqual(mediaLayout(m,100,100),{x:-50,y:0,width:200,height:100});
 const e=new Editor();try{const id=e.add('rectangle',0,0);for(const kind of ['linear','radial','angular','diamond']){const s=save(e,updatePaint(get(e,id),'fill',1,{gradient:defaultGradient('#ff0000',kind)})),layer=paintLayers(s)[0];assert.ok(gradientSvg(layer).includes('gradient-'+layer.id));}
 const s=save(e,updatePaint(get(e,id),'fill',1,{...clearPaintTypes,media:m}));assert.match(textureSvg(paintLayers(s)[0]),/filter=/);
 }finally{e.free();}
});
test('color notation round trips and contrast calculation includes paint opacity',()=>{
 for(const color of ['#ff0000','#00ff00','#0000ff','#ffffff','#000000'])for(const format of ['Hex','RGB','HSL','HSB'])assert.equal(channelsColor(colorChannels(color,format),format),color);
 assert.equal(channelsColor(['abc'],'Hex'),'#aabbcc');assert.equal(contrastRatio('#000000','#ffffff'),21);assert.equal(contrastRatio('#000000','#ffffff',0),1);assert.throws(()=>channelsColor(['bad!'],'Hex'));
});
