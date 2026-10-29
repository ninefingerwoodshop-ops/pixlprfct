import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readConfig} from './config.mjs';
import {connectDatabase,migrateDocuments} from './database.mjs';
import {createAuth,migrateAuth} from './auth.mjs';
import {createApplication} from './application.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
export async function startServer(config,{migrate=false,deliver}={}) {
 const db=await connectDatabase(config);
 if(migrate){await migrateAuth(createAuth(config,db,deliver,{migrating:true}));await migrateDocuments(db,config.engine);}
 else {try{await db.query('SELECT id FROM documents LIMIT 1');}catch{await db.close();throw new Error('Initialize the database with npm run selfhost:migrate first.');}}
 const auth=createAuth(config,db,deliver),handle=createApplication({config,db,auth}),root=path.resolve('web');
 const server=http.createServer(async(req,res)=>{
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
   if(!config.local)res.setHeader('Strict-Transport-Security','max-age=31536000');
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' ws://127.0.0.1:* https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
   try{
     const url=new URL(req.url,config.baseURL);
     if(url.pathname.startsWith('/api/')){
       const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
       // Do not trust arbitrary proxy / platform identity headers from clients.
       for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-')||key==='forwarded'||key.startsWith('x-forwarded-')||key==='x-real-ip'||key==='cf-connecting-ip')headers.delete(key);
       headers.set('x-pixl-client-ip',req.socket.remoteAddress??'unknown');
       let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>5_100_000){res.writeHead(413).end('Request is too large.');return;}chunks.push(chunk);}
       const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
       const response=await handle(request);res.statusCode=response.status;
       response.headers.forEach((value,key)=>{if(key!=='set-cookie')res.setHeader(key,value);});
       const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
       res.end(Buffer.from(await response.arrayBuffer()));return;
     }
     if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
     const routes={'/':'project-home.html','/account':'account.html','/setup':'setup.html'};
     const relative=routes[url.pathname]??(url.pathname.startsWith('/editor/')?decodeURIComponent(url.pathname.slice(8)):null);
     if(!relative){res.writeHead(404).end('Not found');return;}
     const file=path.resolve(root,relative);
     if(!file.startsWith(root+path.sep)||!types[path.extname(file)]){res.writeHead(404).end('Not found');return;}
     const body=await readFile(file);res.setHeader('Content-Type',types[path.extname(file)]);res.setHeader('Cache-Control','no-store');res.end(req.method==='HEAD'?undefined:body);
   }catch(error){if(!res.headersSent)res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'text/plain'});res.end('Unable to complete request.');}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(config.port,config.host,resolve);});}catch(error){await db.close();throw error;}
 return {server,db,auth,close:()=>new Promise(resolve=>server.close(async()=>{await db.close();resolve();}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const config=readConfig(),instance=await startServer(config);console.log('PixlPrfct: '+config.baseURL);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>instance.close().then(()=>process.exit(0)));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
