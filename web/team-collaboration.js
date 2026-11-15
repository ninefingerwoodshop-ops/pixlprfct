import {installActivityInbox,mentionPicker,displayMentions,activityStyles} from './team-activity.js';
import {cloudRequest} from './cloud-session.js';
import {LiveSession} from './live-session.js';
import {TeamSession,sameArtwork} from './team-session.js';
import {icon} from './icons.js';
import {confirmDestructive} from './confirm-dialog.js';
import {Presence,personColor,initials,followView,blendView} from './presence.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const roleNames={none:'No access',viewer:'Can view',commenter:'Can comment',editor:'Can edit',owner:'Owner'};
export function installTeamCollaboration({session,reload,getDocument,selection,select,changed,toast,enabled,editor,applyRemote,busy,point,screenPoint,activePage=()=>getDocument().active_page,view=()=>null,setView=()=>{}}){
 activityStyles();
 const workspace=new URLSearchParams(location.search).get('workspace'),shared=enabled&&/^(org|team):/.test(workspace??'');
 const bar=el('div','team-editing'),label=el('span'),actions=el('div','team-actions');bar.setAttribute('role','region');bar.setAttribute('aria-label','Editing session');bar.append(label,actions);document.querySelector('.right-panel .inspector-top').after(bar);
 const share=document.getElementById('share-file');
 const panel=el('section','team-comments');panel.hidden=true;panel.setAttribute('aria-label','Comments');document.querySelector('.right-panel').append(panel);
 const head=el('header'),title=el('strong',null,'Comments'),close=el('button','team-icon');close.innerHTML=icon('close');close.setAttribute('aria-label','Close comments');close.onclick=()=>{panel.hidden=true;document.body.classList.remove('team-comments-open');};head.append(title,close);
 const search=el('input');search.type='search';search.placeholder='Search';search.setAttribute('aria-label','Search comments');search.oninput=renderThreads;
 const resolved=el('button','team-icon');resolved.innerHTML=icon('check');resolved.setAttribute('aria-label','Show resolved comments');resolved.setAttribute('aria-pressed','false');resolved.onclick=()=>{showResolved=!showResolved;resolved.setAttribute('aria-pressed',String(showResolved));renderThreads();};
 const filters=el('div','team-comment-filters');filters.append(search,resolved);const list=el('div','team-threads'),form=el('form','team-comment-form'),textarea=el('textarea');textarea.placeholder='Leave a comment…';textarea.setAttribute('aria-label','New comment');textarea.maxLength=10000;const post=el('button','primary','Post comment'),anchorLabel=el('small');form.append(anchorLabel,textarea,post);panel.append(head,filters,list,form);
 const replyDrafts=new Map();
 const getMembers=async()=> (await model.call('/members')).members;
 mentionPicker(textarea,getMembers);
 let loading=0,comments=[],showResolved=false,working=false,commentId=crypto.randomUUID(),commentFile=null,nextCommentsOffset=null;
 const model=new TeamSession({session,request:cloudRequest,reload,changed:()=>{render();changed();}});
 const people=el('div','team-presence'),cursors=el('div','team-cursors');people.setAttribute('aria-label','People in this file');document.querySelector('.right-panel .inspector-top').prepend(people);document.getElementById('workspace').append(cursors);let cursor=null;
 // Everyone with this file open, in any editing mode; following one of them moves this view with theirs.
 const follow=el('div','team-follow'),followLabel=el('span'),followStop=el('button',null,'Stop');follow.hidden=true;follow.setAttribute('role','status');followStop.type='button';followStop.onclick=()=>presence.stop();follow.append(followLabel,followStop);document.getElementById('workspace').append(follow);
 let glide=0;const presence=new Presence({call:(path,options)=>model.call(path,options),local:()=>({cursor,view:view()}),changed:renderPresence,left:()=>toast('The person you were following left the file.')});
 const live=new LiveSession({session,model,apply:applyRemote,busy,reserve:(a,b)=>editor?.reserve_ids(a,b),changed:()=>{render();changed();},cursor:()=>cursor});model.live=live;
 const standardSave=({id,revision,body})=>session.request('/'+id,{method:'PUT',headers:{...model.headers(),'if-match':String(revision)},body});
 session.save=value=>live.active()?live.save(value):standardSave(value);session.receive=(data,body)=>live.active()?live.receive(data,body):body;
 if(editor)for(const kind of ['undo','redo','can_undo','can_redo']){const original=editor[kind].bind(editor);editor[kind]=()=>live.active()?(kind.startsWith('can_')?!!live.history[kind==='can_undo'?'undoStack':'redoStack'].length:live.undo(kind)):original();}
 document.getElementById('canvas').addEventListener('pointermove',e=>{if(model.id){const p=point?.(e);if(p)cursor={x:p.x,y:p.y,page:activePage()};}});
 // Moving the view yourself ends following, as in Figma.
 for(const kind of ['wheel','pointerdown'])document.getElementById('canvas').addEventListener(kind,()=>presence.stop(),{capture:true,passive:true});
 addEventListener('keydown',event=>{if(event.key==='Escape'&&presence.following&&!event.target.closest?.('dialog,input,textarea,select,[contenteditable]'))presence.stop();},true);
 document.getElementById('canvas').addEventListener('pointerleave',()=>cursor=null);
 let drawnPeople='';
 function renderPresence(){
  // Redrawn only when who is here or who is followed changes, so a focused avatar keeps its focus between heartbeats.
  const signature=JSON.stringify([model.id,presence.following,presence.people.map(p=>[p.client,p.name,p.mine])]);if(signature===drawnPeople)return;drawnPeople=signature;
  people.replaceChildren();people.hidden=!model.id||!presence.people.length;
  const leader=presence.leader();follow.hidden=!leader;document.getElementById('workspace').classList.toggle('team-following',!!leader);
  if(leader){for(const node of [follow,document.getElementById('workspace')])node.style.setProperty('--team-person',personColor(leader.client));followLabel.textContent='Following '+leader.name;followStop.setAttribute('aria-label','Stop following '+leader.name);}
  // The person being followed first, then everyone else, yourself last; past four, the rest sit behind a count.
  const mine=presence.people.find(p=>p.mine),others=presence.others().sort((a,b)=>(b.client===presence.following)-(a.client===presence.following)),shown=others.slice(0,MAX_AVATARS),more=others.length-shown.length;
  const avatar=p=>{
   const b=el('button','team-avatar',initials(p.name)),following=presence.following===p.client;b.type='button';b.style.setProperty('--team-person',personColor(p.client));b.title=p.mine?p.name+' (You)':(following?'Stop following ':'Follow ')+p.name;b.setAttribute('aria-label',b.title);
   if(p.mine)b.onclick=showPeople;else{b.setAttribute('aria-pressed',String(following));b.onclick=()=>toggleFollow(p);}
   return b;
  };
  people.append(...shown.map(avatar));
  if(more>0){const rest=el('button','team-avatar team-avatar-more','+'+more);rest.type='button';rest.title=`${more} more ${more===1?'person':'people'}`;rest.setAttribute('aria-label',rest.title);rest.onclick=showPeople;people.append(rest);}
  if(mine)people.append(avatar(mine));
 }
 const MAX_AVATARS=4;
 function toggleFollow(p){if(presence.following===p.client)presence.stop();else{presence.follow(p.client);beatLoop();}}
 // Everyone in the file by name; anyone but yourself can be followed from here too.
 function showPeople(event){
  const existing=document.querySelector('.team-people-popover');if(existing){existing.close();return;}
  const pop=el('dialog','team-people-popover');pop.setAttribute('aria-label','People in this file');
  for(const person of [...presence.others(),...presence.people.filter(p=>p.mine)]){
   const row=el('p'),dot=el('span','team-person-dot'),name=el('span',null,person.name+(person.mine?' (You)':''));dot.style.background=personColor(person.client);row.append(dot,name);
   if(!person.mine){const following=presence.following===person.client,b=el('button',null,following?'Stop following':'Follow');b.type='button';b.setAttribute('aria-label',(following?'Stop following ':'Follow ')+person.name);b.onclick=()=>toggleFollow(person);row.append(b);}
   pop.append(row);
  }
  const r=event.currentTarget.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(innerWidth-248,r.left))+'px';pop.style.top=(r.bottom+8)+'px';pop.onclick=()=>pop.close();pop.addEventListener('close',()=>pop.remove());document.body.append(pop);pop.showModal();
 }
 function positionCursors(){cursors.replaceChildren();if(!model.id)return;const page=activePage();for(const p of presence.others().filter(p=>p.cursor?.page===page)){const xy=screenPoint?.(p.cursor);if(!xy)continue;const node=el('div','team-cursor'),color=personColor(p.client);node.style.transform=`translate(${xy.x}px,${xy.y}px)`;node.style.setProperty('--team-person',color);node.innerHTML=`<svg width="16" height="20" viewBox="0 0 16 20"><path d="M1 1L14 12L8 13L5 19Z" fill="${color}" stroke="white"/></svg>`;node.append(el('span',null,p.name));cursors.append(node);}}
 // Show what the followed person sees: their page, with their view fitted whole into this canvas.
 function followLeader(){
  const leader=presence.leader(),mine=view();if(!leader?.view||!mine||busy())return;
  const target=followView(leader.view,mine.canvasWidth,mine.canvasHeight),from={page:mine.page,zoom:mine.zoom,pan:mine.pan},started=performance.now(),run=++glide;
  if(target.page!==mine.page){setView(target);return;}
  if(Math.abs(target.zoom-from.zoom)<1e-4&&Math.abs(target.pan.x-from.pan.x)<.5&&Math.abs(target.pan.y-from.pan.y)<.5)return;
  const step=now=>{if(run!==glide||!presence.following)return;const t=Math.min(1,(now-started)/200);setView(blendView(from,target,t));if(t<1)requestAnimationFrame(step);};requestAnimationFrame(step);
 }
 let beatTimer=0,beatFile=null;
 async function beatLoop(){
  clearTimeout(beatTimer);
  if(model.id!==beatFile){beatFile=model.id;presence.clear();}
  if(model.id&&document.visibilityState==='visible'){try{await presence.beat();followLeader();}catch{/* Offline or access ended: the editing bar already reports it. */}}
  else if(!model.id&&presence.people.length)presence.clear();
  beatTimer=setTimeout(beatLoop,presence.interval());
 }
 beatLoop();addEventListener('pagehide',()=>{if(model.id)presence.leave();});
 setInterval(()=>{if(live.active()&&document.visibilityState==='visible')live.poll();},1000);setInterval(positionCursors,100);
 session.writeHeaders=()=>model.headers();session.equal=(a,b)=>model.id?sameArtwork(a,b):a===b;
 session.beforeWrite=()=>{if(!model.editable())throw Object.assign(new Error(model.issue||'Start editing before saving changes to this file.'),{status:423});};
 const inbox=enabled?installActivityInbox(document.querySelector('.right-panel .inspector-top'),{report:toast}):null;
 const run=async fn=>{if(working)return;working=true;try{await fn();}catch(error){toast(error.message??String(error));}finally{working=false;render();}};
 const button=(text,fn,cls)=>{const b=el('button',cls,text);b.type='button';b.onclick=()=>run(fn);return b;};
 function render(){
  const active=!!model.id;document.getElementById('document-name').readOnly=active&&!model.editable();bar.hidden=!active;share.hidden=!active||!!model.state?.guest;document.body.classList.toggle('team-shared',active);document.body.classList.toggle('team-readonly',active&&!model.editable());
  if(!active){panel.hidden=true;document.body.classList.remove('team-comments-open');return;}
  const s=model.state;label.textContent=model.issue||(!s?'Checking access…':s.editingMode==='live'?(model.editable()?'Editing together':roleNames[s.role]):s.lease?.mine&&model.editable()?'You’re editing':s.lease?`${s.lease.name} is editing`:s.canEdit?'Open for review':roleNames[s.role]);
  actions.replaceChildren();if(live.conflict){label.title=live.conflict.paths.join(', ');actions.append(button('Keep my overlapping edits',()=>live.resolve('local')),button('Keep teammates’ overlapping edits',()=>live.resolve('remote')));}else label.title='';if(s?.canEdit&&s.editingMode!=='live'){if(s.lease?.mine&&model.editable()){actions.append(button('Finish editing',()=>model.action('release')));for(const r of s.requests)actions.append(button('Hand off to '+r.name,()=>model.action('handoff',r.id)));}else if(!s.lease||s.lease.mine)actions.append(button('Start editing',()=>model.action('acquire')));else actions.append(button(s.requested?'Handoff requested':'Request editing',()=>model.action('request')));}
  actions.append(button('Comments',showComments));if(!s?.guest)actions.append(button('Reviews',showReviews));post.disabled=!s?.canComment;textarea.disabled=!s?.canComment;
  if(!panel.hidden){panel.style.top=(bar.offsetTop+bar.offsetHeight)+'px';const d=getDocument(),id=selection()[0],layer=d.shapes.find(s=>s.id===id);anchorLabel.textContent=layer?'On '+layer.name:'On '+(d.pages?.find(p=>p.id===d.active_page)?.name??'this page');}
 }
 const moreComments=button('Load more comments',()=>readComments(true));moreComments.hidden=true;list.after(moreComments);
 async function readComments(more=false){inbox?.refresh();const id=model.id;if(!id)return;const all=more?[...comments]:[];let offset=more?nextCommentsOffset:0,loaded=0;do{const page=await model.call('/comments?offset='+offset);all.push(...page.comments);loaded+=page.comments.length;offset=page.nextOffset;}while(offset!==null&&loaded<2000);if(model.id!==id)return;comments=all;nextCommentsOffset=offset;moreComments.hidden=offset===null;renderThreads();}
 async function showComments(){reviewList.hidden=true;list.hidden=false;filters.hidden=false;form.hidden=false;title.textContent='Comments';panel.hidden=false;document.body.classList.add('team-comments-open');render();await readComments();}
 function renderThreads(){
  list.replaceChildren();const roots=comments.filter(c=>c.id===c.thread_id&&(showResolved||!c.resolved)&&comments.some(r=>r.thread_id===c.id&&(r.body+' '+r.author_name).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())));
  if(!roots.length)list.append(el('p','team-empty',comments.length?'No matching comments.':'Give feedback or ask a question. Select a layer to attach your comment.'));
  for(const root of roots){const thread=el('article','team-thread');for(const c of [root,...comments.filter(c=>c.thread_id===root.id&&c.id!==root.id)]){const h=el('div','team-comment-author',c.author_name),time=el('time',null,new Date(c.created_at).toLocaleString());time.dateTime=new Date(c.created_at).toISOString();h.append(time);thread.append(h,el('p',null,displayMentions(c.body)));}
   if(root.anchor.page)thread.append(button('Show location',()=>{const d=getDocument();if(!d.pages.some(p=>p.id===root.anchor.page))throw new Error('This page has been removed.');select(root.anchor.layer?[root.anchor.layer].filter(id=>d.shapes.some(s=>s.id===id)):[],root.anchor.page);}));
   if(model.state?.canComment){const reply=el('form'),input=el('textarea');input.setAttribute('aria-label','Reply to '+root.author_name);input.placeholder='Reply…';input.maxLength=10000;const draft=replyDrafts.get(root.id)??{id:crypto.randomUUID(),body:''};replyDrafts.set(root.id,draft);input.value=draft.body;input.oninput=()=>draft.body=input.value;const send=el('button',null,'Reply');reply.append(input,send);mentionPicker(input,getMembers);reply.onsubmit=e=>{e.preventDefault();run(async()=>{if(!input.value.trim())return;await model.call('/comments',{method:'POST',body:JSON.stringify({id:draft.id,threadId:root.id,body:input.value})});replyDrafts.delete(root.id);input.value='';await readComments();});};thread.append(reply);if(model.state.canEdit||root.author_id===model.state.userId)thread.append(button(root.resolved?'Reopen thread':'Resolve thread',async()=>{await model.call('/comments',{method:'PATCH',headers:{'if-match':String(root.revision)},body:JSON.stringify({id:root.id,resolved:!root.resolved})});await readComments();}));}
   list.append(thread);
  }
 }
 form.onsubmit=e=>{e.preventDefault();run(async()=>{if(!textarea.value.trim())return;const d=getDocument(),layer=selection()[0];await model.call('/comments',{method:'POST',body:JSON.stringify({id:commentId,body:textarea.value,anchor:{page:d.active_page,...(layer?{layer}:{})}})});commentId=crypto.randomUUID();textarea.value='';await readComments();});};
 const reviewList=el('div','team-threads');reviewList.hidden=true;panel.insertBefore(reviewList,form);
 async function showReviews(){list.hidden=true;filters.hidden=true;form.hidden=true;moreComments.hidden=true;reviewList.hidden=false;title.textContent='Reviews';panel.hidden=false;render();await readReviews();}
 async function readReviews(){
  const data=await model.call('/reviews');reviewList.replaceChildren();
  if(model.state?.canEdit){const requestForm=el('form','team-reviews'),people=el('select'),note=el('textarea');people.setAttribute('aria-label','Reviewer');for(const p of data.members.filter(p=>p.id!==model.state.userId))people.append(new Option(p.name,p.id));note.placeholder='What needs review?';note.setAttribute('aria-label','Review note');note.maxLength=2000;const send=el('button','primary','Request review');send.disabled=!people.options.length;requestForm.append(people,note,send);requestForm.onsubmit=e=>{e.preventDefault();run(async()=>{await session.flush();await model.call('/reviews',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),reviewerId:people.value,documentRevision:session.active.revision,note:note.value})});await readReviews();toast('Review requested');});};reviewList.append(requestForm);}
  if(!data.reviews.length)reviewList.append(el('p','team-empty','No reviews requested. Request a teammate’s approval of a saved version.'));
  for(const review of data.reviews){const row=el('article','team-review'),status=el('p','team-review-status',review.stale?'Artwork changed — review is out of date':review.status.replaceAll('_',' '));status.dataset.stale=String(review.stale);row.append(el('strong',null,review.reviewer),status,el('p',null,review.note),el('small',null,'Version '+review.document_revision+' · requested by '+review.requester));
   const decide=async status=>{await model.call('/reviews',{method:'PATCH',headers:{'if-match':String(review.revision)},body:JSON.stringify({id:review.id,status})});await readReviews();inbox?.refresh();};
   if(review.status==='pending'&&!review.stale&&review.reviewer_id===model.state.userId&&model.state.canComment)row.append(button('Approve',()=>decide('approved')),button('Request changes',()=>decide('changes_requested')));
   if(review.status==='pending'&&model.state.canEdit&&(review.requester_id===model.state.userId||model.state.manage))row.append(button('Cancel review',()=>decide('canceled')));
   reviewList.append(row);
  }
 }
 async function sharing(){
  const state=await model.call('/sharing'),id=model.id,dialog=el('dialog','team-share');dialog.id='team-share';dialog.setAttribute('aria-label','Share file');const header=el('header'),h=el('strong',null,'Share '+getDocument().name),done=button('',()=>dialog.close(),'team-icon');done.innerHTML=icon('close');done.setAttribute('aria-label','Close sharing');header.append(h,button('Copy link',async()=>{await navigator.clipboard.writeText(location.href);toast('File link copied');}),done);const content=el('div','team-share-content');content.append(el('p',null,'Workspace members need to sign in to open this file.'));
  // A link for people outside the workspace: they sign in, then may view this one file.
  const linkBox=el('section','team-link');linkBox.setAttribute('aria-label','Link sharing');content.append(linkBox);
  const drawLink=link=>{
   linkBox.replaceChildren(el('strong',null,'Link sharing'),el('p',null,link.enabled?'Anyone who has this link and signs in can view this file. They cannot edit, comment or see the rest of the workspace.':'Off. Only workspace members can open this file.'));
   const row=el('div','team-link-actions'),change=action=>async()=>{if(model.id!==id)throw new Error('The active file changed.');drawLink(await model.call('/link',{method:'POST',body:JSON.stringify(action)}));};
   if(link.enabled){const field=el('input');field.readOnly=true;field.value=link.url;field.setAttribute('aria-label','Share link');field.onfocus=()=>field.select();linkBox.append(field);row.append(button('Copy share link',async()=>{await navigator.clipboard.writeText(link.url);toast('Share link copied');},'primary'));}
   if(link.manage){if(link.enabled)row.append(button('Replace link',async()=>{if(await confirmDestructive({title:'Replace this link?',message:['The current link stops working and ',{strong:link.guests.length===1?'1 person':link.guests.length+' people'},' who joined through it lose access.'],confirm:'Replace link',tone:'primary'}))await change({action:'replace'})();}),button('Turn off link',async()=>{if(await confirmDestructive({title:'Turn off link sharing?',message:['The link stops working and ',{strong:link.guests.length===1?'1 person':link.guests.length+' people'},' who joined through it lose access.'],confirm:'Turn off link'}))await change({action:'disable'})();}));else row.append(button('Create share link',change({action:'create'}),'primary'));}
   linkBox.append(row);
   if(link.manage&&link.guests.length){linkBox.append(el('strong',null,'Joined by link'));for(const guest of link.guests){const person=el('div','team-person'),name=el('span',null,guest.name);name.append(el('small',null,guest.email));const remove=button('Remove',change({action:'remove',userId:guest.id}));remove.setAttribute('aria-label','Remove '+guest.name);person.append(name,remove);linkBox.append(person);}}
  };
  drawLink(await model.call('/link'));
  const defaults=el('select');defaults.setAttribute('aria-label','Default workspace access');for(const [v,name]of Object.entries(roleNames).filter(([v])=>v!=='owner'))defaults.append(new Option(name,v));defaults.value=state.defaultRole??state.role;defaults.disabled=!state.manage;
  content.append(el('strong',null,'Who has access'));const defaultRow=el('label','team-person');defaultRow.append(el('span',null,'Workspace members'),defaults);if(state.manage)content.append(defaultRow);
  const mode=el('select');mode.setAttribute('aria-label','Editing mode');mode.append(new Option('Hand off editing','handoff'),new Option('Edit together','live'));mode.value=state.editingMode;mode.disabled=!state.manage;const modeRow=el('label','team-person');modeRow.append(el('span',null,'Editing mode'),mode);content.append(modeRow);
  const overrides={...state.overrides};for(const m of state.members??[]){const row=el('label','team-person'),name=el('span',null,m.name),email=el('small',null,m.email);name.append(email);const role=el('select');role.setAttribute('aria-label','Access for '+m.name);for(const [v,label]of Object.entries(roleNames).filter(([v])=>v!=='owner'||m.role==='owner'))role.append(new Option(label,v));role.value=m.role;role.disabled=m.role==='owner'||!state.manage;role.onchange=()=>{overrides[m.id]=role.value;};row.append(name,role);content.append(row);}
  if(!state.manage)content.append(el('p',null,'Your access: '+roleNames[state.role]));
  const footer=el('footer');if(state.manage)footer.append(button('Save access',async()=>{if(model.id!==id)throw new Error('The active file changed.');await session.flush();await model.accept(await model.call('/sharing',{method:'PUT',headers:{'if-match':String(state.revision)},body:JSON.stringify({defaultRole:defaults.value,overrides,editingMode:mode.value})}));dialog.close();toast('File access updated');},'primary'));footer.append(button('Done',()=>dialog.close()));dialog.append(header,content,footer);dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('keydown',e=>e.stopPropagation());document.body.append(dialog);dialog.showModal();
 }
 share.onclick=()=>run(sharing);
 const context=()=>{const id=shared?session.active?.id??null:null;if(id!==commentFile){replyDrafts.clear();comments=[];textarea.value='';commentId=crypto.randomUUID();commentFile=id;}return model.context(id);};
 const tick=()=>{context()?.catch(()=>{});if(model.id)model.sync().then(()=>{if(!panel.hidden&&!panel.contains(document.activeElement))return reviewList.hidden?readComments():readReviews();}).catch(()=>{});};
 setInterval(tick,20_000);window.addEventListener('online',tick);window.addEventListener('focus',tick);window.addEventListener('offline',()=>model.offline());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick();});
 let openedTarget=false;const target=new URLSearchParams(location.search);const originalContext=context;
 const withTarget=async()=>{await originalContext();if(model.id&&!openedTarget){openedTarget=true;if(target.has('review'))await showReviews();else if(target.has('comment'))await showComments();}};
 panel.addEventListener('keydown',e=>e.stopPropagation());render();
 return {record:()=>live.record(),context:withTarget,loading:fn=>{loading++;try{return fn();}finally{loading--;}},guard:(a,b)=>loading?null:model.guard(a,b),editable:()=>model.editable(),active:()=>!!model.id,showComments:()=>run(showComments),selectionChanged:render};
}
