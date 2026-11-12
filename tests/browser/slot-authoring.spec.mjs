import {test,expect,seed,saved,select,fixture} from './fixtures.mjs';

const slots=async page=>(await saved(page)).component_properties.filter(p=>p.kind==='slot');
const dialog=page=>page.getByRole('dialog',{name:'Edit slot property',exact:true});

test('a formatted slot description is authored once, previewed, applied to every variant and shown on instances',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.master);
 await page.locator('#component-panel .slot-property-row').first().hover();await page.getByRole('button',{name:'Edit slot property Body',exact:true}).click();
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
 await page.locator('#component-panel .slot-property-row').first().hover();await page.getByRole('button',{name:'Edit slot property Body',exact:true}).click();
 await dialog(page).getByLabel('Apply to all variants',{exact:true}).uncheck();
 await dialog(page).getByLabel('Slot description',{exact:true}).fill('Only here');
 await dialog(page).getByRole('button',{name:'Save property',exact:true}).click();
 await expect.poll(async()=>(await slots(page)).map(p=>p.slot_settings.description)).toEqual(['Only here','']);
 await page.locator('#component-panel .slot-property-row').first().hover();await page.getByRole('button',{name:'Remove slot property Body',exact:true}).click();
 await page.getByRole('menuitem',{name:'Remove from all 2 variants',exact:true}).click();
 await expect.poll(async()=>(await slots(page)).length).toBe(0);
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');
 await expect.poll(async()=>(await slots(page)).length).toBe(2);
});

test('the slot property chip and Edit slot property dialog follow Figma\'s layout',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.master);
 const row=page.locator('#component-panel .slot-property-row').first(),chip=row.locator('.slot-property-name'),edit=page.getByRole('button',{name:'Edit slot property Body',exact:true});
 // A filled 24 px chip with the slot glyph, name and use count; edit and remove appear on hover or keyboard focus.
 await expect(chip).toHaveText('Body'+'· 1 item');expect((await chip.boundingBox()).height).toBe(24);await expect(chip.locator('svg')).toBeVisible();
 await page.mouse.move(5,5);await expect(edit).toBeHidden();await chip.focus();await expect(edit).toBeVisible();await expect(page.getByRole('button',{name:'Remove slot property Body',exact:true})).toBeVisible();
 await edit.click();const d=dialog(page),box=await d.boundingBox(),at=async locator=>{const b=await locator.boundingBox();return [Math.round(b.x-box.x),Math.round(b.width),Math.round(b.height)];};
 await expect(d.locator('header strong')).toHaveText('Edit slot property');expect(box.width).toBe(304);
 // Name beside a 136 px field; a description box with its tools underneath; 120 px limit fields on the right.
 expect(await at(d.getByLabel('Slot name',{exact:true}))).toEqual([151,136,24]);
 const description=d.getByLabel('Slot description',{exact:true}),tools=d.getByRole('toolbar',{name:'Description formatting'}).getByRole('button');
 expect((await description.boundingBox()).height).toBe(112);expect((await tools.first().boundingBox()).y).toBeGreaterThan((await description.boundingBox()).y+111);
 expect(await tools.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).toEqual(['Bold','Italic','Strikethrough','Heading','Bulleted list','Numbered list','Link','Code','Code block']);
 expect(await tools.evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().x-nodes[0].getBoundingClientRect().x)))).toEqual([0,30,60,90,120,150,180,210,240]);
 for(const name of ['Minimum layers','Maximum layers'])expect(await at(d.getByLabel(name,{exact:true}))).toEqual([167,120,24]);
 await expect(d.getByText('Flag non-preferred instances',{exact:true})).toBeVisible();
 // The new tools write the stored markers and the preview shows them formatted.
 await description.fill('Title\nold\nx=1');await description.evaluate(node=>node.setSelectionRange(0,5));await d.getByRole('button',{name:'Heading',exact:true}).click();
 await description.evaluate(node=>node.setSelectionRange(8,11));await d.getByRole('button',{name:'Strikethrough',exact:true}).click();
 await description.evaluate(node=>node.setSelectionRange(node.value.length-3,node.value.length));await d.getByRole('button',{name:'Code block',exact:true}).click();
 await expect(description).toHaveValue('# Title\n~~old~~\n```\nx=1\n```');
 const preview=d.getByLabel('Description preview',{exact:true});await expect(preview.locator('h4')).toHaveText('Title');await expect(preview.locator('s')).toHaveText('old');await expect(preview.locator('pre code')).toHaveText('x=1');
});
