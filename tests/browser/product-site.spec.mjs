import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

test.beforeEach(async({page})=>{
 const root=path.resolve('site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='127.0.0.1'||!url.pathname.startsWith('/pixlprfct/'))return route.abort();
  const name=url.pathname.slice('/pixlprfct/'.length)||'index.html',file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep))return route.abort();
  try{return route.fulfill({body:await readFile(file),contentType:types[path.extname(file)]??'text/plain'});}catch{return route.fulfill({status:404,body:'Missing site asset'});}
 });
});

for(const width of [390,768,1280])test(`product site works at ${width}px under the GitHub Pages subpath`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/pixlprfct/');await expect(page.getByRole('heading',{level:1})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 const images=page.locator('main img');for(const image of await images.all()){
  await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
 }
 const shot=page.locator('[data-lightbox]').first();await shot.click();const dialog=page.getByRole('dialog',{name:'Product screenshot'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('img')).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(shot).toBeFocused();
 await page.getByRole('link',{name:'Get Pixel Perfect',exact:false}).click();await expect(page.getByRole('heading',{name:'Get Pixel Perfect.',exact:true})).toBeInViewport();await expect(page.getByRole('link',{name:'Download Windows installer'})).toHaveAttribute('href',/^https:\/\/github.com\/ninefingerwoodshop-ops\/pixlprfct\/releases\/download\/.+\.exe$/);
 await page.getByText('Can I sell or monetize a fork?',{exact:true}).click();await expect(page.locator('details[open]')).toContainText('Under the Community License, you cannot sell');
 await page.getByRole('link',{name:'Meet the SVG animator',exact:false}).click();await expect(page.getByRole('heading',{name:'Meet the SVG animator.',exact:true})).toBeInViewport();
 await page.getByRole('link',{name:'Pixel Perfect home',exact:true}).click();await page.screenshot({path:info.outputPath(`product-site-${width}.png`),fullPage:true});
 await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Dev log',exact:true}).click();
 await expect(page).toHaveURL(/\/dev-log\.html$/);await expect(page.getByRole('heading',{level:1})).toHaveText('Made.Improved.Released.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.getByRole('link',{name:'Alpha.20 · Canvas handles',exact:false}).click();await expect(page.locator('#alpha-20')).toBeInViewport();
 await page.screenshot({path:info.outputPath(`dev-log-${width}.png`),fullPage:true});
 await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Roadmap',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 expect(errors).toEqual([]);
});

test('product page embeds the actual interactive SVG export with keyboard playback',async({page})=>{
 await page.goto('/pixlprfct/');await expect.poll(()=>page.frames().some(frame=>frame.url().endsWith('/assets/icon-demo.svg'))).toBe(true);
 const frame=page.frames().find(frame=>frame.url().endsWith('/assets/icon-demo.svg')),icon=frame.getByRole('button',{name:'Interactive icon study animation'});
 await icon.press('Enter');await expect.poll(()=>icon.evaluate(n=>n.getCurrentTime())).toBeCloseTo(.6,4);await icon.press('Space');await expect.poll(()=>icon.evaluate(n=>n.getCurrentTime())).toBe(0);
});
