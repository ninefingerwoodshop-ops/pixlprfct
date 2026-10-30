import http from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import discovery from '../desktop/mcp-discovery.cjs';
import {WebSocketServer,WebSocket} from 'ws';

export const defaultOrigins=['pixlprfct://app',...[4173,4174,4176,5173].flatMap(port=>['http://127.0.0.1:'+port,'http://localhost:'+port])];
export async function createEditorBridge({port=4317,origins=defaultOrigins,timeout=20000}={}){
 const token=randomBytes(32).toString('base64url'),sessions=new Map(),clients=new Map(),pending=new Map(),sockets=new Set();
 const server=http.createServer((req,res)=>res.writeHead(404,{'Content-Type':'text/plain'}).end('PixlPrfct editor bridge'));
 const ws=new WebSocketServer({noServer:true,maxPayload:12_000_000});
 server.on('upgrade',(req,socket,head)=>{
  const host=req.headers.host;
  if(req.url!=='/bridge'||host!==`127.0.0.1:${server.address().port}`||!origins.includes(req.headers.origin)||sockets.size>=10){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  ws.handleUpgrade(req,socket,head,client=>ws.emit('connection',client,req));
 });
 ws.on('connection',(socket,req)=>{
  sockets.add(socket);let session;
  const authTimer=setTimeout(()=>socket.close(1008,'Pairing timed out'),5000);authTimer.unref();
  socket.on('message',buffer=>{
   let message;try{message=JSON.parse(buffer.toString());}catch{socket.close(1008,'Invalid message');return;}
   if(!session){
    const supplied=Buffer.from(typeof message.token==='string'?message.token:'');const expected=Buffer.from(token),scoped=Buffer.from(discovery.scopedToken(token,req.headers.origin));
    if(message.type!=='hello'||supplied.length!==expected.length||(!timingSafeEqual(supplied,expected)&&!timingSafeEqual(supplied,scoped))){socket.close(1008,'Invalid pairing code');return;}
    clearTimeout(authTimer);
    const clientKey=typeof message.clientId==='string'&&/^[-\w]{36}$/.test(message.clientId)?req.headers.origin+':'+message.clientId:null;
    const id=(clientKey&&clients.get(clientKey))||'live:'+randomUUID();
    if(clientKey){if(clients.size>=1000)for(const [key,value] of clients){if(!sessions.has(value)){clients.delete(key);break;}}clients.set(clientKey,id);}
    const previous=sessions.get(id);previous?.socket.close(1000,'Editor reconnected');
    session={id,mode:'live',origin:req.headers.origin,name:String(message.name??'Editor').slice(0,256),socket};sessions.set(id,session);socket.send(JSON.stringify({type:'connected',session:id,heartbeat:true}));return;
   }
   if(message.type==='ping'){socket.send(JSON.stringify({type:'pong'}));return;}
   if(message.type==='result'&&typeof message.id==='string'){
    const request=pending.get(message.id);if(!request||request.session!==session.id||request.socket!==socket)return;
    clearTimeout(request.timer);pending.delete(message.id);if(message.error)request.reject(new Error(String(message.error).slice(0,2000)));else request.resolve(message.result);
   }
  });
  socket.on('error',()=>{});
  socket.on('close',()=>{clearTimeout(authTimer);sockets.delete(socket);if(session&&sessions.get(session.id)?.socket===socket)sessions.delete(session.id);for(const [id,request] of pending)if(request.socket===socket){clearTimeout(request.timer);pending.delete(id);request.reject(new Error('Editor disconnected. Read its state after reconnecting before retrying any edit.'));}});
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return {
  info:()=>({url:`ws://127.0.0.1:${server.address().port}/bridge`,pairingCode:token,allowedOrigins:origins,instructions:'Desktop workspaces discover this server automatically. For a browser editor, choose Tools → MCP connection in the intended project, enter this URL and pairing code, then Connect. Browser pairing is remembered for this tab and project until Disconnect; reconnects happen automatically while this server runs. Treat the code as a secret.'}),
  list:()=>[...sessions.values()].map(({id,mode,origin,name})=>({id,mode,origin,name})),
  async request(session,method,args){const target=sessions.get(session);if(!target||target.socket.readyState!==WebSocket.OPEN)throw new Error('Live editor session not connected.');if(pending.size>=20)throw new Error('Too many pending editor requests.');const id=randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Editor timed out; the operation may have completed. Read its state before retrying.'));},timeout);timer.unref();pending.set(id,{session,socket:target.socket,resolve,reject,timer});target.socket.send(JSON.stringify({type:'request',id,method,args}));});},
  async close(){for(const socket of sockets)socket.terminate();await new Promise(resolve=>ws.close(resolve));await new Promise(resolve=>server.close(resolve));}
 };
}
