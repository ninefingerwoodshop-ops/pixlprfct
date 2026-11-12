import {test,expect,seed,saved,select} from './fixtures.mjs';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();

// Home has a red Plus button and a green Go button. Plus adds 1 to Count.
// Go is a conditional: Count > 1 leads to Done, anything else to Low.
function screens({authored=true}={}){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  e.save_variables(JSON.stringify({collections:[{id:1,name:'State',modes:[{id:1,name:'Default'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Count',kind:'number',values:{1:0}},{id:2,collection_id:1,name:'Open',kind:'boolean',values:{1:false}}]}));
  const home=e.add('frame',0,0),done=e.add('frame',600,0),low=e.add('frame',1200,0),plus=e.add('rectangle',20,20),go=e.add('rectangle',120,20);
  for(const [id,name] of [[home,'Home'],[done,'Done'],[low,'Low']])edit(id,{name,width:400,height:300,fill:'#ffffff'});
  for(const [id,name,fill] of [[plus,'Plus','#ff0000'],[go,'Go','#00aa00']])edit(id,{name,width:60,height:60,fill});
  e.reparent_many(JSON.stringify([plus,go]),home);
  edit(plus,{prototype:{action:'set-variable',variable:1,operation:'add',value:1}});
  if(authored)edit(go,{prototype:{action:'conditional',condition:{variable:1,operator:'>',value:1},if_actions:[{action:'navigate',target:done}],else_actions:[{action:'navigate',target:low}]}});
  const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),home,done,low,plus,go};
 }finally{e.free();}
}
const set=(locator,value)=>locator.evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));},value);
const player=page=>page.getByRole('dialog',{name:'Prototype presentation',exact:true});
async function onScreen(page,x,y){
 return page.evaluate(([x,y])=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),scale=Math.min((r.width-32)/400,(r.height-32)/300);return {x:r.left+(r.width-400*scale)/2+x*scale,y:r.top+(r.height-300*scale)/2+y*scale};},[x,y]);
}

