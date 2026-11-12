import {test,expect,seed,saved,select,fixture} from './fixtures.mjs';

const slots=async page=>(await saved(page)).component_properties.filter(p=>p.kind==='slot');
const dialog=page=>page.getByRole('dialog',{name:'Edit slot property',exact:true});

const openEditor=async page=>{await page.locator('#component-panel .slot-property-row').first().hover();await page.getByRole('button',{name:'Edit slot property Body',exact:true}).click();};
// Select the first occurrence of `word` inside the description editor.
const pick=(editor,word)=>editor.evaluate((node,word)=>{const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);for(let t=walker.nextNode();t;t=walker.nextNode()){const at=t.nodeValue.indexOf(word);if(at<0)continue;const range=document.createRange();range.setStart(t,at);range.setEnd(t,at+word.length);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);node.focus();selection.removeAllRanges();selection.addRange(range);return true;}return false;},word);

test('a slot description is edited as formatted text and each change applies at once to every variant',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.master);await openEditor(page);
 const d=dialog(page),description=d.getByRole('textbox',{name:'Slot description',exact:true}),tool=name=>d.getByRole('button',{name,exact:true});
 // A floating panel beside the properties: no Save button, and the canvas stays usable.
 await expect(d.getByRole('button',{name:/Save|Create/})).toHaveCount(0);expect(await d.evaluate(node=>node.matches(':modal'))).toBe(false);
 const box=await d.boundingBox(),side=await page.locator('.right-panel').boundingBox();expect(Math.round(side.x-box.x-box.width)).toBe(2);
 await expect(description).toHaveClass(/empty/);expect(await description.evaluate(node=>getComputedStyle(node,'::before').content)).toContain('How to use this slot');
 // The fixture's second variant already has a Body slot, so the set-wide box starts ticked.
 await expect(d.getByLabel('Apply to all variants',{exact:true})).toBeChecked();
 // Typed markup stays text; the tools format the selection in place.
 await description.click();await page.keyboard.type('Use one icon. <img src=x onerror="window.__xss=1"> 2 * 3');
 expect(await pick(description,'one')).toBe(true);await tool('Bold').click();await expect(description.locator('b,strong')).toHaveText('one');
 expect(await pick(description,'icon')).toBe(true);await tool('Strikethrough').click();await expect(description.locator('s,strike')).toHaveText('icon');
 await expect(description.locator('img')).toHaveCount(0);
 // Nothing is saved while typing; leaving the field saves once, for both variants.
 expect((await slots(page)).map(p=>p.slot_settings.description)).toEqual(['','']);
 await d.getByLabel('Slot name',{exact:true}).focus();
 const text='Use **one** ~~icon~~. <img src=x onerror="window.\\_\\_xss=1"> 2 \\* 3';
 await expect.poll(async()=>(await slots(page)).map(p=>[p.component_id,p.slot_settings.description])).toEqual([[data.master,text],[data.alternate,text]]);
 expect(await page.evaluate(()=>window.__xss)).toBeUndefined();await expect(d).toBeVisible();
 // A link is given an address in the field under the text; lists and headings come from the tools.
 expect(await pick(description,'Use')).toBe(true);await tool('Link').click();
 const address=d.getByLabel('Link address',{exact:true});await expect(address).toBeFocused();await address.fill('https://example.com/guide');await address.press('Enter');
 await expect(description.locator('a')).toHaveAttribute('href','https://example.com/guide');await expect(description.locator('a')).toHaveText('Use');
 await description.press('Control+End');await page.keyboard.press('Enter');await page.keyboard.type('Keep it short');await tool('Bulleted list').click();await expect(description.locator('ul li')).toHaveText(['Keep it short']);
 // A limit applies on change, as its own step.
 await d.getByLabel('Maximum layers',{exact:true}).fill('3');await d.getByLabel('Maximum layers',{exact:true}).press('Tab');
 await expect.poll(async()=>(await slots(page)).map(p=>[p.slot_settings.max_children,p.slot_settings.description.startsWith('[Use](https://example.com/guide) **one**'),p.slot_settings.description.endsWith('\n\n- Keep it short')])).toEqual([[3,true,true],[3,true,true]]);
 // Undo works with the panel open and takes back one change at a time, in both variants.
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');
 await expect.poll(async()=>(await slots(page)).map(p=>p.slot_settings.max_children??null)).toEqual([null,null]);
 await page.keyboard.press('Control+z');await expect.poll(async()=>(await slots(page)).map(p=>p.slot_settings.description)).toEqual([text,text]);
 await page.keyboard.press('Control+Shift+z');await page.keyboard.press('Control+Shift+z');await expect.poll(async()=>(await slots(page)).every(p=>p.slot_settings.max_children===3)).toBe(true);
 // Clicking the canvas closes the panel; instances show the formatted description.
 await page.mouse.click(40,300);await expect(d).toHaveCount(0);
 await select(page,data.instance);
 const shown=page.locator('#component-panel .slot-description');await expect(shown.locator('strong')).toHaveText('one');await expect(shown.locator('s')).toHaveText('icon');await expect(shown.locator('li')).toHaveCount(1);
 await expect(shown.locator('a')).toHaveAttribute('rel','noopener noreferrer');
});
test('a saved description opens formatted, a refused change is reported, and one variant can be edited alone',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.master);await openEditor(page);
 const d=dialog(page),description=d.getByRole('textbox',{name:'Slot description',exact:true}),name=d.getByLabel('Slot name',{exact:true});
 await d.getByLabel('Apply to all variants',{exact:true}).uncheck();
 await description.click();await page.keyboard.type('Only here');await d.getByRole('button',{name:'Heading',exact:true}).click();await expect(description.locator('h4')).toHaveText('Only here');
 await name.focus();await expect.poll(async()=>(await slots(page)).map(p=>p.slot_settings.description)).toEqual(['# Only here','']);
 // An empty name is refused: the message shows and the field returns to the saved name.
 await name.fill('');await name.press('Enter');await expect(d.getByRole('alert')).not.toBeEmpty();await expect(name).toHaveValue('Body');expect((await slots(page))[0].name).toBe('Body');
 await name.fill('Content');await name.press('Enter');await expect.poll(async()=>(await slots(page)).map(p=>p.name)).toEqual(['Content','Body']);await expect(d.locator('.slot-error')).toBeEmpty();
 // Escape closes; reopening shows the saved description as formatted text.
 await page.keyboard.press('Escape');await expect(d).toHaveCount(0);
 await page.locator('#component-panel .slot-property-row').first().hover();await page.getByRole('button',{name:'Edit slot property Content',exact:true}).click();
 await expect(description.locator('h4')).toHaveText('Only here');await expect(description).not.toHaveClass(/empty/);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await expect(d).toHaveCount(0);
});
test('removal can cover the whole set and is one undo step',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.master);
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
 const description=d.getByRole('textbox',{name:'Slot description',exact:true}),tools=d.getByRole('toolbar',{name:'Description formatting'}).getByRole('button');
 expect((await description.boundingBox()).height).toBe(112);expect((await tools.first().boundingBox()).y).toBeGreaterThan((await description.boundingBox()).y+111);
 expect(await tools.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).toEqual(['Bold','Italic','Strikethrough','Heading','Bulleted list','Numbered list','Link','Code','Code block']);
 expect(await tools.evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().x-nodes[0].getBoundingClientRect().x)))).toEqual([0,30,60,90,120,150,180,210,240]);
 for(const name of ['Minimum layers','Maximum layers'])expect(await at(d.getByLabel(name,{exact:true}))).toEqual([167,120,24]);
 await expect(d.getByText('Flag non-preferred instances',{exact:true})).toBeVisible();
 await expect(d.getByLabel('Description preview',{exact:true})).toHaveCount(0);
});
