import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {APP_URL,CSP,isLocalURL,serverURL,assetPath,externalURL,sameWorkspace,partitionFor}=require('../desktop/policy.cjs');
const root=path.resolve('/packaged/app');
test('only the isolated SVG preview may be embedded and its policy blocks inline scripts',()=>{
 const {contentSecurityPolicy}=require('../desktop/policy.cjs');
 for(const url of [APP_URL,APP_URL+'editor/svg-animation.html','https://example.com/editor/svg-animation-preview.html'])assert.equal(contentSecurityPolicy(url),CSP);
 const preview=contentSecurityPolicy(APP_URL+'editor/svg-animation-preview.html');assert.match(preview,/frame-ancestors 'self'/);assert.doesNotMatch(preview,/allow-same-origin/);assert.match(preview,/script-src 'self';/);assert.match(preview,/default-src 'none'/);
});
test('the packaged origin serves only editor assets and the desktop connection page',()=>{
 assert.equal(assetPath(root,APP_URL),path.join(root,'web/project-home.html'));
 assert.equal(assetPath(root,APP_URL+'editor/pkg/pixlprfct_core_bg.wasm'),path.join(root,'web/pkg/pixlprfct_core_bg.wasm'));
 assert.equal(assetPath(root,APP_URL+'desktop/connect.html'),path.join(root,'desktop/connect.html'));
 for(const input of ['file:///etc/passwd','pixlprfct://evil/editor/index.html',APP_URL+'editor/%2e%2e/main.cjs',APP_URL+'editor/..%2fmain.cjs',APP_URL+'editor/%5c..%5cmain.cjs',APP_URL+'editor/%00',APP_URL+'editor/.env',APP_URL+'main.cjs',APP_URL+'editor/%E0%A4%A'])assert.equal(assetPath(root,input),null,input);
});
test('workspace addresses require HTTPS, except exact loopback development hosts',()=>{
 assert.equal(serverURL('https://design.example.com/'),'https://design.example.com');
 assert.equal(serverURL('http://127.0.0.1:4176'),'http://127.0.0.1:4176');
 assert.equal(serverURL('http://localhost:4174'),'http://localhost:4174');
 for(const input of ['http://example.com','http://localhost.evil.test','file:///tmp','javascript:alert(1)','https://me:secret@example.com','https://example.com/editor','https://example.com/?token=secret','https://example.com/#token',{},null])assert.throws(()=>serverURL(input));
});
test('navigation stays inside its workspace and remote partitions never overlap local drafts',()=>{
 assert.ok(isLocalURL(APP_URL+'editor/index.html?draft=123'));
 assert.ok(!isLocalURL('pixlprfct://app.evil/editor/index.html'));
 assert.ok(!isLocalURL('pixlprfct://user@app/'));
 assert.ok(sameWorkspace('https://team.example.com/editor/index.html','https://team.example.com/account'));
 assert.ok(!sameWorkspace('https://other.example.com/','https://team.example.com'));
 assert.ok(!sameWorkspace('https://u:p@team.example.com/','https://team.example.com'));
 assert.equal(partitionFor(APP_URL+'editor/index.html'),partitionFor(APP_URL));
 assert.equal(partitionFor('https://team.example.com/editor/index.html'),partitionFor('https://team.example.com/'));
 assert.notEqual(partitionFor(APP_URL),partitionFor('https://team.example.com'));
 assert.notEqual(partitionFor('https://other.example.com'),partitionFor('https://team.example.com'));
});
test('external navigation never invokes local programs or embedded credentials',()=>{
 assert.equal(externalURL('https://example.com/help'),'https://example.com/help');
 for(const input of ['file:///etc/passwd','javascript:alert(1)','data:text/html,test','smb://share','https://me:secret@example.com'])assert.equal(externalURL(input),null);
 assert.match(CSP,/script-src 'self' 'wasm-unsafe-eval'/);assert.match(CSP,/object-src 'none'/);
});

test('only named same-workspace panel shells can create connected native windows',()=>{
 const {isPanelWindow}=require('../desktop/policy.cjs'),name='pixl-panel-00000000-0000-4000-8000-000000000001';
 for(const base of [APP_URL,'https://team.example.com/','http://127.0.0.1:5173/'])assert.ok(isPanelWindow(new URL('/editor/panel.html',base).href,base,name));
 for(const url of ['https://other.example.com/editor/panel.html',APP_URL+'editor/index.html',APP_URL+'editor/panel.html?source=other',APP_URL+'editor/panel.html#other','about:blank','data:text/html,test','file:///editor/panel.html',APP_URL+'editor/%70anel.html'])assert.equal(isPanelWindow(url,APP_URL,name),false);
 for(const name of ['','panel','pixl-panel-other',null])assert.equal(isPanelWindow(APP_URL+'editor/panel.html',APP_URL,name),false);
});
