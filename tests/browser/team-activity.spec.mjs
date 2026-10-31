import {test,expect} from '@playwright/test';
import {teamFixture} from '../helpers/team-fixture.mjs';
import {fixture} from './fixtures.mjs';

test('simulated reviewer receives a mention, marks it read and approves a saved version',async({browser},info)=>{
 test.setTimeout(60000);const baseURL='http://127.0.0.1:4210',f=await teamFixture({server:true,baseURL}),contexts=[],errors=[];
 try{
  const id=(await f.owner.call('/api/documents'+f.query,JSON.parse(fixture().body))).data.id;
  async function open(actor){const context=await browser.newContext();contexts.push(context);await context.addCookies([...actor.cookies].map(([name,value])=>({name,value,url:baseURL})));await context.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(baseURL+'/editor/index.html?cloud='+id+'&workspace=org:'+f.org.id);await expect(page.locator('[data-loading-screen]')).toBeHidden();return page;}
  const owner=await open(f.owner),reviewer=await open(f.reviewer);
  await owner.getByRole('button',{name:'Comments',exact:true}).click();await owner.getByLabel('New comment',{exact:true}).fill('Check @Reviewer');await owner.locator('.mention-picker').getByRole('button',{name:'Simulated Reviewer',exact:true}).click();await owner.getByRole('button',{name:'Post comment',exact:true}).click();await expect(owner.locator('.team-thread')).toContainText('@Simulated Reviewer');
  await reviewer.getByRole('button',{name:/^Notifications/}).click();const inbox=reviewer.getByRole('dialog',{name:'Notifications',exact:true});await expect(inbox).toContainText('mentioned you');await inbox.getByRole('button',{name:'Mark read',exact:true}).click();await inbox.getByRole('button',{name:'Unread',exact:true}).click();await expect(inbox).toContainText("You don't have any notifications.");await reviewer.screenshot({path:info.outputPath('review-inbox.png')});await inbox.getByRole('button',{name:'Close',exact:true}).click();
  await owner.getByRole('button',{name:'Reviews',exact:true}).click();await owner.getByRole('button',{name:/^Reviewer:/}).click();await owner.getByRole('option',{name:'Simulated Reviewer',exact:true}).click();await owner.getByLabel('Review note').fill('Check spacing before release');await owner.getByRole('button',{name:'Request review',exact:true}).click();await expect(owner.locator('.team-review')).toContainText('pending');
  await reviewer.getByRole('button',{name:'Reviews',exact:true}).click();await reviewer.getByRole('button',{name:'Approve',exact:true}).click();await expect(reviewer.locator('.team-review')).toContainText('approved');await reviewer.screenshot({path:info.outputPath('review-approved.png')});expect(errors).toEqual([]);
 }finally{for(const c of contexts)await c.close();await f.close();}
});
