import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readConfig} from '../server/config.mjs';
import {startServer} from '../server/index.mjs';
import desktopPolicy from '../desktop/policy.cjs';

test('self-hosted SVG preview keeps the editor unframeable and isolates only the preview',async()=>{
 const config=readConfig({PIXL_APP_URL:'http://localhost:4174',PIXL_LOCAL_DEVELOPMENT:'true',PIXL_SQLITE_PATH:':memory:',BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),PIXL_ADMIN_EMAIL:'owner@example.com'});
 const instance=await startServer({...config,port:0,host:'127.0.0.1'},{migrate:true});
 try{
  const base='http://127.0.0.1:'+instance.server.address().port;
  for(const path of ['/editor/svg-animation.html','/account']){const result=await fetch(base+path);assert.equal(result.status,200);assert.equal(result.headers.get('x-frame-options'),'DENY');assert.match(result.headers.get('content-security-policy'),/frame-ancestors 'none'/);}
  const result=await fetch(base+'/editor/svg-animation-preview.html');assert.equal(result.status,200);assert.equal(result.headers.get('x-frame-options'),'SAMEORIGIN');assert.equal(result.headers.get('content-security-policy'),desktopPolicy.contentSecurityPolicy('pixlprfct://app/editor/svg-animation-preview.html'));
  assert.match(await result.text(),/vendor\/svg-animation-preview\.js/);
 }finally{await instance.close();}
});
