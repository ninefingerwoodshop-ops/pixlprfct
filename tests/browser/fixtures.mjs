import {appearance} from '../../web/appearance.js';
import {test as base,expect} from '@playwright/test';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();
export const key='pixlprfct.drafts.v1';
export const test=base.extend({page:async({page},runFixture)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 // Tests are offline and deterministic. Only the local built application loads.
 await page.route(/https?:\/\//,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await runFixture(page);expect(errors).toEqual([]);
}});
export {expect};
export function fixture({components=false}={}){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
 const label=e.add('text',80,80);edit(label,{name:'Acceptance label',text:'Hello browser',width:300,height:50,typography:{...get(label).typography,font_family:'Arial',font_size:24,line_height:1.25},fill:'#ffffff'});
 const box=e.add('rectangle',80,180);edit(box,{name:'Acceptance card',width:240,height:120,fill:'#666666',appearance:{...appearance(get(box)),shadows:[{x:0,y:4,blur:8,spread:0,color:'#000000',opacity:.25,visible:true,kind:'drop'}]}});
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Theme',modes:[{id:1,name:'Light'},{id:2,name:'Dark'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Shadow/brand',kind:'color',values:{1:'#ff0000',2:'#0000ff'}}]}));
 let componentIds={};
 if(components){const master=e.add('frame',400,50);edit(master,{name:'Card main',width:300,height:180});const content=e.add('text',420,70);edit(content,{name:'Slot label',text:'Default content',width:220,height:40});e.reparent_many(JSON.stringify([content]),master);e.create_component(master);const slot=e.wrap_in_slot(JSON.stringify([content]),'Body'),instance=e.create_instance(master,400,300);edit(instance,{name:'Card instance'});const instanceSlot=doc().shapes.find(s=>s.parent_id===instance&&s.slot).id,alternate=JSON.parse(e.duplicate_many(JSON.stringify([master])))[0];edit(alternate,{name:'Card alternate',fill:'#445566'});e.save_component_set(JSON.stringify({id:0,name:'Card',properties:['State'],variants:[{component_id:master,values:['Default']},{component_id:alternate,values:['Alternate']}]}));componentIds={master,slot,instance,instanceSlot,alternate,content:doc().shapes.find(s=>s.parent_id===instanceSlot).id};}
 const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),label,box,...componentIds};
 }finally{e.free();}
}
export async function seed(page,data=fixture()){
 await page.goto('/editor/project-home.html');await expect(page.locator('#home-new')).toBeVisible();
 await page.evaluate(({key,body})=>localStorage.setItem(key,JSON.stringify({version:1,activeId:'acceptance',files:[{id:'acceptance',name:'Browser acceptance',body,updatedAt:1793318400000}]})),{key,body:data.body});
 await open(page);return data;
}
export async function open(page){await page.goto('/editor/index.html?draft=acceptance');await expect(page.locator('[data-loading-screen]')).toBeHidden();await expect(page.getByLabel('Document name',{exact:true})).toBeVisible();}
export async function saved(page){return page.evaluate(key=>JSON.parse(JSON.parse(localStorage.getItem(key)).files.find(f=>f.id==='acceptance').body),key);}
export async function rename(page,name){const field=page.getByLabel('Document name',{exact:true});await field.fill(name);await field.press('Enter');}
export async function field(page,name,value){const input=page.getByLabel(name,{exact:true});await input.fill(value);await input.press('Tab');}
export async function select(page,id){await page.locator('#expand-all-layers').click();await page.locator(`.layer[data-layer-id="${id}"]`).click();}
export async function snapshot(page,name,locator=page){if(process.platform==='darwin')await expect(locator).toHaveScreenshot(name);}
