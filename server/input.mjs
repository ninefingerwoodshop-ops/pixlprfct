import {DocumentError} from '../lib/documents.mjs';

export async function readJSON(request, limit=50_000) {
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new DocumentError(415,'Send JSON.');
 const reader=request.body?.getReader();if(!reader)throw new DocumentError(400,'Missing request.');
 let size=0;const chunks=[];
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new DocumentError(413,'This request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}
 throw new DocumentError(400,'Invalid JSON request.');
}
