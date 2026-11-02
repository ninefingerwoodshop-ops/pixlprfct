import {test,expect,key,fixture,seed,open,saved,rename,field,select,snapshot} from './fixtures.mjs';

test('create, edit, and reopen a project through Projects',async({page})=>{
 await page.goto('/editor/project-home.html');await page.locator('#home-new').click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.locator('input').first().fill('Created in browser');await dialog.getByRole('button',{name:/Create/}).click();
 await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Created in browser');await rename(page,'Edited in browser');await page.getByRole('button',{name:'All projects',exact:true}).click();await page.getByRole('link',{name:'Open Edited in browser',exact:true}).click();await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Edited in browser');
});

test('an untouched stale tab cannot overwrite a newer project on navigation',async({page,context})=>{
 await seed(page);const stale=await context.newPage();await open(stale);await rename(page,'Newer work');await expect.poll(async()=>(await saved(page)).name).toBe('Newer work');
 await stale.getByRole('button',{name:'All projects',exact:true}).click();await expect(stale.getByRole('link',{name:'Open Newer work',exact:true})).toBeVisible();await expect.poll(async()=>(await saved(page)).name).toBe('Newer work');await stale.close();
});

test('conflicting edits require recovery and can be saved as a separate project',async({page,context})=>{
 await seed(page);const stale=await context.newPage();await open(stale);await rename(page,'Newer work');await expect.poll(async()=>(await saved(page)).name).toBe('Newer work');await rename(stale,'Conflicting work');await stale.getByRole('button',{name:'Recover unsaved changes'}).click();
 const dialog=stale.getByRole('dialog',{name:'Recover local changes'});await expect(dialog).toContainText('another tab');await dialog.getByRole('button',{name:'Save as separate project'}).click();
 await stale.getByRole('button',{name:'All projects',exact:true}).click();await expect(stale.getByRole('link',{name:'Open Newer work',exact:true})).toBeVisible();await expect(stale.getByRole('link',{name:'Open Conflicting work',exact:true})).toBeVisible();await stale.close();
});

test('quota failure guards unload, preserves a tab recovery copy, and retries after reload',async({page})=>{
 await seed(page);
 await page.evaluate(key=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===key)throw new DOMException('Quota exceeded','QuotaExceededError');return write.call(this,k,v);};},key);
 await rename(page,'Recovered after quota');await expect(page.getByRole('button',{name:'Recover unsaved changes'})).toBeVisible();expect((await saved(page)).name).toBe('Browser acceptance');
 expect(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})).toBe(true);
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('pixlprfct.local-recovery:acceptance')).body)).toContain('Recovered after quota');
 page.once('dialog',dialog=>dialog.accept());await page.reload();await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Recovered after quota');
 await expect.poll(async()=>(await saved(page)).name).toBe('Recovered after quota');expect(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})).toBe(false);
});

test('Pages supports inline navigation, search, keyboard resizing, and persistent page paint',async({page})=>{
 await seed(page);await expect(page.locator('#layers-page-control')).toHaveAttribute('open','');
 expect(await page.locator('#layers-page').evaluate(n=>n.getBoundingClientRect().height)).toBe(40);
 const active=page.locator('#page-switch-options [aria-checked="true"]');expect(await active.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(56, 56, 56)');expect(await active.evaluate(n=>n.getBoundingClientRect().height)).toBe(32);
 await page.getByRole('button',{name:'Find page',exact:true}).click();await expect(page.getByRole('searchbox',{name:'Search pages',exact:true})).toBeFocused();await page.keyboard.press('Escape');
 const handle=page.getByRole('separator',{name:'Resize pages panel'}),height=Number(await handle.getAttribute('aria-valuenow'));await handle.focus();await page.keyboard.press('ArrowDown');await expect(handle).toHaveAttribute('aria-valuenow',String(height+10));
 await field(page,'Page background hex','263445');await expect.poll(async()=>{const doc=await saved(page);return doc.pages.find(p=>p.id===doc.active_page)?.background?.color;}).toBe('#263445');
 await page.getByRole('button',{name:'New page',exact:true}).click();await expect(page.getByLabel('Page background hex',{exact:true})).toHaveValue('1E1E1E');await page.locator('#page-switch-options button').first().press('Enter');await expect(page.getByLabel('Page background hex',{exact:true})).toHaveValue('263445');
 await page.reload();await expect(page.getByLabel('Page background hex',{exact:true})).toHaveValue('263445');await expect(handle).toHaveAttribute('aria-valuenow',String(height+10));
 await snapshot(page,'pages-and-page-paint.png',page.locator('.left-panel'));
});

test('text letter spacing, case, style creation, editing, detach, and reload',async({page})=>{
 const {label}=await seed(page);await select(page,label);await field(page,'Letter spacing','5%');await page.getByRole('button',{name:'Type settings',exact:true}).click();await page.getByRole('button',{name:'Uppercase',exact:true}).click();await snapshot(page,'type-settings.png');await page.keyboard.press('Escape');
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===label).typography.text_case).toBe('upper');expect((await saved(page)).shapes.find(s=>s.id===label).text).toBe('Hello browser');
 await page.getByRole('button',{name:'Apply text style',exact:true}).click();await page.getByRole('button',{name:'Create text style',exact:true}).click();await field(page,'Text style name','Body / Strong');await page.getByRole('button',{name:'Create style',exact:true}).click();
 await expect(page.getByRole('button',{name:'Text style Body / Strong',exact:true})).toBeVisible();await page.getByRole('button',{name:'Edit text style',exact:true}).click();await field(page,'Text style Size','30');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.getByLabel('Font size',{exact:true})).toHaveValue('30');
 await page.reload();await select(page,label);await expect(page.getByLabel('Letter spacing',{exact:true})).toHaveValue('5%');await expect(page.getByLabel('Font size',{exact:true})).toHaveValue('30');
 await page.getByRole('button',{name:'Apply text style',exact:true}).click();await snapshot(page,'text-styles.png');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Detach text style',exact:true}).click();await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===label).text_style).toBe(0);
});

