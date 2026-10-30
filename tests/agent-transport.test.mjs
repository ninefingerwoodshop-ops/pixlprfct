import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgentConnection,validateConnection} from '../web/agent-transport.js';
const code='x'.repeat(43),details={url:'ws://127.0.0.1:4317/bridge',pairingCode:code};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function harness({stored,preferences,discover}={}){
 let time=0,tick,project='document-a';const sockets=[],requests=[];
 const storage=stored??new Map(),prefs=preferences??new Map();
 const adapter=map=>({getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)});
 class Socket{
  static OPEN=1;readyState=0;sent=[];
  constructor(url){this.url=url;sockets.push(this);}
  send(data){this.sent.push(JSON.parse(data));}
  open(){this.readyState=1;this.onopen?.();}
  message(message){this.onmessage?.({data:JSON.stringify(message)});}
  close(code=1000){this.readyState=3;this.onclose?.({code});}
  pair(){this.open();this.message({type:'connected',session:'session-'+sockets.length,heartbeat:true});}
 }
 const connection=createAgentConnection({runtime:{state:()=>({name:project}),request:async(method,args)=>{requests.push({method,args});return {ok:true};}},identity:()=>project,discover,WebSocket:Socket,storage:adapter(storage),preferences:adapter(prefs),now:()=>time,setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=()=>{};}});
 return {connection,sockets,requests,storage,prefs,project:value=>{project=value;},advance:async ms=>{time+=ms;tick();await flush();}};
}
test('desktop discovery connects multiple agents, replaces restarted ports and credentials, and never replays edits',async()=>{
 let servers=[details,{...details,url:'ws://127.0.0.1:4318/bridge'}];
 const h=harness({discover:async()=>servers});await flush();assert.equal(h.sockets.length,2);
 h.sockets.forEach(s=>s.pair());assert.equal(h.connection.state().connected,2);
 const first=h.sockets[0];first.message({type:'request',id:'edit',method:'build',args:{revision:'r'}});await flush();assert.equal(h.requests.length,1);
 first.close(1006);await h.advance(500);assert.equal(h.sockets.length,3);h.sockets[2].pair();assert.equal(h.requests.length,1);
 servers=[{url:'ws://127.0.0.1:5000/bridge',pairingCode:'y'.repeat(43)}];await h.advance(2000);assert.equal(h.sockets.length,4);h.sockets[3].pair();assert.equal(h.connection.state().connected,1);
 assert.equal(h.sockets[2].readyState,3);assert.equal(h.requests.length,1);h.connection.dispose();
});
test('manual pairing survives a reload in the same tab and project; rejection clears stale credentials',async()=>{
 const h=harness();h.connection.connect(details);h.sockets[0].pair();h.connection.dispose();
 const restored=harness({stored:h.storage,preferences:h.prefs});assert.equal(restored.sockets.length,1);restored.sockets[0].pair();
 restored.sockets[0].close(1008);await restored.advance(10000);assert.equal(restored.sockets.length,1);assert.equal(restored.storage.has('pixlprfct:mcp-pairing'),false);assert.match(restored.connection.state().error,/rejected/);restored.connection.dispose();
});
test('Disconnect remains effective across reloads and discovery, and Connect explicitly resumes',async()=>{
 const h=harness({discover:async()=>[details]});await flush();h.sockets[0].pair();h.connection.disconnect();await h.advance(2000);assert.equal(h.sockets.length,1);
 const reloaded=harness({preferences:h.prefs,discover:async()=>[details]});await flush();assert.equal(reloaded.sockets.length,0);
 reloaded.connection.connect();await flush();assert.equal(reloaded.sockets.length,1);reloaded.sockets[0].pair();assert.equal(reloaded.connection.state().connected,1);h.connection.dispose();reloaded.connection.dispose();
});
test('project navigation invalidates the old session before a queued write can run',async()=>{
 const h=harness({discover:async()=>[details]});await flush();const old=h.sockets[0];old.pair();old.message({type:'request',id:'stale',method:'build',args:{}});
 h.project('document-b');await flush();assert.equal(h.requests.length,0);await h.advance(2000);assert.equal(old.readyState,3);assert.equal(h.sockets.length,2);
 h.sockets[1].pair();h.sockets[1].message({type:'request',id:'new',method:'read',args:{}});await flush();assert.equal(h.requests.length,1);h.connection.dispose();
});
test('manual credentials do not grant access to a different project',async()=>{
 const h=harness();h.connection.connect(details);h.sockets[0].pair();h.project('document-b');await h.advance(2000);assert.equal(h.sockets.length,1);assert.equal(h.sockets[0].readyState,3);assert.equal(h.storage.has('pixlprfct:mcp-pairing'),false);h.connection.dispose();
});
test('handshake and heartbeat deadlines recover silently stalled connections',async()=>{
 const h=harness();h.connection.connect(details);await h.advance(6000);assert.equal(h.sockets[0].readyState,3);await h.advance(500);h.sockets[1].pair();
 await h.advance(15000);assert.equal(h.sockets[1].sent.at(-1).type,'ping');h.sockets[1].message({type:'pong'});
 await h.advance(46000);assert.equal(h.sockets[1].readyState,3);await h.advance(500);assert.equal(h.sockets.length,3);h.connection.dispose();
});
test('Disconnect or page disposal during asynchronous discovery cannot open a connection',async()=>{
 let resolve;const h=harness({discover:()=>new Promise(r=>{resolve=r;})});await flush();h.connection.disconnect();resolve([details]);await flush();assert.equal(h.sockets.length,0);h.connection.dispose();
 let finish;const disposed=harness({discover:()=>new Promise(r=>{finish=r;})});await flush();disposed.connection.dispose();finish([details]);await flush();assert.equal(disposed.sockets.length,0);
});
test('only strict loopback bridge endpoints and well-formed codes are accepted',()=>{
 assert.deepEqual(validateConnection(details),details);
 for(const url of ['ws://evil.example:4317/bridge','wss://127.0.0.1:4317/bridge','ws://user:secret@127.0.0.1:4317/bridge','ws://127.0.0.1:4317/bridge?token=foo','ws://127.0.0.1:4317/other'])assert.throws(()=>validateConnection({...details,url}));
 assert.throws(()=>validateConnection({...details,pairingCode:'short'}));
});

