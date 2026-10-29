import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,symlink,realpath,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createPixlMcp} from '../mcp/server.mjs';
import {createEditorBridge} from '../mcp/bridge.mjs';
import {createProjectStore} from '../mcp/projects.mjs';
const temporary=async t=>{const directory=await mkdtemp(path.join(os.tmpdir(),'pixl-mcp-'));t.after(()=>rm(directory,{recursive:true,force:true}));return directory;};
const unpack=result=>{assert.equal(result.isError,undefined,JSON.stringify(result.content));return JSON.parse(result.content[0].text);};
test('saved projects are confined, revision checked, saved atomically, and restored without losing CSS',async t=>{
 const directory=await temporary(t),store=await createProjectStore(directory);t.after(()=>store.dispose());const session=await store.open({create:true,name:'MCP test'});
 let state=session.runtime.state();const built=await session.runtime.request('build',{revision:state.revision,operations:[{op:'create',kind:'rectangle',properties:{name:'Box'}}]});
 const css=await session.runtime.request('css',{id:built.result.results[0]});await session.runtime.request('build',{revision:css.revision,operations:[{op:'css',id:css.id,source:css.source+'\n.box-1:hover { opacity: .3; }'}]});
 state=session.runtime.state();const saved=await store.save(session.id,{file:'design.pixl',revision:state.revision});assert.equal(saved.file,'design.pixl');assert.match(await readFile(path.join(directory,'design.pixl'),'utf8'),/custom_css/);
 for(const file of ['../escape.pixl','/tmp/escape.pixl','bad.json'])await assert.rejects(store.save(session.id,{file,revision:state.revision}),/relative/);
 const outside=await mkdtemp(path.join(os.tmpdir(),'pixl-outside-'));t.after(()=>rm(outside,{recursive:true,force:true}));await symlink(outside,path.join(directory,'linked'));await assert.rejects(store.save(session.id,{file:'linked/out.pixl',revision:state.revision}),/Symlinks/);
 await assert.rejects(store.save(session.id,{file:'design.pixl',revision:'stale'}),/Revision/);
 await writeFile(path.join(directory,'design.pixl'),JSON.stringify({...JSON.parse(session.editor.snapshot()),name:'External edit'}));await assert.rejects(store.save(session.id,{revision:state.revision}),/File conflict/);
 store.close(session.id);const reopened=await store.open({file:'design.pixl'});assert.equal(reopened.runtime.state().name,'External edit');assert.deepEqual(await store.files(),['design.pixl']);
});
test('real MCP client discovers tools, resources and prompts, builds, exports and saves through the protocol',async t=>{
 const instance=await createPixlMcp({workspace:await temporary(t),live:false}),client=new Client({name:'test',version:'1.0'}),[a,b]=InMemoryTransport.createLinkedPair();t.after(async()=>{await client.close();await instance.close();});
 await instance.server.connect(a);await client.connect(b);const list=await client.listTools();assert.equal(list.tools.length,13);assert.ok(list.tools.find(tool=>tool.name==='pixlprfct_build').inputSchema);
 assert.ok((await client.listResources()).resources.length>=10);assert.equal((await client.listPrompts()).prompts[0].name,'build-design');
 assert.match((await client.readResource({uri:'pixlprfct://reference/overview'})).contents[0].text,/Rust document engine/);
 const models=unpack(await client.callTool({name:'pixlprfct_reference',arguments:{topic:'models',query:['Typography','Value']}}));assert.ok(models.models.Typography);assert.deepEqual(models.constraints.Value.examples.alias,{alias:1});
 const open=unpack(await client.callTool({name:'pixlprfct_open_project',arguments:{create:true,name:'Protocol test'}}));
 const built=unpack(await client.callTool({name:'pixlprfct_build',arguments:{session:open.id,revision:open.revision,operations:[{op:'create',kind:'frame',as:'frame',properties:{name:'Screen',width:800,height:600}},{op:'create',kind:'text',parent:{$ref:'frame'},properties:{text:'Built through MCP'}}]}}));assert.equal(built.layerCount,2);
 const bad=await client.callTool({name:'pixlprfct_build',arguments:{session:open.id,revision:open.revision,operations:[{op:'create'}]}});assert.equal(bad.isError,true);assert.match(bad.content[0].text,/Revision conflict/);
 const exported=unpack(await client.callTool({name:'pixlprfct_export',arguments:{session:open.id,target:'html'}}));assert.ok(exported.files.some(f=>f.text.includes('Built through MCP')));
 unpack(await client.callTool({name:'pixlprfct_save_project',arguments:{session:open.id,revision:built.revision,file:'protocol.pixl'}}));assert.ok((await instance.store.files()).includes('protocol.pixl'));
});
test('stdio launch is usable by standard clients and emits no non-protocol stdout',async t=>{
 const workspace=await temporary(t),client=new Client({name:'stdio-test',version:'1.0'}),transport=new StdioClientTransport({command:process.execPath,args:[path.resolve('mcp/server.mjs'),'--workspace',workspace,'--no-live'],stderr:'pipe'});
 t.after(()=>client.close());await client.connect(transport);const result=unpack(await client.callTool({name:'pixlprfct_sessions',arguments:{}}));assert.equal(result.workspace,await realpath(workspace));assert.deepEqual(result.sessions,[]);await client.ping();
});
test('bridge rejects untrusted origins and invalid tokens, routes to exactly one paired editor, and closes pending work',async t=>{
 const bridge=await createEditorBridge({port:0,origins:['http://127.0.0.1:4176'],timeout:500});t.after(()=>bridge.close());
 const blocked=new WebSocket(bridge.info().url,{origin:'https://untrusted.example'});blocked.on('error',()=>{});const [response]=await new Promise(resolve=>blocked.on('unexpected-response',(_request,response)=>{response.resume();resolve([response]);blocked.terminate();}));assert.equal(response.statusCode,403);
 const wrong=new WebSocket(bridge.info().url,{origin:'http://127.0.0.1:4176'});await once(wrong,'open');wrong.send(JSON.stringify({type:'hello',token:'wrong'}));assert.equal((await once(wrong,'close'))[0],1008);
 const first=new WebSocket(bridge.info().url,{origin:'http://127.0.0.1:4176'}),second=new WebSocket(bridge.info().url,{origin:'http://127.0.0.1:4176'});await Promise.all([once(first,'open'),once(second,'open')]);
 for(const [socket,name] of [[first,'First'],[second,'Second']])socket.send(JSON.stringify({type:'hello',token:bridge.info().pairingCode,name}));
 const [one,two]=await Promise.all([once(first,'message'),once(second,'message')]);const id=JSON.parse(one[0]).session,otherId=JSON.parse(two[0]).session;assert.notEqual(id,otherId);
 first.on('message',buffer=>{const request=JSON.parse(buffer);if(request.type==='request')first.send(JSON.stringify({type:'result',id:request.id,result:{received:request.method}}));});
 assert.deepEqual(await bridge.request(id,'read',{}),{received:'read'});assert.equal(bridge.list().length,2);
 const pending=bridge.request(otherId,'read',{});const rejected=assert.rejects(pending,/disconnected/);second.close();await rejected;first.close();
});

test('the packaged desktop origin can pair with the default bridge policy',async t=>{
 const bridge=await createEditorBridge({port:0,timeout:500});t.after(()=>bridge.close());
 const socket=new WebSocket(bridge.info().url,{origin:'pixlprfct://app'});t.after(()=>socket.close());
 await once(socket,'open');
 const paired=once(socket,'message');socket.send(JSON.stringify({type:'hello',token:bridge.info().pairingCode,name:'Desktop'}));
 const [message]=await paired;assert.ok(JSON.parse(message).session);assert.equal(bridge.list().length,1);
});
