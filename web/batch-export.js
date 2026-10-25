import {exportShapes,exportBounds,exportSize} from './export.js';
import {visibleInTree} from './selection.js';
export function exportJobs(page,ids,options,name){
 const batch=['layers','frames'].includes(options.scope);
 let roots=options.scope==='frames'?page.filter(s=>s.kind==='frame'&&!s.parent_id&&visibleInTree(s,page)):page.filter(s=>ids.includes(s.id)&&visibleInTree(s,page));
 if(options.scope==='layers')roots=roots.filter(s=>{let p=s;while(p.parent_id){p=page.find(n=>n.id===p.parent_id);if(!p)break;if(ids.includes(p.id))return false;}return true;});
 if(batch&&!roots.length)throw new Error(options.scope==='frames'?'No visible top-level frames to export':'Select visible layers to export');
 if(batch&&roots.length>100)throw new Error('Batch export supports up to 100 files');
 const entries=batch?roots.map(s=>({name:s.name,shapes:exportShapes(page,[s.id],'selection')})):[{name,shapes:exportShapes(page,ids,options.scope)}];
 const used=new Set();return entries.map(entry=>{const box=exportBounds(entry.shapes),size=exportSize(box,options.scale,options.format,entry.shapes);let base=(entry.name??'Layer').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'Layer';if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base))base='_'+base;let filename=base,n=2;while(used.has(filename.toLowerCase()))filename=base+' ('+n+++')';used.add(filename.toLowerCase());return{...entry,name:filename,box,size};});
}
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
export function zipFiles(files){
 if(!files.length||files.length>1000)throw new Error('ZIP requires 1–1000 files');
 const encoder=new TextEncoder(),parts=[],directory=[];let offset=0,total=0;
 for(const file of files){const name=encoder.encode(file.name),data=file.data;total+=data.byteLength;if(total>134217728)throw new Error('Batch export exceeds 128 MB. Export fewer layers or reduce scale.');if(name.length>65535||/[\\/]/.test(file.name)||file.name==='..')throw new Error('Invalid ZIP filename');
  const crc=crc32(data),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);parts.push(local,data);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);directory.push(central);offset+=local.length+data.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,directory.reduce((n,d)=>n+d.length,0),true);v.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
}
