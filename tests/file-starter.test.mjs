import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {fileConfig,fileRejection,fileSelection} from '../web/file-control.js';
import {ensureInputBase} from '../web/input-base.js';
import {newControl,controlMarkup,controlCss} from '../web/controls.js';
import {behaviorSource} from '../web/behaviors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('file limits support extensions, MIME types, wildcards and maximum size',()=>{
 const file={name:'REPORT.PDF',type:'application/pdf',size:1024};
 assert.equal(fileRejection(file,'.pdf',1),'');assert.equal(fileRejection(file,'image/*, application/pdf',1),'');
 assert.match(fileRejection(file,'image/*',1),/accepted file type/);
 assert.match(fileRejection({...file,size:2097153},'',2),/2 MB/);
 assert.equal(fileRejection({name:'a.png',type:'image/png',size:20},'image/*',0),'');
 assert.equal(fileConfig({upload:{max_files:-4}}).max_files,0);
});
test('file starter persists settings and inherits them in instances and exports',()=>{
 const e=new Editor(),base=ensureInputBase(JSON.parse(e.snapshot()).variables,'file');
 const control={...newControl('file','Attachments'),starter:true,base_collection:base.collection.id,multiple:true,required:true,accept:'.pdf',upload:{max_size:5,max_files:3,list:true,drop:true,button:'Browse files'}};
 const id=e.insert_control_starter(JSON.stringify({id:0,name:'File upload',kind:'frame',x:0,y:0,width:280,height:112,fill:'#ffffff',text:'',hidden:false,control,variable_bindings:base.bindings}),JSON.stringify(base.variables));
 const instance=e.create_instance(id,300,0),s=JSON.parse(e.snapshot()).shapes.find(s=>s.id===instance);assert.deepEqual(s.control.upload,control.upload);
 const html=controlMarkup(s.control,instance);assert.match(html,/type="file"/);assert.match(html,/accept=".pdf" multiple required/);assert.match(html,/Browse files/);assert.match(html,/Selected files/);assert.match(html,/px-control-error/);
 assert.match(controlCss(s.control,instance,{interactive:true}),/min-height:96px/);
 assert.match(controlMarkup({...s.control,disabled:true},instance),/data-upload="[^"]*" disabled/);
 const source=behaviorSource([s]);assert.match(source,/function mountFiles/);assert.match(source,/function fileRejection/);new Function(source.replaceAll('export ',''));e.free();
});

test('selection enforces total count, ignores duplicates and preserves existing files on rejection',()=>{
 const a={name:'a.txt',type:'text/plain',size:3,lastModified:1},b={...a,name:'b.txt'},c={...a,name:'c.txt'};
 const cfg={multiple:true,max_files:2,max_size:1,accept:'.txt'};
 const result=fileSelection([a],[a,b,c],cfg);assert.deepEqual(result.files,[a,b]);assert.equal(result.errors.length,1);
 const rejected=fileSelection([a],[{...b,name:'b.exe'}],{...cfg,multiple:false});assert.deepEqual(rejected.files,[a]);assert.equal(rejected.errors.length,1);
});
test('file picker runtime adds, removes, rejects, disables and cleans up selections',async()=>{
 const {mountFiles}=await import('../web/file-control.js');
 class Element extends EventTarget{constructor(){super();this.dataset={};this.children=[];this.attrs={};this.hidden=false;}getAttribute(k){return this.attrs[k]??null;}setAttribute(k,v){this.attrs[k]=v;}append(...children){this.children.push(...children);}replaceChildren(){this.children=[];}focus(){this.focused=true;}contains(){return false;}}
 const trigger=new Element(),input=new Element(),list=new Element(),status=new Element(),error=new Element();error.id='error';input.multiple=true;input.accept='.txt';input.files=[];input.disabled=false;input.required=true;
 trigger.dataset.upload=JSON.stringify({max_files:2,max_size:1,drop:true,list:true});trigger.parentElement={querySelector:s=>({'.px-file-native':input,'.px-file-list':list,'.px-file-status':status,'.px-control-error':error})[s]};
 const oldDocument=globalThis.document,oldTransfer=globalThis.DataTransfer;globalThis.document={createElement:()=>new Element()};globalThis.DataTransfer=class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)};}};
 try{const stop=mountFiles({querySelectorAll:()=>[trigger]});const a={name:'notes.txt',size:6,type:'text/plain',lastModified:1};input.files=[a];input.dispatchEvent(new Event('change'));assert.equal(list.children.length,1);assert.equal(status.textContent,'1 file selected.');assert.deepEqual(input.files,[a]);
 input.files=[{...a,name:'bad.exe'}];input.dispatchEvent(new Event('change'));assert.equal(error.hidden,false);assert.match(error.textContent,/accepted file type/);assert.deepEqual(input.files,[a]);
 list.children[0].children[1].onclick();assert.equal(input.files.length,0);assert.equal(list.children.length,0);assert.match(error.textContent,/at least one/);assert.equal(trigger.focused,true);
 const drop=new Event('drop',{cancelable:true});drop.dataTransfer={files:[a]};trigger.dispatchEvent(drop);assert.equal(input.files.length,1);assert.equal(error.hidden,true);
 input.disabled=true;const disabledDrop=new Event('drop',{cancelable:true});disabledDrop.dataTransfer={files:[{...a,name:'another.txt'}]};trigger.dispatchEvent(disabledDrop);assert.equal(input.files.length,1);stop();input.files=[];input.dispatchEvent(new Event('change'));assert.equal(list.children.length,1);
 }finally{globalThis.document=oldDocument;globalThis.DataTransfer=oldTransfer;}
});
