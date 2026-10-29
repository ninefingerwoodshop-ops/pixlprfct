import {readFile,writeFile,rename,unlink,mkdir,realpath,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {createAgentRuntime} from '../web/agent-runtime.js';
import {importedContentError,protectedInstanceError} from '../web/library-model.js';
import {layoutText,textStyle,textSize} from '../web/typography.js';

let ready;
export async function initializeEngine(){ready??=init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});await ready;}
export const digest=value=>createHash('sha256').update(value).digest('hex');
// Saved-project construction does not require a browser. Use deterministic
// fallback metrics; the live editor replaces these with installed-font metrics.
export function createHeadlessEditor(){const editor=new Editor();editor.set_text_measurer(json=>{const shape=JSON.parse(json),size=textStyle(shape).font_size;return JSON.stringify(textSize(shape,text=>Array.from(text).length*size*.55));});return editor;}
export const headlessOptions=()=>({textLayout:shape=>layoutText(shape,text=>Array.from(text).length*textStyle(shape).font_size*.55)});
export const localGuard=(before,after,history)=> (!history&&importedContentError(before,after))||protectedInstanceError(before,after);

export async function createProjectStore(directory){
 await initializeEngine();await mkdir(directory,{recursive:true});const root=await realpath(directory),sessions=new Map(),saving=new Set();
 const inside=file=>file===root||file.startsWith(root+path.sep);
 async function resolveFile(relative,{missing=false}={}){
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(p=>p==='..'||p==='.'||!p)||!relative.endsWith('.pixl'))throw new Error('Use a relative .pixl path inside the configured workspace.');
  const file=path.resolve(root,relative);if(!inside(file))throw new Error('Path is outside the workspace.');
  const parent=await realpath(path.dirname(file));if(!inside(parent))throw new Error('Symlinks cannot escape the workspace.');
  try{if((await lstat(file)).isSymbolicLink()||!inside(await realpath(file)))throw new Error('Project symlinks are not supported.');}catch(error){if(error.code!=='ENOENT'||!missing)throw error;}
  return file;
 }
 function attach(editor,file=null,diskRevision=null){const id='file:'+randomUUID(),runtime=createAgentRuntime({editor,createEditor:createHeadlessEditor,guard:localGuard,options:headlessOptions});const session={id,editor,runtime,file,diskRevision};sessions.set(id,session);return session;}
 return {root,sessions,
  list:()=>[...sessions.values()].map(s=>({id:s.id,mode:'file',file:s.file,...s.runtime.state(),textMetrics:'approximate; verify typography in the live editor'})),
  async files(){const files=[];async function scan(folder,depth=0){if(depth>5||files.length>=500)return;for(const entry of await readdir(folder,{withFileTypes:true})){if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;const file=path.join(folder,entry.name);if(entry.isDirectory())await scan(file,depth+1);else if(entry.isFile()&&entry.name.endsWith('.pixl'))files.push(path.relative(root,file));}}await scan(root);return files;},
  async open({file,create=false,name='Untitled'}){
   if(sessions.size>=50)throw new Error('Close a project session before opening another (limit 50).');
   if(create){if(typeof name!=='string'||!name.trim()||name.length>256)throw new Error('Project name must contain 1–256 characters.');const editor=createHeadlessEditor(),doc=JSON.parse(editor.snapshot());doc.name=name;editor.load(JSON.stringify(doc));editor.clear_history();return attach(editor);}
   const filename=await resolveFile(file),existing=[...sessions.values()].find(s=>s.file===file);if(existing)return existing;
   const raw=await readFile(filename);if(raw.length>5_000_000)throw new Error('Project exceeds 5 MB.');const editor=createHeadlessEditor();
   try{editor.load(raw.toString('utf8'));editor.clear_history();return attach(editor,file,digest(raw));}catch(error){editor.free();throw error;}
  },
  async save(id,{file,revision}){
   const session=sessions.get(id);if(!session)throw new Error('Saved-project session not found.');if(revision!==session.runtime.state().revision)throw new Error('Revision conflict. Read the project before saving.');
   file??=session.file;if(!file)throw new Error('Choose a .pixl filename for the new project.');
   const body=session.editor.snapshot(),filename=await resolveFile(file,{missing:true});if(saving.has(filename))throw new Error('A save is already in progress for this file.');saving.add(filename);
   try{let current=null;try{current=digest(await readFile(filename));}catch(error){if(error.code!=='ENOENT')throw error;}
   if(file===session.file?current!==session.diskRevision:current!==null)throw new Error('File conflict. The destination changed or already exists. Open it again or choose a new filename.');
   const temp=filename+'.'+randomUUID()+'.tmp';try{await writeFile(temp,body,{flag:'wx',mode:0o600});
    // Recheck after preparing the output, before the atomic rename.
    let latest=null;try{latest=digest(await readFile(filename));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(latest!==current)throw new Error('File changed while saving. Retry with its latest version.');
    if(session.runtime.state().revision!==revision)throw new Error('Project changed while saving. Retry with its latest revision.');
    await rename(temp,filename);
   }finally{await unlink(temp).catch(()=>{});}
   session.file=file;session.diskRevision=digest(body);return {id,file,...session.runtime.state()};
   }finally{saving.delete(filename);}
  },
  close(id){const session=sessions.get(id);if(!session)throw new Error('Saved-project session not found.');session.editor.free();sessions.delete(id);},
  dispose(){for(const session of sessions.values())session.editor.free();sessions.clear();}
 };
}
