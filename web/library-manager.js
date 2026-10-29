import {icon} from './icons.js';
import {mergeLibrary,libraryForMaster,descendantsOf,importedContentError,protectedInstanceError,sourceEditError} from './library-model.js';
import {projectUrl} from './project-navigation.js';
import {staticHost} from './static-host.js';
const el=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
export async function libraryRequest(path='',options={}){
 const url=new URL('/api/libraries'+path,location.origin);const workspace=new URLSearchParams(location.search).get('workspace');if(workspace)url.searchParams.set('workspace',workspace);
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),...options,headers:{'content-type':'application/json',...options.headers}});let data;try{data=await response.json();}catch{throw new Error('Team libraries require a self-hosted workspace.');}
 if(!response.ok)throw Object.assign(new Error(data.error??'The library request failed.'),{status:response.status});return data;
}
export function createLibraryManager({getDocument,getSession,applyDocument,saveCloud,refresh,toast,selfHosted}){
 let contextId=null,sourceInfo=null,contextPending=null,bypass=0,busy=false,tab='file',catalog=[],failure='',opener;
 const dialog=el('dialog','library-manager');dialog.id='library-manager';dialog.setAttribute('aria-label','Manage libraries');
 const header=el('header','library-manager-header'),heading=el('h2',null,'Manage libraries'),close=el('button','library-icon');close.innerHTML=icon('close');close.setAttribute('aria-label','Close libraries');close.onclick=()=>dialog.close();header.append(heading,close);
 const layout=el('div','library-manager-layout'),nav=el('nav','library-manager-nav');nav.id='library-manager-nav';header.id='library-manager-header';nav.setAttribute('aria-label','Library navigation');
 const search=el('input');search.type='search';search.placeholder='Search all libraries';search.setAttribute('aria-label','Search all libraries');search.oninput=render;nav.append(search);
 const tabs=[];for(const [key,label,glyph] of [['file','This file','book'],['updates','Updates','refresh'],['teams','Teams','users'],['permissions','Permissions','shield']]){if(key==='teams')nav.append(el('p','library-nav-label','Browse libraries'));const b=el('button','library-nav-item');b.innerHTML=icon(glyph);b.append(el('span',null,label));b.onclick=()=>{tab=key;render();};b.dataset.tab=key;tabs.push(b);nav.append(b);}
 const content=el('section','library-manager-content'),status=el('p','library-status');status.setAttribute('role','status');content.id='library-manager-content';layout.append(nav,content);dialog.append(header,layout);document.body.append(dialog);
 dialog.addEventListener('close',()=>opener?.focus());dialog.addEventListener('keydown',event=>event.stopPropagation());
 const button=(label,action,primary=false)=>{const b=el('button',primary?'primary':'library-action',label);b.disabled=busy;b.onclick=()=>run(action);return b;};
 const matches=name=>name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase());
 const sourceLink=(id,workspace,label='Open source')=>{const a=el('a','library-action',label);a.href=projectUrl({kind:'cloud',id,workspace});a.target='_blank';a.rel='noopener';return a;};
 async function run(action){if(busy)return;busy=true;failure='';render();try{await action();}catch(error){failure=error.message;toast(error.message);}finally{busy=false;render();refresh();}}
 async function context(force=false){
  const id=getSession()?.active?.id??null;if(!force&&id===contextId)return contextPending;
  contextId=id;sourceInfo=null;
  if(!selfHosted||!id){contextPending=null;return;}
  contextPending=libraryRequest('/'+id+'/access').then(info=>{if(contextId===id)sourceInfo=info;}).catch(error=>{if(contextId===id)sourceInfo={error:error.message};}).finally(()=>{if(contextId===id){contextPending=null;refresh();}});
  return contextPending;
 }
 async function reload(){await context(true);catalog=(await libraryRequest()).libraries;}
 async function publish(){
  const session=getSession();await session.flush();const id=session.active.id;
  const saved=await libraryRequest('/'+id,{method:'PUT',headers:{'if-match':String(session.active.revision)},body:'{}'});
  if(session.active?.id===id){session.active.revision=saved.sourceRevision;session.remember();session.changed();}
  await reload();toast('Library release '+saved.revision+' published');
 }
 async function add(item){
  const release=await libraryRequest('/'+item.id);const next=mergeLibrary(getDocument(),release);
  bypass++;try{applyDocument(next);}finally{bypass--;}
  refresh();await getSession()?.flush();toast('Library added · instances are protected');
 }
 function row(item,actions){const row=el('article','library-list-row'),thumb=el('div','library-thumbnail');thumb.innerHTML=icon('component');const copy=el('div','library-row-copy');copy.append(el('strong',null,item.name),el('small',null,item.subtitle??('Release '+item.revision+' · Protected components')));row.append(thumb,copy,...actions);return row;}
 function message(text){content.append(el('p','library-empty',text));}
 function render(){
  tabs.forEach(b=>{b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');b.disabled=busy;});content.replaceChildren();status.textContent=failure;if(failure)content.append(status);
  if(!selfHosted){message('Team libraries are available on self-hosted installations with accounts.');if(!staticHost){const a=el('a','library-action','Set up a workspace');a.href='/editor/setup.html';content.append(a);}return;}
  const doc=getDocument(),session=getSession(),links=doc.libraries??[],active=links.filter(l=>l.enabled!==false),current=catalog.find(l=>l.id===session?.active?.id);
  if(tab==='file'){
   content.append(el('h3',null,'Assets created in this file'));
   const action=session?.active?button(current?'Publish updates…':'Publish…',publish,true):button('Save to workspace…',async()=>{await saveCloud();await reload();});
   if(session?.active&&(!sourceInfo||sourceInfo.error||!sourceInfo.access?.editAll||(!sourceInfo.published&&!sourceInfo.access.manage)))action.disabled=true;
   content.append(row({name:doc.name,subtitle:session?.active?(current?'Published · source edits require permission':'Not published'):'Local project · save to publish'},[action]));
   content.append(el('h3',null,'Libraries added to this file'));
   if(!active.length)message('Add a design-system library from Teams to use its protected components.');
   for(const link of active.filter(l=>matches(l.name)))content.append(row(link,[button('Remove',async()=>{const next=structuredClone(getDocument());next.libraries.find(l=>l.id===link.id).enabled=false;applyDocument(next);await getSession()?.flush();toast('Library removed from Assets. Placed instances remain linked and protected.');})]));
  }else if(tab==='teams'){
   content.append(el('h3',null,'Workspace libraries'));
   const available=catalog.filter(l=>l.id!==session?.active?.id&&matches(l.name));
   if(!available.length)message('No published libraries here yet. Open a design-system project in this workspace and publish it from This file.');
   for(const item of available){const linked=active.find(l=>l.id===item.id),b=button(linked?'Added':'Add to file',()=>add(item),!linked);b.disabled=busy||!!linked;content.append(row(item,[b]));}
  }else if(tab==='updates'){
   content.append(el('h3',null,'Library updates'));const updates=catalog.filter(l=>active.some(a=>a.id===l.id&&a.revision<l.revision)&&matches(l.name));
   if(!updates.length)message('Your added libraries are up to date. Published releases appear here when you refresh.');
   for(const item of updates){const link=active.find(l=>l.id===item.id);content.append(row({...item,subtitle:'Release '+link.revision+' → '+item.revision+' · replaces protected component definitions'},[sourceLink(item.id,item.workspace,'Review source'),button('Update',()=>add(item),true)]));}
  }else renderPermissions(doc,session);
  content.append(button('Refresh libraries',reload));
 }
 function renderPermissions(doc,session){
  content.append(el('h3',null,'Source permissions'));
  if(!session?.active||!sourceInfo?.published){message('Publish this project as a library to assign maintainers.');return;}
  if(!sourceInfo.access.manage){message(sourceInfo.access.editAll?'You can maintain and publish this library. Workspace owners and administrators manage permissions.':sourceInfo.access.components.length?'You can edit assigned components. A library maintainer publishes releases.':'You can use this library. Its source and instance properties are protected.');return;}
  message('Workspace members can use published components. Only maintainers can edit the source; instance properties remain protected. Owners and administrators retain full access.');
  const policy=structuredClone(sourceInfo.policy),members=sourceInfo.members,form=el('form','library-permissions-form');
  const group=(title,key)=>{
   const section=el('section','library-permission-group');section.append(el('h4',null,title));const list=el('div','library-maintainers'),picker=el('select');picker.setAttribute('aria-label','Add maintainer for '+title);
   const values=()=>key?policy.components[key]??[]:policy.maintainers;
   const set=ids=>{if(key)policy.components[key]=ids;else policy.maintainers=ids;};
   const draw=()=>{list.replaceChildren();for(const id of values()){const member=members.find(m=>m.id===id);const chip=el('span','library-member',member?.name??'Former member'),remove=el('button','library-icon');remove.type='button';remove.innerHTML=icon('close');remove.setAttribute('aria-label','Remove '+(member?.name??'former member')+' from '+title);remove.onclick=()=>{set(values().filter(v=>v!==id));draw();};chip.append(remove);list.append(chip);}picker.replaceChildren();const placeholder=el('option',null,'Add maintainer…');placeholder.value='';picker.append(placeholder);for(const member of members.filter(m=>!values().includes(m.id))){const option=el('option',null,member.name+' · '+member.email);option.value=member.id;picker.append(option);}};
   picker.onchange=()=>{if(picker.value){set([...values(),picker.value]);draw();}};draw();section.append(list,picker);form.append(section);
  };
  group('Entire library',null);for(const s of doc.shapes.filter(s=>s.component?.type==='master'&&!libraryForMaster(doc,s.id)))group(s.name,String(s.id));
  const submit=el('button','primary','Save permissions');submit.type='submit';submit.disabled=busy;form.append(submit);
  form.onsubmit=event=>{event.preventDefault();run(async()=>{await session.flush();const id=session.active.id;const saved=await libraryRequest('/'+id,{method:'PATCH',headers:{'if-match':String(session.active.revision)},body:JSON.stringify(policy)});if(session.active?.id===id){session.active.revision=saved.sourceRevision;session.remember();}await reload();toast('Library permissions saved');});};content.append(form);
 }
 return {
  context,
  locked(shapes){if(!sourceInfo?.published||sourceInfo.access.editAll)return false;const allowed=descendantsOf(getDocument().shapes,sourceInfo.access.components);return shapes.some(s=>!allowed.has(s.id));},
  guard(before,after,history=false){if(bypass)return null;if(selfHosted&&getSession()?.active&&(!sourceInfo||sourceInfo.error))return sourceInfo?.error??'Checking library permissions. Try again in a moment.';return sourceEditError(before,after,sourceInfo?.published?sourceInfo.access:null)||(!history&&importedContentError(before,after))||protectedInstanceError(before,after);},
  loading(action){bypass++;try{return action();}finally{bypass--;sourceInfo=null;contextId=null;}},
  source(id){const link=libraryForMaster(getDocument(),id);if(!link)return false;window.open(projectUrl({kind:'cloud',id:link.id,workspace:link.workspace}),'_blank','noopener');return true;},
  async open(initial='file'){tab=initial;opener=document.activeElement;failure='';dialog.showModal();search.focus();busy=true;render();try{if(selfHosted)await reload();}catch(error){failure=error.message;}finally{busy=false;render();}},
 };
}
