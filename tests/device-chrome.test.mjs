import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {deviceChromeSvg,chromeInsets,orientFrame,orientedFrameSize} from '../web/device-chrome.js';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('SVG shells leave the viewport aperture at its original dimensions',()=>{
 for(const type of ['phone','tablet','desktop','iphone','ipad','iphone-notch','iphone-fold','surface']){
  const [top,right,bottom,left]=chromeInsets(type,390,844),svg=deviceChromeSvg(type,390,844);
  assert.match(svg,new RegExp('viewBox="0 0 '+(390+left+right)+' '+(844+top+bottom)+'"'));
  assert.match(svg,/fill-rule="evenodd"/);
  assert.match(svg,/fill-rule="evenodd"/);
 }
 assert.equal(deviceChromeSvg('none',390,844),'');
});
test('device chrome persists, undoes, and does not resize frame contents',()=>{
 const e=new Editor(),id=e.add('frame',0,0),get=()=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 const initial=get();e.update(JSON.stringify({...initial,device_chrome:'phone'}));
 assert.equal(get().device_chrome,'phone');assert.equal(get().width,initial.width);assert.equal(get().height,initial.height);
 const copy=new Editor();copy.load(e.snapshot());assert.equal(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===id).device_chrome,'phone');
 e.undo();assert.equal(get().device_chrome,'');e.redo();assert.equal(get().device_chrome,'phone');copy.free();e.free();
});

