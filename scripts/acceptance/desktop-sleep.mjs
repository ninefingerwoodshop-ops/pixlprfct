// Manual OS sleep acceptance. Never changes power settings or puts the Mac to sleep.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const minutes=Number(process.argv[2]??40);
if(process.platform!=='darwin'||!Number.isFinite(minutes)||minutes<1||minutes>720)throw Error('Run on macOS with a sleep duration of 1–720 minutes.');
const root=path.resolve(import.meta.dirname,'../..'),output=path.join(root,'.local/acceptance/desktop-sleep.json'),run=promisify(execFile),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const client=new Client({name:'desktop-sleep-acceptance',version:'1.0'}),transport=new StdioClientTransport({command:process.execPath,args:[path.join(root,'mcp/server.mjs'),'--workspace',path.join(root,'.local/acceptance/projects'),'--port','0'],stderr:'pipe'});
const call=async(name,args={})=>{const result=await client.callTool({name:'pixlprfct_'+name,arguments:args});if(result.isError)throw Error(result.content[0].text);return JSON.parse(result.content[0].text);};
let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;client.close().catch(()=>{});});
async function live(){for(let n=0;n<120&&!stopping;n++){const sessions=(await call('sessions')).sessions.filter(s=>s.mode==='live');if(sessions.length>1)throw Error('Keep exactly one live editor open for this test.');if(sessions.length===1)return sessions[0];await delay(500);}throw Error('No live desktop editor connected. Open a saved design in PixlPrfct.');}
async function document(session){const first=await call('read',{session,full:true,limit:200}),doc=first.document;let cursor=first.pagination.nextCursor;while(cursor){const next=await call('read',{session,full:true,limit:200,cursor});doc.shapes.push(...next.document.shapes);cursor=next.pagination.nextCursor;}delete doc.active_page;return {layers:doc.shapes.length,pages:doc.pages.length,digest:createHash('sha256').update(JSON.stringify(doc)).digest('hex')};}
try{
 await client.connect(transport);const initial=await live(),before=await document(initial.id),startedAt=Date.now();
 console.log(JSON.stringify({status:'ready',minutes,...before,instruction:`Put this Mac to sleep, wait at least ${minutes} minutes, then wake and unlock it. Leave the saved design open and unchanged.`}));
 while(!stopping){
  await delay(10000);if(stopping)break;
  const {stdout}=await run('/usr/bin/pmset',['-g','log'],{maxBuffer:64*1024*1024});
  const events=stdout.split('\n').flatMap(line=>{const match=line.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})\s+(Sleep|Wake)\s+\t(.*)$/);if(!match)return [];const time=Date.parse(`${match[1]}T${match[2]}${match[3].slice(0,3)}:${match[3].slice(3)}`);return time>=startedAt?[{time,kind:match[4],detail:match[5]}]:[];});
  const sleep=events.find(event=>event.kind==='Sleep'),wake=sleep&&events.find(event=>event.kind==='Wake'&&event.time-sleep.time>=minutes*60000);
  if(!wake)continue;
  const resumed=await live(),after=await document(resumed.id);assert.equal(resumed.id,initial.id,'Sleep must retain the live session identity');assert.deepEqual(after,before,'Sleep must preserve the saved design');
  const proof={status:'passed',startedAt:new Date(startedAt).toISOString(),sleep,wake,elapsedSleepWindowMs:wake.time-sleep.time,osSleepTested:true,stableSession:true,documentPreserved:true,...after};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));break;
 }
}finally{await client.close();}
