import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const port=Number(process.env.PIXL_ACCEPTANCE_PORT??4197);
const root=path.resolve(process.env.PIXL_ACCEPTANCE_ROOT??'dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/editor/project-home.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const body=await readFile(file);res.writeHead(200,{'content-type':types[path.extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(body);}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Acceptance editor: http://127.0.0.1:${port}`));
