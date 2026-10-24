import test from 'node:test';
import assert from 'node:assert/strict';
import {exportJobs,zipFiles,crc32} from '../web/batch-export.js';
const shape=(id,name,parent_id=0,kind='frame')=>({id,name,parent_id,kind,x:id*100,y:0,width:80,height:60,fill:'#ffffff',hidden:false});
const options={scope:'frames',format:'png',scale:2};
test('batch frames include descendants, omit hidden roots and disambiguate safe filenames',()=>{
 const page=[shape(1,'Card'),shape(2,'Child',1,'rectangle'),shape(3,'card'),shape(4,'../Logo'),{...shape(5,'Hidden'),hidden:true},shape(6,'CON')],jobs=exportJobs(page,[],options,'Page');
 assert.deepEqual(jobs.map(j=>j.name),['Card','card (2)','.._Logo','_CON']);assert.deepEqual(jobs[0].shapes.map(s=>s.id),[1,2]);assert.equal(jobs[1].size.width,160);
 assert.equal(exportJobs(page,[1,2,3],{...options,scope:'layers'},'Page').length,2);assert.throws(()=>exportJobs(page,[],{...options,scope:'layers'},'Page'));
});
test('batch validates every entry and applies per-file limits before output',()=>{
 assert.throws(()=>exportJobs(Array.from({length:101},(_,i)=>shape(i+1,'Frame')),[],options,'Page'));
 assert.throws(()=>exportJobs([shape(1,'Okay'),{...shape(2,'Huge'),width:9000}],[],options,'Page'));
 assert.throws(()=>exportJobs([],[],options,'Page'));assert.equal(exportJobs([shape(1,'Card')],[],{...options,scope:'page'},'Whole page')[0].name,'Whole page');
});
test('ZIP stores UTF-8 filenames, correct CRCs, offsets and a central directory',async()=>{
 const enc=new TextEncoder(),files=[{name:'Card.svg',data:enc.encode('<svg/>')},{name:'日本語.png',data:new Uint8Array([137,80,78,71])}],bytes=new Uint8Array(await zipFiles(files).arrayBuffer()),v=new DataView(bytes.buffer);let offset=0;
 assert.equal(crc32(enc.encode('123456789')),0xcbf43926);
 for(const f of files){assert.equal(v.getUint32(offset,true),0x04034b50);assert.equal(v.getUint16(offset+6,true),0x800);assert.equal(v.getUint32(offset+14,true),crc32(f.data));assert.equal(v.getUint32(offset+18,true),f.data.length);const n=v.getUint16(offset+26,true);assert.equal(new TextDecoder().decode(bytes.slice(offset+30,offset+30+n)),f.name);assert.deepEqual(bytes.slice(offset+30+n,offset+30+n+f.data.length),f.data);offset+=30+n+f.data.length;}
 const central=offset;let local=0;for(const f of files){assert.equal(v.getUint32(offset,true),0x02014b50);assert.equal(v.getUint32(offset+42,true),local);const n=v.getUint16(offset+28,true);offset+=46+n;local+=30+n+f.data.length;}
 assert.equal(v.getUint32(offset,true),0x06054b50);assert.equal(v.getUint16(offset+10,true),2);assert.equal(v.getUint32(offset+16,true),central);assert.equal(offset+22,bytes.length);
 assert.throws(()=>zipFiles([{name:'../escape',data:new Uint8Array()}]));assert.throws(()=>zipFiles([]));
});
