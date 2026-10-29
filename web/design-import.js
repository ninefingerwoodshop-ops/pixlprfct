const FIGMA_LIMIT=64*1024*1024;
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
function modal(title){
 const dialog=el('dialog');dialog.className='design-import-dialog';dialog.id='design-import-dialog';dialog.setAttribute('aria-label',title);dialog.append(el('h2',title));document.body.append(dialog);return dialog;
}
function parseInWorker(bytes,name){
 return new Promise((resolve,reject)=>{
  const dialog=modal('Import Figma design'),status=el('p','Reading pages and layers…'),actions=el('div'),cancel=el('button','Cancel');status.setAttribute('role','status');actions.className='dialog-actions';actions.append(cancel);dialog.append(status,actions);dialog.showModal();
  let worker,timer,finished=false;
  const finish=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);worker?.terminate();dialog.remove();if(error)reject(error);else resolve(result);};
  cancel.onclick=()=>finish(new DOMException('Import canceled.','AbortError'));dialog.oncancel=event=>{event.preventDefault();cancel.click();};
  try{worker=new Worker(new URL('./vendor/figma-import-worker.js',import.meta.url),{type:'module'});timer=setTimeout(()=>finish(new Error('This Figma file took too long to import. Try a smaller file.')),30000);
   worker.onmessage=({data})=>finish(data.ok?null:new Error(data.error),data);worker.onerror=()=>finish(new Error('The Figma importer could not run. Reload the app and try again.'));
   worker.postMessage({buffer:bytes.buffer,name},[bytes.buffer]);
  }catch(error){finish(error);}
 });
}
function reviewImport(report){
 return new Promise(resolve=>{
  const dialog=modal('Figma import summary'),summary=el('p',`${report.pages} page${report.pages===1?'':'s'} · ${report.layers} editable layers · ${report.components} components · ${report.images} images`);dialog.append(summary);
  dialog.append(el('p','Import creates a new project. Your original file stays unchanged.'));
  if(report.warnings.length){const heading=el('h3','Items to review'),list=el('ul');for(const warning of report.warnings){const item=el('li',warning.message+` (${warning.count})`);if(warning.layers.length)item.append(el('small',warning.layers.join(', ')));list.append(item);}dialog.append(heading,list);}
  else dialog.append(el('p','No unsupported features were detected in this file.'));
  const actions=el('div'),cancel=el('button','Cancel'),confirm=el('button','Import design');actions.className='dialog-actions';confirm.className='primary';actions.append(cancel,confirm);dialog.append(actions);
  const finish=value=>{dialog.remove();resolve(value);};cancel.onclick=()=>finish(false);confirm.onclick=()=>finish(true);dialog.oncancel=event=>{event.preventDefault();finish(false);};dialog.showModal();confirm.focus();
 });
}
let importing=false;
export async function readDesignFile(file){
 if(importing)throw new Error('Finish the current import first.');
 importing=true;try{return await readFile(file);}finally{importing=false;}
}
async function readFile(file){
 const name=String(file.name??'Untitled.pixl'),figma=/\.fig$/i.test(name),limit=figma?FIGMA_LIMIT:5_000_000;
 const size=file.size??file.data?.byteLength??new TextEncoder().encode(file.body??'').length;
 if(size>limit)throw new Error(figma?'Figma files must be smaller than 64 MB.':'PixlPrfct files must be smaller than 5 MB.');
 if(!figma)return {body:typeof file.body==='string'?file.body:file.data?new TextDecoder('utf-8',{fatal:true}).decode(file.data):await file.text(),report:null};
 const bytes=file.data?new Uint8Array(file.data):new Uint8Array(await file.arrayBuffer());
 if(bytes.byteLength>limit)throw new Error('Figma files must be smaller than 64 MB.');
 const result=await parseInWorker(bytes,name);
 if(!await reviewImport(result.report))throw new DOMException('Import canceled.','AbortError');return result;
}
