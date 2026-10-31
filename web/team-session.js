// The UI and agent bridge share this gate. The server also fences every commit.
export const sameArtwork=(a,b)=>{if(a===b)return true;if(!a||!b)return false;try{const x=typeof a==='string'?JSON.parse(a):{...a},y=typeof b==='string'?JSON.parse(b):{...b};delete x.active_page;delete y.active_page;return JSON.stringify(x)===JSON.stringify(y);}catch{return false;}};
export class TeamSession{
 constructor({session,request,reload,changed=()=>{},now=Date.now}){Object.assign(this,{session,request,reload,changed,now});this.id=null;this.state=null;this.deadline=0;this.pending=null;this.issue='';this.client=crypto.randomUUID();}
 headers(){if(this.state?.editingMode==='live')return {'x-pixl-client':this.client,...(this.live?.token?{'x-pixl-edit-token':this.live.token}:{})};return {'x-pixl-client':this.client,...(this.state?.lease?.mine?{'x-pixl-edit-token':this.state.lease.token}:{})};}
 editable(){if(this.id&&this.state?.editingMode==='live')return !!this.live?.editable();return !this.id||!!(this.state?.canEdit&&this.state?.lease?.mine&&this.deadline>this.now()&&!this.issue);}
 guard(before,after){return this.editable()||sameArtwork(before,after)?null:this.issue||'This file is open for review. Start editing or request a handoff.';}
 async call(suffix,options={}){const id=this.id;if(!id)throw new Error('Open a shared workspace file first.');const result=await this.request('/'+id+suffix,{...options,headers:{...this.headers(),...options.headers}});if(id!==this.id)throw new Error('The active file changed.');return result;}
 async accept(state){
  if(state.editingMode==='live'){this.state=state;await this.live?.connect();this.changed();return state;}
  const old=this.state,dirty=this.session.isDirty(),newLease=state.lease?.mine&&old?.lease?.token!==state.lease.token;
  this.deadline=0;
  if((newLease||state.documentRevision!==this.session.active?.revision)&&!dirty)await this.reload(this.id);
  if(dirty&&((newLease&&!!old)||state.documentRevision!==this.session.active?.revision)){this.issue='Editing changed while you had unsaved work. Open Files to save a copy or open the latest version.';}
  else this.issue='';
  this.state=state;this.deadline=this.now()+Math.max(0,(state.lease?.expiresAt??state.serverNow)-state.serverNow-3000);this.changed();return state;
 }
 async sync(){
  if(!this.id)return;if(this.pending)return this.pending;
  const id=this.id,task=(async()=>{try{return await this.accept(await this.call('/editing',this.state?.lease?.mine&&this.deadline>this.now()?{method:'POST',body:JSON.stringify({action:'renew'})}:{}));}catch(error){if(id===this.id){this.deadline=0;this.issue=error.message;this.changed();}throw error;}})().finally(()=>{if(this.pending===task)this.pending=null;});this.pending=task;return task;
 }
 context(id){if(id===this.id)return this.pending;this.id=id;this.pending=null;this.state=null;this.deadline=0;this.issue='';this.changed();return this.sync();}
 async action(action,requestId){
  if(this.pending)await this.pending;
  if(['release','handoff'].includes(action))await this.session.flush();
  if(action==='acquire'&&this.session.isDirty())throw new Error('Save a copy of your unsaved work, then open the latest version from Files before starting a new editing session.');
  const task=(async()=>this.accept(await this.call('/editing',{method:'POST',body:JSON.stringify({action,requestId})})))().finally(()=>{if(this.pending===task)this.pending=null;});this.pending=task;return task;
 }
 offline(){if(!this.id)return;this.deadline=0;this.issue='Offline — editing paused. Unsaved work is retained on this device.';this.changed();}
}