test('older bridges without heartbeat support stay connected while idle',async()=>{
 const h=harness();h.connection.connect(details);h.sockets[0].open();h.sockets[0].message({type:'connected',session:'old-bridge'});await h.advance(60000);assert.equal(h.sockets.length,1);assert.equal(h.connection.state().connected,1);h.connection.dispose();
});

test('restoring a page from the back-forward cache restarts discovery',async()=>{
 const h=harness({discover:async()=>[details]});await flush();h.sockets[0].pair();h.connection.dispose();h.connection.resume();await flush();assert.equal(h.sockets.length,2);h.sockets[1].pair();assert.equal(h.connection.state().connected,1);h.connection.dispose();
});

test('a hung discovery call cannot block recovery after sleep, and wake respects Disconnect',async()=>{
 let stalled=false;const h=harness({discover:()=>stalled?new Promise(()=>{}):Promise.resolve([details])});await flush();h.sockets[0].pair();
 const id=h.sockets[0].sent[0].clientId;stalled=true;await h.advance(2000);await h.advance(40*60*1000);await h.advance(500);
 assert.equal(h.sockets.length,2);h.sockets[1].pair();assert.equal(h.sockets[1].sent[0].clientId,id);assert.equal(h.connection.state().connected,1);
 h.connection.disconnect();h.connection.wake();await h.advance(10000);assert.equal(h.sockets.length,2);h.connection.dispose();
});
