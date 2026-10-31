import {test,expect} from '@playwright/test';
import {teamFixture} from '../helpers/team-fixture.mjs';
test('invitation recipient joins the correct workspace and sees first-project guidance',async({browser},info)=>{
 const baseURL='http://127.0.0.1:4212',f=await teamFixture({server:true,baseURL}),contexts=[];
 try{
  const invitation=(await f.owner.call('/api/auth/organization/invite-member',{organizationId:f.org.id,email:f.outsider.user.email,role:'member'})).data;
  async function pageFor(actor){const c=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});contexts.push(c);await c.addCookies([...actor.cookies].map(([name,value])=>({name,value,url:baseURL})));const page=await c.newPage();await page.goto(baseURL+'/editor/account.html?invitation='+invitation.id);return page;}
  const wrong=await pageFor(f.reviewer);await expect(wrong.getByText('This invitation belongs to another email address.',{exact:false})).toBeVisible();await expect(wrong.getByRole('button',{name:'Accept invitation',exact:true})).toHaveCount(0);
  const recipient=await pageFor(f.outsider);await expect(recipient.getByText('Join Simulated product team as member.',{exact:false})).toBeVisible();await recipient.getByRole('button',{name:'Accept invitation',exact:true}).click();await expect(recipient).toHaveURL(new RegExp('workspace=org%3A'+f.org.id));await expect(recipient.getByText('Shared designs for this workspace.',{exact:true})).toBeVisible();await expect(recipient.locator('.team-onboarding')).toContainText('Create your first shared design');await recipient.screenshot({path:info.outputPath('team-onboarding.png')});
  await recipient.locator('.team-onboarding').getByRole('button',{name:'New shared design',exact:true}).click();await expect(recipient.getByRole('dialog')).toBeVisible();
 }finally{for(const c of contexts)await c.close();await f.close();}
});
