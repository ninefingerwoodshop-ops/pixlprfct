import {test,expect} from '@playwright/test';
import {newSvgAnimation} from '../../web/svg-animation-model.js';

const fixture=()=>{const doc=newSvgAnimation('Anchor marquee');doc.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(20 30) rotate(12) scale(1.1 .8)"><path id="pxv1" data-layer-name="Curve" d="M80 180C100 100 140 180 200 180C260 180 300 100 360 180 M80 300L200 300" fill="none" stroke="#ffffff" stroke-width="3"/></g><path id="pxv2" data-layer-name="Other" d="M30 400L80 420L120 390" stroke="#4488ff" fill="none"/></svg>';return doc;};
const selected=page=>page.locator('.svg-path-nodes .anchor[aria-pressed=true]');
const anchor=(page,path,index)=>page.locator(`.svg-path-nodes [data-morph-point="${path}-${index}-anchor"]`);
const saved=page=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body));
async function open(page){await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles({name:'Marquee.pixl',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();if(await page.getByRole('button',{name:'Dock Pen tools on right',exact:true}).count())await page.getByRole('button',{name:'Dock Pen tools on right',exact:true}).click();await expect(anchor(page,0,0)).toBeVisible();}
async function center(locator){const b=await locator.boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};}
async function bounds(page,pairs){const points=await Promise.all(pairs.map(([p,i])=>center(anchor(page,p,i))));return [{x:Math.min(...points.map(p=>p.x))-14,y:Math.min(...points.map(p=>p.y))-14},{x:Math.max(...points.map(p=>p.x))+14,y:Math.max(...points.map(p=>p.y))+14}];}
async function drag(page,points,release=true){await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:4});if(release)await page.mouse.up();}
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});

test('reverse marquee selects transformed anchors live, then moves the group with one undo',async({page})=>{
 await open(page);await page.getByRole('button',{name:'Zoom in',exact:true}).click();const before=await saved(page),first=await center(anchor(page,0,0)),second=await center(anchor(page,0,1));
 await drag(page,(await bounds(page,[[0,0],[0,1]])).reverse(),false);await expect(selected(page)).toHaveCount(2);await expect(page.locator('.svg-anchor-marquee')).toBeVisible();expect(await saved(page)).toEqual(before);
 await page.screenshot({path:'.local/svg-marquee/marquee.png'});await page.mouse.up();await expect(page.locator('.svg-anchor-marquee')).toBeHidden();await expect(selected(page)).toHaveCount(2);await expect(page.getByRole('button',{name:'Smooth selected anchors',exact:true})).toBeEnabled();
 await page.keyboard.press('Shift+ArrowRight');await expect(selected(page)).toHaveCount(2);const nextFirst=await center(anchor(page,0,0)),nextSecond=await center(anchor(page,0,1));expect(nextFirst.x-first.x).toBeCloseTo(nextSecond.x-second.x,3);expect(nextFirst.y-first.y).toBeCloseTo(nextSecond.y-second.y,3);expect(nextFirst.x).toBeGreaterThan(first.x);
 await expect.poll(async()=>(await saved(page)).svg_animation.svg).not.toBe(before.svg_animation.svg);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
});

test('Shift extends across subpaths; replacement, empty boxes and handles do not change artwork',async({page})=>{
 await open(page);const before=await saved(page);await drag(page,await bounds(page,[[0,1],[0,2]]));await expect(selected(page)).toHaveCount(2);
 await page.keyboard.down('Shift');await drag(page,await bounds(page,[[1,0],[1,1]]));await page.keyboard.up('Shift');await expect(selected(page)).toHaveCount(4);await expect(anchor(page,0,0)).toHaveAttribute('aria-pressed','false');
 await drag(page,await bounds(page,[[1,0],[1,1]]));await expect(selected(page)).toHaveCount(2);await expect(anchor(page,0,1)).toHaveAttribute('aria-pressed','false');
 const handle=await center(page.locator('.svg-path-nodes [data-morph-point="0-0-out"]'));await drag(page,[{x:handle.x-12,y:handle.y-12},{x:handle.x+12,y:handle.y+12}]);await expect(selected(page)).toHaveCount(0);await expect(page.locator('#svg-stage')).toHaveAttribute('data-drawing-tool','direct');expect(await saved(page)).toEqual(before);
 await anchor(page,0,0).click();await expect(selected(page)).toHaveCount(1);await page.getByRole('button',{name:'Select Other',exact:true}).click();await expect(page.getByRole('button',{name:'Select Other',exact:true})).toHaveAttribute('aria-pressed','true');expect(await saved(page)).toEqual(before);
});

