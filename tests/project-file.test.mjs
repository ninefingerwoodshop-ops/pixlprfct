import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {projectFile} from '../web/project-file.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('native project opens in a fresh editor with cross-page components and variables still editable',()=>{
 const first=new Editor(),second=new Editor();
 try{
  const frame=first.add('frame',10,20),text=first.add('text',30,40);first.reparent_many(JSON.stringify([text]),frame);
  first.save_variables(JSON.stringify({collections:[{id:1,name:'Theme',modes:[{id:1,name:'Light'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Brand',kind:'color',values:{1:'#123456'}}]}));
  first.bind_variable(frame,'fill',1);first.create_component(frame);const page=first.add_page();first.rename_page(page,'Preview');const instance=first.create_instance(frame,100,100);
  const file=projectFile(first.snapshot());assert.match(file.name,/\.pixl$/);second.load(file.data);assert.equal(second.snapshot(),first.snapshot());
  second.select_page(1);const master=JSON.parse(second.snapshot()).shapes.find(s=>s.id===text);second.update(JSON.stringify({...master,text:'Edited by the recipient'}));
  const imported=JSON.parse(second.snapshot());assert.equal(imported.shapes.find(s=>s.parent_id===instance).text,'Edited by the recipient');assert.equal(imported.shapes.find(s=>s.id===instance).variable_bindings.fill,1);
 }finally{first.free();second.free();}
});
test('native filenames are portable and oversized files cannot be exported as unopenable projects',()=>{
 assert.equal(projectFile(JSON.stringify({name:'Design / mobile',pages:[],shapes:[]})).name,'Design - mobile.pixl');
 assert.throws(()=>projectFile(JSON.stringify({pages:[],shapes:[],name:'x'.repeat(5_000_000)})),/5 MB/);
 assert.throws(()=>projectFile('{}'),/not a PixlPrfct/);
});
