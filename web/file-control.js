import {icon} from './icons.js';
export function fileConfig(c){const v=c.upload??{};return {drop:v.drop!==false,list:v.list!==false,max_size:Math.max(0,Number(v.max_size)||0),max_files:Math.max(0,Math.floor(Number(v.max_files)||0)),button:String(v.button||'Choose files')};}
export function fileRejection(file,accept,maxSize){
 if(maxSize&&file.size>maxSize*1024*1024)return file.name+' exceeds the '+maxSize+' MB limit.';
 const types=String(accept||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
 if(types.length&&!types.some(t=>t.startsWith('.')?file.name.toLowerCase().endsWith(t):t.endsWith('/*')?file.type.toLowerCase().startsWith(t.slice(0,-1)):file.type.toLowerCase()===t))return file.name+' is not an accepted file type.';
 return '';
}
export function fileSelection(existing,incoming,{multiple,accept,max_size,max_files}){
 const next=multiple?[...existing]:[],errors=[];
 for(const file of incoming){if(next.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified))continue;
  let message=fileRejection(file,accept,max_size);const limit=multiple?max_files:1;
  if(!message&&limit&&next.length>=limit)message='Choose no more than '+limit+' '+(limit===1?'file.':'files.');
  if(message)errors.push(message);else next.push(file);
 }
 return {files:next.length||multiple?next:existing,errors};
}
export function fileMarkup(c,id){const cfg=fileConfig(c),esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));return `<button type="button" class="px-control px-file-trigger" data-upload="${esc(JSON.stringify(cfg))}"${c.disabled?' disabled':''}>${icon('upload')}<span>${esc(cfg.button)}</span>${cfg.drop?'<small>or drag and drop here</small>':''}</button><input class="px-file-native" type="file" tabindex="-1" aria-label="${esc(c.label||'Choose files')}" name="${esc(c.name)}" accept="${esc(c.accept)}"${c.multiple?' multiple':''}${c.required?' required':''}${c.disabled?' disabled':''}><ul class="px-file-list" aria-label="Selected files"${cfg.list?'':' hidden'}></ul><span class="px-file-status" role="status"></span>`;}
export function fileCss(id){const r='.px-node-'+id;return `${r}>.px-file-native{position:absolute;width:1px;height:1px;opacity:0;clip-path:inset(50%);pointer-events:none}${r}>.px-file-trigger{height:auto;min-height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;white-space:normal}${r}>.px-file-trigger svg{width:20px;height:20px}${r}>.px-file-trigger small{font:inherit}${r}>.px-file-trigger[data-drag]{outline:2px solid #2563eb;outline-offset:2px}${r}>.px-file-list{list-style:none;padding:0;margin:0;display:grid;gap:6px;font:inherit}${r}>.px-file-list:empty,${r}>.px-file-list[hidden]{display:none}${r} .px-file-list li{display:flex;align-items:center;gap:8px;min-width:0}${r} .px-file-list span{flex:1;overflow-wrap:anywhere}${r} .px-file-list button{flex:none;min-width:28px;min-height:28px;border:1px solid #cbd5e1;border-radius:4px;background:transparent;color:inherit;cursor:pointer}${r} .px-file-list button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}${r}>.px-file-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}`;}
// Self-contained apart from fileRejection, serialized with all web exports.
export function mountFiles(root){const cleanups=[];
 for(const trigger of root.querySelectorAll('[data-upload]')){
  const cfg=JSON.parse(trigger.dataset.upload),host=trigger.parentElement,input=host.querySelector('.px-file-native'),list=host.querySelector('.px-file-list'),status=host.querySelector('.px-file-status'),error=host.querySelector('.px-control-error');if(!input||!error)continue;
  let files=[],disposed=false,syncing=false;
  const on=(el,event,fn)=>{el.addEventListener(event,fn);cleanups.push(()=>el.removeEventListener(event,fn));};
  const showError=message=>{error.textContent=message;error.hidden=!message;trigger.setAttribute('aria-invalid',String(!!message));const ids=new Set((trigger.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));if(message)ids.add(error.id);else ids.delete(error.id);trigger.setAttribute('aria-describedby',[...ids].join(' '));};
  const render=()=>{list.replaceChildren();files.forEach((file,index)=>{const row=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');name.textContent=file.name+' ('+Math.max(1,Math.ceil(file.size/1024))+' KB)';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+file.name);remove.disabled=input.disabled;remove.onclick=()=>{if(input.disabled)return;files.splice(index,1);sync();render();showError(input.required&&!files.length?'Choose at least one file.':'');trigger.focus();};row.append(name,remove);list.append(row);});status.textContent=files.length+' '+(files.length===1?'file':'files')+' selected.';};
  const sync=()=>{const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));input.files=transfer.files;syncing=true;try{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}finally{syncing=false;}};
  const choose=incoming=>{if(input.disabled)return;
   const result=fileSelection(files,incoming,{...cfg,multiple:input.multiple,accept:input.accept});files=result.files;sync();render();showError(result.errors.join(' '));
  };
  on(trigger,'click',()=>{if(!input.disabled)input.click();});on(input,'change',()=>{if(!syncing)choose(Array.from(input.files));});
  if(cfg.drop){on(trigger,'dragover',e=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect=input.disabled?'none':'copy';if(!input.disabled)trigger.dataset.drag='true';});on(trigger,'dragleave',e=>{if(!trigger.contains(e.relatedTarget))delete trigger.dataset.drag;});on(trigger,'drop',e=>{e.preventDefault();delete trigger.dataset.drag;if(!input.disabled)choose(Array.from(e.dataTransfer?.files||[]));});}
  on(input,'invalid',e=>{e.preventDefault();showError('Choose at least one file.');trigger.focus();});
  if(input.form){on(input.form,'reset',()=>queueMicrotask(()=>{if(disposed)return;files=[];render();showError('');}));}
  render();cleanups.push(()=>{disposed=true;delete trigger.dataset.drag;});
 }
 return ()=>cleanups.forEach(fn=>fn());
}
