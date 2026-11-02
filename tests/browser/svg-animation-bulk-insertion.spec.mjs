import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {newSvgAnimation} from '../../web/svg-animation-model.js';

const fixture=()=>{const doc=newSvgAnimation('Bulk midpoint insertion');doc.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(20 10) rotate(8) scale(1.1 .9)"><path id="pxv1" data-layer-name="Contours" data-pixl-mirroring="n,a,n,n;n,n,n;n,n" d="M60 130C80 130 100 170 120 170C140 170 160 130 180 130C200 130 220 170 240 170 M80 300L130 260L180 300Z M300 300L360 300" fill="none" stroke="#ffffff" stroke-width="3"/></g><path id="pxv2" data-layer-name="Other" d="M30 440L80 460L120 430" stroke="#4488ff" fill="none"/></svg>';doc.svg_animation.tracks=[{element:'pxv1',property:'opacity',keys:[{time:0,value:1,easing:'linear'},{time:3000,value:.5,easing:'linear'}]}];return doc;};
const anchor=(page,path,index)=>page.locator(`.svg-path-nodes [data-morph-point="${path}-${index}-anchor"]`);
const selected=page=>page.locator('.svg-path-nodes .anchor[aria-pressed=true]');
const insert=page=>page.locator('[data-anchor-action="insert"]');
const saved=page=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body));
const geometry=page=>page.evaluate(async()=>{const {morphPath}=await import('/editor/svg-animation-morph.js');return morphPath(document.querySelector('.svg-art #pxv1').getAttribute('d'));});
async function open(page){await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles({name:'Midpoints.pixl',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});await page.getByRole('button',{name:'Select Contours',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();if(await page.getByRole('button',{name:'Dock Pen tools on right',exact:true}).count())await page.getByRole('button',{name:'Dock Pen tools on right',exact:true}).click();await expect.poll(async()=>(await saved(page)).svg_animation.tracks.length).toBe(1);}
async function pick(page,pairs){for(const [i,[path,index]] of pairs.entries())await anchor(page,path,index).click({modifiers:i?['Shift']:[]});await expect(selected(page)).toHaveCount(pairs.length);}
async function center(locator){const b=await locator.boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};}
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});

test('group insertion keeps transformed curves, selects new midpoints, and saves/exports with one undo',async({page})=>{
 await open(page);const before=await saved(page),points=await geometry(page),originalPath=await page.locator('.svg-art #pxv1').evaluate(n=>({length:n.getTotalLength(),samples:Array.from({length:41},(_,i)=>{const p=n.getPointAtLength(n.getTotalLength()*i/40);return [p.x,p.y];})}));
 await pick(page,[[1,2],[0,1],[1,0],[0,0]]);await expect(insert(page)).toHaveAccessibleName('Add midpoints after selected anchors');await insert(page).press('Enter');await expect(selected(page)).toHaveCount(4);
 for(const [path,index] of [[1,4],[0,3],[1,1],[0,1]])await expect(anchor(page,path,index)).toHaveAttribute('aria-pressed','true');const after=await geometry(page);expect(after.map(p=>p.points.length)).toEqual([6,5,2]);expect(after[2]).toEqual(points[2]);expect(after[1].closed).toBe(true);
 const nextPath=await page.locator('.svg-art #pxv1').evaluate(n=>({length:n.getTotalLength(),samples:Array.from({length:41},(_,i)=>{const p=n.getPointAtLength(n.getTotalLength()*i/40);return [p.x,p.y];})}));expect(Math.abs(nextPath.length-originalPath.length)).toBeLessThan(.01);for(let i=0;i<41;i++)for(let axis=0;axis<2;axis++)expect(Math.abs(nextPath.samples[i][axis]-originalPath.samples[i][axis])).toBeLessThan(.01);
 await expect.poll(async()=>(await saved(page)).svg_animation.svg).not.toBe(before.svg_animation.svg);const inserted=await saved(page);expect(inserted.svg_animation.tracks).toEqual(before.svg_animation.tracks);expect(inserted.svg_animation.origins).toEqual(before.svg_animation.origins);expect(inserted.svg_animation.svg).toContain('n,a,a,a,n,n;n,a,n,n,a;n,n');
 await page.screenshot({path:'.local/svg-bulk-insertion/inserted.png'});await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(inserted);
 await page.reload();await page.getByRole('button',{name:'Select Contours',exact:true}).click();expect(await geometry(page)).toEqual(after);await page.getByRole('button',{name:'Export',exact:true}).click();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const svg=await readFile(await(await downloading).path(),'utf8');expect(svg).toContain(await page.locator('.svg-art #pxv1').getAttribute('d'));expect(svg).not.toContain('data-pixl-mirroring');expect(svg).toContain('<animate');
});

test('an invalid endpoint rejects all insertion, retains selection, and creates no history entry',async({page})=>{
 await open(page);const before=await saved(page),points=await geometry(page);await pick(page,[[0,0],[1,2],[2,1]]);await insert(page).click();await expect(page.locator('#svg-message')).toContainText('Select anchors with following segments');expect(await geometry(page)).toEqual(points);expect(await saved(page)).toEqual(before);await expect(selected(page)).toHaveCount(3);await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
 await anchor(page,2,1).click({modifiers:['Shift']});await insert(page).click();await expect.poll(async()=>(await saved(page)).svg_animation.svg).not.toBe(before.svg_animation.svg);expect((await geometry(page)).map(p=>p.points.length)).toEqual([5,4,2]);
});

test('undoing insertion keeps active-anchor controls tied to the surviving selection',async({page})=>{
 await open(page);const before=await saved(page);await pick(page,[[0,0],[1,2]]);await insert(page).click();await expect.poll(()=>saved(page)).not.toEqual(before);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);await expect(selected(page)).toHaveCount(1);await expect(anchor(page,0,1)).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'Continue selected endpoint',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Join endpoints',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Split path at anchor',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Split path at anchor',exact:true}).click();expect((await geometry(page)).map(p=>p.points.length)).toEqual([2,3,3,2]);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
});

test('queued insertion is ignored during anchor and marquee drags and with an empty selection',async({page})=>{
 await open(page);const before=await saved(page);await pick(page,[[0,0],[0,1]]);const a=await center(anchor(page,0,0)),b=await center(anchor(page,0,1));
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x+20,a.y+10,{steps:3});await insert(page).dispatchEvent('click');expect(await saved(page)).toEqual(before);await page.keyboard.press('Escape');await page.mouse.up();expect(await saved(page)).toEqual(before);
 await page.mouse.move(a.x-15,a.y-15);await page.mouse.down();await page.mouse.move(b.x+15,b.y+15,{steps:4});await expect(selected(page)).toHaveCount(2);await insert(page).dispatchEvent('click');expect(await saved(page)).toEqual(before);await page.mouse.up();await insert(page).click();await expect(selected(page)).toHaveCount(2);expect((await geometry(page))[0].points.length).toBe(6);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);await anchor(page,0,0).click();await anchor(page,0,0).click({modifiers:['Shift']});await expect(insert(page)).toBeDisabled();await insert(page).dispatchEvent('click');expect(await saved(page)).toEqual(before);
});