test('a conditional is built in the Interaction panel as an if/else block',async({page})=>{
 const data=await seed(page,screens({authored:false}));await select(page,data.go);await page.getByRole('tab',{name:'Prototype',exact:true}).click();
 const panel=page.locator('#prototype-panel'),chip=panel.locator('.prototype-chip'),modal=page.getByRole('dialog',{name:'Interaction',exact:true}),menu=page.getByRole('menu',{name:'Add action'});
 const proto=async()=>(await saved(page)).shapes.find(s=>s.id===data.go).prototype??null,field=name=>modal.getByLabel(name,{exact:true});
 await panel.getByRole('button',{name:'Add interaction',exact:true}).click();await set(field('Action'),'conditional');
 // The test starts from the first variable; both sides are empty.
 await expect.poll(async()=>{const p=await proto();return p&&[p.action,p.condition,'if_actions' in p,'else_actions' in p];}).toEqual(['conditional',{variable:1,operator:'==',value:0},false,false]);
 await expect(chip).toHaveText('Click'+'Conditional');await expect(chip).toHaveAccessibleName('Interaction 1: On click → If Count == 0: nothing; else: nothing');
 // A conditional always shows the action list: an if row, an else row and an "Add action" under each.
 const block=modal.locator('.prototype-modal-conditional'),test=modal.getByRole('option',{name:'if Count == 0',exact:true});
 await expect(test).toHaveAttribute('aria-selected','true');await expect(block.locator('.prototype-modal-else')).toHaveText('else');
 await expect(block.getByRole('button',{name:'Add action to if',exact:true})).toBeVisible();await expect(block.getByRole('button',{name:'Add action to else',exact:true})).toBeVisible();
 await expect(modal.getByRole('heading',{name:'Condition',exact:true})).toBeVisible();await expect(field('Animation')).toHaveCount(0);await expect(field('Run')).toHaveCount(0);
 await expect(field('Comparison').locator('option')).toHaveText(['Equal to','Not equal to','Less than','Less than or equal to','Greater than','Greater than or equal to']);
 await set(field('Comparison'),'>');await field('Compared with').fill('1');await field('Compared with').blur();
 await expect.poll(async()=>(await proto()).condition).toEqual({variable:1,operator:'>',value:1});await expect(modal.getByRole('option',{name:'if Count > 1',exact:true})).toBeVisible();
 // Geometry measured in Figma: a 440 px panel, 182 px block of 24 px rows 8 px apart.
 const box=await block.boundingBox(),rows=await block.locator(':scope>*').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return [Math.round(r.top),Math.round(r.height)];}));
 expect((await modal.boundingBox()).width).toBe(440);expect(box.width).toBe(182);expect(box.height).toBe(120);expect(rows.map(([,h])=>h)).toEqual([24,24,24,24]);expect(rows.map(([top])=>top-rows[0][0])).toEqual([0,32,64,96]);
 // The side menus offer every action except another conditional.
 await block.getByRole('button',{name:'Add action to if',exact:true}).click();await expect(menu.getByRole('menuitem')).toHaveText(['Navigate to','Back','Open overlay','Swap overlay','Close overlay','Set variable']);
 await menu.getByRole('menuitem',{name:'Navigate to',exact:true}).click();
 await expect.poll(async()=>(await proto()).if_actions?.map(s=>[s.action,s.target])).toEqual([['navigate',data.done]]);
 // The new action is selected, edits on the right, and its side no longer shows "Add action".
 const first=modal.getByRole('option',{name:'Navigate to Done',exact:true});await expect(first).toHaveAttribute('aria-selected','true');await expect(test).toHaveCount(0);
 await expect(block.getByRole('button',{name:'Add action to if',exact:true})).toHaveCount(0);await expect(field('If 1: Action').locator('option')).not.toContainText(['Conditional']);await expect(field('If 1: Run')).toHaveCount(0);
 await set(field('If 1: Animation'),'dissolve');await expect.poll(async()=>(await proto()).if_actions[0].transition).toBe('dissolve');
 // With an inner action selected, + adds to the same side.
 await modal.locator('.prototype-modal-foot').getByRole('button',{name:'Add action',exact:true}).click();await expect(menu.getByRole('menuitem',{name:'Conditional',exact:true})).toHaveCount(0);
 await menu.getByRole('menuitem',{name:'Back',exact:true}).click();await expect.poll(async()=>(await proto()).if_actions.map(s=>s.action)).toEqual(['navigate','back']);
 await block.getByRole('button',{name:'Add action to else',exact:true}).click();await menu.getByRole('menuitem',{name:'Navigate to',exact:true}).click();
 await set(field('Else 1: Destination'),String(data.low));await expect.poll(async()=>(await proto()).else_actions.map(s=>[s.action,s.target])).toEqual([['navigate',data.low]]);
 // − removes the selected inner action; with the if row selected it removes the conditional.
 await modal.getByRole('option',{name:'Back',exact:true}).click();await modal.getByRole('button',{name:'Remove action',exact:true}).click();
 await expect.poll(async()=>(await proto()).if_actions.map(s=>s.action)).toEqual(['navigate']);
 // With the conditional itself selected, + offers Conditional and adds after it.
 await modal.getByRole('option',{name:'if Count > 1',exact:true}).click();await modal.locator('.prototype-modal-foot').getByRole('button',{name:'Add action',exact:true}).click();
 await expect(menu.getByRole('menuitem',{name:'Conditional',exact:true})).toBeVisible();await menu.getByRole('menuitem',{name:'Close overlay',exact:true}).click();
 await expect.poll(async()=>(await proto()).then?.map(s=>s.action)).toEqual(['close']);
 // Changing the trigger keeps both sides; undo restores step by step.
 await set(modal.getByLabel('Trigger',{exact:true}),'mousedown');await expect.poll(async()=>{const p=await proto();return [p.trigger,p.if_actions.length,p.else_actions.length,p.then.length];}).toEqual(['mousedown',1,1,1]);
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');await expect.poll(async()=>(await proto()).trigger).toBe('click');
 await modal.getByRole('option',{name:'if Count > 1',exact:true}).click();await modal.getByRole('button',{name:'Remove action',exact:true}).click();
 await expect.poll(async()=>{const p=await proto();return [p.action,p.trigger,'then' in p];}).toEqual(['close','click',false]);await expect(block).toHaveCount(0);
});

test('the player runs the side of a conditional that matches the variable at that moment',async({page})=>{
 await seed(page,screens());await page.getByRole('button',{name:'Present prototype',exact:true}).first().click();
 const status=player(page).getByRole('status');await expect(status).toContainText('Home');
 const plus=await onScreen(page,50,50),go=await onScreen(page,150,50);
 // Count is 0: the else side leads to Low.
 await page.mouse.click(go.x,go.y);await expect(status).toContainText('Low');
 await player(page).getByRole('button',{name:'Back',exact:true}).click();await expect(status).toContainText('Home');
 await page.mouse.click(plus.x,plus.y);await page.mouse.click(plus.x,plus.y);await page.waitForTimeout(200);
 await page.mouse.click(go.x,go.y);await expect(status).toContainText('Done');
 await player(page).locator('summary').click();await player(page).getByRole('button',{name:'Back',exact:true}).click();
 await expect(player(page).getByRole('button',{name:'Go [Click] → If Count > 1: Done; else: Low',exact:true})).toBeVisible();
});
