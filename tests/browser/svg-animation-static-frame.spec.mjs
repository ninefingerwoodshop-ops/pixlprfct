import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {newSvgAnimation} from '../../web/svg-animation-model.js';
import {morphPath} from '../../web/svg-animation-morph.js';

const fixture=()=>{
 const doc=newSvgAnimation('Current frame');
 doc.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="pxv2"><stop id="pxv3" stop-color="#ff0000"/><stop id="pxv4" offset="1" stop-color="#0000ff"/></linearGradient></defs><g id="pxv5" transform="translate(10 20)"><rect id="pxv1" width="80" height="60" fill="url(#pxv2)"/><path id="pxv7" d="M0 0L100 0" fill="none" stroke="#ffffff"/></g><rect id="pxv6" width="10" height="10"/></svg>';
 const track=(element,property,first,last,extra={})=>({element,property,keys:[{time:0,value:first,easing:'linear'},{time:3000,value:last,easing:'linear'}],...extra});
 doc.svg_animation.tracks=[track('pxv1','x',0,80),track('pxv1','rotation',0,90),track('pxv1','scaleX',1,2),track('pxv1','opacity',1,.2),track('pxv1','fillGradientRotation',0,180),track('pxv1','fillGradient',[{color:'#ff0000',offset:0,opacity:1},{color:'#0000ff',offset:1,opacity:1}],[{color:'#00ff00',offset:.2,opacity:.5},{color:'#ffffff',offset:1,opacity:1}]),track('pxv7','morph',morphPath('M0 0L100 0'),morphPath('M0 100L100 100')),track('pxv6','motionProgress',0,100,{motion:{d:'M0 0L100 100',name:'Route',rotate:'auto'}})];
 doc.svg_animation.interaction={trigger:'click',onLeave:'pause',onClick:'pause'};
 return doc;
};
const saved=page=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body));
async function field(page,label,value){const input=page.getByLabel(label,{exact:true});await input.fill(String(value));await input.press('Tab');}
async function choose(page,option){await page.getByRole('button',{name:/^SVG export format:/}).click();await page.getByRole('option',{name:option,exact:true}).click();}
async function download(page){const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();return readFile(await(await pending).path(),'utf8');}
async function create(page){
 await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles({name:'Current frame.pixl',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});
 await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Current frame');
}
const preview=page=>page.frameLocator('iframe[title="Export preview"]').locator('svg');
const state=root=>{
 const node=root.querySelector('#pxv1'),matrix=root.getScreenCTM().inverse().multiply(node.getScreenCTM()),gradient=root.querySelector(node.getAttribute('fill').slice(4,-1));
 return {matrix:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f].map(n=>Number(n.toFixed(8))),opacity:node.getAttribute('opacity'),gradient:gradient.getAttribute('gradientTransform'),stops:[...gradient.children].map(s=>[s.getAttribute('stop-color'),s.getAttribute('offset'),s.getAttribute('stop-opacity')]),path:root.querySelector('#pxv7').getAttribute('d'),motion:root.querySelector('#pxv6').parentElement.parentElement.getAttribute('transform')};
};
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});

test('current-frame preview and download preserve the paused pose, all track types and editable source',async({page,context})=>{
 await create(page);await field(page,'Current time',1500);const before=await saved(page),pose=await page.locator('#svg-art>svg').evaluate(state);
 await page.getByRole('button',{name:'Export',exact:true}).click();await choose(page,'Static SVG · current frame');
 await expect(page.locator('.svg-export-preview-hint')).toHaveText('Current frame · 1.5s · static SVG');await expect(preview(page)).toBeVisible();await expect.poll(()=>preview(page).evaluate(state)).toEqual(pose);
 expect(pose.opacity).toBe('0.6');expect(pose.gradient).toBe('rotate(90 0.5 0.5)');expect(pose.stops[0]).toEqual(['#808000','0.1','0.75']);expect(pose.motion).toMatch(/translate\(50 50\) rotate\(45\)/);expect(morphPath(pose.path)[0].points.map(p=>p.slice(0,2))).toEqual([[0,50],[100,50]]);
 await expect(page.getByRole('button',{name:'Save settings',exact:true})).toBeDisabled();expect(await page.locator('select:visible').count()).toBe(0);
 await page.screenshot({path:'.local/static-frame/current-frame.png'});
 const output=await download(page);expect(output).not.toMatch(/<(animate|animateTransform|animateMotion|script)\b|role="button"|tabindex=/);
 const exported=await context.newPage();await exported.setContent(output);expect(await exported.locator('svg').evaluate(state)).toEqual(pose);await exported.close();
 expect(await saved(page)).toEqual(before);await expect(page.getByLabel('Current time',{exact:true})).toHaveValue('1500');await page.reload();expect(await saved(page)).toEqual(before);
});

