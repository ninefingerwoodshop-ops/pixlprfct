const pairingKey='pixlprfct:mcp-pairing';
const validCode=value=>typeof value==='string'&&/^[-\w]{43}$/.test(value);
export function validateConnection({url,pairingCode}){
 const endpoint=new URL(url);
 if(endpoint.protocol!=='ws:'||endpoint.hostname!=='127.0.0.1'||!endpoint.port||endpoint.pathname!=='/bridge'||endpoint.search||endpoint.hash||endpoint.username||endpoint.password)throw new Error('Use ws://127.0.0.1:PORT/bridge from the MCP server.');
 if(!validCode(pairingCode))throw new Error('Enter the pairing code provided by the MCP server.');
 return {url:endpoint.href,pairingCode};
}
// Transport lifecycle is independent of the connection window and never replays edits.
export function createAgentConnection({runtime,identity=()=>'',discover,WebSocket:Socket=globalThis.WebSocket,storage=globalThis.sessionStorage,preferences=globalThis.localStorage,changed=()=>{},now=Date.now,setInterval:repeat=globalThis.setInterval,clearInterval:cancel=globalThis.clearInterval}){
 const read=(store,key)=>{try{return JSON.parse(store?.getItem(key)??'null');}catch{return null;}};
 const write=(store,key,value)=>{try{if(value===null)store?.removeItem(key);else store?.setItem(key,JSON.stringify(value));}catch{/* Storage can be unavailable in private windows. */}};
 let project=identity(),manual=read(storage,pairingKey),disposed=false,ticking=false,discovery=null,discoveryEpoch=0,serial=Promise.resolve(),error='',lastDiscovery=-Infinity;
 const preferenceKey=()=>`pixlprfct:mcp-disabled:${project}`;
 let enabled=read(preferences,preferenceKey())!==true,discovered=[];
 if(manual?.project!==project)manual=null;
 const connections=new Map();
 const clientId=()=>{const key=`pixlprfct:mcp-client:${project}`;let id=read(storage,key);if(typeof id!=='string'||!/^[-\w]{36}$/.test(id)){id=globalThis.crypto.randomUUID();write(storage,key,id);}return id;};
 const snapshot=()=>({enabled,automatic:!!discover,connected:[...connections.values()].filter(c=>c.session).length,connecting:connections.size>0,error});
 const notify=()=>changed(snapshot());
 const close=connection=>{const client=connection.client;connection.client=null;connection.session=null;client?.close();};
 const clear=()=>{for(const connection of connections.values())close(connection);connections.clear();};
 const connect=connection=>{
  let client;
  try{client=new Socket(connection.details.url);}catch{connection.next=now()+1000;return;}
  connection.client=client;connection.lastSeen=now();connection.lastPing=now();connection.openedAt=now();
  const current=()=>!disposed&&enabled&&connection.client===client&&identity()===project;
  client.onopen=()=>{if(current())client.send(JSON.stringify({type:'hello',token:connection.details.pairingCode,clientId:clientId(),name:runtime.state().name}));else close(connection);};
  client.onmessage=event=>{
   if(!current()){close(connection);return;}
   let message;try{message=JSON.parse(event.data);}catch{return;}
   connection.lastSeen=now();
   if(message.type==='connected'){connection.session=message.session;connection.heartbeat=message.heartbeat===true;connection.attempts=0;error='';notify();return;}
   if(message.type!=='request'||!connection.session)return;
   const requestedProject=project;
   // All agents share one queue, including revision checks. Never retry a request.
   serial=serial.then(async()=>{
    if(!current()||project!==requestedProject||client.readyState!==Socket.OPEN)return;
    let response;try{response={result:await runtime.request(message.method,message.args)};}catch(failure){response={error:String(failure.message??failure)};}
    if(current()&&project===requestedProject&&client.readyState===Socket.OPEN)client.send(JSON.stringify({type:'result',id:message.id,...response}));
   }).catch(()=>{});
  };
  client.onerror=()=>{}; // close schedules recovery; transient failures do not require user action.
  client.onclose=event=>{
   if(connection.client!==client)return;
   connection.client=null;connection.session=null;
   connection.next=now()+Math.min(10000,500*2**Math.min(connection.attempts++,5));
   if(event.code===1008){
    connection.blocked=true;
    if(manual?.url===connection.details.url){manual=null;write(storage,pairingKey,null);error='Pairing was rejected. Request the current code from the MCP server.';}
   }
   notify();
  };
 };
 const tick=async()=>{
  if(disposed||ticking)return;ticking=true;
  try{
   if(identity()!==project){clear();project=identity();manual=null;write(storage,pairingKey,null);enabled=read(preferences,preferenceKey())!==true;discovered=[];lastDiscovery=-Infinity;error='';}
   if(!enabled){notify();return;}
   if(discover&&now()-lastDiscovery>=2000&&(!discovery||now()-discovery.started>5000)){
    lastDiscovery=now();const expectedProject=project,epoch=++discoveryEpoch;discovery={epoch,started:now()};
    // Discovery must never hold up heartbeat/reconnect checks after sleep or a
    // stalled desktop IPC call. Late results from superseded calls are ignored.
    Promise.resolve().then(()=>discover()).then(result=>{
     if(disposed||!enabled||identity()!==expectedProject||discovery?.epoch!==epoch)return;
     discovered=result;
    }).catch(()=>{}).finally(()=>{if(discovery?.epoch===epoch){discovery=null;void tick();}});
   }
   const desired=new Map();
   for(const details of [...discovered,...(manual?[manual]:[])]){
    try{const valid=validateConnection(details);if(!desired.has(valid.url))desired.set(valid.url,valid);}catch{/* Ignore stale or malformed discovery entries. */}
   }
   for(const [url,connection] of connections)if(desired.get(url)?.pairingCode!==connection.details.pairingCode){close(connection);connections.delete(url);}
   for(const [url,details] of desired){
    if(!connections.has(url))connections.set(url,{details,client:null,session:null,attempts:0,next:0});
    const connection=connections.get(url),client=connection.client;
    if(!client){if(!connection.blocked&&now()>=connection.next)connect(connection);continue;}
    if((!connection.session&&now()-connection.openedAt>5000)||(connection.session&&connection.heartbeat&&now()-connection.lastSeen>45000)){close(connection);connection.next=now()+500;continue;}
    if(connection.session&&connection.heartbeat&&client.readyState===Socket.OPEN&&now()-connection.lastPing>=15000){connection.lastPing=now();client.send(JSON.stringify({type:'ping'}));}
   }
   notify();
  }finally{ticking=false;}
 };
 let timer=repeat(()=>void tick(),1000);void tick();
 return {
  state:snapshot,
  connect(details){
   if(details){manual={...validateConnection(details),project};write(storage,pairingKey,manual);}
   enabled=true;error='';write(preferences,preferenceKey(),null);lastDiscovery=-Infinity;
   for(const connection of connections.values())connection.blocked=false;
   void tick();
  },
  disconnect(){enabled=false;manual=null;write(storage,pairingKey,null);write(preferences,preferenceKey(),true);clear();notify();},
  dispose(){disposed=true;discovery=null;discoveryEpoch++;cancel(timer);clear();},
  wake(){if(disposed||!enabled)return;lastDiscovery=-Infinity;for(const connection of connections.values())connection.next=0;void tick();},
  resume(){if(!disposed)return;disposed=false;lastDiscovery=-Infinity;timer=repeat(()=>void tick(),1000);void tick();},
 };
}
