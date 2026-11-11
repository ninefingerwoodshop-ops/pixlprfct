import {test,expect,seed,saved,select} from './fixtures.mjs';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();

// Home holds a 300 × 200 list at (50,50) with a pinned blue header, a red row on screen
// and a green row 130 px below the fold. The green row navigates to Done.
function scrolling(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  const home=e.add('frame',0,0),done=e.add('frame',600,0),list=e.add('frame',50,50),header=e.add('rectangle',50,50),red=e.add('rectangle',50,90),green=e.add('rectangle',50,300);
  for(const [id,name] of [[home,'Home'],[done,'Done']])edit(id,{name,width:400,height:300,fill:'#ffffff'});
  edit(list,{name:'List',width:300,height:200,fill:'#eeeeee'});e.reparent_many(JSON.stringify([list]),home);
  for(const [id,name,fill,height] of [[header,'Header','#0000ff',30],[red,'Red row','#ff0000',80],[green,'Green row','#00aa00',80]])edit(id,{name,width:300,height,fill});
  e.reparent_many(JSON.stringify([header,red,green]),list);edit(list,{overflow_scroll:'vertical'});edit(header,{scroll_fixed:true});
  edit(green,{prototype:{action:'navigate',target:done}});
  const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),home,done,list,header,red,green};
 }finally{e.free();}
}
const player=page=>page.getByRole('dialog',{name:'Prototype presentation',exact:true});
async function onScreen(page,x,y){
 return page.evaluate(([x,y])=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),scale=Math.min((r.width-32)/400,(r.height-32)/300);return {x:r.left+(r.width-400*scale)/2+x*scale,y:r.top+(r.height-300*scale)/2+y*scale};},[x,y]);
}
// The dominant color of the canvas pixel under a frame point: 'red', 'green', 'blue' or 'other'.
async function color(page,x,y){
 const p=await onScreen(page,x,y);
 return page.evaluate(([px,py])=>{const canvas=document.querySelector('.prototype-player canvas'),r=canvas.getBoundingClientRect(),k=canvas.width/r.width,[R,G,B]=canvas.getContext('2d').getImageData(Math.round((px-r.left)*k),Math.round((py-r.top)*k),1,1).data;return R>200&&G<60&&B<60?'red':G>120&&R<60&&B<60?'green':B>200&&R<60&&G<60?'blue':'other';},[p.x,p.y]);
}
test('a scrolling frame moves its content under a pinned header, and clicks land on what is shown',async({page})=>{
 await seed(page,scrolling());await page.getByRole('button',{name:'Present prototype',exact:true}).first().click();
 const status=player(page).getByRole('status');await expect(status).toContainText('Home');await expect(status).toContainText('Scroll with the wheel, touch or arrow keys');
 expect([await color(page,200,60),await color(page,200,120),await color(page,200,220)]).toEqual(['blue','red','other']);
 // The wheel outside the list does nothing.
 const outside=await onScreen(page,20,280),over=await onScreen(page,200,150);
 await page.mouse.move(outside.x,outside.y);await page.mouse.wheel(0,200);await page.waitForTimeout(100);expect(await color(page,200,120)).toBe('red');
 // Over the list it scrolls to the end: 130 px of content, however far the wheel turns.
 await page.mouse.move(over.x,over.y);await page.mouse.wheel(0,600);
 await expect.poll(()=>color(page,200,200)).toBe('green');expect(await color(page,200,60)).toBe('blue');expect(await color(page,200,120)).toBe('other');
 // Content never draws outside the list, and the green row is where the click finds it.
 expect(await color(page,200,270)).toBe('other');
 const row=await onScreen(page,200,200);await page.mouse.click(row.x,row.y);await expect(status).toContainText('Done');
 // Coming back starts at the top again.
 await player(page).getByRole('button',{name:'Back',exact:true}).click();await expect(status).toContainText('Home');
 await expect.poll(()=>color(page,200,120)).toBe('red');
 // Before scrolling, the same spot is empty list background and the click does nothing.
 await page.mouse.click(row.x,row.y);await page.waitForTimeout(200);await expect(status).toContainText('Home');
});
test('the presented screen scrolls from the keyboard',async({page})=>{
 await seed(page,scrolling());await page.getByRole('button',{name:'Present prototype',exact:true}).first().click();
 await expect(player(page).getByRole('status')).toContainText('Home');const canvas=player(page).locator('canvas');await canvas.focus();
 await page.keyboard.press('End');await expect.poll(()=>color(page,200,200)).toBe('green');
 await page.keyboard.press('Home');await expect.poll(()=>color(page,200,120)).toBe('red');
 // 40 px per arrow press: the red row's top edge moves from 90 to 50, under the header.
 await page.keyboard.press('ArrowDown');await expect.poll(()=>color(page,200,125)).toBe('red');await expect.poll(()=>color(page,200,135)).toBe('other');
 await page.keyboard.press('PageUp');await expect.poll(()=>color(page,200,160)).toBe('red');
});
test('overflow scrolling and pinning are set in the Prototype inspector',async({page})=>{
 const data=await seed(page,scrolling()),shape=async id=>(await saved(page)).shapes.find(s=>s.id===id);
 const choose=(label,value)=>page.getByLabel(label,{exact:true}).evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));},value);
 await select(page,data.list);await page.getByRole('tab',{name:'Prototype',exact:true}).click();
 await expect(page.getByLabel('Overflow scrolling',{exact:true})).toHaveValue('vertical');await expect(page.getByLabel('Position when scrolling',{exact:true})).toHaveCount(0);
 await choose('Overflow scrolling','both');await expect.poll(async()=>(await shape(data.list)).overflow_scroll).toBe('both');
 await select(page,data.header);await page.getByRole('tab',{name:'Prototype',exact:true}).click();
 await expect(page.getByLabel('Position when scrolling',{exact:true})).toHaveValue('fixed');await expect(page.getByLabel('Overflow scrolling',{exact:true})).toHaveCount(0);
 await choose('Position when scrolling','scroll');await expect.poll(async()=>(await shape(data.header)).scroll_fixed??false).toBe(false);
 // Turning scrolling off removes the pinning choice from the children.
 await select(page,data.list);await page.getByRole('tab',{name:'Prototype',exact:true}).click();await choose('Overflow scrolling','none');
 await expect.poll(async()=>(await shape(data.list)).overflow_scroll??'none').toBe('none');
 await select(page,data.red);await page.getByRole('tab',{name:'Prototype',exact:true}).click();await expect(page.getByLabel('Position when scrolling',{exact:true})).toHaveCount(0);
});
