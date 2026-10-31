import {test,expect} from '@playwright/test';
import {teamFixture} from '../helpers/team-fixture.mjs';
import {fixture,select,field} from './fixtures.mjs';
test('two simulated editors merge independent edits, undo their own work and recover explicit collisions',async({browser},info)=>{
 test.setTimeout(120000);const baseURL='http://127.0.0.1:4211',f=await teamFixture({server:true,baseURL}),contexts=[],errors=[];
 try{
  const data=fixture(),file=(await f.owner.call('/api/documents'+f.query,JSON.parse(data.body))).data,id=file.id;
  async function pageFor(actor){const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});contexts.push(context);await context.addCookies([...actor.cookies].map(([name,value])=>({name,value,url:baseURL})));await context.route(/https?:\/\//,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.goto(baseURL+'/editor/index.html?cloud='+id+'&workspace=org:'+f.org.id);await expect(page.locator('[data-loading-screen]')).toBeHidden();return page;}
  const owner=await pageFor(f.owner);await owner.getByRole('button',{name:'Share',exact:true}).click();await owner.getByRole('button',{name:'Editing mode: Hand off editing',exact:true}).click();await owner.getByRole('option',{name:'Edit together',exact:true}).click();await owner.getByRole('button',{name:'Save access',exact:true}).click();await expect(owner.getByRole('region',{name:'Editing session'})).toContainText('Editing together');
  const designer=await pageFor(f.designer);await expect(designer.getByRole('region',{name:'Editing session'})).toContainText('Editing together');await expect(owner.getByRole('button',{name:'Simulated Designer',exact:true})).toBeVisible();expect(await owner.getByRole('button',{name:'Simulated Designer',exact:true}).evaluate(n=>({width:n.getBoundingClientRect().width,radius:getComputedStyle(n).borderRadius,color:getComputedStyle(n).backgroundColor}))).toEqual({width:24,radius:'50%',color:'rgb(140, 85, 179)'});
  const serverDoc=async()=>JSON.parse((await f.owner.call(f.path(id))).data.body);
  await select(owner,data.label);await select(designer,data.box);await field(owner,'X-position','100');await expect(owner.locator('#undo')).toBeEnabled();await field(designer,'Y-position','240');
  await expect.poll(async()=>{const d=await serverDoc();return [d.shapes.find(s=>s.id===data.label).x,d.shapes.find(s=>s.id===data.box).y];}).toEqual([100,240]);
  await expect(owner.getByLabel('X-position',{exact:true})).toHaveValue('100');await select(owner,data.label);await owner.keyboard.press('ControlOrMeta+z');await expect.poll(async()=>{const d=await serverDoc();return [d.shapes.find(s=>s.id===data.label).x,d.shapes.find(s=>s.id===data.box).y];}).toEqual([80,240]);
  await designer.mouse.move(700,400);await expect(owner.locator('.team-cursor')).toHaveCount(1);await owner.screenshot({path:info.outputPath('editing-together.png')});
  // Both edits are made with transport paused, then reconnected in sequence.
  await owner.getByLabel('Document name',{exact:true}).fill('Owner collision');await owner.getByLabel('Document name',{exact:true}).press('Enter');await contexts[0].setOffline(true);await designer.getByLabel('Document name',{exact:true}).fill('Designer collision');await designer.getByLabel('Document name',{exact:true}).press('Enter');await contexts[1].setOffline(true);
  await contexts[0].setOffline(false);await owner.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(async()=>(await serverDoc()).name).toBe('Owner collision');
  await contexts[1].setOffline(false);await designer.evaluate(()=>window.dispatchEvent(new Event('online')));await expect(designer.getByRole('button',{name:'Keep my overlapping edits',exact:true})).toBeVisible();await designer.getByRole('button',{name:'Keep my overlapping edits',exact:true}).click();await expect.poll(async()=>(await serverDoc()).name).toBe('Designer collision');
  expect(errors).toEqual([]);
 }finally{for(const c of contexts)await c.close().catch(()=>{});await f.close();}
});
