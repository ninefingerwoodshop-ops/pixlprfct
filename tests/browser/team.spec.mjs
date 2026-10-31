import {test,expect} from '@playwright/test';
import {mkdtemp,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {teamFixture} from '../helpers/team-fixture.mjs';
import {fixture} from './fixtures.mjs';

test('simulated team: roles, review, handoff, offline recovery, persistent restart and backup restore',async({browser},testInfo)=>{
 test.setTimeout(120000);
 const dir=await mkdtemp(path.join(tmpdir(),'pixl-team-')),sqlite=path.join(dir,'team.sqlite'),baseURL='http://127.0.0.1:4209';
 const f=await teamFixture({server:true,baseURL,sqlitePath:sqlite}),contexts=[],errors=[];
 try{
  const data=fixture(),file=(await f.owner.call('/api/documents'+f.query,JSON.parse(data.body))).data,id=file.id;
  const sharing=(await f.owner.call(f.path(id,'/sharing'))).data;
  expect((await f.owner.call(f.path(id,'/sharing'),{defaultRole:'editor',overrides:{[f.reviewer.user.id]:'commenter',[f.viewer.user.id]:'viewer'}},{method:'PUT',revision:sharing.revision})).status).toBe(200);
  async function pageFor(actor){const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});contexts.push(context);await context.addCookies([...actor.cookies].map(([name,value])=>({name,value,url:baseURL})));await context.route(/https?:\/\//,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(baseURL+'/editor/index.html?cloud='+id+'&workspace=org:'+f.org.id);await expect(page.locator('[data-loading-screen]')).toBeHidden();await expect(page.getByRole('button',{name:'Share',exact:true})).toBeVisible();return page;}
  const owner=await pageFor(f.owner),designer=await pageFor(f.designer),reviewer=await pageFor(f.reviewer),viewer=await pageFor(f.viewer);
  await expect(viewer.getByRole('button',{name:'Start editing',exact:true})).toHaveCount(0);
  await owner.getByRole('button',{name:'Start editing',exact:true}).click();await expect(owner.getByRole('region',{name:'Editing session'})).toContainText('You’re editing');
  const name=owner.getByLabel('Document name',{exact:true});await name.fill('Owner saved work');await name.press('Enter');await expect.poll(async()=>(await f.owner.call(f.path(id))).data.name).toBe('Owner saved work');
  await designer.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(designer.getByRole('region',{name:'Editing session'})).toContainText('Simulated Owner');await designer.getByRole('button',{name:'Request editing',exact:true}).click();
  await owner.evaluate(()=>window.dispatchEvent(new Event('focus')));await owner.getByRole('button',{name:'Hand off to Simulated Designer',exact:true}).click();await designer.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(designer.getByRole('region',{name:'Editing session'})).toContainText('You’re editing');await expect(designer.getByLabel('Document name',{exact:true})).toHaveValue('Owner saved work');
  await reviewer.getByRole('button',{name:'Comments',exact:true}).click();await reviewer.getByLabel('New comment',{exact:true}).fill('Simulated review: check the spacing.');await reviewer.getByRole('button',{name:'Post comment',exact:true}).click();await expect(reviewer.locator('.team-thread')).toContainText('Simulated Reviewer');
  await viewer.getByRole('button',{name:'Comments',exact:true}).click();await expect(viewer.getByLabel('New comment',{exact:true})).toBeDisabled();await expect(viewer.locator('.team-thread')).toContainText('Simulated review');
  await reviewer.getByRole('button',{name:'Resolve thread',exact:true}).click();await expect(reviewer.locator('.team-thread')).toHaveCount(0);await reviewer.getByRole('button',{name:'Show resolved comments'}).click();await expect(reviewer.locator('.team-thread')).toContainText('Simulated review');
  await owner.getByRole('button',{name:'Share',exact:true}).click();const share=owner.getByRole('dialog',{name:'Share file'});await expect(share).toBeVisible();expect(await share.evaluate(n=>Math.round(n.getBoundingClientRect().width))).toBe(480);expect(await share.locator('header').evaluate(n=>n.getBoundingClientRect().height)).toBe(40);expect(await share.locator('.team-person').first().evaluate(n=>getComputedStyle(n).display)).toBe('flex');await owner.screenshot({path:testInfo.outputPath('simulated-team-sharing.png')});await share.getByRole('button',{name:'Close sharing'}).click();
  await reviewer.screenshot({path:testInfo.outputPath('simulated-team-comments.png')});
  // Suspend the network after an edit but before autosave. Local recovery survives.
  const designerName=designer.getByLabel('Document name',{exact:true});await designerName.fill('Unsaved during disconnect');await designerName.press('Enter');await designer.context().setOffline(true);await designer.evaluate(()=>window.dispatchEvent(new Event('offline')));await expect(designer.getByRole('region',{name:'Editing session'})).toContainText('Offline');
  expect((await f.owner.call(f.path(id))).data.name).toBe('Owner saved work');await designer.context().setOffline(false);await designer.evaluate(()=>window.dispatchEvent(new Event('online')));await expect(designer.getByRole('region',{name:'Editing session'})).toContainText('You’re editing');
  await designer.getByRole('button',{name:'Finish editing',exact:true}).click();await expect.poll(async()=>(await f.owner.call(f.path(id))).data.name).toBe('Unsaved during disconnect');
  await owner.getByRole('button',{name:'Share',exact:true}).click();await owner.getByRole('button',{name:'Access for Simulated Reviewer: Can comment',exact:true}).click();await owner.getByRole('option',{name:'Can view',exact:true}).click();await owner.getByRole('button',{name:'Save access',exact:true}).click();await expect(owner.getByRole('dialog',{name:'Share file'})).toHaveCount(0);expect((await f.reviewer.call(f.path(id,'/editing'))).data.role).toBe('viewer');
  await f.restart();expect((await f.owner.call(f.path(id))).data.name).toBe('Unsaved during disconnect');expect((await f.reviewer.call(f.path(id,'/comments'))).data.comments[0].resolved).toBe(true);
  // SQLite's online snapshot is restored into the same disposable installation.
  const backup=path.join(dir,'backup.sqlite');await f.db.query('VACUUM INTO ?',[backup],'run');await f.close();await copyFile(backup,sqlite);await f.restart();expect((await f.owner.call(f.path(id))).data.name).toBe('Unsaved during disconnect');expect((await f.reviewer.call(f.path(id,'/comments'))).data.comments.length).toBe(1);
  expect(errors).toEqual([]);
 }finally{for(const context of contexts)await context.close();await f.close();await rm(dir,{recursive:true,force:true});}
});
