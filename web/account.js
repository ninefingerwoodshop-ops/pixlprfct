import {installInspectorDropdowns} from './inspector-dropdown.js';
import {el,button,link,field,form,api,auth,shell} from './account-ui.js';
const root=document.getElementById('account-app'),content=shell(root,'account'),dropdowns=installInspectorDropdowns(root),params=new URLSearchParams(location.search);
let installation,workspace,selectedOrg,selectedTeam;
const heading=(title,description)=>{content.replaceChildren(el('h1',title),el('p',description,'account-lead'));};
const card=(title,description)=>{const node=el('section',undefined,'account-card');if(title)node.append(el('h2',title));if(description)node.append(el('p',description));return node;};
const message=(target,text)=>{const node=el('p',text,'account-success');node.setAttribute('role','status');target.append(node);};
const fail=error=>{const node=el('p',error.message,'account-message');node.setAttribute('role','alert');content.append(node);};
const run=action=>async event=>{const source=event?.currentTarget;if(source)source.disabled=true;try{await action(event);}catch(error){fail(error);}finally{if(source)source.disabled=false;}};
const callback=()=>location.origin+'/editor/account.html'+(params.get('invitation')?'?invitation='+encodeURIComponent(params.get('invitation')):'');
const setMode=mode=>{params.set('mode',mode);history.replaceState(null,'','?'+params);renderAuth(mode);};
function renderAuth(mode='signin'){
 const reset=mode==='reset',signup=mode==='register',forgot=mode==='forgot',factor=mode==='factor',backup=mode==='backup';
 const title=reset?'Choose a new password':signup?'Create your account':forgot?'Reset your password':factor||backup?'Verify it’s you':'Welcome back';
 heading(title,signup?'Create designs, build a team, and work together. Every feature is free.':factor||backup?'Complete the second step to securely sign in.':'Your projects and your team, in one place.');
 const panel=card();panel.classList.add('narrow');content.append(panel);
 if(installation.localDevelopment)panel.append(el('p','Local development: verification emails are saved privately in data/outbox.','account-hint'));
 const fields=[];
 if(signup)fields.push(field('Your name','name',{autocomplete:'name',maxLength:100}));
 if(!reset&&!factor&&!backup)fields.push(field('Email address','email',{type:'email',autocomplete:'email'}));
 if(!forgot&&!factor&&!backup)fields.push(field(signup||reset?'Password · at least 12 characters':'Password','password',{type:'password',autocomplete:signup||reset?'new-password':'current-password',minLength:signup||reset?12:undefined,maxLength:128}));
 if(factor||backup)fields.push(field(backup?'One-time backup code':'Authenticator code','code',{autocomplete:'one-time-code',maxLength:64}));
 panel.append(form(title,fields,signup?'Create account':forgot?'Send reset link':reset?'Save password':factor||backup?'Verify':'Sign in',async(data,node)=>{
   if(forgot){await auth('request-password-reset',{email:data.email,redirectTo:location.origin+'/editor/account.html?mode=reset'});message(panel,'If an account exists for that email, a reset link is on its way.');return;}
   if(reset){await auth('reset-password',{newPassword:data.password,token:params.get('token')});params.delete('token');history.replaceState(null,'','?mode=signin');renderAuth();message(content,'Password updated. Sign in with your new password.');return;}
   if(signup){await auth('sign-up/email',{...data,callbackURL:callback()});node.replaceChildren(el('h2','Check your email'),el('p','Verify your email address to finish creating your account.'));return;}
   const result=factor||backup?await auth(backup?'two-factor/verify-backup-code':'two-factor/verify-totp',{code:data.code,trustDevice:false}):await auth('sign-in/email',{...data,callbackURL:callback()});
   if(result.twoFactorRedirect){setMode('factor');return;}
   await loadAccount();
 }));
 const links=el('div',undefined,'account-links');
 if(factor||backup)links.append(button(backup?'Use authenticator code':'Use a backup code',()=>setMode(backup?'factor':'backup')));
 else if(!signup&&!forgot&&!reset){if(installation.registration)links.append(button('Create an account',()=>setMode('register')));links.append(button('Forgot password?',()=>setMode('forgot')));}
 else links.append(button('Back to sign in',()=>setMode('signin')));
 panel.append(links);
 if(!signup&&!factor&&!backup&&!reset){const resend=card('Need a verification email?');resend.classList.add('narrow');resend.append(form('Resend verification',[field('Email to verify','email',{type:'email',autocomplete:'email'})],'Resend email',async data=>{await auth('send-verification-email',{...data,callbackURL:callback()});message(resend,'If your account needs verification, a new link is on its way.');}));content.append(resend);}
 dropdowns();
}
async function loadAccount(){
 workspace=await api('/api/workspaces');
 heading('Your workspace',`Signed in as ${workspace.user.email}`);
 const actions=el('div',undefined,'account-actions');actions.append(link('Open projects','/'),button('Sign out',run(async()=>{await auth('sign-out',{});location.assign('/editor/account.html');})));
 content.append(actions);
 if(params.get('invitation')){const invite=card('You have a team invitation','Accept this invitation with the email address it was sent to.');invite.append(button('Accept invitation',run(async()=>{await auth('organization/accept-invitation',{invitationId:params.get('invitation')});params.delete('invitation');history.replaceState(null,'',location.pathname);await loadAccount();}),'primary'));content.append(invite);}
 const profile=card('Account','Keep your profile and account security up to date.');
 profile.append(form('Profile',[field('Display name','name',{value:workspace.user.name,autocomplete:'name',maxLength:100})],'Save profile',async data=>{await auth('update-user',data);message(profile,'Profile updated.');}));
 const password=el('details');password.append(el('summary','Change password'));password.append(form('Change password',[field('Current password','currentPassword',{type:'password',autocomplete:'current-password',maxLength:128}),field('New password · at least 12 characters','newPassword',{type:'password',autocomplete:'new-password',minLength:12,maxLength:128})],'Update password',async(data,node)=>{await auth('change-password',{...data,revokeOtherSessions:true});node.reset();message(password,'Password updated. Other sessions have been signed out.');}));profile.append(password);
 profile.append(button('Sign out other devices',run(async()=>{await auth('revoke-other-sessions',{});message(profile,'Other sessions have been signed out.');})));
 content.append(profile);
 renderSecurity();
 const organizations=card('Organizations','Give your group a shared home. Organization owners and admins manage membership and teams.');
 organizations.append(form('Create organization',[field('Organization name','name',{maxLength:100}),field('Organization URL name','slug',{maxLength:80})],'Create organization',async data=>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))throw new Error('Use lowercase letters, numbers, and single hyphens for the URL name.');const org=await auth('organization/create',data);selectedOrg=org.id;await loadAccount();}));
 content.append(organizations);
 if(workspace.organizations.length){
   selectedOrg=workspace.organizations.some(org=>org.id===selectedOrg)?selectedOrg:workspace.organizations[0].id;
   const picker=field('Organization','organization',{value:selectedOrg,options:workspace.organizations.map(org=>({value:org.id,label:org.name}))});organizations.prepend(picker);picker.querySelector('select').onchange=run(async event=>{selectedOrg=event.target.value;selectedTeam=null;await showOrganization();});
   const details=el('div');details.id='organization-details';organizations.append(details);await showOrganization();
 }
 if(workspace.administrator){const admin=card('Installation','Database and server configuration are managed once for this installation.');admin.append(link('Database setup and connection check','/editor/setup.html'));content.append(admin);}
 dropdowns();
}
function renderSecurity(){
 const panel=card('Two-factor authentication',workspace.user.twoFactorEnabled?'An authenticator code is required when you sign in.':'Protect your account with a code from an authenticator app.');content.append(panel);
 if(workspace.user.twoFactorEnabled){panel.append(el('span','Enabled','account-status'));panel.append(form('Disable two-factor',[field('Confirm password','password',{type:'password',autocomplete:'current-password',maxLength:128})],'Turn off two-factor',async data=>{await auth('two-factor/disable',data);await loadAccount();}));return;}
 panel.append(form('Enable two-factor',[field('Confirm password','password',{type:'password',autocomplete:'current-password',maxLength:128})],'Set up authenticator',async(data,node)=>{
   const result=await auth('two-factor/enable',data);node.remove();panel.append(el('h3','1. Add PixlPrfct to your authenticator'));
   if(result.qrCode){const image=el('img',undefined,'account-qr');image.src=result.qrCode;image.alt='Scan with your authenticator app';panel.append(image);}
   const secret=new URL(result.totpURI).searchParams.get('secret');panel.append(el('p','Or enter this setup key manually:'),el('code',secret,'account-code'),el('h3','2. Save your backup codes'),el('p','Keep these somewhere private. Each code works once if you lose access to your authenticator.'));
   const codes=el('div',undefined,'account-backup-codes');for(const code of result.backupCodes)codes.append(el('code',code));panel.append(codes);
   panel.append(form('Verify authenticator',[field('Six-digit code','code',{autocomplete:'one-time-code',maxLength:6,minLength:6})],'Enable two-factor',async values=>{await auth('two-factor/verify-totp',{code:values.code,trustDevice:false});await loadAccount();}));
 }));
}
async function showOrganization(){
 const root=document.getElementById('organization-details');root.replaceChildren(el('p','Loading organization…'));
 const org=await auth('organization/get-full-organization?'+new URLSearchParams({organizationId:selectedOrg}));
 const member=org.members.find(member=>member.userId===workspace.user.id),canManage=member?.role.split(',').some(role=>['owner','admin'].includes(role));
 root.replaceChildren(el('h3',org.name));
 for(const entry of org.members){const row=el('div',undefined,'account-row'),label=el('div',entry.user.name);label.append(el('small',entry.user.email+' · '+entry.role));row.append(label);
   if(canManage&&entry.userId!==workspace.user.id){row.append(button('Remove member',run(async()=>{await auth('organization/remove-member',{memberIdOrEmail:entry.id,organizationId:org.id});await showOrganization();}),'danger'));}root.append(row);
 }
 if(canManage){
   root.append(el('h3','Invite a collaborator'));
   root.append(form('Invite collaborator',[field('Invitation email','email',{type:'email'}),field('Role','role',{value:'member',options:[{value:'member',label:'Member'},{value:'admin',label:'Admin'}]})],'Send invitation',async(data,node)=>{await auth('organization/invite-member',{...data,organizationId:org.id});node.reset();message(root,'Invitation sent.');}));
   for(const invitation of org.invitations??[]){if(invitation.status!=='pending')continue;const row=el('div',undefined,'account-row');row.append(el('span',invitation.email+' · invited'),button('Cancel invitation',run(async()=>{await auth('organization/cancel-invitation',{invitationId:invitation.id});await showOrganization();})));root.append(row);}
 }
 const teams=el('section');teams.append(el('h3','Teams'),el('p','Team projects are available to team members and organization admins.'));root.append(teams);
 if(canManage)teams.append(form('Create team',[field('Team name','name',{maxLength:100})],'Create team',async data=>{const team=await auth('organization/create-team',{...data,organizationId:org.id});selectedTeam=team.id;await showOrganization();}));
 const organizationTeams=org.teams??await auth('organization/list-teams?'+new URLSearchParams({organizationId:org.id}));
 const allTeams=canManage?organizationTeams:organizationTeams.filter(team=>workspace.teams.some(item=>item.id===team.id));
 if(allTeams.length){
   selectedTeam=allTeams.some(team=>team.id===selectedTeam)?selectedTeam:allTeams[0].id;
   const picker=field('Team','team',{value:selectedTeam,options:allTeams.map(team=>({value:team.id,label:team.name}))});teams.append(picker);
   const membersRoot=el('div');teams.append(membersRoot);
   const renderTeam=async()=>{
     const result=await api('/api/teams/'+encodeURIComponent(selectedTeam)+'/members');const members=Array.isArray(result)?result:result.members??[];membersRoot.replaceChildren();
     for(const teamMember of members){const person=org.members.find(m=>m.userId===teamMember.userId);const row=el('div',undefined,'account-row');row.append(el('span',person?.user.name??teamMember.userId));if(canManage)row.append(button('Remove from team',run(async()=>{await auth('organization/remove-team-member',{teamId:selectedTeam,userId:teamMember.userId,organizationId:org.id});await renderTeam();})));membersRoot.append(row);}
     if(canManage){const available=org.members.filter(m=>!members.some(tm=>tm.userId===m.userId));if(available.length)membersRoot.append(form('Add team member',[field('Organization member','userId',{options:available.map(m=>({value:m.userId,label:m.user.name+' · '+m.user.email})),value:available[0].userId})],'Add to team',async data=>{await auth('organization/add-team-member',{...data,teamId:selectedTeam,organizationId:org.id});await renderTeam();}));}
     dropdowns();
   };
   picker.querySelector('select').onchange=run(async event=>{selectedTeam=event.target.value;await renderTeam();});await renderTeam();
 }
 dropdowns();
}
async function start(){
 heading('Your account','Loading your workspace…');
 try{installation=await api('/api/installation');if(installation.mode!=='self-hosted')throw new Error('Self-hosted accounts are not configured on this server.');}
 catch{heading('Bring your team together','Set up your own PixlPrfct installation to enable accounts, organizations, and secure shared projects.');const panel=card('Choose where your workspace lives','The setup builder prepares a configuration for your database and hosting provider.');panel.append(link('Set up your installation','/editor/setup.html'));content.append(panel);return;}
 if(params.get('mode')==='reset'){renderAuth('reset');return;}
 try{await loadAccount();}catch(error){if(error.status===401)renderAuth(params.get('mode')==='register'&&installation.registration?'register':'signin');else fail(error);}
}
start().catch(fail);
