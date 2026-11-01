import {test,expect} from '@playwright/test';
const storageKey='pixlprfct.drafts.v1';
const artwork='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect id="Tile" x="120" y="90" width="100" height="80" fill="#b8a3ff"/></svg>';
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});
async function create(page,svg=artwork){await page.goto('/editor/project-home.html');await page.locator('#home-new').click();await page.getByLabel('Design name',{exact:true}).fill('Canvas handles');await page.getByRole('radio',{name:/^SVG Animation/}).check();await page.getByRole('button',{name:'Create design',exact:true}).click();await expect(page).toHaveURL(/svg-animation\.html/);await page.locator('#svg-file').setInputFiles({name:'handles.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});await page.getByRole('button',{name:'Select Tile',exact:true}).click();}
async function saved(page){return page.evaluate(key=>JSON.parse(JSON.parse(localStorage.getItem(key)).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body),storageKey);}
async function field(page,name,value){await page.getByLabel(name,{exact:true}).fill(String(value));await page.getByLabel(name,{exact:true}).press('Tab');}
const handle=(page,name)=>page.locator('[data-transform-handle="'+name+'"]');
async function at(page,name){const b=await handle(page,name).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};}
async function drag(page,name,dx,dy,modifiers=[]){const p=await at(page,name);for(const key of modifiers)await page.keyboard.down(key);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:5});await page.mouse.up();for(const key of modifiers)await page.keyboard.up(key);}
const value=async(page,label)=>Number(await page.getByLabel(label,{exact:true}).inputValue());
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('canvas handles stretch edges and corners, preserve the anchor, save and undo as one edit',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await create(page);const before=await saved(page),anchor=await at(page,'nw');
 await expect(page.locator('.svg-transform-glyph')).toHaveCount(4);await expect(page.locator('.svg-transform-edge')).toHaveCount(4);await expect(page.locator('.svg-transform-rotate')).toHaveCount(4);
 expect(await page.locator('.svg-transform-glyph').first().getAttribute('width')).toBe('7');
 await drag(page,'e',40,0);expect(await value(page,'Scale X')).toBeCloseTo(1.4,3);expect(await value(page,'Scale Y')).toBe(1);expect(distance(await at(page,'nw'),anchor)).toBeLessThan(.1);
 await expect.poll(async()=>(await saved(page)).svg_animation.tracks.length).toBe(2);expect((await saved(page)).svg_animation.svg).toBe(before.svg_animation.svg);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
 await drag(page,'se',40,24);expect(await value(page,'Scale X')).toBeCloseTo(1.4,3);expect(await value(page,'Scale Y')).toBeCloseTo(1.3,3);expect(distance(await at(page,'nw'),anchor)).toBeLessThan(.1);
 await page.screenshot({path:'.local/svg-animation/transform-resize.png'});const after=await saved(page);await page.reload();await page.getByRole('button',{name:'Select Tile',exact:true}).click();expect(await value(page,'Scale X')).toBeCloseTo(1.4,3);expect(await saved(page)).toEqual(after);expect(errors).toEqual([]);
});

