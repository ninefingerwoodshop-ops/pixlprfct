import {test,expect,seed,saved,select} from './fixtures.mjs';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();

// Two 400 × 300 screens; a red dot sits at the left of one and the right of the other.
function screens(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  const one=e.add('frame',0,0),two=e.add('frame',600,0),dotOne=e.add('rectangle',20,120),dotTwo=e.add('rectangle',880,120);
  for(const [id,name] of [[one,'One'],[two,'Two']])edit(id,{name,width:400,height:300,fill:'#ffffff'});
  for(const id of [dotOne,dotTwo])edit(id,{name:'Dot',width:60,height:60,fill:'#ff0000'});
  e.reparent_many(JSON.stringify([dotOne]),one);e.reparent_many(JSON.stringify([dotTwo]),two);
  edit(dotOne,{prototype:{trigger:'click',action:'navigate',target:two,transition:'smart-animate',duration:3000,easing:'linear'}});
  edit(dotTwo,{prototype:{trigger:'drag',action:'navigate',target:one}});
  const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),one,two};
 }finally{e.free();}
}
const player=page=>page.getByRole('dialog',{name:'Prototype presentation',exact:true});
// Screen position of a point given in the presented frame's own coordinates.
async function onScreen(page,x,y){
 return page.evaluate(([x,y])=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),scale=Math.min((r.width-32)/400,(r.height-32)/300);return {x:r.left+(r.width-400*scale)/2+x*scale,y:r.top+(r.height-300*scale)/2+y*scale};},[x,y]);
}
// True when the canvas pixel under a frame point is the dot's red.
async function red(page,x,y){
 const p=await onScreen(page,x,y);
 return page.evaluate(([px,py])=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),k=canvas.width/r.width,[R,G,B]=canvas.getContext('2d').getImageData(Math.round((px-r.left)*k),Math.round((py-r.top)*k),1,1).data;return R>200&&G<60&&B<60;},[p.x,p.y]);
}
// Left and right edge of the red dot along the frame's middle row, in frame coordinates, read in one pass.
async function redSpan(page){
 return page.evaluate(()=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),k=canvas.width/r.width,scale=Math.min((r.width-32)/400,(r.height-32)/300),left=(r.width-400*scale)/2,top=(r.height-300*scale)/2;
  const row=canvas.getContext('2d').getImageData(0,Math.round((top+150*scale)*k),canvas.width,1).data;let first=-1,last=-1;
  for(let x=0;x<canvas.width;x++)if(row[x*4]>200&&row[x*4+1]<60&&row[x*4+2]<60){if(first<0)first=x;last=x;}
  return first<0?null:[(first/k-left)/scale,(last/k-left)/scale];});
}
test('smart animate moves the matching layer across the screen instead of cutting or sliding',async({page})=>{
 // The suite runs with reduced motion; this test needs the animation itself.
 await page.emulateMedia({reducedMotion:'no-preference'});const data=await seed(page,screens());
 await page.getByRole('button',{name:'Present prototype',exact:true}).first().click();
 const stage=player(page).locator('.prototype-stage'),status=player(page).getByRole('status');
 await expect(status).toContainText('One');
 expect(await red(page,50,150)).toBe(true);expect(await red(page,310,150)).toBe(false);
 const dot=await onScreen(page,50,150);await page.mouse.click(dot.x,dot.y);
 // Part-way through the three-second move the dot is at neither end, but is still on screen.
 await expect(stage).toHaveAttribute('aria-busy','true');
 await expect.poll(async()=>{const span=await redSpan(page);return !!span&&span[0]>45&&span[1]<295;},{timeout:2500,intervals:[50]}).toBe(true);
 await expect(stage).toHaveAttribute('aria-busy','true');
 await expect(stage).not.toHaveAttribute('aria-busy','true',{timeout:6000});
 await expect(status).toContainText('Two');expect(await red(page,310,150)).toBe(true);expect(await red(page,50,150)).toBe(false);
 expect(data.two).toBeGreaterThan(0);
});
test('reduced motion skips the animation, and On drag needs real travel before it fires',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await seed(page,screens());
 await page.getByRole('button',{name:'Present prototype',exact:true}).first().click();
 const stage=player(page).locator('.prototype-stage'),status=player(page).getByRole('status');
 const start=await onScreen(page,50,150);await page.mouse.click(start.x,start.y);
 await expect(status).toContainText('Two');await expect(stage).not.toHaveAttribute('aria-busy','true');expect(await red(page,310,150)).toBe(true);
 // A press that barely moves is not a drag.
 const dot=await onScreen(page,310,150);await page.mouse.move(dot.x,dot.y);await page.mouse.down();await page.mouse.move(dot.x+4,dot.y+3);await page.mouse.up();
 await expect(status).toContainText('Two');
 await page.mouse.move(dot.x,dot.y);await page.mouse.down();await page.mouse.move(dot.x-30,dot.y,{steps:3});
 await expect(status).toContainText('One');await page.mouse.up();
 // The release that ends the drag does not click the dot now under the pointer's old screen.
 await page.waitForTimeout(200);await expect(status).toContainText('One');
});
test('Smart animate and On drag are offered in the Prototype inspector and saved',async({page})=>{
 const data=await seed(page,screens());
 const dot=(await saved(page)).shapes.find(s=>s.name==='Dot'&&s.parent_id===data.two);
 await select(page,dot.id);await page.getByRole('tab',{name:'Prototype',exact:true}).click();
 await page.locator('#prototype-panel .prototype-chip').click();const modal=page.getByRole('dialog',{name:'Interaction',exact:true});
 await expect(page.locator('#prototype-panel .prototype-chip')).toHaveText(/^Drag/);
 const animation=modal.getByLabel('Animation',{exact:true}),trigger=modal.getByLabel('Trigger',{exact:true});
 await expect(trigger).toHaveValue('drag');await expect(trigger.locator('option[value="drag"]')).toHaveText('On drag');
 // The visible control is the shared custom dropdown; drive the field it wraps.
 await expect(animation.locator('option[value="smart-animate"]')).toHaveText('Smart animate');
 await animation.evaluate(node=>{node.value='smart-animate';node.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect.poll(async()=>(await saved(page)).shapes.find(s=>s.id===dot.id).prototype.transition).toBe('smart-animate');
 await expect(modal.getByLabel('Duration',{exact:true})).toBeVisible();await expect(modal.getByLabel('Easing',{exact:true}).locator('option')).toHaveText(['Linear','Ease in','Ease out','Ease in and out']);
 // Figma's order: Trigger, Action, Destination, Animation, Easing, Duration.
 await expect(modal.locator('label')).toContainText(['Trigger','Action','Destination','Animation','Easing','Duration']);
});
