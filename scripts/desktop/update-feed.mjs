import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),{updateFeed}=require('../../desktop/updates.cjs');
const [archive,url,output,notesFile]=process.argv.slice(2);if(!archive||!url||!output)throw new Error('Usage: node scripts/desktop/update-feed.mjs signed.zip https://host/signed.zip feed.json [release-notes.txt]');
const version=JSON.parse(await readFile(new URL('../../package.json',import.meta.url))).version;
if(!archive.endsWith('.zip')||!new URL(updateFeed(url)).pathname.endsWith('.zip'))throw new Error('Mac updates require a ZIP archive.');
// This prepares metadata only. Release acceptance must verify the enclosed app.
const bytes=await readFile(archive),notes=notesFile?await readFile(notesFile,'utf8'):'';
const feed={currentRelease:version,releases:[{version,updateTo:{version,url:updateFeed(url),name:'PixlPrfct '+version,notes,pub_date:new Date((await stat(archive)).mtimeMs).toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length}}]};
await writeFile(output,JSON.stringify(feed,null,2)+'\n',{flag:'wx'});console.log('Prepared '+path.basename(output)+'. Publish only after signed-app and notarization checks pass.');
