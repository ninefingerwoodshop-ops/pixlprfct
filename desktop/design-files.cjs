const {open}=require('node:fs/promises');
const path=require('node:path');
const designExtensions=['.pixl','.json','.fig'];
const designFilters=[{name:'PixlPrfct or Figma design',extensions:['pixl','fig','json']}];
async function readDesign(file){
 const ext=path.extname(file).toLowerCase();
 if(!designExtensions.includes(ext))throw new Error('Choose a .pixl, .fig, or .json design file.');
 const limit=ext==='.fig'?64*1024*1024:5_000_000,handle=await open(file,'r');
 try{
  const info=await handle.stat();if(!info.isFile()||info.size>limit)throw new Error(`Design files must be smaller than ${ext==='.fig'?'64':'5'} MB.`);
  const data=Buffer.alloc(info.size+1);let length=0;
  while(length<data.length){const {bytesRead}=await handle.read(data,length,data.length-length,null);if(!bytesRead)break;length+=bytesRead;}
  if(length>info.size)throw new Error('The file changed while it was being read. Try importing it again.');
  return {name:path.basename(file),data:new Uint8Array(data.subarray(0,length))};
 }finally{await handle.close();}
}
module.exports={readDesign,designExtensions,designFilters};
