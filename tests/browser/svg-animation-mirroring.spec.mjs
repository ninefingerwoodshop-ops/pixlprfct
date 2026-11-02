import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {newSvgAnimation} from '../../web/svg-animation-model.js';

const fixture=()=>{const doc=newSvgAnimation('Handle mirroring');doc.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(20 30) rotate(12) scale(1.1 .8)"><path id="pxv1" data-layer-name="Curve" d="M80 180C100 100 140 180 200 180C260 220 300 100 360 180" fill="none" stroke="#ffffff" stroke-width="3"/></g></svg>';return doc;};
const saved=page=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body));
const node=(page,kind='anchor',index=1)=>page.locator(`[data-morph-point="0-${index}-${kind}"]`);
const radio=(page,name)=>page.getByRole('radio',{name,exact:true});
async function open(page){await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles({name:'Handles.pixl',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await node(page).click();}
async function geometry(page){return page.evaluate(async()=>{const {morphPath}=await import('/editor/svg-animation-morph.js'),store=JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')),doc=JSON.parse(store.files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body),path=new DOMParser().parseFromString(doc.svg_animation.svg,'image/svg+xml').querySelector('path');return {points:morphPath(path.getAttribute('d'))[0].points,modes:path.getAttribute('data-pixl-mirroring')};});}
const distance=(p,offset)=>Math.hypot(p[offset]-p[0],p[offset+1]-p[1]);
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});

test('angle and symmetric modes apply to keyboard edits, undo, native reopening and clean SVG export',async({page})=>{
 await open(page);const before=await saved(page);await radio(page,'Mirror angle').click();await expect(radio(page,'Mirror angle')).toBeChecked();
 const start=(await geometry(page)).points[1];await node(page,'out').press('Shift+ArrowDown');const angle=(await geometry(page)).points[1];expect(distance(angle,2)).toBeCloseTo(distance(start,2),4);expect((angle[2]-angle[0])*(angle[5]-angle[1])-(angle[3]-angle[1])*(angle[4]-angle[0])).toBeCloseTo(0,3);
 await radio(page,'Mirror angle').press('ArrowRight');await expect(radio(page,'Mirror angle and length')).toBeChecked();await expect(radio(page,'Mirror angle and length')).toBeFocused();
 await node(page,'in').press('ArrowLeft');const symmetric=await geometry(page),p=symmetric.points[1];expect(p[2]+p[4]).toBeCloseTo(p[0]*2,5);expect(p[3]+p[5]).toBeCloseTo(p[1]*2,5);expect(symmetric.modes).toBe('n,s,n');
 const after=await saved(page);expect(after.svg_animation.tracks).toEqual(before.svg_animation.tracks);expect(after.svg_animation.origins).toEqual(before.svg_animation.origins);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).not.toEqual(after);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(after);
 await page.reload();await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await node(page).click();await expect(radio(page,'Mirror angle and length')).toBeChecked();expect(await saved(page)).toEqual(after);
 const box=await page.getByRole('radiogroup',{name:'Handle mirroring'}).boundingBox();expect(box.width).toBe(184);expect(box.height).toBe(24);await page.screenshot({path:'.local/svg-mirroring/inspector.png'});
 await page.getByRole('button',{name:'Export',exact:true}).click();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const svg=await readFile(await(await downloading).path(),'utf8');expect(svg).not.toContain('data-pixl-mirroring');const exported=await page.evaluate(svg=>new DOMParser().parseFromString(svg,'image/svg+xml').querySelector('path').getAttribute('d'),svg);expect(after.svg_animation.svg).toContain(exported);
});

test('mirrored pointer drags use transformed coordinates and cancellation restores both handles',async({page})=>{
 await open(page);await radio(page,'Mirror angle and length').click();await page.getByRole('button',{name:'Zoom in',exact:true}).click();const before=await saved(page),bounds=await node(page,'out').boundingBox(),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+25,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();expect(await saved(page)).toEqual(before);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+25,{steps:4});await page.mouse.up();const p=(await geometry(page)).points[1];expect(p[2]+p[4]).toBeCloseTo(400,5);expect(p[3]+p[5]).toBeCloseTo(360,5);const next=await node(page,'out').boundingBox();expect(Math.abs(next.x-bounds.x-30)).toBeLessThan(1);expect(Math.abs(next.y-bounds.y-25)).toBeLessThan(1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
});

test('no mirroring stays independent even when handles are aligned; subdivision keeps modes attached to anchors',async({page})=>{
 await open(page);await radio(page,'Mirror angle and length').click();await radio(page,'No mirroring').click();await page.reload();await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await node(page).click();await expect(radio(page,'No mirroring')).toBeChecked();
 const before=(await geometry(page)).points[1];await node(page,'out').press('ArrowDown');expect((await geometry(page)).points[1].slice(2,4)).toEqual(before.slice(2,4));
 await radio(page,'Mirror angle and length').click();await page.getByRole('button',{name:'Add midpoint after anchor',exact:true}).click();await expect(radio(page,'Mirror angle')).toBeChecked();expect((await geometry(page)).modes).toBe('n,a,a,n');await node(page,'anchor',0).click();await expect(radio(page,'Mirror angle')).toBeDisabled();
});

test('mirroring is unavailable for timed morph editing and read-only documents',async({page})=>{
 await open(page);await page.getByRole('button',{name:'Edit nodes',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await expect(page.getByRole('radiogroup',{name:'Handle mirroring'})).toBeHidden();
 const doc=fixture(),id='00000000-0000-4000-8000-000000000091';let writes=0;await page.route('**/api/documents/'+id+'**',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:new URL(r.request().url()).pathname.endsWith('/editing')?{editingMode:'handoff',documentRevision:1,canEdit:false,serverNow:Date.now(),lease:null}:{id,body:JSON.stringify(doc),revision:1,collaboration:true,can_edit:false}});});
 await page.goto('/editor/svg-animation.html?cloud='+id+'&workspace=team%3Asvg');await page.getByRole('button',{name:'Select Curve',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await node(page).dispatchEvent('click');await expect(radio(page,'Mirror angle and length')).toBeDisabled();await radio(page,'Mirror angle and length').dispatchEvent('click');expect(writes).toBe(0);
});

test('mirroring controls continue working in a detached inspector',async({page})=>{
 await open(page);const pending=page.waitForEvent('popup');await page.getByRole('button',{name:'Open Inspector in separate window',exact:true}).click();const inspector=await pending;
 await radio(inspector,'Mirror angle and length').click();await expect(radio(inspector,'Mirror angle and length')).toBeChecked();await node(page,'out').press('ArrowDown');const p=(await geometry(page)).points[1];expect(p[3]+p[5]).toBeCloseTo(360,5);await inspector.close();await expect(radio(page,'Mirror angle and length')).toBeChecked();
});
