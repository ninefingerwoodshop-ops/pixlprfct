export const DRAFTS_KEY='pixlprfct.drafts.v1';
const ACTIVE_KEY='pixlprfct.drafts.active';

// One atomic write keeps the file bodies and the last-opened file in sync.
export class LocalDrafts {
 constructor(storage,tabStorage,{id=()=>crypto.randomUUID(),now=()=>Date.now()}={}){
  Object.assign(this,{storage,tabStorage,id,now});this.activeId=null;
 }
 read(){
  if(!this.storage)throw new Error('Browser storage is unavailable. Download a local copy before switching designs.');
  const raw=this.storage.getItem(DRAFTS_KEY);if(!raw)return {version:1,activeId:null,files:[]};
  let data;try{data=JSON.parse(raw);}catch{throw new Error('Saved drafts could not be read. They have been preserved.');}
  if(data?.version!==1||!Array.isArray(data.files)||data.files.some(f=>!f||typeof f.id!=='string'||typeof f.body!=='string'||typeof f.name!=='string'||!Number.isFinite(f.updatedAt))||new Set(data.files.map(f=>f.id)).size!==data.files.length)throw new Error('Saved drafts could not be read. They have been preserved.');
  return data;
 }
 remember(){try{this.tabStorage?.setItem(ACTIVE_KEY,this.activeId);}catch{/* The durable last-opened file remains available. */}}
 restore(){
  const data=this.read();let id;try{id=this.tabStorage?.getItem(ACTIVE_KEY);}catch{}
  const files=data.files.filter(f=>!f.deletedAt),file=files.find(f=>f.id===(id||data.activeId))??files.find(f=>f.id===data.activeId)??files[0];
  this.activeId=file?.id??null;return file?.body??null;
 }
 list({trash=false}={}){return this.read().files.filter(f=>!!f.deletedAt===trash).sort((a,b)=>b.updatedAt-a.updatedAt);}
 get(id){const file=this.read().files.find(f=>f.id===id);if(!file)throw new Error('This draft is no longer available.');if(file.deletedAt)throw new Error('This project is in Trash. Restore it from Projects before opening it.');return file;}
 write(data,id){
  try{this.storage.setItem(DRAFTS_KEY,JSON.stringify(data));}catch{throw new Error('Could not save your drafts. Download a local copy or free browser storage before switching designs.');}
  this.activeId=id;this.remember();
 }
 save(body){return this.put(body,this.activeId);}
 create(body){return this.put(body,null);}
 put(body,id){
  const data=this.read(),document=JSON.parse(body),existing=data.files.find(f=>f.id===id);
  if(existing?.deletedAt)throw new Error('This project was moved to Trash. Restore it from Projects before saving changes.');
  if(existing?.body===body)return existing;
  const file={id:existing?.id??this.id(),name:document.name?.trim()||'Untitled design',body,updatedAt:this.now()};
  data.files=existing?data.files.map(f=>f.id===id?file:f):[...data.files,file];data.activeId=file.id;
  this.write(data,file.id);return file;
 }
 activate(id){const data=this.read(),file=this.get(id);data.activeId=id;this.write(data,id);return file.body;}
 setTrashed(id,trash,expectedBody){
  const data=this.read(),file=data.files.find(f=>f.id===id);if(!file)throw new Error('This draft is no longer available.');
  if(expectedBody!==undefined&&file.body!==expectedBody)throw new Error('This project changed in another tab. Refresh the project list and try again.');
  if(!!file.deletedAt===trash)return file;
  const next={...file,deletedAt:trash?this.now():null};data.files=data.files.map(f=>f.id===id?next:f);
  if(trash&&data.activeId===id)data.activeId=null;
  // Preserve this tab's active identity. A deleted open document must refuse
  // autosaves rather than silently resurrecting itself as a different project.
  this.write(data,this.activeId);return next;
 }
 detach(){this.activeId=null;}
}

export const designStarters=[
 {id:'blank',name:'Blank canvas',description:'Start with an open canvas'},
 {id:'desktop',name:'Desktop',description:'1440 × 900',width:1440,height:900},
 {id:'mobile',name:'Mobile',description:'390 × 844',width:390,height:844},
];
export function newDesign(name,starter='blank'){
 const preset=designStarters.find(p=>p.id===starter);if(!preset)throw new Error('Choose a starting point.');
 return JSON.stringify({version:1,name:name.trim().slice(0,256)||'Untitled design',shapes:preset.width?[{id:1,kind:'frame',name:preset.name,x:0,y:0,width:preset.width,height:preset.height,fill:'#ffffff',text:'',hidden:false,clip_content:true}]:[]});
}
