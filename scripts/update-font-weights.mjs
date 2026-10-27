import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fontSuggestions} from '../web/google-fonts.js';
const catalog={};
for(const family of fontSuggestions.filter(x=>!['Georgia','monospace'].includes(x))){
 let metadata;
 for(const license of ['ofl','apache','ufl']){
  try{metadata=execFileSync('curl',['-fsSL','--max-time','15',`https://raw.githubusercontent.com/google/fonts/main/${license}/${family.toLowerCase().replaceAll(' ','')}/METADATA.pb`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});break;}catch{}
 }
 if(!metadata)throw Error('Missing metadata for '+family);
 const axis=metadata.match(/axes\s*\{\s*tag: "wght"\s*min_value: ([\d.]+)\s*max_value: ([\d.]+)/);
 const weights=axis?Array.from({length:9},(_,i)=>(i+1)*100).filter(w=>w>=Number(axis[1])&&w<=Number(axis[2])):[...new Set([...metadata.matchAll(/fonts\s*\{([^}]+)\}/g)].filter(m=>/style: "normal"/.test(m[1])).map(m=>Number(m[1].match(/weight: (\d+)/)[1])))];
 catalog[family]=weights.sort((a,b)=>a-b);
}
writeFileSync('web/font-weight-catalog.js','// Standard weights from google/fonts METADATA.pb. Regenerate with scripts/update-font-weights.mjs.\nexport const fontWeightCatalog='+JSON.stringify(catalog,null,2)+';\n');
console.log('Updated '+Object.keys(catalog).length+' font families');
