import test from 'node:test';
import assert from 'node:assert/strict';
import {exportChunks} from '../web/export-chunks.js';
test('large multi-file exports reconstruct exactly with bounded Unicode-safe chunks',()=>{
 const files=[{name:'design.pixl',text:'😀éあ'.repeat(100000)},{name:'style.css',text:'body{}'.repeat(10000)}],state={revision:'v1'},scope='project';
 const manifest=exportChunks(files,state,{},scope);assert.equal(manifest.partial,true);assert.ok(JSON.stringify(manifest).length<1000);
 for(const file of manifest.files){let cursor=file.cursor,text='';while(cursor){const part=exportChunks(files,state,{cursor,limit:8193},scope),chunk=part.files[0].text;assert.ok(chunk.length<=8193);assert.equal(new TextDecoder().decode(new TextEncoder().encode(chunk)),chunk);text+=chunk;cursor=part.pagination.nextCursor;}assert.equal(text,files.find(f=>f.name===file.name).text);}
 assert.throws(()=>exportChunks(files,{revision:'v2'},{cursor:manifest.files[0].cursor},scope),/changed/);assert.throws(()=>exportChunks(files,state,{cursor:manifest.files[0].cursor},'page'),/same export options/);
});
test('small exports preserve the complete-file response and reject invalid limits',()=>{const files=[{name:'small.svg',text:'<svg/>'}];assert.deepEqual(exportChunks(files,{revision:'v1'},{},'page').files,files);assert.throws(()=>exportChunks(files,{revision:'v1'},{limit:1000000},'page'),/limit/);});
