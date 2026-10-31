import {test,expect,seed,saved,field,select,snapshot} from './fixtures.mjs';

test('page Styles creates text, color and effect styles without selection, applies and persists them',async({page})=>{
 const {box,label}=await seed(page);
 for(const [kind,name] of [['text','Type / Body'],['color','Brand / Primary'],['effect','Elevation / Card']]){
  if(kind==='text'){await page.getByRole('button',{name:'Create style',exact:true}).click();await page.getByRole('menuitem',{name:'Text',exact:true}).click();}else await page.getByRole('button',{name:'Create '+kind+' style',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Create new '+kind+' style',exact:true});await expect(dialog).toBeVisible();
  await field(dialog,kind[0].toUpperCase()+kind.slice(1)+' style name',name);
  if(kind==='text'){await expect(dialog.locator('summary')).toHaveText('Properties');await snapshot(page,'page-text-style-editor.png',dialog);}
  if(kind==='color'){await field(dialog,'Fill 1 hex','345678');await snapshot(page,'page-color-style-editor.png',dialog);}
  await dialog.getByRole('button',{name:'Create style',exact:true}).click();await expect(dialog).toBeHidden();
  await expect.poll(async()=>((await saved(page))[kind+'_styles']??[]).some(s=>s.name===name)).toBe(true);
 }
 await snapshot(page,'page-document-styles.png',page.locator('.right-panel'));
 await select(page,box);await page.getByRole('button',{name:'Apply fill styles and variables',exact:true}).click();await page.getByRole('button',{name:'Apply color style Brand / Primary',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===box).fill).toBe('#345678');
 await page.getByRole('button',{name:'Edit fill color style',exact:true}).click();const color=page.getByRole('dialog',{name:'Edit color style',exact:true});await field(color,'Fill 1 hex','567890');await color.getByRole('button',{name:'Done',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===box).fill).toBe('#567890');
 await select(page,label);await page.getByRole('button',{name:'Apply text style',exact:true}).click();await page.getByRole('button',{name:'Apply Type / Body',exact:true}).click();
 await page.keyboard.press('Escape');await page.reload();await expect(page.getByRole('button',{name:'color style Brand / Primary',exact:true})).toBeVisible();
 const doc=await saved(page);expect(doc.shapes.find(s=>s.id===box).fill_style).toBe(doc.color_styles[0].id);expect(doc.shapes.find(s=>s.id===label).text_style).toBe(doc.text_styles[0].id);
 await page.getByRole('button',{name:'text style Type / Body',exact:true}).press('F2');await field(page,'Rename text style','Type / Body renamed');await expect(page.getByRole('button',{name:'text style Type / Body renamed',exact:true})).toBeVisible();
});

test('page color-style editor reuses the gradient picker without closing its parent editor',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'Create color style',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Create new color style',exact:true});await field(dialog,'Color style name','Brand / Gradient');await dialog.getByRole('button',{name:'Fill 1 color picker',exact:true}).click();
 const paint=page.locator('#style-fill-paint-popover');await expect(paint).toBeVisible();await paint.getByRole('radio',{name:'Gradient',exact:true}).click();await expect(paint.getByLabel('Color stop 1 hex',{exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await dialog.getByRole('button',{name:'Create style',exact:true}).click();await expect.poll(async()=>(await saved(page)).color_styles[0]?.paints[0]?.gradient?.stops?.length).toBe(2);
});
