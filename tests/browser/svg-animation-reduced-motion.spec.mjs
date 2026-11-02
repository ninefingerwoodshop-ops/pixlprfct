import {test,expect,chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {newSvgAnimation} from '../../web/svg-animation-model.js';
import {morphPath} from '../../web/svg-animation-morph.js';

function fixture(trigger='load'){
 const doc=newSvgAnimation('Reduced motion');
 doc.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 240 180" fill="url(#pxv2)" opacity=".8"><title>Orbit illustration</title><defs><linearGradient id="pxv2"><stop stop-color="#ff5500"/><stop offset="1" stop-color="#00bbff"/></linearGradient><linearGradient id="pxv3" href="#pxv2"/><clipPath id="pxv4"><rect x="20" y="30" width="210" height="160"/></clipPath><mask id="pxv5"><rect x="10" y="20" width="240" height="180" fill="white"/></mask></defs><g id="pxv6" transform="translate(15 10)" clip-path="url(#pxv4)" mask="url(#pxv5)"><path id="pxv1" d="M40 50C70 10 100 110 140 70L100 130Z" fill="url(#pxv3)"/><rect id="pxv7" x="30" y="100" width="20" height="20"/><use id="pxv8" href="#pxv7" x="110"/></g></svg>';
 const track=(element,property,start,end,extra={})=>({element,property,keys:[{time:0,value:start,easing:'linear'},{time:3000,value:end,easing:'linear'}],...extra});
 doc.svg_animation.tracks=[track('pxv1','x',5,60),track('pxv1','rotation',10,130),track('pxv1','opacity',.8,.2),track('pxv1','fillGradientRotation',30,200),track('pxv1','fillGradient',[{color:'#ff5500',offset:0,opacity:1},{color:'#00bbff',offset:1,opacity:1}],[{color:'#bb00bb',offset:.2,opacity:.5},{color:'#ffffff',offset:1,opacity:.8}]),track('pxv1','morph',morphPath('M40 50C70 10 100 110 140 70L100 130Z'),morphPath('M50 70C80 20 110 120 160 90L120 150Z')),track('pxv7','motionProgress',20,100,{motion:{d:'M10 10L70 30',name:'Route',rotate:'auto'}})];
 doc.svg_animation.interaction={trigger,onLeave:'reverse',onClick:'pause'};return doc;
}
test.use({reducedMotion:'no-preference'});
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});
async function outputs(page,trigger='load'){
 await page.goto('/editor/project-home.html');return page.evaluate(async doc=>{const {animatedSvg}=await import('/editor/svg-animation-svg.js');return {animated:animatedSvg(doc),still:animatedSvg(doc,{animated:false}),current:animatedSvg(doc,{animated:false,time:1500})};},fixture(trigger));
}
async function openSvg(page,svg){await page.route('**/reduced-motion.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));await page.goto('/reduced-motion.svg');}
const displays=page=>page.locator('svg').evaluate(root=>[root.querySelector('[data-pixl-animated]'),root.querySelector('[data-pixl-still]')].map(n=>getComputedStyle(n).display));
const time=page=>page.locator('svg').evaluate(root=>root.getCurrentTime());

test('script-free on-load export switches to an independent first frame and preserves local references',async({page})=>{
 const out=await outputs(page);expect(out.animated).not.toContain('<script');expect(out.still).not.toContain('prefers-reduced-motion');expect(out.current).not.toContain('data-pixl-still');
 await openSvg(page,out.animated);await expect.poll(()=>displays(page)).toEqual(['inline','none']);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>displays(page)).toEqual(['none','inline']);
 const result=await page.locator('svg').evaluate(root=>{
  const ids=[root,...root.querySelectorAll('[id]')].map(n=>n.id),still=root.querySelector('[data-pixl-still]'),unresolved=[];
  for(const node of still.querySelectorAll('*'))for(const a of node.attributes){const refs=[...a.value.matchAll(/url\(#([^)]*)\)/g)].map(m=>m[1]);if(a.localName==='href')refs.push(a.value.slice(1));for(const id of refs)if(!still.querySelector('[id="'+id+'"]'))unresolved.push(id);}
  return {unique:new Set(ids).size===ids.length,unresolved,animations:still.querySelectorAll('animate,animateMotion,animateTransform,script').length,title:root.querySelector(':scope>title')?.textContent,rootFill:still.style.fill};
 });expect(result).toEqual({unique:true,unresolved:[],animations:0,title:'Orbit illustration',rootFill:'url("#pxv2-still")'});
 await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>displays(page)).toEqual(['inline','none']);
});

test('reduced-motion image and CSS background embeds match the first-frame still',async({page:source})=>{
 const out=await outputs(source);
 // Chromium's per-page DevTools override does not reach SVG image documents.
 // Set the browser preference itself to exercise their real media queries.
 const browser=await chromium.launch({args:['--force-prefers-reduced-motion']}),page=await browser.newPage({reducedMotion:null});
 try{
 await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(source.url());
 expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
 await page.route('**/animated-image.svg',r=>r.fulfill({contentType:'image/svg+xml',body:out.animated}));await page.route('**/static-image.svg',r=>r.fulfill({contentType:'image/svg+xml',body:out.still}));
 await page.setContent('<style>body{margin:0;background:white}img,div{display:block;width:240px;height:180px}#background{background:url(/animated-image.svg) center/contain no-repeat}</style><img id="animated" src="/animated-image.svg"><img id="still" src="/static-image.svg"><div id="background"></div>');
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
 await page.screenshot({path:'.local/reduced-motion/embeds.png'});
 const expected=await sharp(await page.locator('#still').screenshot()).raw().toBuffer(),initial=await page.locator('#animated').screenshot();
 for(const image of [initial,await page.locator('#background').screenshot()]){
  // Extra SVG grouping slightly changes antialiasing at translucent edges.
  const pixels=await sharp(image).raw().toBuffer();expect(pixels.length).toBe(expected.length);let delta=0,max=0;
  for(let i=0;i<pixels.length;i++){const difference=Math.abs(pixels[i]-expected[i]);delta+=difference;max=Math.max(max,difference);}
  expect(delta/pixels.length).toBeLessThan(.1);expect(max).toBeLessThanOrEqual(32);
 }
 await page.waitForTimeout(180);expect((await page.locator('#animated').screenshot()).equals(initial)).toBe(true);
 }finally{await browser.close();}
});

for(const trigger of ['click','hover'])test(`${trigger} exports stop on a live preference change and reject pointer and keyboard playback while reduced`,async({page})=>{
 const out=await outputs(page,trigger);await openSvg(page,out.animated);const root=page.locator('svg');
 await root.press('Enter');await expect.poll(()=>time(page)).toBeGreaterThan(.1);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(root).toHaveAttribute('role','img');await expect(root).not.toHaveAttribute('tabindex');await expect.poll(()=>time(page)).toBe(0);await expect.poll(()=>displays(page)).toEqual(['none','inline']);
 await root.click();await root.dispatchEvent('pointerenter');await root.dispatchEvent('keydown',{key:'Enter'});await page.waitForTimeout(150);expect(await time(page)).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(root).toHaveAttribute('role','button');await expect(root).toHaveAttribute('tabindex','0');expect(await time(page)).toBe(0);
 await root.press('Space');await expect.poll(()=>time(page)).toBeGreaterThan(.1);
});

test('JavaScript-disabled standalone exports retain the reduced-motion first frame',async({page,browser})=>{
 const out=await outputs(page,'click'),context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce'}),viewer=await context.newPage();await openSvg(viewer,out.animated);await expect.poll(()=>displays(viewer)).toEqual(['none','inline']);
 expect(await viewer.locator('[data-pixl-still] animate').count()).toBe(0);await context.close();
});

test('reimporting an animated export does not add duplicate fallback layers',async({page})=>{
 const out=await outputs(page);
 const result=await page.evaluate(async svg=>{const {sanitizeSvg,animationLayers}=await import('/editor/svg-animation-svg.js'),{root}=sanitizeSvg(svg);return {layers:animationLayers(root).map(l=>l.name),paths:root.querySelectorAll('path').length,rects:root.querySelectorAll('rect').length,active:root.querySelectorAll('animate,animateMotion,animateTransform,script').length,still:root.querySelectorAll('[id$="-still"]').length};},out.animated);
 expect(result.paths).toBe(1);expect(result.rects).toBe(3);expect(result.active).toBe(0);expect(result.still).toBe(0);expect(result.layers).not.toContain('g-still');expect(result.layers.filter(name=>name==='pxv1')).toHaveLength(1);
});

test('export preview follows system changes without changing the file or the static-current choice',async({page})=>{
 await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles({name:'Reduced motion.pixl',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture('click')))});await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Reduced motion');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pixlprfct.drafts.v1')).files.find(f=>f.id===new URLSearchParams(location.search).get('draft')).body),before=await saved();
 await page.getByLabel('Current time',{exact:true}).fill('1500');await page.getByLabel('Current time',{exact:true}).press('Tab');await page.getByRole('button',{name:'Export',exact:true}).click();
 const preview=page.frameLocator('iframe[title="Export preview"]').locator('svg'),hint=page.locator('.svg-export-preview-hint');await expect(preview).toHaveAttribute('role','button');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(hint).toHaveText('Reduced motion is on · showing the first frame.');await expect(preview).toHaveAttribute('role','img');await expect(page.getByRole('button',{name:'Save settings',exact:true})).toBeDisabled();
 await page.screenshot({path:'.local/reduced-motion/preview.png'});
 await page.getByRole('button',{name:/^SVG export format:/}).click();await page.getByRole('option',{name:'Static SVG · current frame',exact:true}).click();await expect(hint).toHaveText('Current frame · 1.5s · static SVG');await expect(preview.locator('[data-pixl-still]')).toHaveCount(0);
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const output=await readFile(await(await downloading).path(),'utf8');expect(output).not.toContain('<animate');expect(await saved()).toBe(before);
});
