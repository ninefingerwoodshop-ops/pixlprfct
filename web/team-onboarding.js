import {el,link,button,api} from './account-ui.js';
export async function teamOnboarding(root,workspace,{create,report}){
 const data=await api('/api/onboarding?'+new URLSearchParams({workspace}));if(!root.isConnected)return;
 const section=el('details',undefined,'team-onboarding'),summary=el('summary',data.shared?'Set up your team workspace':'Start working with a team');section.append(summary);section.open=!data.shared||!data.firstProject;
 if(!data.shared){section.append(el('p','Device projects stay on this device. Your personal cloud files belong to you. To collaborate, choose an organization or team workspace.'),link('Create or join a workspace','/editor/account.html'));}
 else{
  const rows=[{done:true,title:'Workspace ready',text:'Shared projects are saved on your team server.'},{done:data.teammates>1,title:'Invite teammates',text:data.teammates+' members can use this workspace.',href:data.manage?'/editor/admin.html?'+new URLSearchParams({section:'people',organization:data.organizationId}):null},{done:!!data.firstProject,title:'Create your first shared design',text:'Open a project, use Share to assign roles, then start editing.',action:create},{done:!!data.library,title:'Publish your design system',text:'In a source project, create components or styles, then open Assets → Manage libraries → Publish.',href:data.firstProject?'/editor/index.html?'+new URLSearchParams({cloud:data.firstProject.id,workspace,libraries:'file'}):null}];
  for(const row of rows){const item=el('div',undefined,'team-onboarding-step');item.append(el('span',row.done?'✓':'○'),el('strong',row.title),el('p',row.text));if(row.href)item.append(link(row.done?'Open':'Continue',row.href));else if(row.action)item.append(button('New shared design',row.action));section.append(item);}
 }
 root.querySelector('.home-header').after(section);section.addEventListener('error',e=>report(e.message));
}