test('Escape, pointer cancellation, lost capture, blur and zoom restore the prior selection',async({page})=>{
 await open(page);const before=await saved(page);
 for(const action of ['escape','pointercancel','lostcapture','blur','zoom']){
  await drag(page,await bounds(page,[[0,1],[0,2]]),false);await expect(selected(page)).toHaveCount(2);
  if(action==='escape')await page.keyboard.press('Escape');
  else if(action==='pointercancel')await page.locator('#workspace').dispatchEvent('pointercancel',{pointerId:1});
  else if(action==='lostcapture'){await page.locator('#workspace').evaluate(n=>n.releasePointerCapture(1));const end=(await bounds(page,[[0,1],[0,2]]))[1];await page.mouse.move(end.x+1,end.y);}
  else if(action==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  else await page.getByRole('button',{name:'Zoom in',exact:true}).dispatchEvent('click');
  await expect(page.locator('.svg-anchor-marquee'),action).toBeHidden();await expect(selected(page)).toHaveCount(1);await expect(anchor(page,0,0)).toHaveAttribute('aria-pressed','true');await page.mouse.up();await expect(page.locator('#svg-stage')).toHaveAttribute('data-drawing-tool','direct');expect(await saved(page)).toEqual(before);
 }
});

test('selection can start outside the artboard and release outside the workspace without swallowing the next click',async({page})=>{
 await open(page);const before=await saved(page),stage=await page.locator('#svg-stage').boundingBox(),workspace=await page.locator('#workspace').boundingBox();
 await drag(page,[{x:stage.x-20,y:stage.y-20},{x:workspace.x+workspace.width+20,y:stage.y+stage.height+20}]);await expect(selected(page)).toHaveCount(5);expect(await saved(page)).toEqual(before);
 await page.getByRole('button',{name:'Select Other',exact:true}).click();await expect(page.getByRole('button',{name:'Select Other',exact:true})).toHaveAttribute('aria-pressed','true');await expect(selected(page)).toHaveCount(1);
 await page.getByRole('button',{name:'Join endpoints',exact:true}).click();const box=await bounds(page,[[0,0],[0,1]]);await drag(page,box,false);await expect(page.locator('.svg-anchor-marquee')).toBeHidden();await page.mouse.up();expect(await saved(page)).toEqual(before);
});

test('read-only documents and paths with timed Morph keys cannot start a base-path marquee',async({page})=>{
 await open(page);const body=JSON.stringify(await saved(page)),id='00000000-0000-4000-8000-000000000089';let writes=0;
 await page.route('**/api/documents/'+id+'**',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:new URL(r.request().url()).pathname.endsWith('/editing')?{editingMode:'handoff',documentRevision:1,canEdit:false,serverNow:Date.now(),lease:null}:{id,body,revision:1,collaboration:true,can_edit:false}});});
 await page.goto('/editor/svg-animation.html?cloud='+id+'&workspace=team%3Asvg');await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();const points=await bounds(page,[[0,0],[0,1]]);await drag(page,points,false);await expect(page.locator('.svg-anchor-marquee')).toBeHidden();await page.mouse.up();expect(writes).toBe(0);
 await open(page);await page.getByRole('button',{name:'Edit nodes',exact:true}).click();await expect.poll(async()=>(await saved(page)).svg_animation.tracks.some(t=>t.property==='morph')).toBe(true);const before=await saved(page);await page.getByRole('button',{name:'Edit base path',exact:true}).click();await drag(page,points,false);await expect(page.locator('.svg-anchor-marquee')).toBeHidden();await page.mouse.up();expect(await saved(page)).toEqual(before);
});
