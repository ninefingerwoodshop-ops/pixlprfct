import {test,expect} from '@playwright/test';
import {teamFixture} from '../helpers/team-fixture.mjs';
import {fixture} from './fixtures.mjs';
import {PRESENCE_COLORS} from '../../web/presence.js';
const rgb=hex=>`rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;

test('people with a file open see each other in any editing mode and can follow one another\'s view',async({browser},info)=>{
 test.setTimeout(120000);const baseURL='http://127.0.0.1:4213',f=await teamFixture({server:true,baseURL}),contexts=[],errors=[];
 try{
  const data=fixture(),file=(await f.owner.call('/api/documents'+f.query,JSON.parse(data.body))).data,id=file.id;
  // The viewer may only look. The file stays in its default mode: nobody is editing together.
  let sharing=(await f.owner.call(f.path(id,'/sharing'))).data;await f.owner.call(f.path(id,'/sharing'),{defaultRole:'editor',overrides:{[f.viewer.user.id]:'viewer'}},{method:'PUT',revision:sharing.revision});
  async function pageFor(actor,viewport={width:1440,height:1000}){const context=await browser.newContext({viewport,colorScheme:'dark'});contexts.push(context);await context.addCookies([...actor.cookies].map(([name,value])=>({name,value,url:baseURL})));await context.route(/https?:\/\//,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.goto(baseURL+'/editor/index.html?cloud='+id+'&workspace=org:'+f.org.id);await expect(page.locator('[data-loading-screen]')).toBeHidden();return page;}
  const owner=await pageFor(f.owner),viewer=await pageFor(f.viewer,{width:1200,height:800});
  await expect(owner.getByRole('region',{name:'Editing session'})).toContainText('Open for review');await expect(viewer.getByRole('region',{name:'Editing session'})).toContainText('Can view');
  // Each sees both avatars: their own first-person entry and a button that follows the other.
  const people=page=>page.getByLabel('People in this file',{exact:true}).getByRole('button');
  await expect(people(owner)).toHaveCount(2);await expect(people(viewer)).toHaveCount(2);
  const followOwner=viewer.getByRole('button',{name:'Follow Simulated Owner',exact:true}),mine=viewer.getByRole('button',{name:'Simulated Viewer (You)',exact:true});
  await expect(people(viewer)).toHaveText(['SO','SV']);await expect(people(owner)).toHaveText(['SV','SO']);
  await expect(followOwner).toHaveText('SO');await expect(mine).toHaveText('SV');await expect(followOwner).toHaveAttribute('aria-pressed','false');
  const colors=PRESENCE_COLORS.map(rgb),colorOf=async locator=>{let value='';await expect.poll(async()=>(value=await locator.evaluate(n=>n.isConnected?getComputedStyle(n).backgroundColor:'').catch(()=>''))).not.toBe('');return value;},ownerColor=await colorOf(followOwner);expect(colors).toContain(ownerColor);
  // The owner sees the same colour on nothing of their own, and the viewer's pointer appears on the owner's canvas in the viewer's colour.
  const viewerColor=await colorOf(owner.getByRole('button',{name:'Follow Simulated Viewer',exact:true}));
  await viewer.mouse.move(600,400);await expect(owner.locator('.team-cursor')).toHaveCount(1);await expect(owner.locator('.team-cursor span')).toHaveText('Simulated Viewer');
  await expect(owner.locator('.team-cursor span')).toHaveCSS('background-color',viewerColor);
  // Your own avatar lists everyone, and anyone else can be followed from the list.
  const list=viewer.getByRole('dialog',{name:'People in this file'});await mine.click();await expect(list.locator('p')).toHaveText(['Simulated Owner'+'Follow','Simulated Viewer (You)']);
  await list.getByRole('button',{name:'Follow Simulated Owner',exact:true}).click();await expect(list).toHaveCount(0);await expect(viewer.locator('.team-follow')).toBeVisible();await viewer.locator('.team-follow').getByRole('button').click();await expect(viewer.locator('.team-follow')).toBeHidden();
  // Following: a frame and a pill in the owner's colour, and the viewer's view tracks the owner's.
  await followOwner.click();const pill=viewer.locator('.team-follow');await expect(pill).toContainText('Following Simulated Owner');await expect(pill).toHaveCSS('background-color',ownerColor);
  await expect(people(viewer).filter({hasText:'SO'})).toHaveAttribute('aria-pressed','true');await expect(people(viewer).filter({hasText:'SO'})).toHaveAccessibleName('Stop following Simulated Owner');await expect(viewer.locator('#workspace')).toHaveClass(/team-following/);
  // Read what each window last reported straight from the server's table, so the check adds no one to the file.
  const viewOf=async name=>{const user=name==='Simulated Owner'?f.owner.user.id:f.viewer.user.id,[row]=await f.db.query('SELECT state FROM document_presence WHERE document_id=? AND user_id=? AND expires_at>?',[id,user,Date.now()]);return row?JSON.parse(row.state).view:null;};
  // The owner zooms in and pans; what the viewer shows comes to contain the owner's whole view, scaled to the viewer's smaller canvas.
  const canvas=await owner.locator('#canvas').boundingBox();await owner.mouse.move(canvas.x+500,canvas.y+400);
  await owner.keyboard.down('Control');await owner.mouse.wheel(0,-400);await owner.keyboard.up('Control');await owner.mouse.wheel(120,80);
  await expect.poll(async()=>{const a=await viewOf('Simulated Owner'),b=await viewOf('Simulated Viewer');if(!a||!b)return 'waiting';
   const inside=b.x<=a.x+1&&b.y<=a.y+1&&b.x+b.width>=a.x+a.width-1&&b.y+b.height>=a.y+a.height-1,centred=Math.abs((a.x+a.width/2)-(b.x+b.width/2))<2&&Math.abs((a.y+a.height/2)-(b.y+b.height/2))<2,tight=Math.abs(b.width-a.width)<2||Math.abs(b.height-a.height)<2;
   return inside&&centred&&tight?'following':JSON.stringify([a,b]);},{timeout:15000}).toBe('following');
  await viewer.screenshot({path:info.outputPath('following.png')});
  // The owner sees who follows them only as a faster heartbeat; the owner's own view is untouched by the viewer.
  const before=await viewOf('Simulated Owner');
  // Scrolling the canvas yourself stops following.
  const mineCanvas=await viewer.locator('#canvas').boundingBox();await viewer.mouse.move(mineCanvas.x+300,mineCanvas.y+300);await viewer.mouse.wheel(0,200);
  await expect(pill).toBeHidden();await expect(viewer.locator('#workspace')).not.toHaveClass(/team-following/);await expect(followOwner).toHaveAttribute('aria-pressed','false');
  expect(await viewOf('Simulated Owner')).toEqual(before);
  // Stop and Escape end it too.
  await followOwner.click();await expect(pill).toBeVisible();await pill.getByRole('button',{name:'Stop following Simulated Owner',exact:true}).click();await expect(pill).toBeHidden();
  await followOwner.click();await expect(pill).toBeVisible();await viewer.locator('#canvas').focus();await viewer.keyboard.press('Escape');await expect(pill).toBeHidden();
  // When the followed person closes the file, following ends and they leave the list.
  await followOwner.click();await expect(pill).toBeVisible();await contexts[0].close();contexts.shift();
  await expect(pill).toBeHidden({timeout:15000});await expect(people(viewer)).toHaveCount(1,{timeout:15000});
  expect(errors).toEqual([]);
 }finally{for(const context of contexts)await context.close();await f.close();}
});
