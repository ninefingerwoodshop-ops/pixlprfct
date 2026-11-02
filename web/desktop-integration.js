// Browser builds have no desktop bridge and keep their existing file flows.
export function installDesktop({importFile,report,commands={},focusedDocument=()=>document}){
 const desktop=window.pixlDesktop;if(!desktop?.local)return ()=>{};
 const run=async action=>{try{await action();}catch(error){if(error.name!=='AbortError')report(error);}};
 const importSelected=()=>run(async()=>{const file=await desktop.openFile();if(file)await importFile(file);});
 const pending=()=>run(async()=>{const file=await desktop.pendingFile();if(file)await importFile(file);});
 const unsubscribe=desktop.onCommand(command=>{
  if(command==='open')importSelected();
  else if(command==='import-pending')pending();
  else if(['undo','redo'].includes(command)&&focusedDocument().activeElement?.matches('input,textarea,[contenteditable=true]'))focusedDocument().execCommand(command);
  else commands[command]?.();
 });
 pending();return unsubscribe;
}
