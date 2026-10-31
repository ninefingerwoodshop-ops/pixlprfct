import {writeFile,readFile} from 'node:fs/promises';
import {test,expect,field,select,key} from './fixtures.mjs';
import {complexFixture} from '../../scripts/acceptance/complex-fixture.mjs';
test.use({trace:'off'});
const fixture=await complexFixture();
async function active(page){return page.evaluate(key=>{const store=JSON.parse(localStorage.getItem(key));return JSON.parse(store.files.find(f=>f.id===store.activeId).body);},key);}
async function importFile(page,file){await page.goto('/editor/project-home.html');await page.locator('#project-import-file').setInputFiles(file);await expect(page.getByLabel('Document name',{exact:true})).toHaveValue('Daily workflow acceptance');await expect(page.locator('[data-loading-screen]')).toBeHidden();}

test('complex project imports, edits a shared style and component, reopens, exports and reimports losslessly',async({page},info)=>{
 test.setTimeout(60000);const path=info.outputPath('source.pixl');await writeFile(path,fixture.body);await importFile(page,path);
 expect((await active(page)).shapes).toHaveLength(727);
 await page.getByRole('button',{name:'color style Brand / Primary',exact:true}).press('Enter');const style=page.getByRole('dialog',{name:'Edit color style',exact:true});await field(style,'Color style description','Verified round trip');await style.getByRole('button',{name:'Done',exact:true}).click();
 await select(page,fixture.label);await field(page,'Letter spacing','2%');await select(page,fixture.editable);await field(page,'Width','320');
 const before=await active(page);expect(before.color_styles[0].description).toBe('Verified round trip');expect(before.shapes.find(s=>s.id===fixture.editable).width).toBe(320);expect(before.shapes.find(s=>s.id===fixture.label).typography.letter_spacing).toBe(2);expect(before.shapes.find(s=>s.id===fixture.instance).fill_style).toBe(fixture.color);
 await page.getByRole('button',{name:'All projects',exact:true}).click();await page.getByRole('link',{name:'Open Daily workflow acceptance',exact:true}).click();await expect(page.locator('[data-loading-screen]')).toBeHidden();expect(await active(page)).toEqual(before);
 await page.locator('#export').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download .pixl',exact:true}).click();const download=await pending,copy=info.outputPath('export.pixl');await download.saveAs(copy);expect(JSON.parse(await readFile(copy,'utf8'))).toEqual(before);
 await importFile(page,copy);expect(await active(page)).toEqual(before);
});

test('727-layer browser input-to-frame responsiveness budget',async({page},info)=>{
 test.setTimeout(60000);const path=info.outputPath('latency.pixl');await writeFile(path,fixture.body);await importFile(page,path);await select(page,fixture.editable);await page.evaluate(()=>document.fonts.ready);
 // A trusted change event starts the clock. Two rAF callbacks include a frame
 // opportunity after synchronous engine, DOM, canvas, layout and save work.
 // This is a browser latency proxy, not hardware display-photon measurement.
 await page.evaluate(()=>{window.__latency=[];window.__eventTiming=[];document.addEventListener('change',event=>{if(!event.isTrusted||event.target.id!=='width')return;const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__latency.push(performance.now()-start)));},true);new PerformanceObserver(list=>window.__eventTiming.push(...list.getEntries().map(e=>({name:e.name,duration:e.duration,interactionId:e.interactionId})))).observe({type:'event',buffered:false,durationThreshold:16});});
 const profile=process.env.PIXL_PROFILE?await page.context().newCDPSession(page):null;if(profile){await profile.send('Profiler.enable');await profile.send('Profiler.start');}
 for(let i=0;i<35;i++){await field(page,'Width',String(300+i));await expect.poll(()=>page.evaluate(()=>window.__latency.length)).toBe(i+1);}
 if(profile){const result=await profile.send('Profiler.stop');await writeFile(info.outputPath('browser.cpuprofile'),JSON.stringify(result.profile));}
 const measured=await page.evaluate(()=>({samples:window.__latency,eventTiming:window.__eventTiming,fonts:document.fonts.status,userAgent:navigator.userAgent})),samples=measured.samples.slice(5).sort((a,b)=>a-b),p95=samples[Math.ceil(samples.length*.95)-1],report={fixture:'727 layers, five pages, components, variants, slot, variables and styles',metric:'trusted width change to second animation frame',warmup:5,sampleCount:samples.length,medianMs:samples[Math.floor(samples.length/2)],p95Ms:p95,budgetMs:100,...measured};
 await info.attach('browser-latency',{body:JSON.stringify(report,null,2),contentType:'application/json'});await writeFile(info.outputPath('browser-latency.json'),JSON.stringify(report,null,2));expect(p95,'browser input-to-frame p95').toBeLessThan(100);
});
