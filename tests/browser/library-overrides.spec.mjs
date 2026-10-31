import {test,expect,fixture,seed,select,saved} from './fixtures.mjs';

test('library authors enable consumer overrides in the inspector and retain them on reopen',async({page})=>{
 const data=fixture({components:true});await seed(page,data);await select(page,data.master);
 for(const name of ['exposed text and visibility','size and layout','variants in this component set'])await page.getByRole('checkbox',{name:'Allow library '+name,exact:true}).check();
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===data.master).editor_meta?.library_overrides).toEqual({properties:true,sizing:true,variants:true});
 await page.reload();await expect(page.locator('[data-loading-screen]')).toBeHidden();await select(page,data.master);
 await expect(page.getByRole('checkbox',{name:'Allow library exposed text and visibility',exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'Allow library size and layout',exact:true}).uncheck();await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===data.master).editor_meta.library_overrides.sizing).toBe(false);
});
