import {el,button,link,field,form,api,auth} from './account-ui.js';
import {installInspectorDropdowns} from './inspector-dropdown.js';
import {icon} from './icons.js';
import {staticHost} from './static-host.js';
import {mountSetup} from './setup-controls.js';
import {LocalDrafts} from './local-drafts.js';
import {projectUrl} from './project-navigation.js';

const root=document.getElementById('admin-app'),params=new URLSearchParams(location.search);
const sections=[['dashboard','Dashboard','shield-check'],['people','People','users'],['teams','Teams','group'],['content','Content','folder'],['settings','Settings','settings-sliders'],['database','Database','database']];
let installation=null,workspace=null,overview=null,organization=params.get('organization')||'',section=params.get('section')||'dashboard';
let viewVersion=0,cleanup=()=>{},closeDialog=()=>{},peopleTab='people',contentTrash=false,contentWorkspace='',peopleQuery='',peopleRole='',contentQuery='';
let storage;try{storage=localStorage;}catch{}const drafts=new LocalDrafts(storage);
root.innerHTML='<aside class="admin-sidebar"><div class="admin-workspace"><img src="/editor/favicon.svg?v=mono" alt="PixlPrfct"><span>PixlPrfct</span></div><a class="admin-back" href="/">'+icon('arrow-left')+'Admin</a><nav aria-label="Admin navigation"></nav><div class="admin-footer"></div></aside><main class="admin-main"><div class="admin-topbar"><a href="/" aria-label="Back to projects">'+icon('arrow-left')+'</a><span id="admin-location">Admin console</span></div><header class="admin-heading"><h1 id="admin-title">Admin</h1><div class="admin-actions"></div></header><p class="admin-status" role="status" aria-live="polite"></p><div class="admin-body" id="account-content"></div></main>';
const body=root.querySelector('.admin-body'),actions=root.querySelector('.admin-actions'),status=root.querySelector('.admin-status'),dropdowns=installInspectorDropdowns(document.body);
const hasRole=(role,value)=>role?.split(',').includes(value),manages=role=>hasRole(role,'owner')||hasRole(role,'admin');
const url=(page,org=organization)=>'/editor/admin.html?'+new URLSearchParams({section:page,...(org?{organization:org}:{})});
function notify(text,error=false){status.textContent=text;status.dataset.error=String(error);status.setAttribute('role',error?'alert':'status');}
const run=action=>async event=>{const source=event?.currentTarget;if(source)source.disabled=true;try{await action(event);}catch(error){notify(error.message,true);}finally{if(source?.isConnected)source.disabled=false;}};
function navLink(page,label){const node=link(label,url(page));node.onclick=event=>{event.preventDefault();navigate(page);};return node;}
for(const [id,label,glyph] of sections){const node=navLink(id,label);node.prepend(document.createRange().createContextualFragment(icon(glyph)));node.dataset.section=id;root.querySelector('nav').append(node);}
function header(title,items=[]){root.querySelector('#admin-title').textContent=title;document.title=title+' · PixlPrfct Admin';actions.replaceChildren(...items);}
function panel(title){const node=el('section',undefined,'admin-panel'),head=el('div',undefined,'admin-panel-head');head.append(el('h2',title));node.append(head);return node;}
function empty(target,title,description,items=[]){const node=el('section',undefined,'admin-empty');node.append(el('h2',title),el('p',description));if(items.length){const links=el('div');links.append(...items);node.append(links);}target.append(node);}
function table(target,headers){const wrap=el('div',undefined,'admin-table-scroll'),node=el('table',undefined,'admin-table'),head=el('thead'),row=el('tr'),rows=el('tbody');for(const text of headers){const cell=el('th',text);cell.scope='col';row.append(cell);}head.append(row);node.append(head,rows);wrap.append(node);target.append(wrap);return rows;}
function row(target,values){const node=el('tr');for(const value of values){const cell=el('td');cell.append(typeof value==='string'?document.createTextNode(value):value);node.append(cell);}target.append(node);return node;}
function person(member){const node=el('div',undefined,'admin-person'),label=el('div',member.name+(member.userId===workspace?.user.id?' (You)':''));label.append(el('small',member.email));node.append(el('span',member.name.slice(0,1).toUpperCase(),'admin-avatar'),label);return node;}
function tabs(target,options,current,change){const list=el('div',undefined,'admin-tabs');list.setAttribute('role','tablist');for(const [id,label] of options){const node=button(label,()=>change(id));node.setAttribute('role','tab');node.setAttribute('aria-selected',String(id===current));node.tabIndex=id===current?0:-1;node.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=options.findIndex(([key])=>key===id),next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowRight'?1:-1)+options.length)%options.length;change(options[next][0]);};list.append(node);}target.append(list);}
function search(target,label,value,change){const wrapper=el('label',undefined,'admin-search');wrapper.innerHTML=icon('search');const input=el('input');input.type='search';input.placeholder=label;input.setAttribute('aria-label',label);input.value=value;input.oninput=()=>change(input.value);wrapper.append(input);target.append(wrapper);return input;}
function pagination(target,data,load){const node=el('div',undefined,'admin-pagination');node.append(el('span',data.total?`${data.offset+1}–${Math.min(data.offset+50,data.total)} of ${data.total}`:'0 people'));const prev=button('Previous',run(()=>load(Math.max(0,data.offset-50)))),next=button('Next',run(()=>load(data.next)));prev.disabled=data.offset===0;next.disabled=data.next===null;node.append(prev,next);target.append(node);}
function dialog(title,render){closeDialog();const previous=document.activeElement,node=el('dialog',undefined,'admin-dialog'),head=el('div',undefined,'admin-dialog-head'),heading=el('h2',title),close=button('',()=>node.close());heading.id='admin-dialog-title';node.setAttribute('aria-labelledby',heading.id);close.innerHTML=icon('close');close.setAttribute('aria-label','Close');head.append(heading,close);node.append(head);document.body.append(node);closeDialog=()=>{if(node.open)node.close();node.remove();};node.addEventListener('close',()=>{node.remove();if(previous?.isConnected)previous.focus();},{once:true});render(node,()=>node.close());dropdowns();node.showModal();return node;}
function confirmAction(title,description,label,action){dialog(title,(node,close)=>{node.append(el('p',description));const footer=el('div',undefined,'admin-dialog-footer');footer.append(button('Cancel',close),button(label,run(async()=>{await action();close();}),label==='Remove'?'danger':'primary'));node.append(footer);});}
function orgRequest(path,query={}){return api('/api/admin/'+path+'?'+new URLSearchParams({organization,...query}));}
async function loadOverview(){return organization?await orgRequest('overview'):null;}
function renderWorkspace(){
 const top=root.querySelector('.admin-workspace'),footer=root.querySelector('.admin-footer');top.querySelectorAll('label,span').forEach(node=>node.remove());
 const managed=workspace?.organizations.filter(org=>manages(org.role))??[];
 if(managed.length){const picker=field('Organization','organization',{value:organization,options:managed.map(org=>({value:org.id,label:org.name}))});picker.querySelector('select').onchange=run(async event=>{organization=event.target.value;contentWorkspace='';peopleQuery='';peopleRole='';await navigate(section);});top.append(picker);}else top.append(el('span','PixlPrfct'));
 footer.replaceChildren();if(workspace){footer.append(link('Account & security','/editor/account.html'),button('Create organization',createOrganization));}else if(installation?.mode==='self-hosted')footer.append(link('Sign in','/editor/account.html'));footer.append(link('All projects','/'));dropdowns();
}
function createOrganization(){dialog('Create organization',(node,close)=>node.append(form('Create organization',[field('Organization name','name',{maxLength:100}),field('URL name','slug',{maxLength:80})],'Create organization',async data=>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))throw new Error('Use lowercase letters, numbers, and single hyphens.');const result=await auth('organization/create',data);organization=result.id;workspace=await api('/api/workspaces');close();renderWorkspace();await navigate('dashboard');})));}
function needsOrganization(target){
 if(overview)return false;
 if(workspace){empty(target,'Choose an admin workspace','You must be an organization owner or admin to manage people, teams, and shared content.',[button('Create organization',createOrganization)]);}
 else if(installation?.mode==='self-hosted'){empty(target,'Sign in to administer your workspace','Use an owner or admin account to manage people, teams, and shared projects.',[link('Sign in','/editor/account.html')]);}
 else{empty(target,'Connect your workspace','This app is saving projects on this device. Set up a server for accounts, teams, and shared projects.',[navLink('database','Set up a database'),button('Open a team server',connectServer)]);}
 return true;
}
function connectServer(){dialog('Open a team server',(node,close)=>{node.append(el('p','Open your existing PixlPrfct server. Projects on this device stay in this browser.'));node.append(form('Open team server',[field('Workspace address','address',{type:'url',value:'http://127.0.0.1:4174'})],'Open workspace',data=>{const target=new URL(data.address),local=['localhost','127.0.0.1','[::1]'].includes(target.hostname);if(target.username||target.password||!(target.protocol==='https:'||local&&target.protocol==='http:'))throw new Error('Use HTTPS, or HTTP for a server on this computer, without credentials in the address.');close();location.assign(new URL('/editor/admin.html',target.origin).href);}));});}
async function dashboard(target,version){
 header(overview?overview.organization.name+' admin':'PixlPrfct admin');
 const grid=el('div',undefined,'admin-grid');target.append(grid);
 if(!overview){const welcome=panel('Workspace administration');grid.append(welcome);needsOrganization(welcome);const local=panel('On this device'),stats=el('dl',undefined,'admin-stats');try{for(const [label,value] of [['Projects',drafts.list().length],['In Trash',drafts.list({trash:true}).length]])stats.append(el('dt',label),el('dd',String(value)));}catch(error){notify(error.message,true);}local.append(stats,navLink('content','Manage local projects'));grid.append(local);return;}
 const invitations=await auth('organization/list-invitations?'+new URLSearchParams({organizationId:organization}));if(version!==viewVersion)return;
 const pending=invitations.filter(item=>item.status==='pending'&&new Date(item.expiresAt)>new Date()),requests=panel('Pending invitations'),stack=el('div',undefined,'admin-stack'),members=panel('People'),teams=panel('Teams');
 requests.querySelector('h2').append(el('span',String(pending.length),'admin-badge'));requests.querySelector('.admin-panel-head').append(button('Invite users',invite));
 if(pending.length){for(const item of pending.slice(0,5)){const entry=el('div',undefined,'admin-setting');entry.append(el('span',item.email),el('span',item.role));requests.append(entry);}requests.append(navLink('people','Manage invitations'));}else empty(requests,'You’re all caught up!','There are no pending invitations.',[navLink('people','Manage people')]);
 const counts=el('dl',undefined,'admin-stats');counts.append(el('dt','Members'),el('dd',String(overview.people)),el('dt','Teams'),el('dd',String(overview.teams.length)));members.append(counts);members.querySelector('.admin-panel-head').append(navLink('people','Manage'));
 teams.append(el('p',overview.teams.length?'Manage access to each team’s projects.':'Create a team to organize people and projects.'));teams.querySelector('.admin-panel-head').append(navLink('teams','Manage'));stack.append(members,teams);grid.append(requests,stack);
}
function invite(){const org=organization;dialog('Invite to organization',(node,close)=>{node.append(form('Invite users',[field('Email address','email',{type:'email'}),field('Role','role',{value:'member',options:[{value:'member',label:'Member'},{value:'admin',label:'Admin'}]})],'Send invitation',async data=>{await auth('organization/invite-member',{...data,organizationId:org});close();notify('Invitation sent.');await navigate(section,{keepNotice:true});}));});}
function managePerson(member){const org=organization,owner=hasRole(overview.organization.role,'owner'),self=member.userId===workspace.user.id;
 dialog('Manage '+member.name,(node,close)=>{
  node.append(person(member));
  if(!self&&(!hasRole(member.role,'owner')||owner)){
   const choices=[{value:'member',label:'Member'},{value:'admin',label:'Admin'},...(owner?[{value:'owner',label:'Owner'}]:[])];
   node.append(form('Change role',[field('Role','role',{value:member.role,options:choices})],'Save role',async data=>{await auth('organization/update-member-role',{...data,memberId:member.id,organizationId:org});close();notify('Role updated.');await navigate('people',{keepNotice:true});}));
   node.append(button('Remove from organization',()=>confirmAction('Remove '+member.name+'?', 'They will lose access to this organization and its teams. Their existing shared projects will remain.', 'Remove',async()=>{await auth('organization/remove-member',{memberIdOrEmail:member.id,organizationId:org});notify('Member removed.');await navigate('people',{keepNotice:true});}),'danger'));
  }else node.append(el('p',self?'Your own role is managed by another owner. Account security is available from Account & security.':'Only an owner can change another owner’s role.'));
 });
}
async function people(target,version){
 header('People',[button('Invite users',invite,'primary')]);if(needsOrganization(target)){actions.replaceChildren();return;}
 tabs(target,[['people','People'],['invitations','Invitations']],peopleTab,value=>{peopleTab=value;navigate('people');});
 const toolbar=el('div',undefined,'admin-toolbar'),results=el('div');target.append(toolbar,results);
 let searchTimer,request=0;cleanup=()=>clearTimeout(searchTimer);
 const load=async(offset=0)=>{const current=++request;results.setAttribute('aria-busy','true');
  try{
   if(peopleTab==='invitations'){
    const list=await auth('organization/list-invitations?'+new URLSearchParams({organizationId:organization}));if(current!==request||version!==viewVersion)return;results.replaceChildren();
    const pending=list.filter(item=>item.status==='pending'&&new Date(item.expiresAt)>new Date()&&item.email.toLowerCase().includes(peopleQuery.toLowerCase()));
    const rows=table(results,['Email','Role','Actions']);for(const item of pending){const org=organization;row(rows,[item.email,item.role,button('Cancel invitation',run(async()=>{await auth('organization/cancel-invitation',{invitationId:item.id});if(org===organization)await load();notify('Invitation canceled.');}))]);}if(!pending.length)empty(results,'No pending invitations','Invite people to collaborate in this organization.');
   }else{
    const data=await orgRequest('people',{q:peopleQuery,...(peopleRole?{role:peopleRole}:{}),offset});if(current!==request||version!==viewVersion)return;results.replaceChildren();const rows=table(results,['Name','Role','Actions']);for(const member of data.members){const manage=button('Manage',()=>managePerson(member));manage.setAttribute('aria-label','Manage '+member.name);row(rows,[person(member),member.role,manage]);}if(!data.members.length)empty(results,'No people found','Try another name, email address, or role.');pagination(results,data,load);
   }
  }catch(error){if(current===request&&version===viewVersion)notify(error.message,true);}finally{results.removeAttribute('aria-busy');}
 };
 search(toolbar,peopleTab==='people'?'Search people…':'Search invitations…',peopleQuery,value=>{peopleQuery=value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>load(),200);});
 if(peopleTab==='people'){const filter=el('div',undefined,'admin-filter'),roles=field('Role filter','role',{value:peopleRole,options:[{value:'',label:'All roles'},{value:'owner',label:'Owner'},{value:'admin',label:'Admin'},{value:'member',label:'Member'}]});roles.querySelector('select').onchange=()=>{peopleRole=roles.querySelector('select').value;load();};filter.append(roles);toolbar.append(filter);}dropdowns();await load();
}
function teamForm(team){const org=organization;dialog(team?'Rename team':'Create team',(node,close)=>node.append(form(team?'Rename team':'Create team',[field('Team name','name',{value:team?.name??'',maxLength:100})],team?'Save name':'Create team',async data=>{if(team)await auth('organization/update-team',{teamId:team.id,data:{...data,organizationId:org}});else await auth('organization/create-team',{...data,organizationId:org});close();await navigate('teams');})));}
function teamMembers(team){const org=organization;dialog(team.name+' members',(node)=>{
 const results=el('div');node.append(results);let currentPage=0,request=0;
 const load=async(offset=0)=>{const current=++request;currentPage=offset;const data=await api('/api/admin/people?'+new URLSearchParams({organization:org,team:team.id,offset}));if(!node.isConnected||current!==request)return;team.people=data.total;const count=root.querySelector('[data-team-count="'+CSS.escape(team.id)+'"]');if(count)count.textContent=String(data.total);results.replaceChildren();const rows=table(results,['Name','Actions']);for(const member of data.members)row(rows,[person(member),button('Remove',run(async()=>{await auth('organization/remove-team-member',{teamId:team.id,userId:member.userId,organizationId:org});await load(currentPage);}))]);if(!data.members.length)results.append(el('p','No team members yet. Organization admins retain access.'));pagination(results,data,load);};
 node.append(form('Add team member',[field('Member email','email',{type:'email'})],'Add to team',async data=>{const result=await api('/api/admin/people?'+new URLSearchParams({organization:org,email:data.email.trim()}));const member=result.members.find(m=>m.email.toLowerCase()===data.email.trim().toLowerCase());if(!member)throw new Error('Invite this person to the organization first. They must accept before joining a team.');await auth('organization/add-team-member',{teamId:team.id,userId:member.userId,organizationId:org});await load();}));load().catch(error=>notify(error.message,true));
 });}
