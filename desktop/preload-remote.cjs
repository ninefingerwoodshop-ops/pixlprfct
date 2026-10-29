const {ipcRenderer}=require('electron');
// Remote workspaces get menu commands, never the local filesystem bridge.
ipcRenderer.on('desktop:command',(_event,command)=>{
 const actions={open:'open',save:'save',undo:'undo',redo:'redo'};
 if(!Object.hasOwn(actions,command))return;
 const active=document.activeElement;
 if(['undo','redo'].includes(command)&&active?.matches('input,textarea,[contenteditable=true]')){document.execCommand(command);return;}
 const target=document.getElementById(actions[command])??(command==='open'?document.getElementById('home-import'):null);
 target?.click();
});
