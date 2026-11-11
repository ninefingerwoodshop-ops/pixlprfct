import {test,expect} from '@playwright/test';
import {teamFixture} from '../helpers/team-fixture.mjs';
import {fixture} from './fixtures.mjs';

test('self-hosted editor: delete a saved version and delete a trashed file forever',async({browser})=>{
 test.setTimeout(90000);
 const baseURL='http://127.0.0.1:4211',f=await teamFixture({server:true,baseURL}),errors=[];let context;
 try{
  const design=JSON.parse(fixture().body),ok=(r,status=200)=>{expect(r.status,JSON.stringify(r.data)).toBe(status);return r.data;};
  const id=ok(await f.owner.call('/api/documents'+f.query,design),201).id,doomed=ok(await f.owner.call('/api/documents'+f.query,{...design,name:'Doomed file'}),201).id;
  for(const label of ['Keep this','Remove this'])ok(await f.owner.call(f.path(id,'/versions'),undefined,{method:'POST',revision:1,headers:{'x-version-label':encodeURIComponent(label)}}),201);
  ok(await f.owner.call(f.path(doomed,'/versions'),undefined,{method:'POST',revision:1,headers:{'x-version-label':'Doomed version'}}),201);
  ok(await f.owner.call(f.path(doomed),undefined,{method:'DELETE',revision:1}));
  context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});
  await context.addCookies([...f.owner.cookies].map(([name,value])=>({name,value,url:baseURL})));
  await context.route(/https?:\/\//,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(baseURL+'/editor/index.html?cloud='+id+'&workspace=org:'+f.org.id);await expect(page.locator('[data-loading-screen]')).toBeHidden();
  await page.evaluate(()=>document.getElementById('cloud-files').click());
  const files=page.getByRole('dialog',{name:'Cloud files'});await expect(files).toBeVisible();
  await files.getByRole('button',{name:'Version history',exact:true}).click();
  const history=page.getByRole('dialog',{name:'Version history'}),rows=history.locator('.cloud-row');
  await expect(rows).toHaveCount(2);
  const versions=async()=>ok(await f.owner.call(f.path(id,'/versions'))).versions.map(v=>v.label).sort();
  // Cancel keeps the version.
  await rows.filter({hasText:'Remove this'}).getByRole('button',{name:'Delete',exact:true}).click();
  let confirm=page.getByRole('alertdialog',{name:'Delete this version?'});await expect(confirm).toContainText('“Remove this”');await expect(confirm).toContainText('The current design is not changed.');
  await confirm.getByRole('button',{name:'Cancel'}).click();await expect(rows).toHaveCount(2);expect(await versions()).toEqual(['Keep this','Remove this']);
  await rows.filter({hasText:'Remove this'}).getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByRole('alertdialog',{name:'Delete this version?'}).getByRole('button',{name:'Delete version'}).click();
  await expect(rows).toHaveCount(1);await expect(rows).toContainText('Keep this');await expect(history.locator('.cloud-info')).toHaveText('Version deleted.');
  expect(await versions()).toEqual(['Keep this']);
  // Nothing here is older than 30 days, so pruning removes nothing.
  await history.getByRole('button',{name:'Delete automatic backups older than 30 days'}).click();
  await page.getByRole('alertdialog',{name:'Delete old automatic backups?'}).getByRole('button',{name:'Delete backups'}).click();
  await expect(history.locator('.cloud-info')).toHaveText('No automatic backups are older than 30 days.');expect(await versions()).toEqual(['Keep this']);
  await history.getByRole('button',{name:'Close history'}).click();
  // Trash in the files dialog: delete the other file forever.
  await files.getByRole('button',{name:'Show Trash'}).click();
  const doomedRow=files.locator('.cloud-row').filter({hasText:'Doomed file'});await expect(doomedRow).toBeVisible();
  await doomedRow.getByRole('button',{name:'Delete forever'}).click();
  confirm=page.getByRole('alertdialog',{name:'Delete forever?'});await expect(confirm).toContainText('“Doomed file” and its version history will be permanently deleted.');
  await confirm.getByRole('button',{name:'Cancel'}).click();await expect(doomedRow).toBeVisible();expect((await f.owner.call(f.path(doomed))).status).toBe(200);
  await doomedRow.getByRole('button',{name:'Delete forever'}).click();await page.getByRole('alertdialog',{name:'Delete forever?'}).getByRole('button',{name:'Delete forever'}).click();
  await expect(doomedRow).toHaveCount(0);await expect(files).toContainText('Trash is empty.');
  expect((await f.owner.call(f.path(doomed))).status).toBe(404);
  expect((await f.db.query('SELECT id FROM document_versions WHERE document_id=?',[doomed])).length).toBe(0);
  // The open file and its remaining version are intact.
  expect(ok(await f.owner.call(f.path(id))).deleted_at).toBeNull();expect(await versions()).toEqual(['Keep this']);
  expect(errors).toEqual([]);
 }finally{await context?.close();await f.close();}
});