test('first frame remains available and reopening captures the new playhead without changing animated export',async({page})=>{
 await create(page);await field(page,'Current time',750);await page.getByRole('button',{name:'Export',exact:true}).click();await choose(page,'Static SVG · current frame');await expect(page.locator('.svg-export-preview-hint')).toContainText('0.75s');
 await choose(page,'Static SVG · first frame');await expect(page.locator('.svg-export-preview-hint')).toHaveText('First frame · static SVG');await expect.poll(()=>preview(page).locator('#pxv1').getAttribute('opacity')).toBe('1');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await field(page,'Current time',3000);await page.getByRole('button',{name:'Export',exact:true}).click();await choose(page,'Static SVG · current frame');await expect(page.locator('.svg-export-preview-hint')).toContainText('3s');await expect.poll(()=>preview(page).locator('#pxv1').getAttribute('opacity')).toBe('0.2');
 await choose(page,'Animated SVG');const output=await download(page);expect(output).toContain('<animateTransform');expect(output).toContain('<animateMotion');expect(output).toContain('<script');expect(output).toContain('begin="indefinite"');
});

test('read-only cloud projects can download the current frame without writing settings or history',async({page})=>{
 const id='00000000-0000-4000-8000-000000000093',doc=fixture();let writes=0;
 await page.route('**/api/documents/'+id+'**',route=>{if(route.request().method()!=='GET'){writes++;return route.fulfill({status:403,json:{error:'Read only'}});}if(new URL(route.request().url()).pathname.endsWith('/editing'))return route.fulfill({json:{editingMode:'handoff',documentRevision:1,canEdit:false,serverNow:Date.now(),lease:null}});return route.fulfill({json:{id,body:JSON.stringify(doc),revision:1,collaboration:true,can_edit:false}});});
 await page.goto('/editor/svg-animation.html?cloud='+id+'&workspace=team%3Asvg');await expect(page.getByRole('button',{name:'Start editing',exact:true})).toBeDisabled();await expect(page.getByLabel('Document name',{exact:true})).toHaveValue(doc.name);await field(page,'Current time',1500);await page.getByRole('button',{name:'Export',exact:true}).click();await choose(page,'Static SVG · current frame');await expect(page.getByRole('button',{name:'Save settings',exact:true})).toBeDisabled();
 const output=await download(page);expect(output).toContain('opacity="0.6"');expect(output).not.toContain('<animate');expect(writes).toBe(0);
});

test('static export rejects invalid frame times, keeps zero as the default and never mutates the document',async({page})=>{
 await page.goto('/editor/project-home.html');const result=await page.evaluate(async doc=>{
  const {animatedSvg}=await import('/editor/svg-animation-svg.js'),before=JSON.stringify(doc),errors=[];
  for(const time of [-1,3001,NaN,Infinity,'1500']){try{animatedSvg(doc,{animated:false,time});errors.push(null);}catch(error){errors.push(error.message);}}
  return {errors,unchanged:before===JSON.stringify(doc),same:animatedSvg(doc,{animated:false})===animatedSvg(doc,{animated:false,time:0}),fractional:animatedSvg(doc,{animated:false,time:1500.5})};
 },fixture());expect(result.errors).toEqual(Array(5).fill('Choose a frame within the animation duration.'));expect(result.unchanged).toBe(true);expect(result.same).toBe(true);expect(result.fractional).not.toContain('<animate');
});
