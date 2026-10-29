import {parseFigma} from './parse.js';
import {convertFigma,imageType} from './convert.js';

async function prepareImage(bytes,type){
 const bitmap=await createImageBitmap(new Blob([bytes],{type}));
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>64_000_000)throw new Error('An embedded image is too large to decode safely.');
  let width=bitmap.width,height=bitmap.height,data=bytes,resized=false;
  if(Math.max(width,height)>2048||data.length>1_500_000){
   const scale=Math.min(1,2048/width,2048/height);width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
   const canvas=new OffscreenCanvas(width,height);canvas.getContext('2d').drawImage(bitmap,0,0,width,height);
   data=new Uint8Array(await (await canvas.convertToBlob({type:'image/webp',quality:.85})).arrayBuffer());resized=true;
  }
  if(data.length>1_500_000)throw new Error('An embedded image exceeds the editor’s 2 MB encoded-image limit.');
  let binary='';for(let at=0;at<data.length;at+=8192)binary+=String.fromCharCode(...data.subarray(at,at+8192));
  return {data_url:`data:${imageType(data)};base64,${btoa(binary)}`,width,height,resized};
 }finally{bitmap.close();}
}
self.onmessage=async({data})=>{
 try{const result=await convertFigma(parseFigma(new Uint8Array(data.buffer)),data.name,{prepareImage});self.postMessage({ok:true,...result});}
 catch(error){self.postMessage({ok:false,error:error.message||'This Figma file could not be parsed.'});}
};
