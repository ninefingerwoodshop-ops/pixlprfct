import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {librarySnapshot,mergeLibrary,importedContentError,protectedInstanceError,sourceEditError} from '../web/library-model.js';
import {connectDatabase,migrateDocuments} from '../server/database.mjs';
import {createApplication} from '../server/application.mjs';
import {codeExportFiles} from '../web/code-export.js';
import {prototypeFrames} from '../web/prototype.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const snapshot=e=>JSON.parse(e.snapshot());
const source=()=>{const e=new Editor(),root=e.add('frame',10,20),text=e.add('text',30,40);e.update(JSON.stringify({...snapshot(e).shapes.find(s=>s.id===text),parent_id:root,text:'Button'}));e.create_component(root);const doc=snapshot(e);e.free();return doc;};
const release=doc=>({id:'11111111-1111-1111-1111-111111111111',workspace:'personal',name:'Design system',revision:1,body:librarySnapshot(doc)});
test('linked libraries survive save/load, place protected instances, and update without replacing IDs',()=>{
 const original=source(),r=release(original),e=new Editor();e.add('rectangle',800,800);const before=e.snapshot();e.load(JSON.stringify(mergeLibrary(snapshot(e),r)));
 const doc=snapshot(e),master=doc.libraries[0].maps.shapes[1];assert.equal(importedContentError(doc,mergeLibrary(doc,r)),null);
 const id=e.create_instance(master,300,200),placed=snapshot(e);assert.equal(protectedInstanceError(doc,placed),null);
 e.set_write_guard((a,b,history)=>{const old=JSON.parse(a),next=JSON.parse(b);return (!history&&importedContentError(old,next))||protectedInstanceError(old,next)||'';});
 const child=placed.shapes.find(s=>s.parent_id===id);assert.throws(()=>e.update(JSON.stringify({...child,text:'Changed'})),/protected/);assert.throws(()=>e.detach_instance(id),/detached/);
 assert.throws(()=>e.update(JSON.stringify({...placed.shapes.find(s=>s.id===id),width:900})),/protected/);
 e.update(JSON.stringify({...snapshot(e).shapes.find(s=>s.id===id),x:400,y:300}));assert.equal(protectedInstanceError(placed,snapshot(e)),null);
 const dup=e.duplicate(id);assert.ok(dup);assert.equal(protectedInstanceError(placed,snapshot(e)),null);
 const clipboard=e.copy_layers(JSON.stringify([id])),other=new Editor();assert.throws(()=>other.paste_layers(clipboard,0,0,0),/Add the library/);other.free();
 const pasted=JSON.parse(e.paste_layers(clipboard,24,24,0));assert.ok(pasted.length);assert.equal(protectedInstanceError(placed,snapshot(e)),null);e.remove(pasted[0]);
 const destination=e.add('frame',900,900),inside=JSON.parse(e.paste_into_frames(clipboard,JSON.stringify([destination])));assert.equal(snapshot(e).shapes.find(s=>s.id===inside[0]).parent_id,destination);assert.equal(protectedInstanceError(placed,snapshot(e)),null);
 const replacement=JSON.parse(e.paste_replace(clipboard,JSON.stringify(inside)));assert.equal(protectedInstanceError(placed,snapshot(e)),null);e.remove(destination);assert.ok(replacement.length);
 e.remove(dup);e.undo();assert.ok(snapshot(e).shapes.find(s=>s.id===dup));e.redo();
 const changed=structuredClone(original);changed.shapes[1].text='Published update';
 e.set_write_guard(()=>null);e.load(JSON.stringify(mergeLibrary(snapshot(e),{...r,revision:2,body:librarySnapshot(changed)})));
 assert.equal(snapshot(e).shapes.find(s=>s.id===child.id).text,'Published update');assert.equal(snapshot(e).libraries[0].maps.shapes[1],master);
 const copy=new Editor();copy.load(e.snapshot());assert.deepEqual(snapshot(copy).libraries,snapshot(e).libraries);copy.free();e.free();assert.ok(before);
});
test('updates cannot orphan used components; imported source and partial instances are protected',()=>{
 const e=new Editor(),r=release(source());e.load(JSON.stringify(mergeLibrary(snapshot(e),r)));const master=snapshot(e).libraries[0].maps.shapes[1],id=e.create_instance(master,0,0),doc=snapshot(e);
 const changed=structuredClone(doc);changed.shapes.find(s=>s.id===master).fill='#ff0000';assert.match(importedContentError(doc,changed),/protected/);
 const child=doc.shapes.find(s=>s.parent_id===id);const missing=structuredClone(doc);missing.shapes=missing.shapes.filter(s=>s.id!==child.id);assert.match(protectedInstanceError(doc,missing),/structure/);
 const removed={...r,revision:2,body:{...r.body,shapes:[]}};assert.throws(()=>mergeLibrary(doc,removed),/removes a component/);e.free();
});
test('component maintainers can edit assigned trees, not other components or shared settings',()=>{
 const before=source(),after=structuredClone(before),access={manage:false,editAll:false,components:[1]};after.shapes[1].text='Updated';assert.equal(sourceEditError(before,after,access),null);
 assert.match(sourceEditError(before,after,{...access,components:[]}),/permission/);after.variables.values.push({id:1});assert.match(sourceEditError(before,after,access),/shared project/);
});
test('nested components, variables, aliases, exposed properties and guide styles remap without collisions',()=>{
 const e=new Editor();e.load(JSON.stringify(source()));
 const variables={collections:[{id:1,name:'Theme',modes:[{id:1,name:'Light'},{id:2,name:'Dark'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Brand',kind:'color',values:{1:'#ff0000',2:'#0000ff'}},{id:2,collection_id:1,name:'Alias',kind:'color',values:{1:{alias:1},2:{alias:1}}}]};
 e.save_variables(JSON.stringify(variables));e.bind_variable(1,'fill',2);e.set_page_variable_mode(1,1,2);
 e.save_component_property(JSON.stringify({id:0,component_id:1,name:'Label',kind:'text',targets:[2]}));
 e.save_guide_style(JSON.stringify({id:0,name:'Grid',grids:[{kind:'grid',visible:true,size:10,count:5,gutter:20,margin:0,alignment:'stretch',color:'#ff0000',opacity:0.1}]}),1);
 const nested=e.create_instance(1,800,0),outer=e.create_component_selection(JSON.stringify([nested]));
 const target=new Editor();target.add('rectangle',0,0);target.save_variables(JSON.stringify(variables));const r=release(snapshot(e));
 target.load(JSON.stringify(mergeLibrary(snapshot(target),r)));const doc=snapshot(target),map=doc.libraries[0].maps;assert.notEqual(map.collections[1],1);assert.notEqual(map.variables[1],1);
 assert.equal(doc.variables.values.find(v=>v.id===map.variables[2]).values[1].alias,map.variables[1]);assert.equal(doc.shapes.find(s=>s.id===map.shapes[1]).fill,'#0000ff');
 const instance=target.create_instance(map.shapes[outer],1400,500);assert.equal(protectedInstanceError(doc,snapshot(target)),null);
 assert.ok(snapshot(target).shapes.find(s=>s.parent_id===instance));assert.equal(importedContentError(snapshot(target),mergeLibrary(snapshot(target),r)),null);
 e.free();target.free();
});
test('exports and prototype navigation omit cached library source pages but keep placed instances',()=>{
 const e=new Editor(),local=e.add('frame',0,0);e.load(JSON.stringify(mergeLibrary(snapshot(e),release(source()))));
 const master=snapshot(e).libraries[0].maps.shapes[1],instance=e.create_instance(master,500,0),doc=snapshot(e);
 const files=Object.fromEntries(codeExportFiles(doc).map(f=>[f.name,new TextDecoder().decode(f.data)]));
 assert.equal(JSON.parse(files['project.json']).pages.length,1);assert.match(files['index.html'],new RegExp('data-px-id="'+instance+'"'));assert.ok(!files['index.html'].includes('data-px-id="'+master+'"'));
 assert.deepEqual(prototypeFrames(doc).map(s=>s.id),[local,instance]);e.free();
});
async function fixture(){
 const db=await connectDatabase({engine:'sqlite',sqlitePath:':memory:'});await migrateDocuments(db,'sqlite');
 for(const sql of ['CREATE TABLE member (id TEXT,organizationId TEXT,userId TEXT,role TEXT)','CREATE TABLE team (id TEXT,organizationId TEXT)','CREATE TABLE teamMember (id TEXT,teamId TEXT,userId TEXT)','CREATE TABLE "user" (id TEXT,name TEXT,email TEXT)'])await db.query(sql,[],'run');
 for(const [id,role] of [['owner','owner'],['editor','member'],['consumer','member']]){await db.query('INSERT INTO member VALUES(?,?,?,?)',[id,'organization',id,role],'run');await db.query('INSERT INTO "user" VALUES(?,?,?)',[id,id,id+'@example.test'],'run');}
 const handle=createApplication({config:{engine:'sqlite',baseURL:'http://localhost',adminEmail:'owner@example.test'},db,auth:{api:{getSession:async({headers})=>headers.get('x-test-user')?{user:{id:headers.get('x-test-user'),email:'member@example.test',emailVerified:true}}:null}}});
 async function call(user,path,body,method=body===undefined?'GET':'POST',revision){const response=await handle(new Request('http://localhost'+path+(path.includes('?')?'&':'?')+'workspace=org:organization',{method,headers:{origin:'http://localhost','content-type':'application/json',...(user?{'x-test-user':user}:{}),...(revision?{'if-match':String(revision)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:response.status,data:await response.json()};}
 return {db,call};
}
test('server enforces source grants, locked instances, tenant access, releases, and restore permissions',async()=>{
 const {db,call}=await fixture();try{
  const initial=source();let result=await call('owner','/api/documents',initial);assert.equal(result.status,201);const id=result.data.id;
  assert.equal((await call('consumer','/api/libraries/'+id,{},'PUT',1)).status,403);
  result=await call('owner','/api/libraries/'+id,{},'PUT',1);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.sourceRevision,2);
  const changed=structuredClone(initial);changed.shapes[1].text='Editor update';assert.equal((await call('consumer','/api/documents/'+id,changed,'PUT',2)).status,403);
  result=await call('owner','/api/libraries/'+id,{maintainers:[],components:{1:['editor']}},'PATCH',2);assert.equal(result.status,200,JSON.stringify(result));
  assert.equal((await call('editor','/api/documents/'+id,changed,'PUT',2)).status,409);
  result=await call('editor','/api/documents/'+id,changed,'PUT',3);assert.equal(result.status,200,JSON.stringify(result));
  assert.equal((await call('editor','/api/libraries/'+id,{},'PUT',4)).status,403);
  assert.equal((await call('consumer','/api/documents/'+id,undefined,'DELETE',4)).status,403);
  assert.equal((await call('outsider','/api/libraries/'+id)).status,403);assert.equal((await call(null,'/api/libraries')).status,401);
  let published=(await call('consumer','/api/libraries/'+id)).data;assert.equal(JSON.parse(published.body).shapes[1].text,'Button');
  const e=new Editor();e.load(JSON.stringify(mergeLibrary(snapshot(e),published)));const master=snapshot(e).libraries[0].maps.shapes[1],instance=e.create_instance(master,300,300);const consuming=snapshot(e);
  result=await call('consumer','/api/documents',consuming);assert.equal(result.status,201,JSON.stringify(result));const target=result.data.id;
  const tampered=structuredClone(consuming);tampered.shapes.find(s=>s.component?.source===2&&s.component?.master===master).text='Unauthorized';assert.equal((await call('consumer','/api/documents/'+target,tampered,'PUT',1)).status,403);
  const detached=structuredClone(consuming);for(const s of detached.shapes)if(s.component?.type==='instance')s.component=null;assert.equal((await call('consumer','/api/documents/'+target,detached,'PUT',1)).status,403);
  const modified=structuredClone(consuming);modified.shapes.find(s=>s.id===master).fill='#123456';assert.equal((await call('consumer','/api/documents/'+target,modified,'PUT',1)).status,403);
  e.update(JSON.stringify({...snapshot(e).shapes.find(s=>s.id===instance),x:450}));result=await call('consumer','/api/documents/'+target,snapshot(e),'PUT',1);assert.equal(result.status,200,JSON.stringify(result));
  result=await call('owner','/api/libraries/'+id,{},'PUT',4);assert.equal(result.status,200,JSON.stringify(result));published=(await call('consumer','/api/libraries/'+id)).data;
  e.load(JSON.stringify(mergeLibrary(snapshot(e),published)));result=await call('consumer','/api/documents/'+target,snapshot(e),'PUT',2);assert.equal(result.status,200,JSON.stringify(result));
  assert.equal((await call('editor','/api/libraries/'+id,{maintainers:['editor'],components:{}},'PATCH',5)).status,403);
  result=await call('owner','/api/libraries/'+id,{maintainers:[],components:{}},'PATCH',5);assert.equal(result.status,200);
  assert.equal((await call('editor','/api/documents/'+id,initial,'PUT',6)).status,403);
  const history=(await call('consumer','/api/documents/'+id+'/versions')).data.versions;assert.ok(history.length);assert.equal((await call('consumer','/api/documents/'+id+'/versions/'+history[0].id+'/restore',{},'POST',6)).status,403);
  await db.query('DELETE FROM member WHERE userId=?',['consumer'],'run');assert.equal((await call('consumer','/api/libraries/'+id)).status,403);e.free();
 }finally{await db.close();}
});

test('component-set containers and variant metadata remap together in published libraries',()=>{
 const sourceEditor=new Editor();sourceEditor.load(JSON.stringify(source()));sourceEditor.add_variant(1);const original=snapshot(sourceEditor),set=original.component_sets[0],r=release(original);
 assert(r.body.shapes.some(s=>s.id===set.frame_id));const target=new Editor();target.add('rectangle',0,0);target.load(JSON.stringify(mergeLibrary(snapshot(target),r)));
 const doc=snapshot(target),link=doc.libraries[0],imported=doc.component_sets[0];assert.equal(imported.frame_id,link.maps.shapes[set.frame_id]);assert(imported.variants.every(v=>doc.shapes.find(s=>s.id===v.component_id).parent_id===imported.frame_id));
 assert.equal(importedContentError(doc,mergeLibrary(doc,r)),null);sourceEditor.free();target.free();
});
