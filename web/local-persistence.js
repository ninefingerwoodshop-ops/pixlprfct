import {withDraftLock} from './local-drafts.js';

// Content acknowledgment belongs to the open editor, not to the shared list.
// Recovery uses per-tab session storage so a full durable store cannot erase it.
export class LocalPersistence {
 constructor({drafts,snapshot,storage,status=()=>{},lock=withDraftLock}){
  Object.assign(this,{drafts,snapshot,storage,status,lock});this.ack=null;this.exported=null;this.error=null;this.pending=null;this.enabled=true;
 }
 key(){return 'pixlprfct.local-recovery:'+(this.drafts.activeId??'new');}
 dirty(){const body=this.snapshot();return this.enabled&&body!==this.ack&&body!==this.exported;}
 remember(body=this.snapshot()){
  if(!this.enabled||body===this.ack||body===this.exported)return;
  try{this.storage?.setItem(this.key(),JSON.stringify({id:this.drafts.activeId,body,base:this.drafts.base,...(this.ack===this.drafts.base?{ackIsBase:true}:{ack:this.ack})}));}catch{/* Keep dirty state and the unload guard when both stores are full. */}
 }
 adopt(body){this.ack=body;this.exported=null;this.error=null;}
 recovery(){
  const raw=this.storage?.getItem(this.key());if(!raw)return null;
  const value=JSON.parse(raw);
  if(value?.ackIsBase===true){value.ack=value.base;delete value.ackIsBase;}
  if(value?.id!==this.drafts.activeId||typeof value.body!=='string'||value.base!==null&&typeof value.base!=='string'||value.ack!==null&&typeof value.ack!=='string')throw new Error('The recovery copy could not be read. It has been preserved.');
  return value;
 }
 restore(record){this.drafts.base=record.base;this.adopt(record.ack);}
 clearRecovery(){try{this.storage?.removeItem(this.key());}catch{}}
 downloaded(body){this.exported=body;this.status(this.error);}
 changed(body=this.snapshot()){if(this.enabled){this.remember(body);this.flush(body).catch(()=>{});}}
 async flush(initial=this.snapshot()){
  if(!this.enabled)return;
  if(this.pending)return this.pending;
  if(initial===this.ack)return;
  this.pending=(async()=>{
   try{
    let body=initial,next=initial;
    do{
     body=next;
     const key=this.key();await this.lock(()=>this.drafts.save(body));
     if(key!==this.key())try{this.storage?.removeItem(key);}catch{}
     this.ack=body;this.error=null;this.exported=null;
     next=this.snapshot();
    }while(this.enabled&&next!==body);
    this.clearRecovery();this.status(null);
   }catch(error){this.error=error;this.remember();this.status(error);throw error;}
  })().finally(()=>{this.pending=null;});return this.pending;
 }
 async copy(){
  if(this.pending)await this.pending.catch(()=>{});
  const key=this.key(),body=this.snapshot();await this.lock(()=>this.drafts.create(body));
  try{this.storage?.removeItem(key);}catch{}
  this.adopt(body);this.status(null);return body;
 }
 async latest(){
  if(this.pending)await this.pending.catch(()=>{});
  if(this.dirty())throw new Error('Save a separate project or download your edits before opening the latest version.');
  const body=await this.lock(()=>this.drafts.activate(this.drafts.activeId));this.clearRecovery();this.adopt(body);this.status(null);return body;
 }
}
