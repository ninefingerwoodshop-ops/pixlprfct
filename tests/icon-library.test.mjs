import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {iconPaths,iconWeights,icon} from '../web/icons.js';
import {iconSvg} from '../web/icon-library.js';
test('library includes every system icon in three real weights and portable SVG exports',async()=>{
 const css=await readFile(new URL('../web/icon-library-assets/css/icons.css',import.meta.url),'utf8');
 for(const name of Object.keys(iconPaths)){
  assert.ok(css.includes('.pxi-'+name+'::before'));
  for(const [weight,stroke] of Object.entries(iconWeights)){
   const svg=iconSvg(name,weight);assert.ok(svg.includes('stroke-width="'+stroke+'"'));assert.match(svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  }
 }
 assert.ok(Object.hasOwn(iconPaths,'asterisk'));assert.match(icon('asterisk'),/stroke-width="1.5"/);
 assert.throws(()=>iconSvg('missing'),/Unknown icon/);
});
