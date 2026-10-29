import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {access,mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..');
test('the static-host build marks every page and leaves out the server-only pages',async t=>{
 const out=await mkdtemp(path.join(os.tmpdir(),'pixl-static-'));t.after(()=>rm(out,{recursive:true,force:true}));
 await run(process.execPath,[path.join(root,'scripts/build-static.mjs'),out]);
 const pages=['index.html',...(await readdir(path.join(out,'editor'))).filter(name=>name.endsWith('.html')).map(name=>'editor/'+name)];
 assert.ok(pages.includes('editor/index.html'));
 for(const page of pages)assert.match(await readFile(path.join(out,page),'utf8'),/<html data-host="static"/,page);
 for(const page of ['editor/account.html','editor/pkg/README.md','editor/pkg/.gitignore'])await assert.rejects(access(path.join(out,page)),page);
 for(const page of ['editor/admin.html','editor/setup.html'])await access(path.join(out,page));
 await access(path.join(out,'editor/pkg/pixlprfct_core_bg.wasm'));
 await access(path.join(out,'editor/static-host.js'));
 const htaccess=await readFile(path.join(out,'.htaccess'),'utf8');
 assert.match(htaccess,/AddType application\/wasm \.wasm/);
 assert.match(htaccess,/Cache-Control "no-cache"/);
});
test('the static-host build refuses to delete the repository or the editor source',async()=>{
 for(const target of [root,path.join(root,'web')])await assert.rejects(run(process.execPath,[path.join(root,'scripts/build-static.mjs'),target]),/output directory of its own/);
});
