const {contextBridge,ipcRenderer}=require('electron');
// No raw IPC, filesystem, shell, account credentials, or Node objects reach the editor.
contextBridge.exposeInMainWorld('pixlDesktop',Object.freeze({
 platform:process.platform,
 local:true,
 onlineFonts:process.argv.includes('--pixl-online-fonts=true'),
 openFile:()=>ipcRenderer.invoke('desktop:open-file'),
 pendingFile:()=>ipcRenderer.invoke('desktop:pending-file'),
 connect:()=>ipcRenderer.invoke('desktop:show-connect'),
 submitServer:async address=>{const result=await ipcRenderer.invoke('desktop:connect',address);if(!result.ok)throw new Error(result.error);return true;},
 closeConnect:()=>ipcRenderer.invoke('desktop:close-connect'),
 onCommand:callback=>{const listener=(_event,command)=>callback(command);ipcRenderer.on('desktop:command',listener);return ()=>ipcRenderer.removeListener('desktop:command',listener);},
}));

// Only bridge credentials scoped to this workspace origin are discoverable.
contextBridge.exposeInMainWorld('pixlMcp',Object.freeze({connections:()=>ipcRenderer.invoke('desktop:mcp-connections')}));
