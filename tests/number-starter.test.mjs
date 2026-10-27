import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {numberConfig,formatNumber} from '../web/number-control.js';
import {ensureInputBase} from '../web/input-base.js';
import {newControl,controlMarkup,controlCss} from '../web/controls.js';
import {behaviorSource} from '../web/behaviors.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
test('number formatting supports localized decimals, currency and percentage without changing values',()=>{
 const config=numberConfig({number:{format:'currency',currency:'USD',decimals:2}});assert.equal(formatNumber('1234.5',config),'$1,234.50');
 assert.equal(formatNumber('',config),'');assert.equal(formatNumber('bad',config),'');
 assert.equal(formatNumber('0.25',{...config,format:'percent',decimals:0}),'25%');
 assert.equal(formatNumber('1234.5',{...config,format:'decimal',locale:'de-DE'}),'1.234,50');
 assert.equal(formatNumber('12.345',{...config,format:'plain'}),'12.345');
 assert.equal(formatNumber('1234.5',{...config,format:'decimal',grouping:false}),'1234.50');
});
test('number starter keeps native constraints, persists settings and exports runtime',()=>{
 const e=new Editor(),base=ensureInputBase(JSON.parse(e.snapshot()).variables,'number');
 const control={...newControl('number','Quantity'),starter:true,base_collection:base.collection.id,value:'2.5',min:'0',max:'10',step:'0.5',number:{buttons:true,format:'decimal',decimals:2}};
 const id=e.insert_control_starter(JSON.stringify({id:0,name:'Number input',kind:'frame',x:0,y:0,width:280,height:112,fill:'#ffffff',text:'',hidden:false,control,variable_bindings:base.bindings}),JSON.stringify(base.variables));
 const instance=e.create_instance(id,300,0),s=JSON.parse(e.snapshot()).shapes.find(s=>s.id===instance);assert.deepEqual(s.control.number,control.number);
 const html=controlMarkup(s.control,instance);assert.match(html,/type="number"/);assert.match(html,/min="0" max="10" step="0.5"/);assert.match(html,/Decrease Quantity/);assert.match(html,/>2.50<\/span>/);
 assert.doesNotMatch(controlMarkup({...s.control,number:{buttons:false}},instance),/data-number-step/);
 assert.match(controlMarkup({...s.control,readonly:true},instance),/readonly="readonly"/);assert.match(controlMarkup({...s.control,readonly:true},instance),/aria-controls="[^"]+" disabled/);
 assert.match(controlCss(s.control,instance,{interactive:true}),/grid-row:2/);
 const source=behaviorSource([s]);assert.match(source,/function mountNumbers/);new Function(source.replaceAll('export ',''));e.free();
});
