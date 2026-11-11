import {test,expect,seed,saved,select} from './fixtures.mjs';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();

// Home has a dot that navigates to Detail and then opens Menu over it. Menu closes itself and goes back.
function screens(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  const home=e.add('frame',0,0),detail=e.add('frame',600,0),menu=e.add('frame',1200,0),dot=e.add('rectangle',20,120);
  for(const [id,name] of [[home,'Home'],[detail,'Detail']])edit(id,{name,width:400,height:300,fill:'#ffffff'});
  edit(menu,{name:'Menu',width:200,height:100,fill:'#2563eb'});edit(dot,{name:'Dot',width:60,height:60,fill:'#ff0000'});e.reparent_many(JSON.stringify([dot]),home);
  edit(dot,{prototype:{trigger:'click',action:'navigate',target:detail,transition:'dissolve',duration:200,then:[{action:'overlay',target:menu,transition:'dissolve',duration:200}]}});
  edit(menu,{prototype:{trigger:'click',action:'close',then:[{action:'back'},{action:'close'}]}});
  const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),home,detail,menu,dot};
 }finally{e.free();}
}
const player=page=>page.getByRole('dialog',{name:'Prototype presentation',exact:true});
test('one click runs its actions in order, waiting for each transition, and skips an action that cannot apply',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await seed(page,screens());
 await page.getByRole('button',{name:'Present prototype',exact:true}).first().click();
 const status=player(page).getByRole('status'),stage=player(page).locator('.prototype-stage');await expect(status).toContainText('Home');
 await player(page).locator('summary').click();
 await player(page).getByRole('button',{name:'Dot [Click] → Detail, then Open overlay: Menu',exact:true}).click();
 await expect(status).toContainText('Detail · Landscape · Overlay: Menu');await expect(stage).not.toHaveAttribute('aria-busy','true');
 // Close, then Go back; the last Close has no overlay left and is skipped without an error.
 await player(page).getByRole('button',{name:'Menu [Click] → Close overlay, then Go back, then Close overlay',exact:true}).click();
 await expect(status).toContainText('Home');await expect(status).not.toContainText('Overlay');await expect(status).not.toContainText('unavailable');
 await expect(player(page).getByRole('button',{name:'Back',exact:true})).toBeDisabled();
});
test('follow-up actions are added, edited and removed in the Prototype inspector',async({page})=>{
 const data=await seed(page,screens());await select(page,data.dot);await page.getByRole('tab',{name:'Prototype',exact:true}).click();
 const then=async()=>(await saved(page)).shapes.find(s=>s.id===data.dot).prototype.then??[];
 await expect(page.locator('.prototype-connection-summary')).toHaveText('On click → Detail, then Open overlay: Menu');
 await page.getByRole('button',{name:'Add follow-up action to interaction 1',exact:true}).click();
 await expect.poll(async()=>(await then()).map(s=>s.action)).toEqual(['overlay','navigate']);
 // A follow-up has no trigger or delay of its own.
 await expect(page.getByLabel('Then 2: Action',{exact:true})).toHaveValue('navigate');await expect(page.getByLabel('Then 2: Trigger',{exact:true})).toHaveCount(0);
 await page.getByLabel('Then 2: Action',{exact:true}).evaluate(node=>{node.value='close';node.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect.poll(async()=>(await then()).map(s=>[s.action,s.target])).toEqual([['overlay',data.menu],['close',0]]);
 // Editing the first action keeps its follow-ups.
 await page.getByLabel('Animation',{exact:true}).evaluate(node=>{node.value='instant';node.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect.poll(async()=>{const p=(await saved(page)).shapes.find(s=>s.id===data.dot).prototype;return [p.transition,p.then.length];}).toEqual(['instant',2]);
 await page.getByRole('button',{name:'Remove follow-up action 1 of interaction 1',exact:true}).click();
 await expect.poll(async()=>(await then()).map(s=>s.action)).toEqual(['close']);
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');
 await expect.poll(async()=>(await then()).length).toBe(2);
});
