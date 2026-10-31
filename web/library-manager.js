import {showContextMenu} from './context-menu.js';
import {previewRelease,releaseDialog} from './library-release-ui.js';
import {LocalDrafts} from './local-drafts.js';
import {icon} from './icons.js';
import {mergeLibrary,libraryForMaster,descendantsOf,importedContentError,protectedInstanceError,sourceEditError} from './library-model.js';
import {projectUrl} from './project-navigation.js';
import {LocalLibraries,libraryPackage,parseLibraryPackage} from './local-libraries.js';
import {librarySnapshot} from './library-model.js';
import {readDesignFile} from './design-import.js';
import {componentAssets,assetAppearance} from './assets.js';
import {libraryCatalog} from './library-catalog.js';
import {paintPreview} from './paint-preview.js';
const el=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
export async function libraryRequest(path='',options={}){
 const url=new URL('/api/libraries'+path,location.origin);const workspace=new URLSearchParams(location.search).get('workspace');if(workspace)url.searchParams.set('workspace',workspace);
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),...options,headers:{'content-type':'application/json',...options.headers}});let data;try{data=await response.json();}catch{throw new Error('Team libraries require a self-hosted workspace.');}
 if(!response.ok)throw Object.assign(new Error(data.error??'The library request failed.'),{status:response.status});return data;
}
export function createLibraryManager({getDocument,getSession,applyDocument,refresh,toast,selfHosted,getProject,saveProject,normalizeDocument,textLayout}){
 let contextId=null,sourceInfo=null,contextPending=null,bypass=0,busy=false,tab='file',catalog=[],failure='',opener,detail=null;
 const local=new LocalLibraries(),same=(a,b)=>a.id===b?.id&&a.workspace===b?.workspace;
 const projectKey=()=>JSON.stringify(getProject());
 const downloadable=release=>{const blob=new Blob([libraryPackage(release)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=release.name.replace(/[^\p{L}\p{N} ._-]/gu,'-')+'.pixllib';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const dialog=el('dialog','library-manager');dialog.id='library-manager';dialog.setAttribute('aria-label','Manage libraries');
 const header=el('header','library-manager-header'),heading=el('h2',null,'Manage libraries'),close=el('button','library-icon');close.innerHTML=icon('close');close.setAttribute('aria-label','Close libraries');close.onclick=()=>dialog.close();header.append(heading,close);
 const layout=el('div','library-manager-layout'),nav=el('nav','library-manager-nav');nav.id='library-manager-nav';header.id='library-manager-header';nav.setAttribute('aria-label','Library navigation');
 const search=el('input');search.type='search';search.placeholder='Search all libraries';search.setAttribute('aria-label','Search all libraries');search.oninput=render;nav.append(search);
 const tabs=[];for(const [key,label,glyph] of [['file','This file','book'],['updates','Updates','refresh'],...(selfHosted?[['teams','Teams','users']]:[]),['local','On this device','book'],...(selfHosted?[['permissions','Permissions','shield']]:[])]){if(key===(selfHosted?'teams':'local'))nav.append(el('p','library-nav-label','Browse libraries'));const b=el('button','library-nav-item');b.innerHTML=icon(glyph);b.append(el('span',null,label));b.onclick=()=>{tab=key;detail=null;render();};b.dataset.tab=key;tabs.push(b);nav.append(b);}
 const importFile=el('input');importFile.type='file';importFile.hidden=true;importFile.id='library-import-file';importFile.accept='.pixllib,.pixl,.fig,.json';nav.append(importFile);
 const importButton=el('button','library-action library-import','Import library…');importButton.onclick=()=>importFile.click();nav.append(importButton);
 importFile.onchange=()=>{const file=importFile.files[0];importFile.value='';if(file)run(()=>importLibrary(file));};
 const content=el('section','library-manager-content'),status=el('p','library-status');status.setAttribute('role','status');content.id='library-manager-content';layout.append(nav,content);dialog.append(header,layout);document.body.append(dialog);
 dialog.addEventListener('close',()=>opener?.focus());dialog.addEventListener('keydown',event=>event.stopPropagation());
 const button=(label,action,primary=false)=>{const b=el('button',primary?'primary':'library-action',label);b.disabled=busy;b.onclick=()=>run(action);return b;};
 const matches=name=>name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase());
 async function run(action){if(busy)return;busy=true;failure='';render();try{await action();}catch(error){failure=error?.message??String(error);toast(failure);}finally{busy=false;render();refresh();}}
 async function context(force=false){
  const id=getSession()?.active?.id??null;if(!force&&id===contextId)return contextPending;
  contextId=id;sourceInfo=null;
  if(!selfHosted||!id){contextPending=null;return;}
  contextPending=libraryRequest('/'+id+'/access').then(info=>{if(contextId===id)sourceInfo=info;}).catch(error=>{if(contextId===id)sourceInfo={error:error.message};}).finally(()=>{if(contextId===id){contextPending=null;refresh();}});
  return contextPending;
 }
 async function reload(){await context(true);catalog=(await local.list()).map(r=>({...r,device:true}));if(selfHosted){try{catalog.push(...(await libraryRequest()).libraries);}catch(error){failure=error.message;}}}
 async function importLibrary(file){
  const target=projectKey();let release;
  if(/\.pixllib$/i.test(file.name))release=parseLibraryPackage(await file.text());
  else{const {body}=await readDesignFile(file,{library:true});const source=normalizeDocument(JSON.parse(body));release={id:'import:'+crypto.randomUUID(),workspace:'local',name:source.name,revision:1,body:librarySnapshot(source)};}
  normalizeDocument(release.body);
  if(projectKey()!==target)throw new Error('The open project changed. Import the library again.');
  if(getSession()?.active){
   const remote=(await libraryRequest()).libraries.find(item=>same(item,release));
   if(!remote)throw new Error('Publish this library in the current workspace before adding it to a workspace project. Local projects can import this file directly.');
   await add(remote);detail=null;tab='file';return;
  }
  await local.import(release);await reload();detail=catalog.find(item=>same(item,release));tab='local';
 }
 async function releaseFor(item,revision=null){return item.device?local.get(item,revision):libraryRequest('/'+item.id+(revision?'?revision='+revision:''));}
 async function publish(assertCurrent=()=>{},options={}){
  const session=getSession(),target=projectKey(),check=()=>{if(target!==projectKey())throw new Error('The open project changed. Publish the library again.');assertCurrent();};
  if(!session?.active){await saveProject();check();const release=await local.publish(getProject()?.id,getDocument(),options);await reload();toast('Library release '+release.revision+' published on this device');return;}
  await session.flush();check();const id=session.active.id;
  const saved=await libraryRequest('/'+id,{method:'PUT',headers:{...session.writeHeaders(),'if-match':String(session.active.revision)},body:JSON.stringify(options)});
  if(session.active?.id===id){session.active.revision=saved.sourceRevision;session.remember();session.changed();}
  await reload();toast('Library release '+saved.revision+' published');
 }
 async function add(item,assertCurrent=()=>{}){
  const target=projectKey(),release=item.historical?item:await releaseFor(item);if(projectKey()!==target)throw new Error('The open project changed. Add the library again.');
  assertCurrent();
  if(item.device?item.source_project===getProject()?.id:item.id===getSession()?.active?.id)throw new Error('This file already contains the library source. Add it to a different project.');
  if(item.device&&getSession()?.active)throw new Error('Publish this library in the current workspace before adding it to a workspace project.');
  const existing=getDocument().libraries?.find(l=>same(l,item));if(existing?.pinned&&existing.revision!==release.revision)throw new Error('Unpin this library before changing its release.');if(item.retired&&!existing)throw new Error('This library is retired.');
  const next=mergeLibrary(getDocument(),release);
  bypass++;try{applyDocument(next);}finally{bypass--;}
  refresh();await saveProject();toast('Library added to this file');
 }
 async function publishPreview(item){
  const source=librarySnapshot(getDocument()),previous=item?(await releaseFor(item)).body:null,target=projectKey();
  previewRelease({previous,next:source,title:'Publish library',accept:'Publish',editNotes:true,onAccept:async notes=>{if(projectKey()!==target)throw new Error('The open project changed.');await publish(()=>{}, {notes});render();refresh();}});
 }
 async function updatePreview(item,revision=null){
  const link=getDocument().libraries?.find(l=>same(l,item)),next=await releaseFor(item,revision),target=projectKey();let previous=null;if(link)try{previous=(await releaseFor(item,link.revision)).body;}catch{throw new Error('The installed release is not in this device’s archive. Import that release first to compare changes.');}
  previewRelease({previous,next:next.body,title:'Review changes',notes:next.notes,accept:'Apply release '+next.revision,onAccept:async()=>{if(projectKey()!==target)throw new Error('The open project changed.');await add({...item,...next,revision:next.revision,historical:true});await reload();render();refresh();}});
 }
 async function releases(item,source){
  const entries=item.device?await local.history(item):(await libraryRequest('/'+item.id+'/releases')).releases,ui=releaseDialog('Library releases');
  for(const release of entries){const line=el('article','library-release-row');line.append(el('strong',null,'Release '+release.revision),el('p',null,release.notes||'No release notes.'));line.append(button(source?'Publish rollback to '+release.revision:'Review release '+release.revision,async()=>{ui.dialog.close();if(source){const old=await releaseFor(item,release.revision);previewRelease({previous:(await releaseFor(item)).body,next:old.body,title:'Publish rollback',accept:'Publish rollback',editNotes:true,notes:'Restore release '+release.revision+'. Source artwork is unchanged.',onAccept:async notes=>{await publish(()=>{}, {notes,rollbackRevision:release.revision});render();refresh();}});}else await updatePreview(item,release.revision);}));ui.body.append(line);}
 }
 async function retire(item){const ui=releaseDialog(item.retired?'Restore library':'Retire library');ui.body.append(el('p',null,item.retired?'Make this library available to new projects again.':'Hide this library from discovery. Existing projects retain their linked components and releases.'));ui.footer.append(button(item.retired?'Restore library':'Retire library',async()=>{if(item.device)await local.retire(item,!item.retired);else{const session=getSession();await session.flush();const saved=await libraryRequest('/'+item.id+'/lifecycle',{method:'PATCH',headers:{...session.writeHeaders(),'if-match':String(session.active.revision)},body:JSON.stringify({retired:!item.retired})});session.active.revision=saved.sourceRevision;session.remember();}ui.dialog.close();await reload();}));}
 async function usage(item){const ui=releaseDialog('Projects using '+item.name);let rows=[];if(item.device){rows=new LocalDrafts(localStorage).list().flatMap(f=>{const link=JSON.parse(f.body).libraries?.find(l=>same(l,item));return link?[{...f,revision:link.revision,pinned:link.pinned}]:[];});}else{let offset=0;do{const data=await libraryRequest('/'+item.id+'/usage?offset='+offset);rows.push(...data.projects);offset=data.nextOffset;}while(offset!==null);}
  if(!rows.length)ui.body.append(el('p',null,'No accessible projects currently use this library.'));for(const row of rows){const a=el('a','library-release-row',row.name+' · Release '+row.revision+(row.pinned?' · Pinned':''));a.href=projectUrl({kind:item.device?'local':'cloud',id:row.id,workspace:item.workspace});a.target='_blank';a.rel='noopener';ui.body.append(a);}
 }
 function row(item,actions){const row=el('article','library-list-row'),thumb=el('div','library-thumbnail');thumb.innerHTML=icon('component');const copy=el('div','library-row-copy');copy.append(el('strong',null,item.name),el('small',null,item.subtitle??('Release '+item.revision+' · Protected components')));row.append(thumb,copy);if(actions.length>2){const primary=actions.findLast(a=>a.classList.contains('primary'))??actions[0],more=el('button','library-action','More');more.setAttribute('aria-label','More actions for '+item.name);more.onclick=event=>{showContextMenu(event,actions.filter(a=>a!==primary).map(a=>({label:a.textContent,enabled:!a.disabled,run:()=>a.click()})),more,{container:dialog,anchor:more,label:'Library actions'});};row.append(primary,more);}else row.append(...actions);return row;}
 function message(text){content.append(el('p','library-empty',text));}
 function render(){
  tabs.forEach(b=>{b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');b.disabled=busy;});content.replaceChildren();status.textContent=failure;if(failure)content.append(status);
  const doc=getDocument(),session=getSession(),links=doc.libraries??[],active=links.filter(l=>l.enabled!==false),current=catalog.find(l=>session?.active?l.id===session.active.id&&!l.device:l.source_project===getProject()?.id);
  importButton.disabled=busy;if(detail){renderDetail(detail,active);return;}
  if(tab==='file'){
   content.append(el('h3',null,'Assets created in this file'));
   const action=button(current?'Publish updates…':'Publish…',()=>publishPreview(current),true);
   if(session?.active&&(!sourceInfo||sourceInfo.error||!sourceInfo.access?.editAll||(!sourceInfo.published&&!sourceInfo.access.manage)))action.disabled=true;
   content.append(row({name:doc.name,subtitle:current?'Published · Release '+current.revision:session?.active?'Not published':'Local project · publish on this device'},[...(current?[button('Export library…',async()=>downloadable(await releaseFor(current))),button('Releases',()=>releases(current,true)),button('Used in projects',()=>usage(current)),button(current.retired?'Restore library':'Retire library',()=>retire(current))]:[]),action]));
   content.append(el('h3',null,'Libraries added to this file'));
   if(!active.length)message('Add a library to use its components, styles and variables in this file.');
   content.append(button('Add more libraries',()=>{tab=selfHosted?'teams':'local';detail=null;},true));
   for(const link of active.filter(l=>matches(l.name)))content.append(row({...link,subtitle:'Release '+link.revision+(link.pinned?' · Pinned':'')},[button(link.pinned?'Unpin':'Pin release',async()=>{const next=structuredClone(getDocument());next.libraries.find(l=>same(l,link)).pinned=!link.pinned;applyDocument(next);await saveProject();}),button('Releases',()=>releases(catalog.find(i=>same(i,link))??link,false)),button('Remove',async()=>{const next=structuredClone(getDocument());next.libraries.find(l=>same(l,link)).enabled=false;applyDocument(next);await saveProject();toast('Library removed from Assets. Placed instances remain linked and protected.');})]));
  }else if(tab==='teams'||tab==='local'){
   content.append(el('h3',null,tab==='teams'?'Workspace libraries':'Published on this device'));
   const available=catalog.filter(l=>(tab==='local'?l.device:!l.device)&&l!==current&&!l.retired&&matches(l.name));
   if(!available.length)message('No published libraries here yet. Publish a design-system project from This file, or import a library file.');
   for(const item of available){const linked=active.find(l=>same(l,item)),b=button(linked?'Added':'View library',async()=>{detail={...item,...await releaseFor(item)};});content.append(row({...item,subtitle:'Release '+item.revision+(linked?' · Added to this file':'')},[b]));}
  }else if(tab==='updates'){
   content.append(el('h3',null,'Library updates'));const updates=catalog.filter(l=>active.some(a=>same(a,l)&&a.revision<l.revision)&&matches(l.name));
   if(!updates.length)message('Your added libraries are up to date. Published releases appear here when you refresh.');
   for(const item of updates){const link=active.find(l=>same(l,item));content.append(row({...item,subtitle:'Release '+link.revision+' → '+item.revision+' · replaces protected component definitions'},[button(link.pinned?'Pinned · review changes':'Review changes',()=>updatePreview(item)),...link.pinned?[]:[button('Update',()=>updatePreview(item),true)]]));}
  }else renderPermissions(doc,session);
  content.append(button('Refresh libraries',reload));
 }
 function renderDetail(item,active){
  const top=el('header','library-detail-heading'),back=button('Back',()=>{detail=null;}),copy=el('div','library-row-copy'),linked=active.some(l=>same(l,item));
  copy.append(el('strong',null,item.name),el('small',null,'Release '+item.revision));
  const addButton=button(linked?'Added':'Add to file',()=>add(item),true);addButton.disabled=busy||linked;addButton.setAttribute('aria-label',(linked?'Added ':'Add ')+item.name+(linked?'':' to file'));top.append(back,copy,addButton);content.append(top);
  const source=typeof item.body==='string'?JSON.parse(item.body):item.body;if(!source){message('Open this library to preview its contents.');return;}
  const styles=['text_styles','color_styles','effect_styles','guide_styles'].flatMap(key=>(source[key]??[]).map(s=>({...s,type:key.split('_')[0]})));
  if(styles.length){content.append(el('h3',null,'Styles'));const list=el('ul','library-style-list');for(const style of styles){const row=el('li'),sample=el('span','page-style-sample '+style.type,style.type==='text'?'Ag':'');if(style.type==='color')sample.style.background=paintPreview(style,source,16,16,textLayout);else if(style.type==='guide')sample.innerHTML=icon('grid');row.append(sample,el('span',null,style.name));list.append(row);}content.append(list);}
  const assets=componentAssets(source);if(assets.length){content.append(el('h3',null,'Components'));const grid=el('div','library-preview-grid');for(const asset of assets){
   const card=el('div','library-preview-card'),preview=el('div','library-component-preview');preview.inert=true;
   try{const result=assetAppearance(source,asset.variants[0].id,textLayout),shadow=preview.attachShadow({mode:'open'}),style=el('style'),scene=el('div'),scale=Math.min(56/result.width,56/result.height,1);
    style.textContent=result.css+'\n:host{display:block;position:relative;pointer-events:none;overflow:hidden}';scene.className='px-scene';scene.innerHTML=result.html;scene.style.cssText='position:absolute;left:0;top:0;width:'+result.width+'px;height:'+result.height+'px;transform:translate('+(64-result.width*scale)/2+'px,'+(64-result.height*scale)/2+'px) scale('+scale+');transform-origin:0 0;';shadow.append(style,scene);
   }catch{preview.innerHTML=icon('component');}
   card.append(preview,el('span',null,asset.name));grid.append(card);
  }content.append(grid);}
  if(source.variables?.values?.length)content.append(el('p','library-empty',source.variables.values.length+' variables'));
  content.append(button('Export library…',()=>downloadable(item)));
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
  form.onsubmit=event=>{event.preventDefault();run(async()=>{await session.flush();const id=session.active.id;const saved=await libraryRequest('/'+id,{method:'PATCH',headers:{...session.writeHeaders(),'if-match':String(session.active.revision)},body:JSON.stringify(policy)});if(session.active?.id===id){session.active.revision=saved.sourceRevision;session.remember();}await reload();toast('Library permissions saved');});};content.append(form);
 }
 return {
  context,
  needsGuard(doc){return !!doc?.libraries?.length||!!(selfHosted&&getSession()?.active);},
  async request(args,assertCurrent=()=>{}){
   if(busy)throw new Error('A library operation is already running. Try again when it finishes.');
   const target=projectKey(),check=()=>{if(target!==projectKey())throw new Error('The open project changed. Read the new project before editing its libraries.');assertCurrent();};
   busy=true;failure='';try{
    await reload();const action=args.action??'list';
    if(action!=='list')check();
    if(action==='publish')await publish(check);
    else if(['add','update','remove'].includes(action)){
     const item=catalog.find(l=>l.id===args.id&&l.workspace===args.workspace),link=getDocument().libraries?.find(l=>l.id===args.id&&l.workspace===args.workspace);
     if(action==='remove'){if(!link)throw new Error('This library is not linked to the project.');const next=structuredClone(getDocument());next.libraries.find(l=>same(l,link)).enabled=false;applyDocument(next);await saveProject();}
     else{if(!item)throw new Error('This published library is unavailable. List libraries first.');if(action==='update'&&!link)throw new Error('Add this library before updating it.');await add(item,check);}
    }else if(action!=='list')throw new Error('Unknown library action.');
    return libraryCatalog(getDocument(),catalog,getProject(),getSession(),args);
   }finally{busy=false;if(dialog.open)render();refresh();}
  },
  locked(shapes){if(!sourceInfo?.published||sourceInfo.access.editAll)return false;const allowed=descendantsOf(getDocument().shapes,sourceInfo.access.components);return shapes.some(s=>!allowed.has(s.id));},
  guard(before,after,history=false){if(bypass)return null;if(selfHosted&&getSession()?.active&&(!sourceInfo||sourceInfo.error))return sourceInfo?.error??'Checking library permissions. Try again in a moment.';return sourceEditError(before,after,sourceInfo?.published?sourceInfo.access:null)||(!history&&importedContentError(before,after))||protectedInstanceError(before,after);},
  remote(action){bypass++;try{return action();}finally{bypass--;}},
  loading(action){bypass++;try{return action();}finally{bypass--;sourceInfo=null;contextId=null;}},
  source(id){const link=libraryForMaster(getDocument(),id);if(!link)return false;if(link.workspace==='local'){local.get(link).then(item=>{if(item.source_project)window.open(projectUrl({kind:'local',id:item.source_project}),'_blank','noopener');else toast('This library was imported from a file. Open its original source project to edit it.');}).catch(error=>toast(error.message));return true;}window.open(projectUrl({kind:'cloud',id:link.id,workspace:link.workspace}),'_blank','noopener');return true;},
  async open(initial='file'){tab=initial==='browse'?(selfHosted?'teams':'local'):initial;detail=null;opener=document.activeElement;failure='';dialog.showModal();search.focus();busy=true;render();try{await reload();}catch(error){failure=error.message;}finally{busy=false;render();}},
 };
}