test('Shift preserves proportions, Alt resizes from center, and Escape or capture loss cancels',async({page})=>{
 await create(page);const before=await saved(page),nw=await at(page,'nw'),se=await at(page,'se'),center={x:(nw.x+se.x)/2,y:(nw.y+se.y)/2};
 await drag(page,'se',35,8,['Shift','Alt']);expect(await value(page,'Scale X')).toBeCloseTo(1.7,3);expect(await value(page,'Scale Y')).toBeCloseTo(1.7,3);const nextNW=await at(page,'nw'),nextSE=await at(page,'se');expect(distance({x:(nextNW.x+nextSE.x)/2,y:(nextNW.y+nextSE.y)/2},center)).toBeLessThan(.1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
 const p=await at(page,'se');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+40,p.y+20);await expect(page.getByLabel('Scale X',{exact:true})).not.toHaveValue('1');expect(await saved(page)).toEqual(before);await page.keyboard.press('Escape');await page.mouse.up();expect(await saved(page)).toEqual(before);expect(distance(await at(page,'se'),p)).toBeLessThan(.1);await expect(page.getByRole('button',{name:'Select Tile',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+20,p.y);await handle(page,'se').dispatchEvent('lostpointercapture');await page.mouse.up();expect(await saved(page)).toEqual(before);expect(distance(await at(page,'se'),p)).toBeLessThan(.1);
 await handle(page,'se').click();expect(await saved(page)).toEqual(before);
});

test('rotation uses outside-corner handles, snaps with Shift, follows nested transforms and exports the same pose',async({page,context})=>{
 await create(page,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400"><g transform="translate(40 20) rotate(18) scale(1.4 .8)"><rect id="Tile" x="120" y="90" width="100" height="80" fill="#b8a3ff" transform="rotate(12 170 130)"/></g></svg>');
 await field(page,'Current time',1000);const before=await saved(page);await handle(page,'rotate-ne').press('Shift+ArrowRight');expect(await value(page,'Rotation')).toBe(15);await expect.poll(async()=>(await saved(page)).svg_animation.tracks.find(t=>t.property==='rotation')?.keys.map(k=>k.time)).toEqual([0,1000]);
 const anchor=await at(page,'nw');await drag(page,'se',30,25);expect(distance(await at(page,'nw'),anchor)).toBeLessThan(.02);await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await value(page,'Rotation')).toBe(15);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
 const p=await at(page,'rotate-ne');await page.keyboard.down('Shift');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+35,p.y+65,{steps:10});await page.mouse.up();await page.keyboard.up('Shift');expect((await value(page,'Rotation'))%15).toBe(0);expect(await value(page,'Rotation')).not.toBe(0);await page.screenshot({path:'.local/svg-animation/transform-rotation.png'});
 const current=await saved(page),id=current.svg_animation.tracks[0].element;
 const pose=({id})=>{const node=document.querySelector('#svg-art #'+id)??document.getElementById(id),m=node.ownerSVGElement.getScreenCTM().inverse().multiply(node.getScreenCTM());return [m.a,m.b,m.c,m.d,m.e,m.f];};
 const preview=await page.evaluate(pose,{id});await page.getByRole('button',{name:'Export',exact:true}).click();const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const download=await waiting,stream=await download.createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);const exported=await context.newPage();await exported.setContent(Buffer.concat(chunks).toString());await exported.evaluate(()=>{const svg=document.querySelector('svg');svg.pauseAnimations();svg.setCurrentTime(1);});const result=await exported.evaluate(pose,{id});for(let i=0;i<6;i++)expect(result[i]).toBeCloseTo(preview[i],3);await exported.close();expect(current.svg_animation.svg).toBe(before.svg_animation.svg);
});

test('handles work at zoom, keep existing easing, limit scale, and cancel a drag before seeking',async({page})=>{
 await create(page);await field(page,'Current time',1000);await field(page,'Scale X',1.2);await page.getByRole('button',{name:'Tile Scale X keyframe at 1000 ms',exact:true}).press('Enter');await page.getByRole('button',{name:/^Keyframe easing:/}).click();await page.getByRole('option',{name:'Ease in',exact:true}).click();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();const before=await saved(page),anchor=await at(page,'nw');await drag(page,'e',50,0);expect(await value(page,'Scale X')).toBeCloseTo(1.6,3);expect(distance(await at(page,'nw'),anchor)).toBeLessThan(.1);expect((await saved(page)).svg_animation.tracks.find(t=>t.property==='scaleX').keys.at(-1).easing).toBe('ease-in');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
 const p=await at(page,'se');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+30,p.y+25);await field(page,'Current time',2000);await page.mouse.up();expect(await saved(page)).toEqual(before);
 await field(page,'Current time',1000);await drag(page,'e',-400,0);expect(await value(page,'Scale X')).toBe(.001);expect(await value(page,'Scale Y')).toBe(1);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
});

test('transform handles pause playback before edits and stay separate from morph node editing',async({page})=>{
 await create(page);await field(page,'Current time',2000);await field(page,'Rotation',90);await field(page,'Current time',500);await page.getByRole('button',{name:'Play',exact:true}).click();await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();await handle(page,'rotate-ne').press('ArrowRight');await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();const time=await page.getByLabel('Current time',{exact:true}).inputValue();await page.waitForTimeout(70);await expect(page.getByLabel('Current time',{exact:true})).toHaveValue(time);
 await page.getByRole('button',{name:'Edit nodes',exact:true}).click();await expect(page.locator('#svg-selection')).toBeHidden();await expect(page.getByRole('button',{name:/^Morph node/}).first()).toBeVisible();await page.getByRole('button',{name:'Done editing nodes',exact:true}).click();await expect(handle(page,'se')).toBeVisible();
});

