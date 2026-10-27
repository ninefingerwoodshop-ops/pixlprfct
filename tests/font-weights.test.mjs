import test from 'node:test';
import assert from 'node:assert/strict';
import {availableFontWeights} from '../web/google-fonts.js';
test('font weight options omit unsupported weights and cache successful requests',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;const weight=Number(new URL(url).searchParams.get('family').split('@')[1]);return {ok:[400,700].includes(weight),status:[400,700].includes(weight)?200:400};};
 try{assert.deepEqual(await availableFontWeights('Test Family'),[400,700]);await availableFontWeights('Test Family');assert.equal(calls,9);}finally{globalThis.fetch=original;}
});
test('failed font weight requests can retry',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>{throw Error('Offline');};await assert.rejects(availableFontWeights('Retry Family'));globalThis.fetch=async()=>({ok:true,status:200});assert.equal((await availableFontWeights('Retry Family')).length,9);}finally{globalThis.fetch=original;}
});
test('bundled font weights work offline and reflect each family',async()=>{
 assert.deepEqual(await availableFontWeights('Open Sans'),[300,400,500,600,700,800]);
 assert.deepEqual(await availableFontWeights('Bebas Neue'),[400]);
 assert.deepEqual(await availableFontWeights('Manrope'),[200,300,400,500,600,700,800]);
});
