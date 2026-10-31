import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {teamFixture} from './helpers/team-fixture.mjs';
import {mergeLibrary} from '../web/library-model.js';
import {libraryChanges} from '../web/library-changes.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
test('library release history, notes, pins, retirement, usage and rollback preserve immutable releases',async()=>{
 const f=await teamFixture(),e=new Editor(),consumer=new Editor();try{
  const {owner:a,path,query}=f,shape=e.add('frame',0,0);e.create_component(shape);e.load(JSON.stringify({...JSON.parse(e.snapshot()),name:'Team library'}));
  const source=ok(await a.call('/api/documents'+query,JSON.parse(e.snapshot())),201),lease=ok(await a.call(path(source.id,'/editing'),{action:'acquire'})),lib=(suffix='')=>'/api/libraries/'+source.id+suffix+query;
  let published=ok(await a.call(lib(),{notes:'Initial version'},{method:'PUT',revision:1,token:lease.lease.token}));assert.equal(published.revision,1);
  const first=ok(await a.call(lib()));assert.equal(first.notes,'Initial version');
  consumer.load(JSON.stringify(mergeLibrary(JSON.parse(consumer.snapshot()),first)));let doc=JSON.parse(consumer.snapshot());doc.libraries[0].pinned=true;
  const used=ok(await a.call('/api/documents'+query,doc),201);assert.equal(ok(await a.call(lib('/usage'))).projects[0].id,used.id);
  const old=JSON.parse(e.snapshot()),next={...old,shapes:old.shapes.map(s=>({...s,fill:'#123456'}))};e.load(JSON.stringify(next));
  ok(await a.call(path(source.id),JSON.parse(e.snapshot()),{method:'PUT',revision:published.sourceRevision,token:lease.lease.token}));
  published=ok(await a.call(lib(),{notes:'New color'},{method:'PUT',revision:published.sourceRevision+1,token:lease.lease.token}));
  const second=ok(await a.call(lib()));assert(libraryChanges(first.body,second.body).changed>0);assert.equal(ok(await a.call('/api/libraries/'+source.id+'?revision=1&workspace=org:'+f.org.id)).body,first.body);
  const editConsumer=ok(await a.call(path(used.id,'/editing'),{action:'acquire'})),updated=mergeLibrary(doc,second);
  assert.equal((await a.call(path(used.id),updated,{method:'PUT',revision:1,token:editConsumer.lease.token})).status,403);
  const retired=ok(await a.call(lib('/lifecycle'),{retired:true},{method:'PATCH',revision:published.sourceRevision}));assert(retired.retired);
  assert.equal((await a.call('/api/documents'+query,mergeLibrary(JSON.parse(new Editor().snapshot()),second))).status,403);
  ok(await a.call(path(used.id),doc,{method:'PUT',revision:1,token:editConsumer.lease.token}));
  const rollback=ok(await a.call(lib(),{rollbackRevision:1,notes:'Restore original'},{method:'PUT',revision:retired.sourceRevision,token:lease.lease.token}));assert.equal(rollback.revision,3);assert.equal(ok(await a.call(lib())).body,first.body);assert.equal(ok(await a.call(lib('/releases'))).releases.length,3);
 }finally{e.free();consumer.free();await f.close();}
});
