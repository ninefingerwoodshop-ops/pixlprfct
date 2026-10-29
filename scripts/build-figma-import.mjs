import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('web/vendor',{recursive:true});
await build({entryPoints:['web/figma/worker.js'],outfile:'web/vendor/figma-import-worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof'});
const licenses=await Promise.all(['fflate','fzstd','kiwi-schema'].map(async name=>`${name}\n${await readFile(name==='kiwi-schema'?'scripts/licenses/kiwi-schema.txt':`node_modules/${name}/LICENSE`,'utf8')}`));
await writeFile('web/vendor/figma-import-LICENSES.txt',licenses.join('\n\n'));
console.log('Built local Figma import worker.');
