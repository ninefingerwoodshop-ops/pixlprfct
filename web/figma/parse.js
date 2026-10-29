import {unzipSync,Inflate} from 'fflate';
import {Decompress} from 'fzstd';
import {ByteBuffer,decodeBinarySchema} from 'kiwi-schema';

export const FIGMA_FILE_LIMIT=64*1024*1024;
const EXPANDED_LIMIT=128*1024*1024;
const fail=message=>{throw new Error(message);};
// Check every Zstandard frame before its window buffer is allocated.
function checkZstd(data,limit){
 let at=0,total=0;
 const number=(offset,bytes)=>{if(offset+bytes>data.length)fail('Truncated Figma compression header.');let value=0;for(let i=bytes-1;i>=0;i--)value=value*256+data[offset+i];return value;};
 while(at<data.length){
  if(number(at,4)!==0xfd2fb528)fail('Unsupported Figma compression frame.');
  const flags=number(at+4,1),single=(flags>>5)&1,code=flags>>6,dict=flags&3;
  let cursor=at+5,windowSize=0;
  if(!single){const wd=number(cursor++,1),base=2**(10+(wd>>3));windowSize=base+base/8*(wd&7);}
  cursor+=dict===3?4:dict;
  const bytes=code?2**code:single,size=number(cursor,bytes)+(code===1?256:0);cursor+=bytes;
  if(single)windowSize=size;total+=size;
  if(!Number.isSafeInteger(size)||windowSize>limit||total>limit)fail('Expanded Figma data exceeds the import limit.');
  let last=false;
  while(!last){const block=number(cursor,3);cursor+=3;last=!!(block&1);const type=(block>>1)&3;if(type===3)fail('Invalid Figma compression block.');cursor+=type===1?1:block>>>3;if(cursor>data.length)fail('Truncated Figma compression block.');}
  if(flags&4)cursor+=4;if(cursor>data.length)fail('Truncated Figma checksum.');at=cursor;
 }
}
export function inflateBounded(data,limit){
 const zstd=data[0]===0x28&&data[1]===0xb5&&data[2]===0x2f&&data[3]===0xfd;
 if(zstd)checkZstd(data,limit);
 const chunks=[];let size=0;
 const receive=chunk=>{size+=chunk.length;if(size>limit)fail('Expanded Figma data exceeds the import limit.');chunks.push(chunk.slice());};
 const stream=zstd?new Decompress(receive):new Inflate(receive);
 for(let at=0;at<data.length;at+=1024)stream.push(data.subarray(at,at+1024),at+1024>=data.length);
 const result=new Uint8Array(size);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}return result;
}

// Interpret the embedded schema as data. Never compile file-supplied code or
// relax the desktop CSP with eval / new Function.
export function decodeKiwi(schema,data){
 if(schema.definitions.length>4000)fail('Figma schema is too large.');
 const definitions=new Map(schema.definitions.map(d=>[d.name,{...d,byId:new Map(d.fields.map(f=>[f.value,f]))}]));
 const bb=new ByteBuffer(data);let values=0;
 const read=(type,depth=0)=>{
  if(++values>2_000_000||depth>96)fail('Figma data is too complex to import.');
  switch(type){
   case 'bool':return !!bb.readByte();case 'byte':return bb.readByte();
   case 'int':return bb.readVarInt();case 'uint':return bb.readVarUint();
   case 'float':return bb.readVarFloat();case 'string':return bb.readString();
   case 'int64':return bb.readVarInt64().toString();case 'uint64':return bb.readVarUint64().toString();
  }
  const definition=definitions.get(type);if(!definition)fail('Unsupported Figma schema type.');
  if(definition.kind==='ENUM')return definition.byId.get(bb.readVarUint())?.name;
  const result=Object.create(null);
  const field=f=>{
   let value;
   if(f.isArray&&f.type==='byte')value=bb.readByteArray();
   else if(f.isArray){const count=bb.readVarUint();if(count>200_000)fail('Figma array exceeds the import limit.');value=[];for(let i=0;i<count;i++)value.push(read(f.type,depth+1));}
   else value=read(f.type,depth+1);
   if(!f.isDeprecated)result[f.name]=value;
  };
  if(definition.kind==='STRUCT'){for(const f of definition.fields)field(f);}
  else if(definition.kind==='MESSAGE'){for(;;){const id=bb.readVarUint();if(!id)break;const f=definition.byId.get(id);if(!f)fail('The Figma message does not match its schema.');field(f);}}
  else fail('Unsupported Figma schema definition.');
  return result;
 };
 return read('Message');
}

export function parseFigma(data){
 if(!(data instanceof Uint8Array)||!data.length||data.length>FIGMA_FILE_LIMIT)fail('Choose a Figma .fig file smaller than 64 MB.');
 let canvas=data,meta={},images=new Map();
 if(data[0]===0x50&&data[1]===0x4b){
  let expanded=0,entries=0;const names=new Set();
  const files=unzipSync(data,{filter:file=>{
   if(++entries>4096)fail('The Figma archive contains too many files.');
   const name=file.name;
   if(names.has(name))fail('The Figma archive contains duplicate files.');names.add(name);
   if(name.includes('\\')||name.startsWith('/')||name.split('/').some(p=>p==='..'||p==='.')||name.includes('\0'))fail('Invalid path in Figma archive.');
   const keep=name==='canvas.fig'||name==='meta.json'||/^images\/[a-f0-9]{40}(?:\.(?:png|jpe?g|webp|gif))?$/i.test(name);
   if(keep){expanded+=file.originalSize;if(!Number.isSafeInteger(expanded)||expanded>EXPANDED_LIMIT||file.originalSize>FIGMA_FILE_LIMIT)fail('Expanded Figma archive exceeds 128 MB.');}
   return keep;
  }});
  canvas=files['canvas.fig'];if(!canvas)fail('This archive does not contain a Figma design (canvas.fig).');
  if(files['meta.json']){if(files['meta.json'].length>1_000_000)fail('Figma metadata is too large.');try{meta=JSON.parse(new TextDecoder().decode(files['meta.json']));}catch{meta={};}}
  images=new Map(Object.entries(files).filter(([key])=>key.startsWith('images/')).map(([key,value])=>[key.slice(7).split('.')[0].toLowerCase(),value]));
 }
 if(canvas.length<20||new TextDecoder().decode(canvas.subarray(0,8))!=='fig-kiwi')fail('This is not a supported Figma Design .fig file.');
 const view=new DataView(canvas.buffer,canvas.byteOffset,canvas.byteLength),chunks=[];let at=12;
 // Two initial chunks are schema and document; older exports may have a trailing thumbnail.
 for(let i=0;i<2;i++){if(at+4>canvas.length)fail('The Figma file is truncated.');const length=view.getUint32(at,true);at+=4;if(!length||at+length>canvas.length)fail('The Figma file is truncated.');chunks.push(canvas.subarray(at,at+length));at+=length;}
 const schema=decodeBinarySchema(inflateBounded(chunks[0],2*1024*1024));
 const message=decodeKiwi(schema,inflateBounded(chunks[1],FIGMA_FILE_LIMIT));
 if(!Array.isArray(message.nodeChanges)||message.nodeChanges.length>50_000)fail('The Figma file has no supported node tree, or has more than 50,000 source nodes.');
 return {version:view.getUint32(8,true),message,images,meta};
}
