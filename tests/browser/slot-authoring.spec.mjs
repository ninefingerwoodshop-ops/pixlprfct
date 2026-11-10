import {test,expect,seed,saved,select,fixture} from './fixtures.mjs';

const slots=async page=>(await saved(page)).component_properties.filter(p=>p.kind==='slot');
const dialog=page=>page.getByRole('dialog',{name:'Edit slot property',exact:true});

test('a formatted slot description is authored once, previewed, applied to every variant and shown on instances',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.master);
 await page.getByRole('button',{name:'Edit slot property Body',exact:true}).click();
 const description=dialog(page).getByLabel('Slot description',{exact:true}),preview=dialog(page).getByLabel('Description preview',{exact:true});
 await expect(preview).toBeHidden();
 await description.fill('Use one icon');await description.evaluate(node=>node.setSelectionRange(4,7));
 await dialog(page).getByRole('button',{name:'Bold',exact:true}).click();
 await expect(description).toHaveValue('Use **one** icon');await expect(preview.locator('strong')).toHaveText('one');
 // Markup typed into a description is shown as text, never interpreted.
 await description.fill('Use **one** icon. <img src=x onerror="window.__xss=1">\n\n- Keep it [short](https://example.com/guide)\n- No text');
 await expect(preview.locator('li')).toHaveCount(2);await expect(preview.locator('img')).toHaveCount(0);
 await expect(preview.locator('a')).toHaveAttribute('href','https://example.com/guide');await expect(preview.locator('a')).toHaveAttribute('rel','noopener noreferrer');
 // The fixture's second variant already has a Body slot, so the set-wide box starts ticked.
 const everywhere=dialog(page).getByLabel('Apply to all variants',{exact:true});await expect(everywhere).toBeChecked();
 await dialog(page).getByLabel('Maximum layers',{exact:true}).fill('3');
 await dialog(page).getByRole('button',{name:'Save property',exact:true}).click();
 await expect.poll(async()=>(await slots(page)).map(p=>[p.component_id,p.slot_settings.max_children,p.slot_settings.description.startsWith('Use **one** icon.')])).toEqual([[data.master,3,true],[data.alternate,3,true]]);
 expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
 // One undo restores both variants.
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');
 await expect.poll(async()=>(await slots(page)).map(p=>p.slot_settings.description)).toEqual(['','']);
 await page.keyboard.press('Control+Shift+z');
 await expect.poll(async()=>(await slots(page)).every(p=>p.slot_settings.max_children===3)).toBe(true);
 await select(page,data.instance);
 const shown=page.locator('#component-panel .slot-description');await expect(shown.locator('strong')).toHaveText('one');await expect(shown.locator('li')).toHaveCount(2);
});
test('unticking the box keeps an edit in one variant, and removal can cover the whole set',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.master);
 await page.getByRole('button',{name:'Edit slot property Body',exact:true}).click();
 await dialog(page).getByLabel('Apply to all variants',{exact:true}).uncheck();
 await dialog(page).getByLabel('Slot description',{exact:true}).fill('Only here');
 await dialog(page).getByRole('button',{name:'Save property',exact:true}).click();
 await expect.poll(async()=>(await slots(page)).map(p=>p.slot_settings.description)).toEqual(['Only here','']);
 await page.getByRole('button',{name:'Remove slot property Body',exact:true}).click();
 await page.getByRole('menuitem',{name:'Remove from all 2 variants',exact:true}).click();
 await expect.poll(async()=>(await slots(page)).length).toBe(0);
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');
 await expect.poll(async()=>(await slots(page)).length).toBe(2);
});
