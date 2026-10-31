import {teamOnboarding} from './team-onboarding.js';
import {installActivityInbox} from './team-activity.js';
import {installDesktop} from './desktop-integration.js';
import {staticHost} from './static-host.js';
import {readDesignFile} from './design-import.js';
import {icon} from './icons.js';
import {showContextMenu} from './context-menu.js';
import {LocalDrafts,DRAFTS_KEY,withDraftLock} from './local-drafts.js';
import {installDesignCreator} from './design-browser.js';
import {projectUrl,visibleProjects} from './project-navigation.js';
import {installInspectorDropdowns} from './inspector-dropdown.js';
import {projectPreview} from './project-preview.js';
import {api} from './account-ui.js';
import {cloudRequest} from './cloud-session.js';
import init,{Editor} from './pkg/pixlprfct_core.js';
import {migrateChromeDocument} from './frame-tools.js';
import {ensureBaseTextDocument} from './base-text.js';
import {isSvgAnimation} from './svg-animation-model.js';
import {normalizeSvgAnimation} from './svg-animation-svg.js';

export function mountProjectHome(root,{onReady=()=>{},onError=()=>{}}={}){
let disposed=false,closeDesktop=()=>{},activity=null;
root.innerHTML=`<aside class="home-sidebar" aria-label="Workspace navigation">
 <a class="home-brand" href="/"><img class="home-mark" src="/editor/favicon.svg?v=mono" width="34" height="34" alt=""><span>PixlPrfct<small>Design workspace</small></span></a>
 <label class="home-workspace" id="home-workspace-label" hidden>Workspace<select id="home-workspace" aria-label="Workspace"></select></label><span class="home-nav-label">Projects</span>
 <nav aria-label="Project collections"><button data-scope="all" aria-current="page">${icon('layout-grid')}All projects</button><button data-scope="local">${icon('monitor')}On this device</button><button data-scope="cloud">${icon('cloud')}Cloud projects</button><button data-scope="trash">${icon('trash')}Trash</button><a id="home-admin" href="/editor/admin.html">${icon('shield-check')}Admin</a></nav>
 <div class="home-account-links"><a href="/editor/account.html" id="home-account">Account & teams</a><a href="/editor/setup.html">Host your workspace</a></div><div class="home-sidebar-note">A place for your next idea.<span>Create a project, then make it yours.</span></div>
</aside>
<main class="home-main">
 <header class="home-header"><div><h1 id="home-title">All projects</h1><p id="home-description">Create a design or pick up where you left off.</p></div><div class="home-actions"><button id="home-import" title="Import a PixlPrfct (.pixl) or Figma (.fig) design">${icon('download')}Import design</button><button id="home-new" class="primary">${icon('plus')}New design</button></div></header>
 <div class="home-toolbar"><label class="home-search">${icon('search')}<input id="project-search" type="search" placeholder="Search projects" aria-label="Search projects"></label><div class="home-view-controls"><label class="home-sort">Sort by<select id="project-sort" aria-label="Sort projects"><option value="edited">Last edited</option><option value="name">Name</option></select></label><div class="home-view-toggle" role="group" aria-label="Project view"><button id="project-grid" class="icon-button" aria-label="Grid view" aria-pressed="true">${icon('layout-grid')}</button><button id="project-list" class="icon-button" aria-label="List view" aria-pressed="false">${icon('list-bulleted')}</button></div></div></div>
 <p id="home-status" class="home-notice" role="status" hidden></p>
 <p id="home-error" class="home-notice" role="alert" hidden></p>
 <div id="cloud-notice" class="home-notice" hidden><span id="cloud-message" role="status"></span><button id="cloud-retry">Try again</button><a id="cloud-signin" href="/signin-with-chatgpt?return_to=%2F" hidden>Sign in with ChatGPT</a></div>
 <div class="home-collection-heading"><h2 id="collection-title">Your designs</h2><span id="project-count" role="status"></span></div>
 <div id="project-cards" class="project-grid" aria-label="Projects"></div><button id="home-more" hidden>Load more cloud projects</button>
 <p class="home-storage-note">Projects on this device are saved in this browser. Download a copy from the editor to keep a backup.</p>
 <input id="project-import-file" type="file" accept=".pixl,.json,.fig" hidden>
</main>`;
const $=id=>document.getElementById(id),el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
let storage,tabStorage;try{storage=localStorage;}catch{}try{tabStorage=sessionStorage;}catch{}
const drafts=new LocalDrafts(storage,tabStorage),measure=document.createElement('canvas').getContext('2d'),previews=new Map();
let workspace=new URLSearchParams(location.search).get('workspace')??'personal',selfHosted=false;
let scope='all',view='grid',cloud=[],cloudError=null,cloudLoading=false,next=null,engineReady,cloudRequestId=0,closeProjectMenu=()=>{},changingProject=false;
const report=error=>{if(disposed)return;$('home-error').textContent=error.message??String(error);$('home-error').hidden=false;};
async function normalize(body){
 const document=JSON.parse(body);if(isSvgAnimation(document))return JSON.stringify(normalizeSvgAnimation(document).document);
 await (engineReady??=init({module_or_path:'/editor/pkg/pixlprfct_core_bg.wasm'}).catch(error=>{engineReady=null;throw error;}));const editor=new Editor();
 try{editor.load(JSON.stringify(migrateChromeDocument(JSON.parse(body))));const base=ensureBaseTextDocument(JSON.parse(editor.snapshot()));if(base)editor.load(JSON.stringify(base));return editor.snapshot();}finally{editor.free();}
}
const syncDropdowns=installInspectorDropdowns(root);
const creator=installDesignCreator({saveLocation:()=>selfHosted&&workspace!=='personal'?'Saved to this shared workspace':'Saved in your projects on this device',create:async body=>{const normalized=await normalize(body);const file=selfHosted&&workspace!=='personal'?await cloudRequest('',{method:'POST',body:normalized}):await withDraftLock(()=>drafts.create(normalized));location.assign(projectUrl({kind:selfHosted&&workspace!=='personal'?'cloud':'local',id:file.id,workspace,body:normalized}));}});
root.ondragover=event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();};
root.ondrop=event=>{event.preventDefault();const file=event.dataTransfer.files[0];if(file)importDesign(file).catch(error=>{if(error.name!=='AbortError')report(error);});};
$('home-new').onclick=()=>creator.showNew();$('home-import').onclick=()=>$('project-import-file').click();
async function importDesign(file){
 const {body}=await readDesignFile(file),normalized=await normalize(body),shared=selfHosted&&workspace!=='personal';
 const saved=shared?await cloudRequest('',{method:'POST',body:normalized}):await withDraftLock(()=>drafts.create(normalized));
 location.assign(projectUrl({kind:shared?'cloud':'local',id:saved.id,workspace,body:normalized}));
}
$('project-import-file').onchange=async()=>{
 const file=$('project-import-file').files[0];if(!file)return;$('home-import').disabled=true;
 try{await importDesign(file);}
 catch(error){if(error.name!=='AbortError')report(error);}finally{$('project-import-file').value='';$('home-import').disabled=false;}
};
function localProjects(){try{return drafts.list({trash:scope==='trash'}).map(file=>({...file,kind:'local',can_delete:true}));}catch(error){report(error);return [];}}
function render(){
 if(disposed)return;
 closeProjectMenu();
 const projects=visibleProjects([...(workspace==='personal'?localProjects():[]),...cloud],{scope:scope==='trash'?'all':scope,query:$('project-search').value,sort:$('project-sort').value}),cards=$('project-cards');cards.replaceChildren();cards.className='project-'+view;
 $('project-count').textContent=projects.length+' project'+(projects.length===1?'':'s');
 $('cloud-notice').hidden=!['cloud','trash'].includes(scope)||(!cloudError&&!cloudLoading);
 $('cloud-message').textContent=cloudLoading?'Loading cloud projects…':cloudError?.status===401?'Sign in to see your cloud projects.':cloudError?'Cloud projects could not be loaded. Your projects on this device are available.':'';
 $('cloud-retry').hidden=cloudLoading||cloudError?.status===401;$('cloud-signin').hidden=cloudError?.status!==401;
 $('home-more').hidden=scope==='local'||!next;$('home-more').disabled=cloudLoading;
 for(const file of projects){
  const trash=scope==='trash',card=el('article','project-card'),link=el(trash?'div':'a','project-link');card.setAttribute('aria-label',file.name);
  if(!trash){link.href=projectUrl({...file,workspace});link.setAttribute('aria-label','Open '+file.name);}
  const preview=el('div','project-art');preview.setAttribute('aria-hidden','true');
  if(file.body){try{let cached=previews.get(file.id);if(cached?.body!==file.body){cached={body:file.body,source:projectPreview(file.body,measure)};previews.set(file.id,cached);}if(cached.source){const image=el('img');image.src=cached.source;image.alt='';image.loading='lazy';preview.append(image);}}catch{/* An unreadable thumbnail does not prevent opening its project. */}}
  if(!preview.childElementCount){const blank=el('span','project-placeholder');blank.innerHTML=icon('file');preview.append(blank);}
  const meta=el('div','project-meta'),title=el('strong',null,file.name),details=el('span','project-details'),place=el('span',null,file.kind==='cloud'?'Cloud':'On this device'),date=el('time');date.dateTime=new Date(file.updatedAt).toISOString();date.textContent='Edited '+new Date(file.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  try{if(file.body&&isSvgAnimation(JSON.parse(file.body)))details.append(el('span',null,'SVG Animation'));}catch{/* A damaged file can still be listed and recovered. */}
  details.append(place,date);meta.append(title,details);link.append(preview,meta);card.append(link);
  const actions=[...(!trash?[{label:'Open',run:()=>location.assign(projectUrl({...file,workspace}))}]:[]),...(file.can_delete===true?[...(!trash?[{separator:true}]:[]),{label:trash?'Restore':'Move to trash',enabled:!changingProject,run:()=>changeProjectTrash(file,!trash)}]:[])];
  if(actions.length){const menu=el('button','project-menu-button');menu.type='button';menu.innerHTML=icon('more-horizontal');menu.setAttribute('aria-label','Actions for '+file.name);menu.setAttribute('aria-haspopup','menu');menu.setAttribute('aria-expanded','false');
   const open=(event,anchor)=>{menu.setAttribute('aria-expanded','true');closeProjectMenu=showContextMenu(event,actions,menu,{label:'Project actions',anchor,onClose:()=>menu.setAttribute('aria-expanded','false')});};
   menu.onclick=event=>open(event,menu);card.oncontextmenu=event=>open(event,null);card.append(menu);
  }
  cards.append(card);
 }
 if(!projects.length){const empty=el('section','home-empty'),symbol=el('div','home-empty-icon');symbol.innerHTML=icon('file');
  const searching=!!$('project-search').value.trim(),heading=el('h3',null,searching?'No matching projects':scope==='trash'?'Trash is empty':scope==='cloud'?(cloudLoading?'Loading your projects':cloudError?'Connect your cloud projects':'No cloud projects yet'):'Your first design starts here');
  const text=el('p',null,searching?'Try another name or clear your search.':scope==='trash'?'Deleted projects appear here. Their creator or an administrator can restore them.':scope==='cloud'?'Save a project to the cloud from its editor to see it here.':'Start with a blank canvas or a frame sized for desktop or mobile.');empty.append(symbol,heading,text);
  if(!['cloud','trash'].includes(scope)&&!searching){const start=el('button','primary','New design');start.onclick=()=>creator.showNew();empty.append(start);}cards.append(empty);
 }
}
async function changeProjectTrash(file,trash){
 if(changingProject||disposed)return;changingProject=true;const startedScope=scope;$('home-error').hidden=true;$('home-status').hidden=true;
 try{
  if(file.kind==='local')await withDraftLock(()=>drafts.setTrashed(file.id,trash,file.body));
  else{await cloudRequest('/'+encodeURIComponent(file.id),{method:trash?'DELETE':'PATCH',headers:{'if-match':String(file.revision)}});if(scope!==startedScope)await fetchCloud();else cloud=cloud.filter(item=>item.id!==file.id);}
  if(disposed)return;previews.delete(file.id);$('home-status').textContent=trash?`“${file.name}” moved to Trash.`:`“${file.name}” restored.`;$('home-status').hidden=false;
 }catch(error){report(error);if(file.kind==='cloud')await fetchCloud();}
 finally{changingProject=false;if(!disposed){render();($('project-cards').querySelector('a,button')??$('home-new')).focus();}}
}
async function fetchCloud(more=false){
 if(disposed||staticHost||more&&cloudLoading)return;
 const requestId=++cloudRequestId,trash=scope==='trash';cloudLoading=true;cloudError=null;render();
 const query=new URLSearchParams();if(trash)query.set('trash','1');if(more&&next)query.set('before',next);
 try{const result=await cloudRequest(query.size?'?'+query:'');if(disposed||requestId!==cloudRequestId)return;const rows=result.documents.filter(f=>!!f.deleted_at===trash).map(f=>({...f,kind:'cloud',updatedAt:f.updated_at}));cloud=more?[...cloud,...rows]:rows;next=result.next;}
 catch(error){if(requestId===cloudRequestId)cloudError=error;}finally{if(requestId===cloudRequestId){cloudLoading=false;render();}}
}
for(const button of root.querySelectorAll('[data-scope]'))button.onclick=()=>{
 closeProjectMenu();const wasTrash=scope==='trash';scope=button.dataset.scope;for(const b of root.querySelectorAll('[data-scope]')){if(b===button)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 $('home-title').textContent=scope==='all'?'All projects':scope==='local'?'On this device':scope==='trash'?'Trash':'Cloud projects';$('collection-title').textContent=scope==='trash'?'Deleted projects':'Your designs';$('home-description').textContent=scope==='trash'?'Restore projects moved to Trash.':scope==='cloud'?'Designs saved to your account.':'Create a design or pick up where you left off.';
 if(wasTrash!==(scope==='trash')){cloud=[];next=null;fetchCloud();}render();
};
$('project-search').oninput=render;$('project-sort').onchange=render;
for(const mode of ['grid','list'])$('project-'+mode).onclick=()=>{view=mode;for(const key of ['grid','list'])$('project-'+key).setAttribute('aria-pressed',String(key===mode));render();};
$('cloud-retry').onclick=()=>fetchCloud();$('home-more').onclick=()=>fetchCloud(true);
const onStorage=event=>{if(event.key===DRAFTS_KEY)render();},onPageShow=event=>{if(event.persisted){render();fetchCloud();}};
window.addEventListener('storage',onStorage);window.addEventListener('pageshow',onPageShow);

async function loadWorkspace(){
 if(staticHost)return;
 try{
  const installation=await api('/api/installation');if(installation.mode!=='self-hosted')return;selfHosted=true;
  $('cloud-signin').href='/editor/account.html';$('cloud-signin').textContent='Sign in or create account';
  const account=await api('/api/workspaces');if(disposed)return;activity??=installActivityInbox(root.querySelector('.home-brand').parentElement,{report:message=>report(new Error(message))});
  const managed=account.organizations.filter(org=>org.role?.split(',').some(role=>['owner','admin'].includes(role)));const selected=managed.find(org=>workspace==='org:'+org.id||account.teams.some(team=>workspace==='team:'+team.id&&team.organizationId===org.id))??managed[0];
  $('home-admin').hidden=!selected&&!account.administrator;$('home-admin').href='/editor/admin.html'+(selected?'?organization='+encodeURIComponent(selected.id):'');
  $('home-account').textContent=account.user.name+' · Account & teams';
  const choices=[{value:'personal',label:'Personal workspace'},...account.organizations.map(org=>({value:'org:'+org.id,label:org.name})),...account.teams.map(team=>({value:'team:'+team.id,label:'Team · '+team.name}))];
  const select=$('home-workspace');select.replaceChildren();for(const item of choices){const option=el('option',null,item.label);option.value=item.value;select.append(option);}
  if(!choices.some(item=>item.value===workspace))throw new Error('You no longer have access to the selected workspace.');
  select.value=workspace;$('home-workspace-label').hidden=false;
  await teamOnboarding(root,workspace,{create:()=>creator.showNew(),report:message=>report(new Error(message))});
  select.onchange=()=>{const query=new URLSearchParams();if(select.value!=='personal')query.set('workspace',select.value);location.assign('/'+(query.size?'?'+query:''));};
  if(workspace!=='personal'){$('home-description').textContent='Shared designs for this workspace.';root.querySelector('[data-scope="local"]').hidden=true;$('home-new').innerHTML=icon('plus')+'New shared design';root.querySelector('.home-storage-note').textContent='Workspace members can edit these designs. Changes save to your server, with version history and conflict protection.';}
  syncDropdowns();
 }catch(error){if(error.status!==401&&selfHosted)report(error);}
}

async function start(){
try{
 if(!drafts.read().files.length){const legacy=storage?.getItem('pixlprfct.document.v1');if(legacy){const normalized=await normalize(legacy);await withDraftLock(()=>{if(!drafts.read().files.length)drafts.create(normalized);});}}
}catch(error){report(error);}
if(disposed)return;await loadWorkspace();if(disposed)return;render();await fetchCloud();if(disposed)return;
if(window.pixlDesktop?.local){
 root.querySelector('.home-storage-note').textContent='Projects on this device are saved in the desktop app. Save a .pixl copy to keep a portable backup.';
 root.querySelector('[data-scope="cloud"]').hidden=true;
 const links=root.querySelector('.home-account-links');links.replaceChildren();
 const connect=el('button',null,'Connect to a team server…');connect.onclick=()=>window.pixlDesktop.connect();links.append(connect);
 closeDesktop=installDesktop({report,importFile:importDesign});
}
if(staticHost){
 root.querySelector('[data-scope="cloud"]').hidden=true;
 const links=root.querySelector('.home-account-links');links.replaceChildren();
 const desktop=el('a',null,'Get the desktop app');desktop.href='https://ninefingerwoodshop.com/pixlprfct.html#download';links.append(desktop);
}
const params=new URLSearchParams(location.search);
if(params.has('projectError'))report(new Error('That project could not be opened. Choose a saved project below or import a copy.'));
if(params.get('new')==='1'){const query=new URLSearchParams(location.search);query.delete('new');history.replaceState(null,'','/'+(query.size?'?'+query:''));creator.showNew();}

}
start().then(()=>{if(!disposed)onReady();}).catch(error=>{if(!disposed){report(error);onError(error);}});
return ()=>{disposed=true;activity?.destroy();closeProjectMenu();closeDesktop();window.removeEventListener('storage',onStorage);window.removeEventListener('pageshow',onPageShow);creator.destroy();syncDropdowns.destroy();root.replaceChildren();};
}
