// The local-only editor as plain files for an ordinary web server: the project list
// at /, the editor under /editor/, no accounts or cloud files. Projects stay in each
// visitor's browser. Run after `npm run build:editor`, which makes web/pkg and web/vendor.
// Usage: node scripts/build-static.mjs [output directory, default .static]
import {access,cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),web=path.join(root,'web'),out=path.resolve(process.argv[2]??path.join(root,'.static'));
if([path.parse(out).root,root,web].includes(out))throw new Error('Choose an output directory of its own; it is deleted and rebuilt.');
await access(path.join(web,'pkg/pixlprfct_core_bg.wasm')).catch(()=>{throw new Error('web/pkg is missing. Run npm run build:editor first.');});
// Account sign-in needs a server; Admin and the setup builder work offline.
// Dotfiles, type declarations and the
// README wasm-pack copies into pkg are not part of the app.
const serverPages=new Set(['account.html']);
const keep=source=>{const name=path.basename(source);return !name.startsWith('.')&&!name.endsWith('.d.ts')&&name!=='README.md'&&!(path.dirname(source)===web&&serverPages.has(name));};
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(web,path.join(out,'editor'),{recursive:true,filter:source=>source===web||keep(source)});
await cp(path.join(web,'project-home.html'),path.join(out,'index.html'));
// web/static-host.js reads this mark and hides what needs a server.
const pages=[path.join(out,'index.html'),...(await readdir(path.join(out,'editor'))).filter(name=>name.endsWith('.html')).map(name=>path.join(out,'editor',name))];
for(const page of pages){const html=await readFile(page,'utf8');if(!/<html\b/i.test(html))throw new Error(page+' has no <html> tag to mark.');await writeFile(page,html.replace(/<html\b/i,'<html data-host="static"'));}
await writeFile(path.join(out,'.htaccess'),`# PixlPrfct in the browser: static files with no server behind them.
# Written by scripts/build-static.mjs.
AddType application/wasm .wasm
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /index.html

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json application/wasm image/svg+xml
</IfModule>

# No file here has a version in its URL, so browsers and proxies must check for a
# newer copy on every visit; unchanged files come back as 304s. ExpiresActive Off
# and the <Files> section keep a parent directory's long-lived cache rules from
# applying: a parent's <FilesMatch> would otherwise beat a plain Header line here.
<IfModule mod_expires.c>
  ExpiresActive Off
</IfModule>
<IfModule mod_headers.c>
  <Files "*">
    Header set Cache-Control "no-cache"
  </Files>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header always unset X-Powered-By
</IfModule>
`);
const shown=path.relative(process.cwd(),out);console.log('Built the static-host editor in '+(shown.startsWith('..')?out:shown)+'/');
