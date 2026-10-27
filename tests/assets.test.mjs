import {test} from 'node:test';
import assert from 'node:assert/strict';
import {componentAssets} from '../web/assets.js';

test('assets combine variants across pages without duplicate masters and search property values',()=>{
  const doc={pages:[{id:1,name:'Foundations'},{id:2,name:'Controls'}],shapes:[
    {id:1,name:'Default button',page_id:1,component:{type:'master'}},
    {id:2,name:'Hover button',page_id:2,component:{type:'master'}},
    {id:3,name:'Logo',page_id:1,component:{type:'master'}},
    {id:4,name:'Instance',page_id:2,component:{type:'instance'}}
  ],component_sets:[{name:'Button',properties:['State'],variants:[{component_id:1,values:['Default']},{component_id:2,values:['Hover']},{component_id:99,values:['Stale']}]}]};
  const before=JSON.stringify(doc);
  assert.deepEqual(componentAssets(doc).map(a=>a.name),['Button','Logo']);
  assert.deepEqual(componentAssets(doc,'button HOVER','2')[0].variants.map(v=>v.id),[1,2]);
  assert.equal(componentAssets(doc,'logo','2').length,0);
  assert.deepEqual(componentAssets(doc,'foundations logo').map(a=>a.name),['Logo']);
  assert.equal(JSON.stringify(doc),before);
});

test('assets tolerate removed component variants and ungrouped legacy documents',()=>{
  assert.deepEqual(componentAssets({pages:[],shapes:[],component_sets:[{name:'Empty',properties:[],variants:[{component_id:1,values:[]}]}]}),[]);
  assert.equal(componentAssets({pages:[{id:1,name:'Page'}],shapes:[{id:4,name:'Card',page_id:1,component:{type:'master'}}]})[0].variants[0].id,4);
});

test('asset previews render the real control and preserve the source document',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {default:init,Editor}=await import('../web/pkg/pixlprfct_core.js');
  const {newControl}=await import('../web/controls.js');
  const {assetAppearance}=await import('../web/assets.js');
  await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
  const e=new Editor(),id=e.add('frame',500,300);
  const shape=JSON.parse(e.snapshot()).shapes.find(s=>s.id===id);
  e.update(JSON.stringify({...shape,control:{...newControl('text','Email address'),placeholder:'name@example.com'}}));
  const doc=JSON.parse(e.snapshot()),before=JSON.stringify(doc),preview=assetAppearance(doc,id);
  assert.match(preview.html,/<input/);
  assert.match(preview.html,/Email address/);
  assert.match(preview.html,/name@example.com/);
  assert.ok(preview.width>0&&preview.height>0);
  assert.equal(JSON.stringify(doc),before);
  e.free();
});
