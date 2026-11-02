import {test,expect,seed,select} from './fixtures.mjs';
const storage=page=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body));
const grip=page=>page.getByRole('button',{name:'Move drawing toolbar',exact:true});
async function create(page,editor){
 if(editor==='Design'){const data=await seed(page);await select(page,data.box);}
 else{await page.goto('/editor/project-home.html');await page.locator('#home-new').click();await page.getByLabel('Design name',{exact:true}).fill('Movable toolbar');await page.getByRole('radio',{name:/^SVG Animation/}).check();await page.getByRole('button',{name:'Create design',exact:true}).click();await page.getByRole('button',{name:'Try an example',exact:true}).click();await expect(page.locator('#svg-art > svg')).toBeVisible();await expect.poll(async()=>(await storage(page)).svg_animation.tracks.length).toBe(2);}
 await expect(grip(page)).toBeVisible();
}
async function drag(page,dx,dy,release=true){const b=await grip(page).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:5});if(release)await page.mouse.up();}
const bounds=page=>page.locator('.toolbox').boundingBox();
for(const editor of ['Design','SVG']){
 test(editor+' toolbar drags in the workspace, stops on release and cancels without editing artwork',async({page,context})=>{
  await create(page,editor);const before=await storage(page),start=await bounds(page),pages=context.pages().length;
  await expect(page.getByRole('button',{name:'Open Drawing tools in separate window',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Collapse Drawing tools panel',exact:true})).toHaveCount(0);await expect(page.locator('[data-detachable-panel=tools]')).toHaveCount(0);
  await drag(page,40,-170);const moved=await bounds(page);expect(moved.x-start.x).toBeCloseTo(40,0);expect(moved.y-start.y).toBeCloseTo(-170,0);expect(context.pages()).toHaveLength(pages);
  await page.mouse.move(moved.x+100,moved.y-60);expect(await bounds(page)).toEqual(moved);
  await drag(page,10,-80,false);await page.keyboard.press('Escape');await page.mouse.up();expect(await bounds(page)).toEqual(moved);
  await grip(page).press('ArrowRight');expect((await bounds(page)).x-moved.x).toBeCloseTo(10,0);await grip(page).press('Home');expect(await bounds(page)).toEqual(start);expect(await storage(page)).toEqual(before);
  const pen=page.locator('.toolbox').getByRole('button',{name:editor==='Design'?'Pen':'Pen (P)',exact:true});await pen.click();await expect(pen).toHaveAttribute('aria-pressed','true');
  await drag(page,20,-90,false);await page.keyboard.press('Escape');await page.mouse.up();await expect(pen).toHaveAttribute('aria-pressed','true');expect(await storage(page)).toEqual(before);
 });
 test(editor+' toolbar removes old window state, remembers placement and stays reachable after resize',async({page,context})=>{
  await page.setViewportSize({width:1083,height:924});await create(page,editor);await page.evaluate(editor=>{localStorage.setItem('pixlprfct.panels.v1:'+location.pathname,JSON.stringify({tools:{label:'Drawing tools',x:20,y:20,width:400,height:300}}));localStorage.setItem('pixlprfct.panel-icons.v1:'+location.pathname,JSON.stringify(['tools','inspector',editor==='Design'?'layers':'elements']));},editor);const count=context.pages().length;await page.reload();await expect(grip(page)).toBeVisible();expect(context.pages()).toHaveLength(count);
  await expect(page.getByRole('button',{name:'Expand Inspector panel',exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pixlprfct.panels.v1:'+location.pathname)))).toEqual({});
  const before=await storage(page);await drag(page,50,-200);const moved=await bounds(page);await page.reload();await expect(grip(page)).toBeVisible();expect(await bounds(page)).toEqual(moved);
  await page.getByRole('button',{name:'Expand Inspector panel',exact:true}).click();await page.getByRole('button',{name:'Expand '+(editor==='Design'?'Layers':'Elements')+' panel',exact:true}).click();await page.setViewportSize({width:800,height:600});const host=await page.locator('#workspace').boundingBox();await expect.poll(async()=>{const b=await bounds(page);return b.x>=host.x&&b.y>=host.y&&b.x+b.width<=host.x+host.width+1&&b.y+b.height<=host.y+host.height+1;}).toBe(true);expect(await storage(page)).toEqual(before);await page.screenshot({path:'.local/toolbelt-drag/'+editor.toLowerCase()+'-moved.png'});
 });
}
test('Design dropdown triggers match compact Figma geometry and menus follow the movable toolbar',async({page})=>{
 await create(page,'Design');const before=await storage(page),bar=page.locator('.toolbox');
 const disclosures=bar.locator('.toolbar-disclosure');await expect(disclosures).toHaveCount(7);
 for(const button of await disclosures.all()){const b=await button.boundingBox();expect(b.width).toBe(16);expect(b.height).toBe(32);await expect(button.locator('svg')).toHaveCount(1);}
 const move=bar.locator('summary[aria-label="Move tools"]');await expect(move).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 const creation=bar.locator('summary[aria-label="Creation tools"]');await creation.click();await expect(creation).toHaveAttribute('aria-expanded','true');await expect(creation).toHaveCSS('background-color','rgb(56, 56, 56)');const menu=bar.getByRole('menu',{name:'Creation tools',exact:true});await expect(menu).toBeVisible();expect((await menu.boundingBox()).y+(await menu.boundingBox()).height).toBeLessThan((await bounds(page)).y);
 await creation.press('ArrowDown');await expect(menu.getByRole('menuitem',{name:'Pen',exact:true})).toBeFocused();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(bar.locator('.tool-split > button[data-tool=pencil]')).toHaveAttribute('aria-pressed','true');
 await drag(page,0,-900);await creation.click();await expect(menu).toBeVisible();await expect.poll(async()=>{const b=await bounds(page),m=await menu.boundingBox();return m.y>b.y+b.height;}).toBe(true);const m=await menu.boundingBox();const host=await page.locator('#workspace').boundingBox();expect(m.x).toBeGreaterThanOrEqual(host.x);expect(m.x+m.width).toBeLessThanOrEqual(host.x+host.width);
 await page.screenshot({path:'.local/toolbelt-drag/dropdown.png'});await creation.press('Escape');await expect(creation).toBeFocused();await expect(menu).toBeHidden();expect(await storage(page)).toEqual(before);
});
