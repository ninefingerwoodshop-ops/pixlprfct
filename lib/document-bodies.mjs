const PREFIX='@pixlprfct-r2:';
/** @typedef {{put:(key:string,bytes:Uint8Array,options?:object)=>Promise<unknown>,get:(key:string)=>Promise<{text:()=>Promise<string>}|null>}} BodyStore */
export async function storeBody(body,bucket){
 const bytes=new TextEncoder().encode(body);if(bytes.length<=1_500_000)return body;
 if(!bucket)throw new Error('Document object storage is unavailable');
 const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 // Immutable content keys let history keep references without copying large rows.
 await bucket.put('documents/'+hash,bytes,{httpMetadata:{contentType:'application/json'}});return PREFIX+hash;
}
export async function readBody(body,bucket){
 if(!body.startsWith(PREFIX))return body;const hash=body.slice(PREFIX.length);if(!/^[0-9a-f]{64}$/.test(hash)||!bucket)throw new Error('Document object storage is unavailable');const object=await bucket.get('documents/'+hash);if(!object)throw new Error('Stored document body is unavailable');return object.text();
}
