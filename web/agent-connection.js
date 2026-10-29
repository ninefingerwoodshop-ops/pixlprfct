import {workspaceWindow} from './workspace-window.js';
import {createAgentRuntime} from './agent-runtime.js';

export function installAgentConnection(runtimeOptions){
 const runtime=createAgentRuntime(runtimeOptions),content=document.createElement('div');content.className='mcp-connection';
 const intro=document.createElement('p');intro.textContent='Connect an MCP agent to this project. It can inspect and edit the design using your current permissions. You can undo its changes or disconnect at any time.';
 const field=(label,type,value='')=>{const row=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('input');caption.textContent=label;input.setAttribute('aria-label',label);input.type=type;input.value=value;input.autocomplete='off';row.append(caption,input);content.append(row);return input;};
 content.append(intro);const url=field('Bridge URL','text','ws://127.0.0.1:4317/bridge'),token=field('Pairing code','password');
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Disconnected. Start the PixlPrfct MCP server in your agent, then request its connection details.';
 const actions=document.createElement('div');actions.className='dialog-actions';const connect=document.createElement('button'),disconnect=document.createElement('button');connect.type=disconnect.type='button';connect.textContent='Connect';connect.className='primary';disconnect.textContent='Disconnect';disconnect.disabled=true;actions.append(disconnect,connect);content.append(status,actions);
 const win=workspaceWindow('MCP connection',content,{width:440,height:350});win.dialog.classList.add('workspace-page-controls');
 let socket=null,session=null,serial=Promise.resolve();
 const sync=()=>{connect.disabled=!!socket;disconnect.disabled=!socket;url.disabled=token.disabled=!!socket;};
 disconnect.onclick=()=>{socket?.close();socket=null;session=null;status.textContent='Disconnected.';sync();};
 connect.onclick=()=>{
  try{
   const endpoint=new URL(url.value);if(endpoint.protocol!=='ws:'||endpoint.hostname!=='127.0.0.1'||endpoint.pathname!=='/bridge'||endpoint.search||endpoint.hash||endpoint.username||endpoint.password)throw new Error('Use ws://127.0.0.1:PORT/bridge from the MCP server.');
   if(!/^[\w-]{43}$/.test(token.value.trim()))throw new Error('Enter the pairing code provided by the MCP server.');
   const code=token.value.trim(),project=runtimeOptions.identity?.(),client=new WebSocket(endpoint);socket=client;sync();status.textContent='Connecting…';
   client.onopen=()=>client.send(JSON.stringify({type:'hello',token:code,name:runtime.state().name}));
   client.onmessage=event=>{
    let message;try{message=JSON.parse(event.data);}catch{return;}
    if(message.type==='connected'){session=message.session;token.value='';status.textContent='Connected · '+runtime.state().name+' · '+session;return;}
    if(message.type!=='request'||!session)return;
    // Serialize requests in one tab so revision checks and writes cannot race.
    serial=serial.then(async()=>{if(client!==socket||client.readyState!==WebSocket.OPEN)return;if(runtimeOptions.identity?.()!==project){client.close(1000,'Project changed');return;}let response;try{response={result:await runtime.request(message.method,message.args)};}catch(error){response={error:String(error.message??error)};}if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify({type:'result',id:message.id,...response}));}).catch(()=>{});
   };
   client.onerror=()=>{status.textContent='Connection failed. Check the server URL, pairing code, and allowed editor origin.';};
   client.onclose=event=>{if(socket!==client)return;socket=null;session=null;status.textContent=event.code===1008?'Pairing was rejected. Check the pairing code.':'Disconnected. Reconnect to allow agent access again.';sync();};
  }catch(error){status.textContent=error.message;}
 };
 window.addEventListener('pagehide',()=>socket?.close());
 return ()=>win.open();
}
