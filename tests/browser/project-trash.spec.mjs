import {test,expect,key,fixture} from './fixtures.mjs';

const cloudId='11111111-2222-4333-8444-555555555555';
async function home(page,{cloud=true}={}){
 const requests=[];let remaining=cloud?[{id:cloudId,name:'Cloud old',revision:7,created_at:1,updated_at:1793318400000,deleted_at:1793318400000,created_by:'me',can_delete:true}]:[];
 await page.route(/\/api\/documents/,async route=>{
  const request=route.request(),url=new URL(request.url());requests.push({method:request.method(),path:url.pathname,query:url.search,revision:request.headers()['if-match']});
  if(request.method()==='GET')return route.fulfill({json:{documents:url.searchParams.get('trash')==='1'?remaining:[],next:null}});
  if(request.method()==='DELETE'&&url.searchParams.get('permanent')==='1'){remaining=[];return route.fulfill({json:{id:cloudId,deleted:true}});}
  return route.fulfill({status:500,json:{error:'Unexpected request'}});
 });
 const body=fixture().body;
 await page.goto('/editor/project-home.html');await expect(page.locator('#home-new')).toBeVisible();
 await page.evaluate(({key,body})=>localStorage.setItem(key,JSON.stringify({version:1,activeId:'keep',files:[{id:'keep',name:'Keep',body,updatedAt:2},{id:'old',name:'Old sketch',body,updatedAt:1,deletedAt:3}]})),{key,body});
 await page.reload();await expect(page.locator('#home-new')).toBeVisible();
 await page.locator('[data-scope="trash"]').click();await expect(page.locator('#home-title')).toHaveText('Trash');
 return requests;
}
const card=(page,name)=>page.locator('.project-card',{has:page.getByText(name,{exact:true})});
async function chooseDeleteForever(page,name){
 await page.getByRole('button',{name:'Actions for '+name}).click();
 const menu=page.getByRole('menu',{name:'Project actions'});await expect(menu.getByRole('menuitem')).toHaveText(['Restore','Permanently delete']);
 await menu.getByRole('menuitem',{name:'Permanently delete'}).click();
 const dialog=page.getByRole('alertdialog',{name:'Permanently delete project'});await expect(dialog).toBeVisible();return dialog;
}

test('a local project in Trash is only deleted forever after explicit confirmation',async({page})=>{
 await home(page,{cloud:false});
 await expect(page.locator('#home-description')).toHaveText('Restore projects moved to Trash, or permanently delete them.');
 await expect(card(page,'Old sketch')).toBeVisible();await expect(card(page,'Keep')).toHaveCount(0);
 const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).files.map(f=>f.id),key);
 let dialog=await chooseDeleteForever(page,'Old sketch');
 await expect(dialog).toHaveText(/Permanently delete project.*You’re about to permanently delete the project Old sketch from this device\. You won’t be able to restore it\./);
 // Cancel has focus, so Enter and Escape both keep the project.
 await expect(dialog.getByRole('button',{name:'Cancel'})).toBeFocused();
 await page.keyboard.press('Enter');await expect(dialog).toBeHidden();expect(await stored()).toEqual(['keep','old']);
 dialog=await chooseDeleteForever(page,'Old sketch');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();expect(await stored()).toEqual(['keep','old']);
 dialog=await chooseDeleteForever(page,'Old sketch');await dialog.getByRole('button',{name:'Close'}).click();await expect(dialog).toBeHidden();expect(await stored()).toEqual(['keep','old']);
 await expect(card(page,'Old sketch')).toBeVisible();
 dialog=await chooseDeleteForever(page,'Old sketch');await dialog.getByRole('button',{name:'Permanently delete'}).click();
 await expect(dialog).toBeHidden();await expect(card(page,'Old sketch')).toHaveCount(0);
 await expect(page.locator('#home-status')).toHaveText('“Old sketch” permanently deleted.');
 expect(await stored()).toEqual(['keep']);
 await expect(page.getByRole('heading',{name:'Trash is empty'})).toBeVisible();
 // The remaining project is untouched and still listed.
 await page.locator('[data-scope="local"]').click();await expect(card(page,'Keep')).toBeVisible();
});

test('a project that changed in another tab is not deleted',async({page})=>{
 await home(page,{cloud:false});
 const dialog=await chooseDeleteForever(page,'Old sketch');
 await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key));data.files[1].body=data.files[1].body.replace('Browser acceptance','Edited elsewhere');localStorage.setItem(key,JSON.stringify(data));},key);
 await dialog.getByRole('button',{name:'Permanently delete'}).click();
 await expect(page.locator('#home-error')).toContainText('changed in another tab');
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).files.length,key)).toBe(2);
});

test('a cloud project is permanently deleted with its revision, and only after confirmation',async({page})=>{
 const requests=await home(page);
 await expect(card(page,'Cloud old')).toBeVisible();
 let dialog=await chooseDeleteForever(page,'Cloud old');
 await expect(dialog).toContainText('You’re about to permanently delete the project Cloud old and its version history. You won’t be able to restore it.');
 await dialog.getByRole('button',{name:'Cancel'}).click();expect(requests.filter(r=>r.method!=='GET')).toEqual([]);
 dialog=await chooseDeleteForever(page,'Cloud old');await dialog.getByRole('button',{name:'Permanently delete'}).click();
 await expect(card(page,'Cloud old')).toHaveCount(0);await expect(page.locator('#home-status')).toHaveText('“Cloud old” permanently deleted.');
 expect(requests.filter(r=>r.method!=='GET')).toEqual([{method:'DELETE',path:'/api/documents/'+cloudId,query:'?permanent=1',revision:'7'}]);
 // The local project in Trash was not affected.
 await expect(card(page,'Old sketch')).toBeVisible();
});

test('moving a project to Trash asks first, as Figma does, and Cancel keeps it',async({page})=>{
 await home(page,{cloud:false});await page.locator('[data-scope="local"]').click();
 const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).files.filter(f=>f.deletedAt).map(f=>f.id),key);
 const ask=async()=>{await page.getByRole('button',{name:'Actions for Keep'}).click();await page.getByRole('menuitem',{name:'Move to trash'}).click();const dialog=page.getByRole('alertdialog',{name:'Move project to trash'});await expect(dialog).toBeVisible();return dialog;};
 let dialog=await ask();
 await expect(dialog.locator('.confirm-dialog-body')).toHaveText('You’re about to move the project Keep to trash.You can always restore it later from the Trash section.');
 await expect(dialog.locator('strong')).toHaveText('Keep');await expect(dialog.getByRole('button',{name:'Cancel'})).toBeFocused();
 // Figma's dialog is 320 px wide with a blue, not red, confirm button.
 expect((await dialog.boundingBox()).width).toBe(320);await expect(dialog.getByRole('button',{name:'Move project to trash'})).toHaveClass('primary');
 await dialog.getByRole('button',{name:'Cancel'}).click();expect(await stored()).toEqual(['old']);await expect(card(page,'Keep')).toBeVisible();
 dialog=await ask();await dialog.getByRole('button',{name:'Move project to trash'}).click();
 await expect(page.locator('#home-status')).toHaveText('“Keep” moved to Trash.');expect((await stored()).sort()).toEqual(['keep','old']);
});
