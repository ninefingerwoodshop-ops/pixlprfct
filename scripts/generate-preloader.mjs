import {readFile,writeFile} from 'node:fs/promises';
import {loadingScreenMarkup} from '../web/loading-screen.js';

const check=process.argv.includes('--check');
const css=await readFile(new URL('../web/loading-screen.css',import.meta.url),'utf8');
for(const [name,message] of [['index.html','Opening your workspace…'],['project-home.html','Loading your projects…']]){
 const path=new URL('../web/'+name,import.meta.url),source=await readFile(path,'utf8');
 const block=(name,body)=>`<!-- preloader:${name} -->\n${body}\n<!-- /preloader:${name} -->`;
 const next=source.replace(/<!-- preloader:styles -->[\s\S]*?<!-- \/preloader:styles -->/,block('styles',`<style>\n${css}</style>`)).replace(/<!-- preloader:markup -->[\s\S]*?<!-- \/preloader:markup -->/,block('markup',loadingScreenMarkup(message)));
 if(!source.includes('<!-- preloader:styles -->')||!source.includes('<!-- preloader:markup -->'))throw new Error('Missing preloader markers in '+name);
 if(check&&source!==next)throw new Error('Run node scripts/generate-preloader.mjs to update '+name);
 if(!check)await writeFile(path,next);
}
