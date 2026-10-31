import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {WebSocket} from 'ws';
import discovery from '../../desktop/mcp-discovery.cjs';
import {createPixlMcp} from '../../mcp/server.mjs';
import {createAgentConnection} from '../../web/agent-transport.js';
import {createAgentRuntime} from '../../web/agent-runtime.js';
import {initializeEngine,createHeadlessEditor,headlessOptions} from '../../mcp/projects.mjs';
const minutes=Number(process.argv[2]??40);if(!Number.isFinite(minutes)||minutes<=0)throw new Error('Supply a positive idle duration in minutes');
const directory=await mkdtemp(path.join(os.tmpdir(),'pixl-idle-')),registry=path.join(directory,'registry'),workspace=path.join(directory,'projects');
await initializeEngine();const editor=createHeadlessEditor();editor.load(JSON.stringify({version:1,name:'Idle acceptance',shapes:[]}));
const runtime=createAgentRuntime({editor,createEditor:createHeadlessEditor,options:headlessOptions});let instance,connection;
const waitFor=async predicate=>{for(let i=0;i<150;i++){if(predicate())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Connection did not recover within 15 seconds');};
class DesktopSocket extends WebSocket{constructor(url){super(url,{origin:'pixlprfct://app'});}}
try{
 instance=await createPixlMcp({workspace,port:0,discover:true,discoveryDirectory:registry});
 connection=createAgentConnection({runtime,discover:()=>discovery.discoverBridges('pixlprfct://app',{directory:registry}),WebSocket:DesktopSocket});
 await waitFor(()=>instance.bridge.list().length===1);const start=Date.now();console.log(JSON.stringify({phase:'idle',minutes,started:new Date(start).toISOString()}));
 await new Promise(r=>setTimeout(r,minutes*60000));
 let session=instance.bridge.list()[0];assert.ok(session,'Socket remained discoverable through idle');
 const before=await instance.bridge.request(session.id,'read',{});assert.ok(before);
 await instance.close();instance=await createPixlMcp({workspace,port:0,discover:true,discoveryDirectory:registry});connection.wake();await waitFor(()=>instance.bridge.list().length===1);
 session=instance.bridge.list()[0];const after=await instance.bridge.request(session.id,'read',{});assert.ok(after);
 console.log(JSON.stringify({phase:'passed',elapsedMs:Date.now()-start,idleMinutes:minutes,restarted:true,osSleepTested:false}));
}finally{connection?.dispose();await instance?.close();editor.free();await rm(directory,{recursive:true,force:true});}
