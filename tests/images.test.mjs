import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';import {imageLayout,imageSvg} from '../web/images.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
const shape=()=>({id:0,kind:'image',name:'Test image',x:10,y:20,width:100,height:100,fill:'#ffffff',text:'',hidden:false,image:{data_url:data,width:400,height:200,mode:'fill',zoom:1,offset_x:.5,offset_y:.5}});
test('fill, fit and positioned zoom crops preserve source aspect ratios',()=>{
  const s=shape();assert.deepEqual(imageLayout(s),{sx:100,sy:0,sw:200,sh:200,dx:10,dy:20,dw:100,dh:100});
  assert.deepEqual(imageLayout({...s,image:{...s.image,mode:'fit'}}),{sx:0,sy:0,sw:400,sh:200,dx:10,dy:45,dw:100,dh:50});
  const crop=imageLayout({...s,image:{...s.image,zoom:2,offset_x:1,offset_y:0}});assert.deepEqual([crop.sx,crop.sy,crop.sw,crop.sh],[300,0,100,100]);
  assert.match(imageSvg(s),/viewBox="100 0 200 200"/);assert.ok(imageSvg(s).includes(data));
});
test('embedded images and crops roundtrip with atomic history and independent duplicates',()=>{
  const e=new Editor(),id=e.insert(JSON.stringify(shape()));let s=JSON.parse(e.snapshot()).shapes[0];const before=e.snapshot();
  e.update(JSON.stringify({...s,image:{...s.image,zoom:2,offset_x:.7}}));const edited=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),edited);
  const r=new Editor();r.load(edited);assert.equal(r.snapshot(),edited);e.duplicate(id);assert.equal(JSON.parse(e.snapshot()).shapes[1].image.zoom,2);e.free();r.free();
});
test('image format and crop validation reject malformed state without a partial insert',()=>{
  const e=new Editor(),before=e.snapshot(),s=shape();
  for(const patch of [{data_url:'https://example.com/a.png'},{data_url:'data:image/svg+xml;base64,AAAA'},{data_url:'data:image/png;base64,"/>'},{zoom:0},{offset_x:1.1},{height:0},{mode:'bad'}]){assert.throws(()=>e.insert(JSON.stringify({...s,image:{...s.image,...patch}})));assert.equal(e.snapshot(),before);}
  assert.throws(()=>e.insert(JSON.stringify({...s,image:null})));assert.equal(e.snapshot(),before);e.free();
});