test('group handles follow a motion path and preserve its route, children and origin',async({page})=>{
 await create(page,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400"><path id="Route" d="M80 100 Q240 30 380 220" fill="none" stroke="#777"/><g id="Tile" transform="translate(10 5)"><rect x="140" y="130" width="80" height="60" fill="#b8a3ff"/><circle cx="240" cy="160" r="20" fill="#0d99ff"/></g></svg>');
 await page.getByRole('button',{name:'Motion path: No motion path',exact:true}).click();await page.getByRole('option',{name:'Route',exact:true}).click();await page.getByRole('button',{name:'Path orientation: Keep orientation',exact:true}).click();await page.getByRole('option',{name:'Auto rotate',exact:true}).click();await field(page,'Current time',1000);
 // Draft writes acquire an asynchronous lock; capture the baseline after orientation saves.
 await expect.poll(async()=>(await saved(page)).svg_animation.tracks.find(t=>t.property==='motionProgress')?.motion.rotate).toBe('auto');
 const before=await saved(page),anchor=await at(page,'nw');await drag(page,'se',35,20);expect(distance(await at(page,'nw'),anchor)).toBeLessThan(.02);await expect.poll(async()=>(await saved(page)).svg_animation.tracks.length).toBe(5);const after=await saved(page);expect(after.svg_animation.tracks.find(t=>t.property==='motionProgress')).toEqual(before.svg_animation.tracks[0]);expect(after.svg_animation.origins).toEqual(before.svg_animation.origins);expect(after.svg_animation.svg).toBe(before.svg_animation.svg);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
});

test('read-only shared SVG files expose selection without allowing canvas transforms or writes',async({page})=>{
 await create(page);const body=JSON.stringify(await saved(page)),id='00000000-0000-4000-8000-000000000088';let writes=0;
 await page.route('**/api/documents/'+id+'**',route=>{const request=route.request();if(request.method()!=='GET')writes++;if(new URL(request.url()).pathname.endsWith('/editing'))return route.fulfill({json:{editingMode:'handoff',documentRevision:1,canEdit:false,serverNow:Date.now(),lease:null}});return route.fulfill({json:{id,body,revision:1,collaboration:true,can_edit:false}});});
 await page.goto('/editor/svg-animation.html?cloud='+id+'&workspace=team%3Asvg');await page.getByRole('button',{name:'Select Tile',exact:true}).click();await expect(handle(page,'se')).toHaveAttribute('aria-disabled','true');await expect(handle(page,'se')).toHaveAttribute('tabindex','-1');await handle(page,'rotate-ne').press('ArrowRight');await drag(page,'e',30,0);await page.getByRole('button',{name:'Select Tile',exact:true}).click();expect(await value(page,'Scale X')).toBe(1);expect(await value(page,'Rotation')).toBe(0);expect(writes).toBe(0);
});

test('shared-file handles enable on lease acquisition and disable again on release without reselecting',async({page})=>{
 await create(page);let body=JSON.stringify(await saved(page)),lease=null,revision=1;const id='00000000-0000-4000-8000-000000000089';
 await page.route('**/api/documents/'+id+'**',route=>{const request=route.request();if(new URL(request.url()).pathname.endsWith('/editing')){if(request.method()==='POST')lease=request.postDataJSON().action==='acquire'?{mine:true,token:'handle-lease',expiresAt:Date.now()+90000}:null;return route.fulfill({json:{editingMode:'handoff',documentRevision:revision,canEdit:true,serverNow:Date.now(),lease}});}if(request.method()==='GET')return route.fulfill({json:{id,body,revision,collaboration:true,can_edit:true}});expect(lease?.mine).toBe(true);body=request.postData();revision++;return route.fulfill({json:{id,revision}});});
 await page.goto('/editor/svg-animation.html?cloud='+id+'&workspace=team%3Asvg');await page.getByRole('button',{name:'Select Tile',exact:true}).click();await expect(handle(page,'se')).toHaveAttribute('aria-disabled','true');await page.getByRole('button',{name:'Start editing',exact:true}).click();await expect(handle(page,'se')).toHaveAttribute('aria-disabled','false');await drag(page,'e',30,0);await expect.poll(()=>JSON.parse(body).svg_animation.tracks.length).toBe(2);await page.getByRole('button',{name:'Finish editing',exact:true}).click();await expect(handle(page,'se')).toHaveAttribute('aria-disabled','true');
});