test('shadow colors bind through the Libraries picker and detach without losing paint',async({page})=>{
 const {box}=await seed(page);await select(page,box);await page.getByRole('button',{name:'Drop shadow settings 1',exact:true}).click();
 await page.getByRole('button',{name:'Shadow 1 color picker',exact:true}).click();await page.getByRole('tab',{name:'Libraries',exact:true}).click();const choice=page.getByRole('button',{name:'Use Shadow/brand',exact:true});expect(await choice.evaluate(n=>getComputedStyle(n).backgroundColor)).not.toBe('rgb(255, 255, 255)');expect(await choice.locator('.paint-library-swatch').evaluate(n=>n.getBoundingClientRect().width)).toBe(16);await choice.click();
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===box).appearance.shadows[0].color_variable).toBe(1);
 await page.getByRole('button',{name:'Shadow 1 color picker',exact:true}).click();await snapshot(page,'shadow-variables.png');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Detach Shadow 1 variable',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===box).appearance.shadows[0].color_variable??0).toBe(0);expect((await saved(page)).shapes.find(s=>s.id===box).appearance.shadows[0].color).toBe('#ff0000');
});

test('slot content edits remain local to an instance and reset through the inspector',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.content);await page.locator('#canvas').focus();await page.keyboard.press('Enter');await page.getByRole('textbox',{name:'Edit text on canvas'}).fill('Customized content');await page.keyboard.press('Escape');await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===data.content).text).toBe('Customized content');
 expect((await saved(page)).shapes.find(s=>s.id===data.instanceSlot).slot.modified).toBe(true);await select(page,data.instanceSlot);await page.getByRole('button',{name:'Slot actions',exact:true}).click();await page.getByRole('menuitem',{name:'Reset slot',exact:true}).click();await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.parent_id===data.instanceSlot)?.text).toBe('Default content');
});

test('Motion docks across the viewport and returns to Design with working controls',async({page})=>{
 const {label}=await seed(page);await select(page,label);await page.getByRole('button',{name:'Motion',exact:true}).click();const timeline=page.locator('#motion-timeline');await expect(timeline).toBeVisible();const box=await timeline.boundingBox();expect(box.x).toBe(0);expect(box.width).toBe(1440);
 await page.getByRole('button',{name:'Add animation',exact:true}).click();await field(page,'Current time','1000');await field(page,'Motion Translation X','100');await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===label).editor_meta?.motion?.keyframes.length).toBeGreaterThan(0);await page.getByRole('button',{name:'Collapse Motion timeline'}).click();await expect(timeline).toBeHidden();await page.getByRole('button',{name:'Expand Timeline panel',exact:true}).click();await page.getByRole('separator',{name:'Resize Motion timeline'}).focus();await page.keyboard.press('ArrowUp');await snapshot(page,'motion.png');await page.getByRole('button',{name:'Design',exact:true}).click();await expect(timeline).toBeHidden();await expect(page.getByLabel('Letter spacing',{exact:true})).toBeVisible();
 expect(await page.locator('select:visible').count()).toBe(0);
});


