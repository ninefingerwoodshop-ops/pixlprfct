import {test,expect} from '@playwright/test';
import {teamFixture} from '../helpers/team-fixture.mjs';
import {fixture} from './fixtures.mjs';

test('a share link brings a signed-in outsider into one file as a viewer, and turning it off sends them out',async({browser},info)=>{
 test.setTimeout(120000);const baseURL='http://127.0.0.1:4214',f=await teamFixture({server:true,baseURL}),contexts=[],errors=[];
 try{
  const data=fixture(),file=(await f.owner.call('/api/documents'+f.query,JSON.parse(data.body))).data,id=file.id;
  async function contextFor(actor){const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark',permissions:['clipboard-read','clipboard-write']});contexts.push(context);if(actor)await context.addCookies([...actor.cookies].map(([name,value])=>({name,value,url:baseURL})));await context.route(/https?:\/\//,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));return page;}
  const owner=await contextFor(f.owner);await owner.goto(baseURL+'/editor/index.html?cloud='+id+'&workspace=org:'+f.org.id);await expect(owner.locator('[data-loading-screen]')).toBeHidden();
  // The owner turns link sharing on in the Share dialog and copies the link.
  await owner.getByRole('button',{name:'Share',exact:true}).click();const share=owner.getByRole('dialog',{name:'Share file'}),box=share.getByRole('region',{name:'Link sharing'});
  await expect(box).toContainText('Off. Only workspace members can open this file.');await box.getByRole('button',{name:'Create share link',exact:true}).click();
  await expect(box).toContainText('Anyone who has this link and signs in can view this file.');const field=box.getByLabel('Share link',{exact:true});await expect(field).toHaveValue(new RegExp('^'+baseURL+'/editor/account\\.html\\?join=[A-Za-z0-9_-]{43}$'));
  const url=await field.inputValue();await box.getByRole('button',{name:'Copy share link',exact:true}).click();expect(await owner.evaluate(()=>navigator.clipboard.readText())).toBe(url);
  await share.getByRole('button',{name:'Done',exact:true}).click();
  // Someone who is not signed in is asked to sign in, and the link survives that step.
  const stranger=await contextFor(null);await stranger.goto(url);await expect(stranger.getByText('Sign in to view the file that was shared with you.',{exact:true})).toBeVisible();expect(new URL(stranger.url()).searchParams.get('join')).toBe(new URL(url).searchParams.get('join'));
  // A signed-in outsider lands in the file, read-only, and cannot reach the Share dialog.
  const guest=await contextFor(f.outsider);await guest.goto(url);await guest.waitForURL(/\/editor\/index\.html\?cloud=/);await expect(guest.locator('[data-loading-screen]')).toBeHidden();
  await expect(guest.getByRole('region',{name:'Editing session'})).toContainText('Can view');await expect(guest.getByLabel('Document name',{exact:true})).toHaveValue('Browser acceptance');
  await expect(guest.getByText('Acceptance card',{exact:true}).first()).toBeVisible();await expect(guest.getByRole('button',{name:'Share',exact:true})).toBeHidden();
  await expect(guest.getByRole('button',{name:'Start editing',exact:true})).toHaveCount(0);await guest.screenshot({path:info.outputPath('guest.png')});
  // Each sees the other in the file, and the owner sees who joined by the link.
  await expect(owner.getByRole('button',{name:'Follow Simulated Outsider',exact:true})).toBeVisible();await expect(guest.getByRole('button',{name:'Follow Simulated Owner',exact:true})).toBeVisible();
  await owner.getByRole('button',{name:'Share',exact:true}).click();await expect(box).toContainText('Joined by link');await expect(box.locator('.team-person')).toContainText('Simulated Outsider');
  // Turning the link off asks first, names how many people lose access, and ends the guest's access.
  await box.getByRole('button',{name:'Turn off link',exact:true}).click();const confirm=owner.getByRole('alertdialog',{name:'Turn off link sharing?'});await expect(confirm).toContainText('1 person who joined through it lose access.');
  await confirm.getByRole('button',{name:'Turn off link',exact:true}).click();await expect(box).toContainText('Off. Only workspace members can open this file.');
  expect((await f.outsider.call(f.path(id))).status).toBe(403);await expect(owner.getByRole('button',{name:'Follow Simulated Outsider',exact:true})).toHaveCount(0,{timeout:20000});
  await guest.goto(url);await expect(guest.getByText('This link is no longer active. Ask the person who shared it for a new one.',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
 }finally{for(const context of contexts)await context.close();await f.close();}
});
