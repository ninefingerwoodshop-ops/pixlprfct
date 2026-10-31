export async function cloudRequest(path='',options={}){
 const url=new URL('/api/documents'+path,globalThis.location?.origin??'http://localhost');const workspace=new URLSearchParams(globalThis.location?.search??'').get('workspace');if(workspace)url.searchParams.set('workspace',workspace);
 const response=await fetch(url.pathname+url.search,{signal:AbortSignal.timeout(20000),...options,headers:{...(options.body?{'content-type':'application/json'}:{}),...options.headers}});
 let data;try{data=await response.json();}catch{throw new Error('Cloud files are unavailable on this server.');}
 if(!response.ok){const error=new Error(data.error??'Cloud request failed.');error.status=response.status;error.data=data;throw error;}return data;
}
export class CloudSession{
 constructor({snapshot,status=()=>{},storage,request=cloudRequest,delay=900}){Object.assign(this,{snapshot,status,storage,request,delay});this.active=null;this.ack=null;this.error=null;this.pending=null;this.timer=null;this.equal=(a,b)=>a===b;this.writeHeaders=()=>({});this.beforeWrite=()=>{};}
 isDirty(){return !!this.active&&!this.equal(this.snapshot(),this.ack);}
 remember(){if(!this.active)return;try{this.storage?.setItem('pixlprfct.cloud.session',JSON.stringify({...this.active,body:this.snapshot(),clean:this.equal(this.snapshot(),this.ack)}));}catch{this.status('Recovery storage full — download a local copy');}}
 adopt(meta,ack){clearTimeout(this.timer);this.active={id:meta.id,revision:meta.revision};this.ack=ack;this.error=null;this.remember();this.status('Saved to cloud');}
 detach(){clearTimeout(this.timer);this.active=null;this.ack=null;this.error=null;this.storage?.removeItem('pixlprfct.cloud.session');this.status('Saved on this device');}
 changed(){if(!this.active)return;this.remember();if(this.equal(this.snapshot(),this.ack))return;if(this.error){this.status(this.error.status===409?'Cloud conflict — open Files':'Cloud save failed — open Files to retry');return;}this.status('Saving to cloud…');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(()=>{}),this.delay);}
 async flush(){
  clearTimeout(this.timer);if(this.pending)return this.pending;if(!this.active||this.equal(this.snapshot(),this.ack))return;if(this.error?.status===409)throw this.error;
  this.error=null;
  this.pending=(async()=>{try{
   while(this.active&&!this.equal(this.snapshot(),this.ack)){this.beforeWrite();const body=this.snapshot(),id=this.active.id,revision=this.active.revision;this.status('Saving to cloud…');const saved=await (this.save?this.save({id,revision,body}):this.request('/'+id,{method:'PUT',headers:{...this.writeHeaders(),'if-match':String(revision)},body}));if(this.active?.id!==id)throw new Error('The active cloud file changed during a save.');this.active.revision=saved.revision;this.ack=this.receive?await this.receive(saved,body):body;this.remember();}
   if(this.active)this.status('Saved to cloud');
  }catch(error){this.error=error;this.remember();this.status(error.status===409?'Cloud conflict — open Files':'Cloud save failed — local copy retained');throw error;}})().finally(()=>{this.pending=null;});
  return this.pending;
 }
}
