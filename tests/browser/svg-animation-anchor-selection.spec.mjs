import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {newSvgAnimation} from '../../web/svg-animation-model.js';

const fixture=()=>{const doc=newSvgAnimation('Anchor selection');doc.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(20 30) rotate(12) scale(1.1 .8)"><path id="pxv1" data-layer-name="Curve" data-pixl-mirroring="n,a,n" d="M80 180C100 100 140 180 200 180C260 180 300 100 360 180" fill="none" stroke="#ffffff" stroke-width="3"/></g><path id="pxv2" data-layer-name="Other" d="M30 400L80 420L120 390" stroke="#4488ff" fill="none"/></svg>';return doc;};
const anchor=(page,index)=>page.locator(`.svg-path-nodes [data-morph-point="0-${index}-anchor"]`);
const selected=page=>page.locator('.svg-path-nodes .anchor[aria-pressed=true]');
const saved=page=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body));
const geometry=page=>page.evaluate(async()=>{const {morphPath}=await import('/editor/svg-animation-morph.js');return morphPath(document.querySelector('.svg-art #pxv1').getAttribute('d'))[0].points;});
async function open(page){await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles({name:'Anchors.pixl',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await anchor(page,0).click();await expect.poll(async()=>(await saved(page)).svg_animation.svg).toContain('data-pixl-mirroring');}
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});

test('Shift-click toggles anchors; group keyboard movement carries handles, saves and exports with one undo',async({page})=>{
 await open(page);const before=await saved(page),points=await geometry(page);
 await anchor(page,1).click({modifiers:['Shift']});await expect(selected(page)).toHaveCount(2);
 for(const name of ['Add midpoint after anchor','Split path at anchor','Join endpoints','Continue selected endpoint'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();
 for(const name of ['Delete selected anchors','Smooth selected anchors','Corner selected anchors'])await expect(page.getByRole('button',{name,exact:true})).toBeEnabled();
 await expect(page.getByRole('radio',{name:'Mirror angle',exact:true})).toBeDisabled();
 await anchor(page,1).press('Shift+ArrowRight');let moved=await geometry(page);
 for(const i of [0,1])expect(moved[i]).toEqual(points[i].map((n,j)=>n+(j%2?0:10)));expect(moved[2]).toEqual(points[2]);await expect(selected(page)).toHaveCount(2);
 await expect.poll(async()=>(await saved(page)).svg_animation.svg).not.toBe(before.svg_animation.svg);const after=await saved(page);expect(after.svg_animation.tracks).toEqual(before.svg_animation.tracks);expect(after.svg_animation.svg).toContain('data-pixl-mirroring="n,a,n"');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(after);
 await anchor(page,1).click({modifiers:['Shift']});await expect(selected(page)).toHaveCount(1);await anchor(page,0).press('Shift+Enter');await expect(selected(page)).toHaveCount(0);await expect(anchor(page,0).locator('.svg-morph-glyph')).toHaveCSS('fill','rgb(255, 255, 255)');expect(await saved(page)).toEqual(after);
 await page.reload();await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();expect(await geometry(page)).toEqual(moved);await expect(selected(page)).toHaveCount(1);
 await page.getByRole('button',{name:'Export',exact:true}).click();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const svg=await readFile(await(await downloading).path(),'utf8');const d=await page.locator('.svg-art #pxv1').getAttribute('d');expect(svg).toContain(d);expect(svg).not.toContain('data-pixl-mirroring');
});

test('dragging a selected group uses transformed coordinates, cancels cleanly, and undoes in one step',async({page})=>{
 await open(page);await anchor(page,1).click({modifiers:['Shift']});const before=await saved(page),points=await geometry(page),bounds=await anchor(page,0).boundingBox(),second=await anchor(page,1).boundingBox(),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+25,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();expect(await saved(page)).toEqual(before);expect(await geometry(page)).toEqual(points);await expect(selected(page)).toHaveCount(2);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+25,{steps:4});await page.mouse.up();await expect(selected(page)).toHaveCount(2);
 const next=await anchor(page,1).boundingBox();expect(Math.abs(next.x-second.x-30)).toBeLessThan(1);expect(Math.abs(next.y-second.y-25)).toBeLessThan(1);const moved=await geometry(page),dx=moved[0][0]-points[0][0],dy=moved[0][1]-points[0][1];
 for(const index of [0,1])for(let i=0;i<6;i++)expect(moved[index][i]-points[index][i]).toBeCloseTo(i%2?dy:dx,4);expect(moved[2]).toEqual(points[2]);
 await page.screenshot({path:'.local/roadmap-pr/multi-anchor.png'});
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
});

test('selecting a handle or another path clears the anchor group without editing artwork',async({page})=>{
 await open(page);const before=await saved(page);await anchor(page,1).click({modifiers:['Shift']});await expect(selected(page)).toHaveCount(2);
 await page.locator('.svg-path-nodes [data-morph-point="0-1-out"]').click();await expect(selected(page)).toHaveCount(1);await expect(page.getByRole('radio',{name:'Mirror angle',exact:true})).toBeEnabled();
 await anchor(page,0).click({modifiers:['Shift']});await expect(selected(page)).toHaveCount(2);await page.getByRole('button',{name:'Select Other',exact:true}).click();await expect(selected(page)).toHaveCount(1);expect(await saved(page)).toEqual(before);
});
