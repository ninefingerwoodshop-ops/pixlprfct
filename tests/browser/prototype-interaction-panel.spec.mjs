import {test,expect,seed,saved,select} from './fixtures.mjs';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();

function screens(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  const home=e.add('frame',0,0),detail=e.add('frame',600,0),dot=e.add('rectangle',20,120),plain=e.add('rectangle',120,120);
  for(const [id,name] of [[home,'Screen A'],[detail,'Screen B']])edit(id,{name,width:400,height:300,fill:'#ffffff'});
  edit(dot,{name:'Dot',width:60,height:60,fill:'#ff0000'});edit(plain,{name:'Plain',width:60,height:60,fill:'#00aa00'});e.reparent_many(JSON.stringify([dot,plain]),home);
  edit(dot,{prototype:{trigger:'click',action:'navigate',target:detail,transition:'smart-animate',duration:300,easing:'ease-out'}});
  const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),home,detail,dot,plain};
 }finally{e.free();}
}
const set=(locator,value)=>locator.evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));},value);
const open=async(page,id)=>{await select(page,id);await page.getByRole('tab',{name:'Prototype',exact:true}).click();};

test('an interaction is added from +, shown as a chip, edited in the panel and removed with −',async({page})=>{
 const data=await seed(page,screens());await open(page,data.plain);
 const panel=page.locator('#prototype-panel'),chips=panel.locator('.prototype-chip'),modal=page.getByRole('dialog',{name:'Interaction',exact:true});
 const proto=async()=>(await saved(page)).shapes.find(s=>s.id===data.plain).prototype??null;
 await expect(panel.getByRole('heading',{name:'Interactions'})).toBeVisible();await expect(chips).toHaveCount(0);
 await panel.getByRole('button',{name:'Add interaction',exact:true}).click();
 // Like Figma, a new interaction starts as "Click → None" with its panel open; nothing is saved yet.
 await expect(chips).toHaveCount(1);await expect(chips).toHaveText('Click'+'None');await expect(chips).toHaveAttribute('aria-expanded','true');
 await expect(modal).toBeVisible();await expect(modal.getByLabel('Trigger',{exact:true})).toHaveValue('click');await expect(modal.getByLabel('Action',{exact:true})).toHaveValue('none');
 await expect(modal.locator('header').getByRole('button',{name:'Add action',exact:true})).toBeHidden();expect(await proto()).toBe(null);
 await expect(panel.getByRole('button',{name:'Add interaction',exact:true})).toBeDisabled();
 // A trigger chosen before the action is kept when the action is picked.
 await set(modal.getByLabel('Trigger',{exact:true}),'mouseenter');await expect(chips).toHaveText('Mouse enter'+'None');expect(await proto()).toBe(null);
 await set(modal.getByLabel('Action',{exact:true}),'navigate');
 await expect.poll(async()=>{const p=await proto();return p&&[p.trigger,p.action,p.target];}).toEqual(['mouseenter','navigate',data.detail]);
 await expect(chips).toHaveText('Mouse enter'+'Screen B');await expect(modal).toBeVisible();
 await expect(modal.getByLabel('Destination',{exact:true}).locator('option')).toContainText(['Screen A','Screen B']);
 // Panel geometry measured in Figma: 240 px wide, 40 px title bar, 24 px controls, beside the sidebar.
 const box=await modal.boundingBox(),side=await page.locator('.right-panel').boundingBox();
 expect(box.width).toBe(240);expect((await modal.locator('header').boundingBox()).height).toBe(40);expect(Math.round(side.x-(box.x+box.width))).toBe(2);
 expect((await modal.locator('.inspector-select-trigger').first().boundingBox()).height).toBe(24);
 // Choosing None again keeps the chip and panel, as a draft, and removes the saved interaction.
 await set(modal.getByLabel('Action',{exact:true}),'none');await expect.poll(proto).toBe(null);await expect(chips).toHaveText('Mouse enter'+'None');await expect(modal).toBeVisible();
 await set(modal.getByLabel('Action',{exact:true}),'back');await expect.poll(async()=>(await proto())?.action).toBe('back');await expect(chips).toHaveText('Mouse enter'+'Back');
 // Close with ×, then remove with −.
 await modal.getByRole('button',{name:'Close',exact:true}).click();await expect(modal).toHaveCount(0);await expect(chips).toHaveAttribute('aria-expanded','false');
 await chips.hover();await panel.getByRole('button',{name:'Remove interaction 1',exact:true}).click();
 await expect.poll(proto).toBe(null);await expect(chips).toHaveCount(0);
});

test('the panel follows the selection and closes when the Prototype tab is left',async({page})=>{
 const data=await seed(page,screens());await open(page,data.dot);
 const chip=page.locator('#prototype-panel .prototype-chip'),modal=page.getByRole('dialog',{name:'Interaction',exact:true});
 await expect(chip).toHaveAccessibleName('Interaction 1: On click → Screen B');await chip.click();await expect(modal).toBeVisible();
 // Clicking the chip again closes it.
 await chip.click();await expect(modal).toHaveCount(0);await chip.click();await expect(modal).toBeVisible();
 await page.getByRole('tab',{name:'Design',exact:true}).click();await expect(modal).toHaveCount(0);
 await page.getByRole('tab',{name:'Prototype',exact:true}).click();await expect(modal).toHaveCount(0);await chip.click();await expect(modal).toBeVisible();
 await select(page,data.plain);await expect(modal).toHaveCount(0);await expect(page.locator('#prototype-panel .prototype-chip')).toHaveCount(0);
 // A draft that was never given an action leaves nothing behind.
 await page.locator('#prototype-panel').getByRole('button',{name:'Add interaction',exact:true}).click();await expect(modal).toBeVisible();
 await page.locator('#prototype-panel').getByRole('button',{name:'Remove interaction 1',exact:true}).click();await expect(modal).toHaveCount(0);
 expect((await saved(page)).shapes.find(s=>s.id===data.plain).prototype??null).toBe(null);
});

test('adding a second action from the title bar switches to the action list layout',async({page})=>{
 const data=await seed(page,screens());await open(page,data.dot);
 const modal=page.getByRole('dialog',{name:'Interaction',exact:true});await page.locator('#prototype-panel .prototype-chip').click();
 await modal.locator('header').getByRole('button',{name:'Add action',exact:true}).click();await page.getByRole('menuitem',{name:'Back',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===data.dot).prototype.then?.map(s=>s.action)).toEqual(['back']);
 await expect(modal.getByRole('option')).toHaveText(['Navigate to Screen B','Back']);await expect(modal.getByRole('option').nth(1)).toHaveAttribute('aria-selected','true');
 // Figma's two-column sizes: 440 px wide, a 199 px action column.
 expect((await modal.boundingBox()).width).toBe(440);expect((await modal.locator('.prototype-modal-actions').boundingBox()).width).toBe(199);
 await expect(modal.locator('header').getByRole('button',{name:'Add action',exact:true})).toBeHidden();
 await expect(page.locator('#prototype-panel .prototype-chip')).toHaveText('Click'+'Screen B +1');
});