test('landscape rotates the hardware and insets, not the viewport content',()=>{
 assert.deepEqual(chromeInsets('phone',393,852),[9,9,11,9]);
 assert.deepEqual(chromeInsets('phone',852,393),[9,9,9,11]);
 for(const type of ['iphone','iphone-notch','ipad','phone','tablet']){
  const portrait=deviceChromeSvg(type,393,852),landscape=deviceChromeSvg(type,852,393);
  assert.doesNotMatch(portrait,/rotate\(90\)/);
  assert.match(landscape,/rotate\(90\)/);
  const [t,r,b,l]=chromeInsets(type,852,393);
  assert.ok(landscape.includes(`viewBox="0 0 ${852+l+r} ${393+t+b}"`));
 }
 assert.doesNotMatch(deviceChromeSvg('surface',1440,960),/rotate\(90\)/);
 assert.match(deviceChromeSvg('surface',960,1440),/rotate\(90\)/);
 assert.doesNotMatch(deviceChromeSvg('desktop',1440,1024),/rotate\(90\)/);
});
test('orientation swaps dimensions atomically and survives history and reload',()=>{
 const e=new Editor(),id=e.add('frame',50,60),get=()=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(),width:393,height:852,device_chrome:'iphone'}));
 const before=get();e.update(JSON.stringify(orientFrame(before,'landscape')));
 assert.equal(get().width,852);assert.equal(get().height,393);assert.equal(get().rotation,before.rotation);assert.equal(get().x,50);assert.equal(get().y,60);
 assert.deepEqual(orientedFrameSize(852,393,'landscape'),{width:852,height:393});
 const copy=new Editor();copy.load(e.snapshot());assert.equal(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===id).width,852);
 e.undo();assert.equal(get().width,393);e.redo();assert.equal(get().width,852);e.free();copy.free();
});
test('turning chrome off remembers its device style through save and history',()=>{
 const e=new Editor(),id=e.add('frame',0,0),get=()=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 e.update(JSON.stringify({...get(),device_chrome:'ipad',device_chrome_hidden:true}));
 assert.equal(get().device_chrome,'ipad');assert.equal(get().device_chrome_hidden,true);
 e.update(JSON.stringify({...get(),device_chrome_hidden:false}));assert.equal(get().device_chrome_hidden,false);
 e.undo();assert.equal(get().device_chrome_hidden,true);e.redo();assert.equal(get().device_chrome,'ipad');
 const copy=new Editor();copy.load(e.snapshot());assert.equal(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===id).device_chrome_hidden,false);copy.free();e.free();
});
test('automatic custom-frame chrome follows viewport width and preserves explicit presets',async()=>{
 const {responsiveChromeType}=await import('../web/device-chrome.js');
 for(const [width,type] of [[390,'phone'],[599,'phone'],[600,'tablet'],[768,'tablet'],[1023,'tablet'],[1024,'desktop'],[1440,'desktop'],[390,'phone']]){
  assert.equal(responsiveChromeType('auto',width),type);
  assert.equal(deviceChromeSvg('auto',width,900),deviceChromeSvg(type,width,900));
  assert.deepEqual(chromeInsets('auto',width,900),chromeInsets(type,width,900));
 }
 assert.equal(responsiveChromeType('iphone',1200),'iphone');assert.equal(responsiveChromeType('ipad',390),'ipad');
});
test('only top-level frames display chrome; nested frames and hidden chrome do not',async()=>{
 const {showsDeviceChrome}=await import('../web/device-chrome.js');
 const parent={id:1,kind:'frame',parent_id:0,device_chrome:'auto'},child={...parent,id:2,parent_id:1};
 assert.equal(showsDeviceChrome(parent,[parent,child]),true);assert.equal(showsDeviceChrome(child,[parent,child]),false);
 assert.equal(showsDeviceChrome({...parent,device_chrome_hidden:true},[parent]),false);
 assert.equal(showsDeviceChrome({...parent,device_chrome:''},[parent]),false);
});
test('automatic Apple and Android families switch at the same widths in canvas and prototype',async()=>{
 const {responsiveChromeType,deviceScreenRadius}=await import('../web/device-chrome.js');
 const {prototypeViewport}=await import('../web/prototype.js');
 for(const family of ['auto','auto-apple'])for(const width of [390,599,600,768,1023,1024,1440,390]){
  const expected=width>=1024?'desktop':family==='auto-apple'?(width<600?'iphone':'ipad'):(width<600?'phone':'tablet');
  assert.equal(responsiveChromeType(family,width),expected);
  const frame={width,height:900,device_chrome:family};
  assert.equal(deviceChromeSvg(family,width,900),deviceChromeSvg(expected,width,900));
  assert.deepEqual(chromeInsets(family,width,900),chromeInsets(expected,width,900));
  assert.equal(deviceScreenRadius(family,width,900),deviceScreenRadius(expected,width,900));
  assert.equal(prototypeViewport(frame,1600,1200).svg,deviceChromeSvg(expected,width,900));
 }
});
test('automatic family choice persists through save/reload, visibility, and undo',()=>{
 const editor=new Editor(),id=editor.add('frame',0,0),get=e=>JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
 editor.update(JSON.stringify({...get(editor),device_chrome:'auto'}));
 editor.update(JSON.stringify({...get(editor),device_chrome:'auto-apple',device_chrome_hidden:true}));
 const copy=new Editor();copy.load(editor.snapshot());assert.equal(get(copy).device_chrome,'auto-apple');assert.equal(get(copy).device_chrome_hidden,true);
 editor.undo();assert.equal(get(editor).device_chrome,'auto');editor.redo();assert.equal(get(editor).device_chrome,'auto-apple');editor.free();copy.free();
});
test('custom switching widths apply to SVG, insets, and prototype and survive reload',async()=>{
 const {responsiveChromeType}=await import('../web/device-chrome.js');const {prototypeViewport}=await import('../web/prototype.js');
 const limits={tablet:700,desktop:1200};
 for(const [width,type] of [[699,'iphone'],[700,'ipad'],[1199,'ipad'],[1200,'desktop']]){
  assert.equal(responsiveChromeType('auto-apple',width,limits),type);
  assert.equal(deviceChromeSvg('auto-apple',width,900,limits),deviceChromeSvg(type,width,900));
  assert.deepEqual(chromeInsets('auto-apple',width,900,limits),chromeInsets(type,width,900));
  assert.equal(prototypeViewport({width,height:900,device_chrome:'auto-apple',device_chrome_breakpoints:limits},1600,1200).svg,deviceChromeSvg(type,width,900));
 }
 const e=new Editor(),id=e.add('frame',0,0),s=JSON.parse(e.snapshot()).shapes[0];e.update(JSON.stringify({...s,device_chrome:'auto',device_chrome_breakpoints:limits}));
 const copy=new Editor();copy.load(e.snapshot());assert.deepEqual(JSON.parse(copy.snapshot()).shapes.find(s=>s.id===id).device_chrome_breakpoints,limits);copy.free();e.free();
});
test('existing custom frames migrate once across pages without enabling hidden chrome or changing presets',async()=>{
 const {migrateChromeDocument}=await import('../web/frame-tools.js');
 const doc={shapes:[{id:1,kind:'frame',name:'Frame',device_chrome:'desktop',page_id:1},{id:2,kind:'frame',name:'Custom',device_chrome:'iphone',device_chrome_hidden:true,page_id:2},{id:3,kind:'frame',name:'iPhone 16',device_chrome:'iphone'},{id:4,kind:'frame',name:'Child',parent_id:1,device_chrome:'tablet'}]};
 const migrated=migrateChromeDocument(doc);assert.equal(migrated.shapes[0].device_chrome,'auto');assert.equal(migrated.shapes[0].device_chrome_hidden,false);assert.equal(migrated.shapes[1].device_chrome,'auto-apple');assert.equal(migrated.shapes[1].device_chrome_hidden,true);assert.equal(migrated.shapes[2].device_chrome,'iphone');assert.equal(migrated.shapes[3].device_chrome,'tablet');
 migrated.shapes[0].device_chrome='desktop';assert.deepEqual(migrateChromeDocument(migrated),migrated);
});

test('active chrome status follows live width, family, thresholds and visibility',async()=>{
 const {deviceChromeStatus}=await import('../web/device-chrome.js');
 const frame={id:1,kind:'frame',width:599,height:900,device_chrome:'auto'};
 const status=(patch={})=>{const current={...frame,...patch};return deviceChromeStatus(current,[current]);};
 assert.equal(status(),'Phone · Android');
 assert.equal(status({width:600}),'Tablet · Android');
 assert.equal(status({width:1024}),'Desktop · Browser');
 assert.equal(status({device_chrome:'auto-apple',width:600}),'Tablet · iPad');
 assert.equal(status({device_chrome:'auto-apple'}),'Phone · iPhone');
 assert.equal(status({_rotationHit:{width:1024}}),'Desktop · Browser');
 assert.equal(status({width:650,device_chrome_breakpoints:{tablet:700,desktop:1200}}),'Phone · Android');
 assert.equal(status({width:1400,device_chrome:'iphone-notch'}),'Phone · iPhone (Notch)');
 assert.equal(status({device_chrome_hidden:true}),'Hidden');
 assert.equal(status({device_chrome:'none'}),'Hidden');
 assert.equal(deviceChromeStatus({...frame,parent_id:2},[frame,{id:2,kind:'frame'}]),'Top-level frames only');
 assert.equal(deviceChromeStatus(null,[]),'');
});
