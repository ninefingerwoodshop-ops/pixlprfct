import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,lstat,writeFile,chmod,symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import discovery from '../desktop/mcp-discovery.cjs';
import {createEditorBridge} from '../mcp/bridge.mjs';
import {createPixlMcp} from '../mcp/server.mjs';
import {createAgentConnection} from '../web/agent-transport.js';
const temporary=async t=>{const directory=await mkdtemp(path.join(os.tmpdir(),'pixl-discovery-'));t.after(()=>rm(directory,{recursive:true,force:true}));return directory;};
const waitFor=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}assert.fail('Connection did not recover');};
test('discovery is private, origin scoped, ignores invalid files, and removes stopped servers',async t=>{
 const directory=await temporary(t),bridge=await createEditorBridge({port:0});t.after(()=>bridge.close());
 const remove=await discovery.publishBridge(bridge.info(),{directory});const [name]=await readdir(directory);assert.equal((await lstat(path.join(directory,name))).mode&0o777,0o600);
 const local=await discovery.discoverBridges('pixlprfct://app',{directory}),web=await discovery.discoverBridges('http://127.0.0.1:4174',{directory});assert.equal(local.length,1);assert.notEqual(local[0].pairingCode,bridge.info().pairingCode);assert.notEqual(local[0].pairingCode,web[0].pairingCode);
 assert.deepEqual(await discovery.discoverBridges('https://untrusted.example',{directory}),[]);
 const socket=new WebSocket(local[0].url,{origin:'pixlprfct://app'});t.after(()=>socket.terminate());await once(socket,'open');let response=once(socket,'message');socket.send(JSON.stringify({type:'hello',token:local[0].pairingCode}));assert.equal(JSON.parse((await response)[0]).type,'connected');
 response=once(socket,'message');socket.send(JSON.stringify({type:'ping'}));assert.equal(JSON.parse((await response)[0]).type,'pong');
 const wrong=new WebSocket(local[0].url,{origin:'http://127.0.0.1:4174'});await once(wrong,'open');wrong.send(JSON.stringify({type:'hello',token:local[0].pairingCode}));assert.equal((await once(wrong,'close'))[0],1008);
 await chmod(path.join(directory,name),0o644);assert.deepEqual(await discovery.discoverBridges('pixlprfct://app',{directory}),[]);await chmod(path.join(directory,name),0o600);
 await writeFile(path.join(directory,'00000000-0000-0000-0000-000000000001.json'),'bad json',{mode:0o600});
 await symlink(path.join(directory,name),path.join(directory,'00000000-0000-0000-0000-000000000002.json'));
 assert.equal((await discovery.discoverBridges('pixlprfct://app',{directory})).length,1);await remove();assert.deepEqual(await discovery.discoverBridges('pixlprfct://app',{directory}),[]);
});
test('a real editor reconnects automatically after an MCP server restarts on a different port',async t=>{
 const directory=await temporary(t),workspace=path.join(directory,'projects'),registry=path.join(directory,'registry');let instance=await createPixlMcp({workspace,port:0,discover:true,discoveryDirectory:registry});t.after(()=>instance.close());
 let tick,offset=0;const edits=[];
 class DesktopSocket extends WebSocket{constructor(url){super(url,{origin:'pixlprfct://app'});}}
 const connection=createAgentConnection({runtime:{state:()=>({name:'Automatic editor'}),request:async(method,args)=>{edits.push({method,args});return {ok:true};}},discover:()=>discovery.discoverBridges('pixlprfct://app',{directory:registry}),WebSocket:DesktopSocket,setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{},now:()=>Date.now()+offset});
 t.after(()=>connection.dispose());tick();await waitFor(()=>instance.bridge.list().length===1);const old=instance.bridge.list()[0].id;
 assert.deepEqual(await instance.bridge.request(old,'build',{revision:'a'}),{ok:true});await instance.close();
 instance=await createPixlMcp({workspace,port:0,discover:true,discoveryDirectory:registry});offset=3000;tick();await waitFor(()=>instance.bridge.list().length===1);assert.notEqual(instance.bridge.list()[0].id,old);
 assert.equal(edits.length,1);await assert.rejects(instance.bridge.request(old,'build',{}),/not connected/);
 assert.deepEqual(await instance.bridge.request(instance.bridge.list()[0].id,'read',{}),{ok:true});assert.equal(edits.length,2);
});
test('automatic port selection tolerates a second agent; explicit ports still fail clearly',async t=>{
 const workspace=await temporary(t),first=await createPixlMcp({workspace,port:0});t.after(()=>first.close());const port=Number(new URL(first.bridge.info().url).port);
 const second=await createPixlMcp({workspace,port,autoPort:true});t.after(()=>second.close());assert.notEqual(second.bridge.info().url,first.bridge.info().url);
 await assert.rejects(createPixlMcp({workspace,port}),{code:'EADDRINUSE'});
});