test('component variants switch from the shared custom dropdown and survive reload',async({page})=>{
 const data=await seed(page,fixture({components:true}));await select(page,data.instance);await page.getByRole('button',{name:/^Variant State:/}).click();await page.getByRole('option',{name:'Alternate',exact:true}).click();await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===data.instance).component.master).toBe(data.alternate);await page.reload();await select(page,data.instance);await expect(page.getByRole('button',{name:/^Variant State:/})).toContainText('Alternate');
});

test('set labels avoid adjacent artwork and retain selection, rename, and zoom clipping',async({page})=>{
 const data=fixture({components:true}),doc=JSON.parse(data.body),set=doc.component_sets[0],frame=doc.shapes.find(s=>s.id===set.frame_id),header=Math.max(...doc.shapes.map(s=>s.id))+1;
 doc.shapes.push({...doc.shapes.find(s=>s.id===data.label),id:header,name:'Adjacent heading',text:'Authored heading',x:frame.x,y:frame.y-30,width:frame.width,height:24});data.body=JSON.stringify(doc);
 await seed(page,data);await page.locator('#canvas').focus();await page.keyboard.press('Control+0');
 const label=page.locator('.frame-label[data-component-type="set"]');await expect(label).toHaveAttribute('data-occluded','true');await expect(label).toBeHidden();
 await select(page,header);await page.getByLabel('Layer visible',{exact:true}).uncheck();await expect(label).toBeVisible();
 await label.getByRole('button').click();await expect(page.locator(`.layer[data-layer-id="${frame.id}"]`)).toHaveAttribute('aria-pressed','true');
 await label.getByRole('button').dblclick();await label.getByRole('textbox',{name:'Frame name'}).fill('Renamed set');await page.keyboard.press('Enter');await expect.poll(async()=>(await saved(page)).component_sets[0].name).toBe('Renamed set');
 expect(await label.getByRole('button').evaluate(n=>getComputedStyle(n).fontSize)).toBe('12px');await snapshot(page,'set-labels.png');
 await page.locator('#canvas').focus();for(let i=0;i<22;i++)await page.keyboard.press('Control+-');
 expect(await label.evaluate(n=>parseFloat(n.style.maxWidth))).toBeLessThan(80);expect(await label.evaluate(n=>n.getBoundingClientRect().width)).toBeLessThan(80);
 await page.reload();expect((await saved(page)).shapes.find(s=>s.id===header).hidden).toBe(true);expect((await saved(page)).component_sets[0].name).toBe('Renamed set');
});

test('conflicting edits must be preserved before latest, and the downloaded project contains them',async({page,context})=>{
 await seed(page);const newer=await context.newPage();await open(newer);await rename(newer,'Latest durable work');await expect.poll(async()=>(await saved(page)).name).toBe('Latest durable work');await rename(page,'Export these conflicting edits');await page.getByRole('button',{name:'Recover unsaved changes'}).click();
 const dialog=page.getByRole('dialog',{name:'Recover local changes'});await dialog.getByRole('button',{name:'Open latest saved version'}).click();await expect(dialog).toContainText('download your edits');await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Export these conflicting edits');
 const downloadEvent=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download .pixl copy'}).click();const download=await downloadEvent,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(JSON.parse(Buffer.concat(chunks).toString()).name).toBe('Export these conflicting edits');
 await dialog.getByRole('button',{name:'Open latest saved version'}).click();await expect(dialog).toBeHidden();await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Latest durable work');await newer.close();
});

test('retained layer rows use current geometry and cancelled rename restores the row',async({page})=>{
 const {box}=await seed(page);await select(page,box);await field(page,'Width','321');
 const layer=page.locator(`.layer[data-layer-id="${box}"]`);await layer.dblclick();await page.locator('#layers input[aria-label="Layer name"]').fill('Cancelled rename');await page.locator('#layers input[aria-label="Layer name"]').press('Escape');await expect(layer).toHaveText('Acceptance card');
 await page.getByRole('button',{name:'Lock Acceptance card',exact:true}).click();await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===box).width).toBe(321);expect((await saved(page)).shapes.find(s=>s.id===box).locked).toBe(true);
 await page.getByRole('button',{name:'Unlock Acceptance card',exact:true}).click();await page.getByRole('button',{name:'Hide Acceptance card',exact:true}).click();await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===box).hidden).toBe(true);expect((await saved(page)).shapes.find(s=>s.id===box).width).toBe(321);
 const boxes=await page.locator('#canvas,.frame-labels').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));expect(boxes[0]).toEqual(boxes[1]);
});
