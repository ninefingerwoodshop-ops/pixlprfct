import assert from 'node:assert/strict';
export async function completeExport(runtime,args){
 const result=await runtime.request('export',args);if(!result.partial)return result;
 const files=[];
 for(const file of result.files){let cursor=file.cursor,text='';while(cursor){const chunk=await runtime.request('export',{...args,cursor});assert.equal(chunk.revision,result.revision);assert.equal(chunk.files[0].name,file.name);assert.equal(chunk.pagination.offset,text.length);text+=chunk.files[0].text;cursor=chunk.pagination.nextCursor;}assert.equal(text.length,file.characters);assert.equal(new TextEncoder().encode(text).length,file.bytes);files.push({name:file.name,text});}
 return {...result,partial:false,files};
}
