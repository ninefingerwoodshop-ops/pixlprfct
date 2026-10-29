import {workspaceWindow} from './workspace-window.js';
import {createAgentRuntime} from './agent-runtime.js';
import {createAgentConnection} from './agent-transport.js';

export function installAgentConnection(runtimeOptions){
 const runtime=createAgentRuntime(runtimeOptions),content=document.createElement('div');content.className='mcp-connection';
 const discover=window.pixlMcp?.connections;
 const intro=document.createElement('p');intro.textContent=discover?'Local MCP agents connect automatically to this project. You can undo their changes or disconnect at any time.':'Pair an MCP agent with this project once. Interrupted connections recover automatically. You can undo its changes or disconnect at any time.';
 const field=(label,type,value='')=>{const row=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('input');caption.textContent=label;input.setAttribute('aria-label',label);input.type=type;input.value=value;input.autocomplete='off';row.append(caption,input);content.append(row);return input;};
 content.append(intro);const url=field('Bridge URL','text','ws://127.0.0.1:4317/bridge'),token=field('Pairing code','password');
 const status=document.createElement('p');status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='dialog-actions';const connect=document.createElement('button'),disconnect=document.createElement('button');connect.type=disconnect.type='button';connect.textContent='Connect';connect.className='primary';actions.append(disconnect,connect);content.append(status,actions);
 const win=workspaceWindow('MCP connection',content,{width:440,height:350});win.dialog.classList.add('workspace-page-controls');
 const connection=createAgentConnection({runtime,identity:runtimeOptions.identity,discover,changed:state=>{
  connect.disabled=state.connected>0;disconnect.disabled=!state.enabled||(!state.automatic&&!state.connecting);disconnect.textContent='Disconnect';
  url.disabled=token.disabled=state.connecting;connect.textContent=state.automatic?'Connect automatically':'Connect';
  status.textContent=state.connected?`Connected · ${runtime.state().name}${state.connected>1?' · '+state.connected+' agents':''}`:state.error||(!state.enabled?'Disconnected. Click Connect to resume.':state.connecting?'Reconnecting automatically…':state.automatic?'Waiting for a local MCP agent…':'Start the PixlPrfct MCP server in your agent, then enter its connection details.');
  if(state.connected)token.value='';
 }});
 disconnect.onclick=()=>connection.disconnect();
 connect.onclick=()=>{try{connection.connect(discover&&!token.value.trim()?undefined:{url:url.value,pairingCode:token.value.trim()});}catch(error){status.textContent=error.message;}};
 window.addEventListener('pagehide',()=>connection.dispose());
 window.addEventListener('pageshow',event=>{if(event.persisted)connection.resume();});
 return ()=>win.open();
}
