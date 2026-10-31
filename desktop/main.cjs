const {app,autoUpdater,BrowserWindow,Menu,dialog,ipcMain,protocol,session,shell,nativeTheme}=require('electron');
const {readFile,realpath}=require('node:fs/promises');
const path=require('node:path');
const {APP_URL,CSP,isLocalURL,serverURL,assetPath,externalURL,sameWorkspace,partitionFor}=require('./policy.cjs');
const {readDesign,designExtensions,designFilters}=require('./design-files.cjs');
const {discoverBridges}=require('./mcp-discovery.cjs');
const {readPreferences,writePreferences,isOnlineFontURL}=require('./preferences.cjs');
const {installUpdates}=require('./updates.cjs');
const updateConfig=require('./update-config.json');
let updates;
let preferences={onlineFonts:false};
const root=__dirname,windows=new Map(),pending=new Map(),configured=new Set();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf','.mp4':'video/mp4','.webm':'video/webm'};
app.setName('PixlPrfct');
// A test profile can be explicitly selected without touching the user's drafts.
if(!app.isPackaged&&process.env.PIXL_DESKTOP_TEST_PROFILE)app.setPath('userData',path.resolve(process.env.PIXL_DESKTOP_TEST_PROFILE));
protocol.registerSchemesAsPrivileged([{scheme:'pixlprfct',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
app.enableSandbox();
nativeTheme.themeSource='dark';
const single=process.mas||app.requestSingleInstanceLock();
if(!single){app.quit();}else{
 const initialFiles=process.argv.slice(1).filter(value=>!value.startsWith('-')&&designExtensions.includes(path.extname(value).toLowerCase()));
 app.on('open-file',(event,file)=>{event.preventDefault();if(app.isReady())openNativeFile(file);else initialFiles.push(file);});
 app.on('second-instance',(_event,args)=>{const file=args.find(value=>designExtensions.includes(path.extname(value).toLowerCase()));if(file)openNativeFile(file);else localWindow().focus();});
 app.whenReady().then(async()=>{
  preferences=readPreferences(app.getPath('userData'));
  updates=installUpdates({app,autoUpdater,dialog,config:updateConfig});installIPC();installMenu();
  if(initialFiles.length)for(const file of initialFiles)await openNativeFile(file);else createWindow(preferences.workspaceServer||APP_URL);
  app.on('activate',()=>{if(!windows.size)createWindow(preferences.workspaceServer||APP_URL);});
 }).catch(error=>{dialog.showErrorBox('PixlPrfct could not start',error.message);app.quit();});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
function configureSession(base){
 const partition=partitionFor(base),ses=session.fromPartition(partition);
 if(configured.has(partition))return ses;configured.add(partition);
 if(isLocalURL(base))ses.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!preferences.onlineFonts&&isOnlineFontURL(details.url)}));
 if(isLocalURL(base))ses.protocol.handle('pixlprfct',async request=>{
  const headers={'Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'};
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
  const url=new URL(request.url);
  if(isLocalURL(request.url)&&url.pathname==='/api/installation')return Response.json({mode:'desktop'},{headers});
  if(isLocalURL(request.url)&&url.pathname==='/api/documents')return Response.json({documents:[],next:null},{headers});
  const file=assetPath(root,request.url),type=file&&types[path.extname(file)];
  if(!file||!type)return new Response('Not found',{status:404,headers});
  try{
   const resolved=await realpath(file);
   if(!resolved.startsWith(root+path.sep))return new Response('Not found',{status:404,headers});
   return new Response(request.method==='HEAD'?null:await readFile(file),{headers:{...headers,'Content-Type':type}});
  }catch{return new Response('Not found',{status:404,headers});}
 });
 const mayUse=(contents,permission)=>{
  const record=contents&&windows.get(contents.id);
  return !!record&&sameWorkspace(contents.getURL(),record.base)&&['clipboard-sanitized-write',...(record.role==='local'?['clipboard-read']:[])].includes(permission);
 };
 ses.setPermissionRequestHandler((contents,permission,callback)=>callback(mayUse(contents,permission)));
 ses.setPermissionCheckHandler((contents,permission)=>mayUse(contents,permission));
 ses.on('will-download',(_event,item)=>{
  item.setSaveDialogOptions({title:'Save from PixlPrfct',defaultPath:path.basename(item.getFilename()),properties:['showOverwriteConfirmation','createDirectory']});
 });
 return ses;
}
function createWindow(base,role=isLocalURL(base)?'local':'remote',parent){
 const local=isLocalURL(base),win=new BrowserWindow({
  title:'PixlPrfct',width:role==='connection'?500:1440,height:role==='connection'?340:960,minWidth:role==='connection'?500:880,minHeight:role==='connection'?340:600,
  show:false,backgroundColor:'#1e1e1e',...(parent?{parent,modal:true,resizable:false,minimizable:false,maximizable:false}:{}),
  webPreferences:{backgroundThrottling:false,session:configureSession(base),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false,preload:path.join(root,local?'preload.cjs':'preload-remote.cjs'),additionalArguments:[`--pixl-online-fonts=${preferences.onlineFonts}`]},
 });
 const contentsId=win.webContents.id;
 windows.set(contentsId,{win,base,role});
 win.once('ready-to-show',()=>win.show());
 win.on('closed',()=>{windows.delete(contentsId);pending.delete(contentsId);});
 const navigate=(event,url)=>{if(!sameWorkspace(url,base)){event.preventDefault();const external=externalURL(url);if(external)shell.openExternal(external).catch(()=>{});}};
 win.webContents.on('will-navigate',navigate);
 win.webContents.on('will-redirect',(event,url)=>{if(!sameWorkspace(url,base))event.preventDefault();});
 win.webContents.setWindowOpenHandler(({url})=>{
  if(sameWorkspace(url,base))createWindow(url,role);else{const external=externalURL(url);if(external)shell.openExternal(external).catch(()=>{});}return {action:'deny'};
 });
 win.webContents.on('will-attach-webview',event=>event.preventDefault());
 win.webContents.on('will-prevent-unload',async event=>{
  // Electron requires the cancellation decision synchronously.
  const result=dialog.showMessageBoxSync(win,{type:'question',buttons:['Keep open','Close anyway'],defaultId:0,cancelId:0,message:'Changes may still be saving.',detail:'Keep this window open to finish saving your project.'});
  if(result===1)event.preventDefault();
 });
 win.webContents.on('did-fail-load',(_event,code,description,_url,mainFrame)=>{if(mainFrame&&code!==-3){win.show();dialog.showMessageBox(win,{type:'error',message:'The workspace could not be opened.',detail:description,buttons:['OK']});}});
 win.loadURL(base).catch(()=>{});
 return win;
}
function localWindow(){const existing=[...windows.values()].find(w=>w.role==='local');return existing?.win??createWindow(APP_URL);}
async function openNativeFile(file){
 try{const design=await readDesign(file),win=createWindow(APP_URL);pending.set(win.webContents.id,design);}catch(error){dialog.showErrorBox('Could not open design',error.message);}
}
function sender(event,role='local'){
 const record=windows.get(event.sender.id);
 if(!record||record.role!==role||event.senderFrame!==event.sender.mainFrame||!isLocalURL(event.senderFrame.url))throw new Error('This action is available only in the local PixlPrfct window.');
 if(role==='connection'&&new URL(event.senderFrame.url).pathname!=='/desktop/connect.html')throw new Error('Invalid connection window.');
 return record;
}
function showConnect(parent){
 const existing=[...windows.values()].find(w=>w.role==='connection');if(existing){existing.win.focus();return;}
 const win=createWindow(APP_URL+'desktop/connect.html','connection',parent);win.setMenu(null);
}
function installIPC(){
 ipcMain.handle('desktop:mcp-connections',event=>{
  const record=windows.get(event.sender.id),frame=event.senderFrame;
  if(!record||!['local','remote'].includes(record.role)||frame!==event.sender.mainFrame||!sameWorkspace(frame.url,record.base))throw new Error('MCP discovery is available only in a PixlPrfct workspace.');
  const origin=isLocalURL(frame.url)?'pixlprfct://app':new URL(frame.url).origin;
  return discoverBridges(origin);
 });
 ipcMain.handle('desktop:open-file',async event=>{
  const {win}=sender(event);const result=await dialog.showOpenDialog(win,{title:'Import design',filters:designFilters,properties:['openFile']});
  return result.canceled?null:readDesign(result.filePaths[0]);
 });
 ipcMain.handle('desktop:pending-file',event=>{sender(event);const file=pending.get(event.sender.id)??null;pending.delete(event.sender.id);return file;});
 ipcMain.handle('desktop:show-connect',event=>{const {win}=sender(event);showConnect(win);});
 ipcMain.handle('desktop:close-connect',event=>sender(event,'connection').win.close());
 ipcMain.handle('desktop:connect',async(event,value)=>{
  const {win}=sender(event,'connection');
  let address;
  try{address=serverURL(value);}catch(error){return {ok:false,error:error.message};}
  // The server has its own isolated browser session and receives no native bridge.
  const workspace=createWindow(address);
  workspace.webContents.once('did-finish-load',()=>{
   try{preferences=writePreferences(app.getPath('userData'),{workspaceServer:address});}
   catch(error){dialog.showErrorBox('Could not remember workspace',error.message);}
  });
  win.close();return {ok:true};
 });
}
function installMenu(){
 const command=(name,win)=>{const target=windows.get(win?.webContents.id);if(target&&target.role!=='connection')win.webContents.send('desktop:command',name);};
 const template=[...(process.platform==='darwin'?[{role:'appMenu'}]:[]),{label:'File',submenu:[
  {label:'New design',accelerator:'CmdOrCtrl+N',click:(_item,win)=>createWindow(windows.get(win?.webContents.id)?.role==='remote'?new URL('/?new=1',win.webContents.getURL()).href:APP_URL+'?new=1')},
  {label:'All local projects',accelerator:'CmdOrCtrl+Shift+O',click:()=>{const win=createWindow(APP_URL);win.focus();}},
  {label:'Import design…',accelerator:'CmdOrCtrl+O',click:async(_item,win)=>{if(windows.has(win?.webContents.id))command('open',win);else{const result=await dialog.showOpenDialog({title:'Import design',filters:designFilters,properties:['openFile']});if(!result.canceled)await openNativeFile(result.filePaths[0]);}}},
  {label:'Save a copy…',accelerator:'CmdOrCtrl+S',click:(_item,win)=>command('save',win)},
  {type:'separator'},{label:'Connect to a team server…',click:(_item,win)=>showConnect(win)},
  {type:'separator'},{role:process.platform==='darwin'?'close':'quit'}
 ]},{label:'Edit',submenu:[{label:'Undo',accelerator:'CmdOrCtrl+Z',click:(_item,win)=>{command('undo',win);}},{label:'Redo',accelerator:'CmdOrCtrl+Shift+Z',click:(_item,win)=>{command('redo',win);}},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
 {label:'View',submenu:[{role:'reload'},{role:'togglefullscreen'},{type:'separator'},{label:'Allow online fonts in local designs',type:'checkbox',checked:preferences.onlineFonts,click:async item=>{
  try{writePreferences(app.getPath('userData'),{onlineFonts:item.checked});preferences.onlineFonts=item.checked;
   await dialog.showMessageBox({type:'info',message:item.checked?'Online fonts enabled':'Online fonts disabled',detail:'Reopen local designs to apply the change. When enabled, Google receives font requests and normal connection information, including your IP address. Team servers use their own settings.',buttons:['OK']});
  }catch(error){item.checked=preferences.onlineFonts;dialog.showErrorBox('Could not save preference',error.message);}
 }},...(!app.isPackaged?[{role:'toggleDevTools'}]:[])]},{role:'windowMenu'},
 {label:'Help',submenu:[{label:'Check for updates…',click:()=>updates.check()},{type:'separator'},{label:'Privacy policy',click:()=>shell.openExternal('https://github.com/ninefingerwoodshop-ops/pixlprfct/blob/main/PRIVACY.md')},{label:'Code signing policy',click:()=>shell.openExternal('https://github.com/ninefingerwoodshop-ops/pixlprfct/blob/main/CODE_SIGNING.md')},{type:'separator'},{label:'About PixlPrfct',click:()=>app.showAboutPanel()}]}];
 app.setAboutPanelOptions({applicationName:'PixlPrfct',applicationVersion:app.getVersion(),copyright:'Free design software. Yours to host.'});
 Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
