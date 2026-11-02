const {contextBridge,ipcRenderer}=require('electron');
// Remote workspaces get menu commands, never the local filesystem bridge.
ipcRenderer.on('desktop:command',(_event,command)=>{
 const actions={open:'open',save:'save',undo:'undo',redo:'redo'};
 if(!Object.hasOwn(actions,command))return;
 const active=document.activeElement;
 if(['undo','redo'].includes(command)&&active?.matches('input,textarea,[contenteditable=true]')){document.execCommand(command);return;}
 const target=document.getElementById(actions[command])??(command==='open'?document.getElementById('home-import'):null);
 target?.click();
});

// Only bridge credentials scoped to this workspace origin are discoverable.
contextBridge.exposeInMainWorld('pixlMcp',Object.freeze({connections:()=>ipcRenderer.invoke('desktop:mcp-connections')}));

// Layout state survives an owning window/app shutdown. Child panels receive no bridge.
contextBridge.exposeInMainWorld('pixlPanels',Object.freeze({onClosing:callback=>{const listener=(_event,closing)=>callback(closing===true);ipcRenderer.on('desktop:closing',listener);return ()=>ipcRenderer.removeListener('desktop:closing',listener);}}));
