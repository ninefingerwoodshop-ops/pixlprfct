import {deflateSync} from 'fflate';
import {parseSchema,compileSchema,encodeBinarySchema} from 'kiwi-schema';
export function figmaLibraryFixture(){
 const schema=parseSchema('message Parent { string guid = 1; string position = 2; } message Size { float x = 1; float y = 2; } message Node { string guid = 1; string type = 2; string name = 3; Parent parentIndex = 4; Size size = 5; } message Message { Node[] nodeChanges = 1; }');
 const codec=compileSchema(schema),data=codec.encodeMessage({nodeChanges:[{guid:'page',type:'CANVAS',name:'Components'},{guid:'main',type:'SYMBOL',name:'Figma button',parentIndex:{guid:'page',position:'a'},size:{x:120,y:40}}]});
 const chunks=[encodeBinarySchema(schema),data].map(bytes=>deflateSync(bytes)),raw=new Uint8Array(12+chunks.reduce((n,c)=>n+c.length+4,0)),view=new DataView(raw.buffer);raw.set(new TextEncoder().encode('fig-kiwi'));view.setUint32(8,101,true);let at=12;for(const c of chunks){view.setUint32(at,c.length,true);raw.set(c,at+4);at+=4+c.length;}return raw;
}
