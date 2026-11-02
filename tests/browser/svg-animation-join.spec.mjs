import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {newSvgAnimation,putKey} from '../../web/svg-animation-model.js';

const fixture=()=>{const doc=newSvgAnimation('Join separate paths');doc.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g id="pxv3" data-layer-name="Shared"><g id="pxv4" transform="translate(20 30) rotate(12)"><path id="pxv1" data-layer-name="First" d="M60 140C80 60 120 140 180 140" fill="none" stroke="#ffffff" stroke-width="3"/></g><g id="pxv5" transform="translate(60 20) scale(.8 1.2)"><path id="pxv2" data-layer-name="Second" data-pixl-mirroring="n,a,n;n,n" d="M210 170C230 130 250 170 270 170C290 170 310 130 330 170M60 310L120 330" fill="none" stroke="#ff9966" stroke-width="5"/></g></g></svg>';doc.svg_animation.origins={pxv2:[270,170]};return doc;};
const saved=page=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body));
const target=(page,id='pxv2',path=0,index=0)=>page.locator(`[data-join-target="${id}"][data-join-path="${path}"][data-join-anchor="${index}"]`);
const anchor=(page,index)=>page.locator(`.svg-path-nodes [data-morph-point="0-${index}-anchor"]`);
async function open(page,doc=fixture()){await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles({name:'Join.pixl',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});await page.getByRole('button',{name:'Select First',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await anchor(page,1).click();await expect.poll(async()=>(await saved(page)).svg_animation.svg).toContain('Second');}
async function start(page){await page.getByRole('button',{name:'Join endpoints',exact:true}).click();await expect(target(page)).toBeVisible();}
const geometry=(page,id)=>page.evaluate(async id=>{const {morphPath}=await import('/editor/svg-animation-morph.js'),node=document.querySelector('.svg-art #'+id),matrix=node.getScreenCTM();return morphPath(node.getAttribute('d')).map(part=>part.points.map(p=>[0,2,4].flatMap(i=>{const q=new DOMPoint(p[i],p[i+1]).matrixTransform(matrix);return [q.x,q.y];})));},id);
const near=(a,b)=>{for(let i=0;i<a.length;i++)expect(a[i]).toBeCloseTo(b[i],4);};
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});

test('joining transformed separate paths preserves curves, subpaths and first appearance with atomic undo, reopening and export',async({page})=>{
 await open(page);const before=await saved(page),first=await geometry(page,'pxv1'),second=await geometry(page,'pxv2');await start(page);await expect(page.getByRole('status').filter({hasText:'appearance'})).toBeVisible();await target(page).click();
 await expect(page.getByRole('button',{name:'Select Second',exact:true})).toHaveCount(0);await expect(page.locator('.svg-art #pxv1')).toHaveAttribute('stroke','#ffffff');await expect(page.locator('.svg-art #pxv1')).toHaveAttribute('stroke-width','3');
 const after=await geometry(page,'pxv1');expect(after).toHaveLength(2);expect(after[0]).toHaveLength(5);near(after[0][0],first[0][0]);near(after[0][1].slice(0,4),first[0][1].slice(0,4));near(after[0][2].slice(4),second[0][0].slice(4));near(after[0][3],second[0][1]);near(after[0][4],second[0][2]);for(let i=0;i<2;i++)near(after[1][i],second[1][i]);
 await expect.poll(async()=>(await saved(page)).svg_animation.svg).not.toContain('data-layer-name="Second"');const joined=await saved(page);expect(joined.svg_animation.origins.pxv2).toBeUndefined();expect(joined.svg_animation.tracks).toEqual(before.svg_animation.tracks);expect(joined.svg_animation.svg).toContain('data-pixl-mirroring="n,n,n,a,n;n,n"');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(joined);
 await page.reload();await expect(page.getByRole('button',{name:'Select Second',exact:true})).toHaveCount(0);const reopened=await geometry(page,'pxv1');expect(reopened).toEqual(after);
 await page.getByRole('button',{name:'Select First',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();await page.screenshot({path:'.local/svg-path-joining/joined.png'});
 await page.getByRole('button',{name:'Export',exact:true}).click();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const svg=await readFile(await(await downloading).path(),'utf8');expect(svg).toContain(await page.locator('.svg-art #pxv1').getAttribute('d'));expect(svg).not.toContain('data-layer-name="Second"');
});

test('keyboard target joining and Escape cancellation preserve unrelated animation, including a shared parent',async({page})=>{
 const doc=fixture();doc.svg_animation=putKey(doc.svg_animation,'pxv3','rotation',0,12);doc.svg_animation=putKey(doc.svg_animation,'pxv3','rotation',3000,35);await open(page,doc);const before=await saved(page);await start(page);await target(page).focus();await page.keyboard.press('Escape');await expect(target(page)).toHaveCount(0);expect(await saved(page)).toEqual(before);
 await start(page);await page.screenshot({path:'.local/svg-path-joining/targets.png'});await target(page).press('Enter');await expect(page.getByRole('button',{name:'Select Second',exact:true})).toHaveCount(0);expect((await saved(page)).svg_animation.tracks).toEqual(before.svg_animation.tracks);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>saved(page)).toEqual(before);
});

for(const element of ['pxv1','pxv2','pxv5'])test(`joining rejects independent animation on ${element} without changing either path`,async({page})=>{
 const doc=fixture();doc.svg_animation=putKey(doc.svg_animation,element,'x',0,10);await open(page,doc);const before=await saved(page);await start(page);await target(page).click();await expect(page.locator('#svg-notice')).toContainText('Remove individual path or group animation');expect(await saved(page)).toEqual(before);await expect(target(page)).toBeVisible();
});

test('references and singular transforms reject joins without edits; selection changes remove target handles',async({page})=>{
 const doc=fixture();doc.svg_animation.svg=doc.svg_animation.svg.replace('</svg>','<use id="pxv6" href="#pxv2" transform="translate(0 150)"/></svg>');await open(page,doc);let before=await saved(page);await start(page);await target(page).click();await expect(page.locator('#svg-notice')).toContainText('referenced by other artwork');expect(await saved(page)).toEqual(before);
 await page.getByRole('button',{name:'Select Second',exact:true}).click();await expect(page.locator('[data-join-target]')).toHaveCount(0);
 const singular=fixture();singular.svg_animation.svg=singular.svg_animation.svg.replace('translate(20 30) rotate(12)','scale(0 1)');await open(page,singular);before=await saved(page);await start(page);await target(page).press('Enter');await expect(page.locator('#svg-notice')).toContainText('collapsed paths');expect(await saved(page)).toEqual(before);
});

test('read-only shared files do not expose join targets or accept a queued join action',async({page})=>{
 const doc=fixture(),id='00000000-0000-4000-8000-000000000096';let writes=0;await page.route('**/api/documents/'+id+'**',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:new URL(r.request().url()).pathname.endsWith('/editing')?{editingMode:'handoff',documentRevision:1,canEdit:false,serverNow:Date.now(),lease:null}:{id,body:JSON.stringify(doc),revision:1,collaboration:true,can_edit:false}});});
 await page.goto('/editor/svg-animation.html?cloud='+id+'&workspace=team%3Asvg');await page.getByRole('button',{name:'Select First',exact:true}).click();await page.getByRole('button',{name:'Edit base path',exact:true}).click();const join=page.getByRole('button',{name:'Join endpoints',exact:true});await expect(join).toBeDisabled();await join.dispatchEvent('click');await expect(page.locator('[data-join-target]')).toHaveCount(0);expect(writes).toBe(0);
});
