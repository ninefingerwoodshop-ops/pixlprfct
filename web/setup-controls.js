import {installInspectorDropdowns} from './inspector-dropdown.js';
import {databaseProviders,setupPlan} from './setup-plan.js';
import {el,button,link,field,form,api} from './account-ui.js';
export function mountSetup(content,{intro=true,connectionStatus=true,dropdowns:sharedDropdowns}={}){
const dropdowns=sharedDropdowns??installInspectorDropdowns(content);
if(intro){
content.append(el('span','One installation · one database','account-status'),el('h1','Host your workspace'),el('p','A free design tool, on infrastructure you choose. Set it up once, then invite everyone to the same address.','account-lead'));
const features=el('div',undefined,'setup-features');for(const [title,text] of [['Your database','Accounts, teams, designs, and history stay together.'],['Your people','Verified accounts, organization roles, and team workspaces.'],['Your control','No subscriptions or paid tiers. You run the installation.']]){const item=el('div');item.append(el('h3',title),el('p',text));features.append(item);}content.append(features);
}
const panel=el('section',undefined,'account-card');panel.append(el('h2','Build your setup'),el('p','Choose a provider to prepare your server configuration. Database passwords are added on your server.'));
const provider=field('Database provider','provider',{value:'sqlite',options:databaseProviders.map(item=>({value:item.id,label:item.name}))});
const description=el('p',databaseProviders[0].description,'setup-provider-description');provider.querySelector('select').onchange=()=>{description.textContent=databaseProviders.find(p=>p.id===provider.querySelector('select').value).description;};
const local=field('Where will it run?','deployment',{value:'local',options:[{value:'local',label:'Local trial · this computer'},{value:'public',label:'On the internet · HTTPS'}]});
const url=field('Application address','url',{type:'url',value:'http://127.0.0.1:4174'});
local.querySelector('select').onchange=()=>{const input=url.querySelector('input');if(local.querySelector('select').value==='public'){if(input.value==='http://127.0.0.1:4174')input.value='https://design.example.com';}else input.value='http://127.0.0.1:4174';};
const output=el('section',undefined,'account-card');output.hidden=true;output.setAttribute('aria-live','polite');
panel.append(form('Installation setup',[provider,description,local,url,field('Administrator email','email',{type:'email',autocomplete:'email'})],'Prepare configuration',async values=>{
 const plan=setupPlan({...values,local:values.deployment==='local'});output.hidden=false;output.replaceChildren(el('h2','Your '+plan.provider.name.split(' · ')[0]+' setup'),el('p','1. Add the configuration below to a file named .env.selfhost on your server. Replace the marked values before running it.'));
 output.append(el('pre',plan.env,'account-code'));
 output.append(button('Download configuration template',()=>{const blob=new Blob([plan.env],{type:'text/plain'}),url=URL.createObjectURL(blob),anchor=link('Download',url);anchor.download='pixlprfct.env.example';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 output.append(el('p','2. Generate a unique secret with this command. Store it in BETTER_AUTH_SECRET and keep it when upgrading.'),el('pre',plan.secretCommand,'account-code'),el('p','3. From your downloaded PixlPrfct source, install, build, initialize the tables, and start the app. Node 24 LTS, Rust, and wasm-pack are required; Docker is also supported.'),el('pre',plan.commands,'account-code'));
 output.append(el('p',values.deployment==='local'?'Local trial emails are written to the private data/outbox folder. Open the verification link from there to activate your account.':'Point your HTTPS reverse proxy at port 4174. Configure SMTP so people can verify accounts, receive invitations, and reset passwords.'));
 output.append(el('p','The initializer creates the tables in an existing database. It does not create a provider account, provision a database server, or move data from another installation.','account-hint'));
 dropdowns();output.scrollIntoView({block:'start',behavior:'smooth'});
}));content.append(panel,output);dropdowns();
async function status(){
 try{const installation=await api('/api/installation');if(installation.mode!=='self-hosted')return;const current=el('section',undefined,'account-card');current.append(el('h2','This installation'),el('p','Database provider: '+installation.provider+(installation.localDevelopment?' · local development':'')));
 const workspace=await api('/api/workspaces').catch(()=>null);
 if(workspace?.administrator){const report=el('p');report.setAttribute('role','status');const check=button('Test server connection',async()=>{check.disabled=true;try{const result=await api('/api/installation/check',{});report.textContent=`Database: ${result.database}. Accounts: ${result.accounts}. Email: ${result.email}.`;}catch(error){report.textContent=error.message;}finally{check.disabled=false;}});current.append(check,report);}else current.append(link('Sign in to manage your installation','/editor/account.html'));
 content.insertBefore(current,panel);
 }catch{/* The setup builder also works before a self-hosted server exists. */}
}
if(connectionStatus)status();
return ()=>{if(!sharedDropdowns)dropdowns.destroy();};
}
