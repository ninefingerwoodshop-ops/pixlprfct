const {mkdir,lstat,open,readdir,unlink}=require('node:fs/promises');
const {constants}=require('node:fs');
const {randomUUID,createHmac}=require('node:crypto');
const path=require('node:path');
const os=require('node:os');
const discoveryDirectory=()=>path.join(os.homedir(),'.pixlprfct','mcp');
const scopedToken=(token,origin)=>createHmac('sha256',token).update(origin).digest('base64url');
function privateEntry(stat,directory=false){
 return (directory?stat.isDirectory():stat.isFile())&&(!process.getuid||(stat.uid===process.getuid()&&(stat.mode&0o077)===0));
}
async function publishBridge(info,{directory=discoveryDirectory()}={}){
 await mkdir(directory,{recursive:true,mode:0o700});
 if(!privateEntry(await lstat(directory),true))throw new Error('MCP discovery directory must be private to this user.');
 const file=path.join(directory,randomUUID()+'.json');
 const handle=await open(file,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600);
 try{await handle.writeFile(JSON.stringify({...info,pid:process.pid}));}finally{await handle.close();}
 return async()=>{await unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});};
}
async function discoverBridges(origin,{directory=discoveryDirectory()}={}){
 try{if(!privateEntry(await lstat(directory),true))return [];}catch{return [];}
 const entries=await readdir(directory).catch(()=>[]),result=[];
 for(const name of entries.filter(name=>/^[\da-f-]{36}\.json$/.test(name)).slice(0,100)){
  let handle;
  try{
   handle=await open(path.join(directory,name),constants.O_RDONLY|(constants.O_NOFOLLOW??0));
   const stat=await handle.stat();if(!privateEntry(stat)||stat.size>16384)continue;
   const value=JSON.parse(await handle.readFile('utf8')),url=new URL(value.url);
   if(url.protocol!=='ws:'||url.hostname!=='127.0.0.1'||!url.port||url.pathname!=='/bridge'||url.search||url.hash||url.username||url.password||!/^[-\w]{43}$/.test(value.pairingCode)||!value.allowedOrigins?.includes(origin)||!Number.isSafeInteger(value.pid)||value.pid<=0)continue;
   process.kill(value.pid,0);
   // Only an origin-scoped token reaches the renderer, never the master code.
   result.push({url:url.href,pairingCode:scopedToken(value.pairingCode,origin)});
  }catch{ /* A stopped process, partial write or unrelated file is not discoverable. */ }
  finally{await handle?.close();}
 }
 return result;
}
module.exports={publishBridge,discoverBridges,scopedToken};