function teams(target){header('Teams',[button('Create team',()=>teamForm(),'primary')]);if(needsOrganization(target)){actions.replaceChildren();return;}const toolbar=el('div',undefined,'admin-toolbar'),results=el('div');target.append(toolbar,results);const draw=query=>{results.replaceChildren();const rows=table(results,['Name','People','Actions']);for(const team of overview.teams.filter(t=>t.name.toLowerCase().includes(query.toLowerCase()))){const controls=el('div',undefined,'admin-row-actions');controls.append(button('Members',()=>teamMembers(team)),button('Rename',()=>teamForm(team)));const entry=row(rows,[link(team.name,'/?workspace='+encodeURIComponent('team:'+team.id)),String(team.people),controls]);entry.children[1].dataset.teamCount=team.id;}if(!rows.childElementCount)empty(results,'No teams found','Create a team to organize people and shared projects.');};search(toolbar,'Search teams…','',draw);draw('');}
async function content(target,version){
 header('Content');const local=!overview&&!organization;if(!local&&needsOrganization(target))return;
 tabs(target,[['projects','Projects'],['trash','Trash']],contentTrash?'trash':'projects',value=>{contentTrash=value==='trash';navigate('content');});
 const toolbar=el('div',undefined,'admin-toolbar'),results=el('div');target.append(toolbar,results);let timer,request=0,next=null,files=[];cleanup=()=>clearTimeout(timer);
 const load=async(more=false)=>{const current=++request;try{
  if(local){files=drafts.list({trash:contentTrash}).filter(f=>f.name.toLowerCase().includes(contentQuery.toLowerCase())).map(f=>({...f,kind:'local',can_delete:true}));next=null;}
  else{const query=new URLSearchParams({workspace:contentWorkspace||'org:'+organization,...(contentTrash?{trash:'1'}:{}),...(contentQuery?{search:contentQuery}:{}),...(more&&next?{before:next}:{})});const data=await api('/api/documents?'+query);if(current!==request||version!==viewVersion)return;const incoming=data.documents.map(f=>({...f,kind:'cloud',updatedAt:f.updated_at}));files=more?[...files,...incoming]:incoming;next=data.next;}
  if(current!==request||version!==viewVersion)return;results.replaceChildren();const rows=table(results,['Name','Last edited','Actions']);
  for(const file of files){const controls=el('div',undefined,'admin-row-actions'),scope=contentWorkspace||'org:'+organization,trash=contentTrash;
   if(!trash)controls.append(link('Open',projectUrl({...file,workspace:scope})));
   if(file.can_delete)controls.append(button(trash?'Restore':'Move to trash',run(async()=>{if(local)drafts.setTrashed(file.id,!trash,file.body);else{const response=await fetch('/api/documents/'+encodeURIComponent(file.id)+'?'+new URLSearchParams({workspace:scope}),{method:trash?'PATCH':'DELETE',headers:{'if-match':String(file.revision)},credentials:'same-origin',signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not update the project.');}notify(trash?'Project restored.':'Project moved to Trash.');if(version===viewVersion)await load();})));
   row(rows,[file.name,new Date(file.updatedAt).toLocaleDateString(),controls]);
  }
  if(!files.length)empty(results,contentTrash?'Trash is empty':'No projects found',contentTrash?'Projects moved to Trash can be restored here.':'Create or import a project from All projects.');if(next)results.append(button('Load more',run(()=>load(true))));
 }catch(error){if(current===request&&version===viewVersion)notify(error.message,true);}};
 search(toolbar,'Search projects…',contentQuery,value=>{contentQuery=value;clearTimeout(timer);timer=setTimeout(()=>load(),200);});
 if(overview){const filter=el('div',undefined,'admin-filter'),choices=[{value:'org:'+organization,label:overview.organization.name},...overview.teams.map(t=>({value:'team:'+t.id,label:t.name}))];if(!choices.some(c=>c.value===contentWorkspace))contentWorkspace=choices[0].value;const picker=field('Workspace','workspace',{value:contentWorkspace,options:choices});picker.querySelector('select').onchange=()=>{contentWorkspace=picker.querySelector('select').value;next=null;load();};filter.append(picker);toolbar.append(filter);dropdowns();}else toolbar.append(el('span','On this device','admin-note'));await load();
}
function setting(target,title,description,action){const node=el('div',undefined,'admin-setting'),label=el('div');label.append(el('strong',title),el('p',description));node.append(label);if(action)node.append(action);target.append(node);}
function settings(target){header('Settings');const wrapper=el('div',undefined,'admin-settings');target.append(wrapper);
 if(overview){const profile=el('section'),list=el('div',undefined,'admin-settings-list');profile.append(el('h2','Organization profile'),list);wrapper.append(profile);const org=organization;setting(list,'Display name',overview.organization.name,button('Edit',()=>dialog('Display name',(node,close)=>node.append(form('Organization name',[field('Display name','name',{value:overview.organization.name,maxLength:100})],'Save',async data=>{await auth('organization/update',{organizationId:org,data});workspace=await api('/api/workspaces');close();renderWorkspace();await navigate('settings');})))));setting(list,'Organization address',overview.organization.slug);}
 const security=el('section'),list=el('div',undefined,'admin-settings-list');security.append(el('h2','Access and security'),list);wrapper.append(security);
 if(workspace)setting(list,'Account security','Manage your password, two-factor authentication, and signed-in devices.',link('Manage','/editor/account.html'));
 if(overview)setting(list,'People and roles','Owners and admins manage membership. Project deletion is restricted to creators and admins.',navLink('people','Manage'));
 setting(list,'Database and hosting',installation?.mode==='self-hosted'?'Database provider: '+installation.provider:'This preview stores projects in this browser.',navLink('database','Open setup'));
 if(installation?.mode==='self-hosted')setting(list,'Registration',installation.registration?'New account registration is open.':'New account registration is closed.');
 if(!overview&&!workspace)setting(list,'Team administration','Connect to a PixlPrfct server to manage accounts and teams.',button('Open team server',connectServer));
}
function database(target){header('Database');const wrapper=el('div',undefined,'admin-database');target.append(wrapper);const current=panel('Connection');wrapper.append(current);
 if(installation?.mode==='self-hosted'){
  current.append(el('p','Provider: '+installation.provider+(installation.localDevelopment?' · Local development':'')));
  if(workspace?.administrator){const result=el('p');result.setAttribute('role','status');current.append(button('Test server connection',run(async()=>{result.textContent='Checking connection…';try{const report=await api('/api/installation/check',{});result.textContent=`Database: ${report.database}. Accounts: ${report.accounts}. Email: ${report.email}.`;}catch(error){result.textContent=error.message;throw error;}}),'primary'),result);}else current.append(el('p','The installation administrator can run the connection check.'),...(!workspace?[link('Sign in','/editor/account.html')]:[]));
 }else current.append(el('p','No server is connected to this local app. Prepare your database configuration below, or open an existing team server.'),button('Open a team server',connectServer));
 const builder=el('div');wrapper.append(builder);cleanup=mountSetup(builder,{intro:false,connectionStatus:false,dropdowns});
}
async function navigate(next,{keepNotice=false}={}){
 section=sections.some(([id])=>id===next)?next:'dashboard';const version=++viewVersion,restoreTabFocus=document.activeElement?.getAttribute('role')==='tab';cleanup();cleanup=()=>{};closeDialog();if(!keepNotice)notify('');history.replaceState(null,'',url(section));for(const node of root.querySelectorAll('[data-section]')){node.href=url(node.dataset.section);if(node.dataset.section===section)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');}
 header(sections.find(([id])=>id===section)[1]);body.replaceChildren(el('p','Loading…','admin-note'));body.setAttribute('aria-busy','true');
 try{const summary=section==='database'?null:await loadOverview();if(version!==viewVersion)return;overview=summary;const view=el('div');body.replaceChildren(view);root.querySelector('#admin-location').textContent=overview?.organization.name??'Admin console';await ({dashboard,people,teams,content,settings,database}[section])(view,version);dropdowns();if(restoreTabFocus&&version===viewVersion)body.querySelector('[role=tab][aria-selected=true]')?.focus();}catch(error){if(version!==viewVersion)return;overview=null;body.replaceChildren();notify(error.message,true);empty(body,'Unable to open administration','Check your connection and current workspace permissions.',[button('Try again',()=>navigate(section)),navLink('database','Database setup')]);}finally{if(version===viewVersion)body.removeAttribute('aria-busy');}
}
async function start(){
 if(!staticHost&&!window.pixlDesktop?.local){try{installation=await api('/api/installation');}catch{/* Static and managed hosts still expose the setup builder. */}
  if(installation?.mode==='self-hosted'){try{workspace=await api('/api/workspaces');}catch(error){if(error.status!==401)notify(error.message,true);}}
 }
 const managed=workspace?.organizations.filter(org=>manages(org.role))??[];if(!managed.some(org=>org.id===organization))organization=managed[0]?.id??'';renderWorkspace();await navigate(section);
}
start().catch(error=>notify(error.message,true));
