import {test,expect,seed,saved,select} from './fixtures.mjs';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();

// Home has a red Plus button, a green Show button and a blue badge hidden by a variable.
// Plus adds 1 to Count and navigates to Done once Count reaches 2. Show toggles the badge.
function counter(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  e.save_variables(JSON.stringify({collections:[{id:1,name:'State',modes:[{id:1,name:'Default'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Count',kind:'number',values:{1:0}},{id:2,collection_id:1,name:'Badge hidden',kind:'boolean',values:{1:true}}]}));
  const home=e.add('frame',0,0),done=e.add('frame',600,0),plus=e.add('rectangle',20,20),show=e.add('rectangle',120,20),badge=e.add('rectangle',300,200);
  for(const [id,name] of [[home,'Home'],[done,'Done']])edit(id,{name,width:400,height:300,fill:'#ffffff'});
  for(const [id,name,fill] of [[plus,'Plus','#ff0000'],[show,'Show','#00aa00'],[badge,'Badge','#0000ff']])edit(id,{name,width:60,height:60,fill});
  e.reparent_many(JSON.stringify([plus,show,badge]),home);e.bind_variable(badge,'hidden',2);
  edit(plus,{prototype:{action:'set-variable',variable:1,operation:'add',value:1,then:[{action:'navigate',target:done,condition:{variable:1,operator:'>=',value:2}}]}});
  edit(show,{prototype:{action:'set-variable',variable:2,operation:'toggle'}});
  const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),home,done,plus,show,badge};
 }finally{e.free();}
}
const player=page=>page.getByRole('dialog',{name:'Prototype presentation',exact:true});
async function onScreen(page,x,y){
 return page.evaluate(([x,y])=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),scale=Math.min((r.width-32)/400,(r.height-32)/300);return {x:r.left+(r.width-400*scale)/2+x*scale,y:r.top+(r.height-300*scale)/2+y*scale};},[x,y]);
}
// Whether the canvas pixel under a frame point is predominantly blue (the badge).
async function blue(page,x,y){
 const p=await onScreen(page,x,y);
 return page.evaluate(([px,py])=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),k=canvas.width/r.width,[R,G,B]=canvas.getContext('2d').getImageData(Math.round((px-r.left)*k),Math.round((py-r.top)*k),1,1).data;return B>200&&R<60&&G<60;},[p.x,p.y]);
}
test('variables changed by actions drive bound layers and conditions for one presentation only',async({page})=>{
 const data=await seed(page,counter());const before=JSON.stringify((await saved(page)).variables);
 await page.getByRole('button',{name:'Present prototype',exact:true}).first().click();
 const status=player(page).getByRole('status');await expect(status).toContainText('Home');
 expect(await blue(page,330,230)).toBe(false);
 const show=await onScreen(page,150,50),plus=await onScreen(page,50,50);
 await page.mouse.click(show.x,show.y);await expect.poll(()=>blue(page,330,230)).toBe(true);
 await page.mouse.click(show.x,show.y);await expect.poll(()=>blue(page,330,230)).toBe(false);
 await page.mouse.click(show.x,show.y);await expect.poll(()=>blue(page,330,230)).toBe(true);
 // Count becomes 1: the navigate step's condition fails, so Home stays and the badge keeps its state.
 await page.mouse.click(plus.x,plus.y);await page.waitForTimeout(300);await expect(status).toContainText('Home');expect(await blue(page,330,230)).toBe(true);
 await page.mouse.click(plus.x,plus.y);await expect(status).toContainText('Done');
 // Restart puts every variable back.
 await player(page).getByRole('button',{name:'Restart',exact:true}).click();await expect(status).toContainText('Home');
 await expect.poll(()=>blue(page,330,230)).toBe(false);
 await page.mouse.click(plus.x,plus.y);await page.waitForTimeout(300);await expect(status).toContainText('Home');
 await player(page).locator('summary').click();
 await expect(player(page).getByRole('button',{name:'Plus [Click] → Add 1 to Count, then Done (when Count is at least 2)',exact:true})).toBeVisible();
 await player(page).getByRole('button',{name:'Close presentation',exact:true}).click();
 // Nothing from the presentation reached the document.
 expect(JSON.stringify((await saved(page)).variables)).toBe(before);expect((await saved(page)).shapes.find(s=>s.id===data.badge).hidden).toBe(true);
});
test('Set variable and a condition are authored in the Prototype inspector',async({page})=>{
 const data=await seed(page,counter());await select(page,data.show);await page.getByRole('tab',{name:'Prototype',exact:true}).click();
 const proto=async()=>(await saved(page)).shapes.find(s=>s.id===data.show).prototype,choose=(label,value)=>page.getByLabel(label,{exact:true}).evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));},value);
 await expect(page.locator('.prototype-connection-summary')).toHaveText('On click → Toggle Badge hidden');
 await expect(page.getByLabel('Animation',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Value',{exact:true})).toHaveCount(0);
 // Switching to a number variable starts from Set to 0, then Add 5.
 await choose('Variable','1');await expect.poll(async()=>{const p=await proto();return [p.variable,p.operation??'set',p.value];}).toEqual([1,'set',0]);
 await choose('Operation','add');await page.getByLabel('Amount',{exact:true}).fill('5');await page.getByLabel('Amount',{exact:true}).blur();
 await expect.poll(async()=>{const p=await proto();return [p.operation,p.value];}).toEqual(['add',5]);
 await choose('Run','2');await expect.poll(async()=>(await proto()).condition).toEqual({variable:2,operator:'==',value:true});
 await choose('Compared with','false');await choose('Comparison','!=');
 await expect.poll(async()=>(await proto()).condition).toEqual({variable:2,operator:'!=',value:false});
 await expect(page.locator('.prototype-connection-summary')).toHaveText('On click → Add 5 to Count (when Badge hidden is not false)');
 await choose('Run','0');await expect.poll(async()=>'condition' in (await proto())).toBe(false);
});
