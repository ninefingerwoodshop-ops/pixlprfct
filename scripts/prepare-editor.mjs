import {mkdir,cp} from 'node:fs/promises';
await mkdir('public/editor',{recursive:true});
await cp('web','public/editor',{recursive:true});
await cp('LICENSE','public/editor/LICENSE');
await cp('docs/licenses','public/editor/licenses',{recursive:true});
console.log('Prepared Rust editor assets for cloud runtime');
