import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadingScreenMarkup,startLoading,loadingMessage,finishLoading,failLoading} from '../web/loading-screen.js';

test('static startup screens stay in sync with the shared renderer and critical CSS',()=>{
 execFileSync(process.execPath,['scripts/generate-preloader.mjs','--check'],{cwd:new URL('..',import.meta.url)});
 assert.ok(loadingScreenMarkup('<Project & name>').includes('&lt;Project &amp; name&gt;'));
});

test('loading blocks the workspace, survives slow and failed startup, then restores existing inert states',t=>{
 const previous=globalThis.document;
 const label={textContent:''},help={hidden:true},actions={hidden:true};
 const screen={hidden:false,failed:false,contains:()=>false,querySelector:selector=>({'.loading-message':label,'.loading-help':help,'.loading-actions':actions}[selector]),setAttribute(){this.failed=true;},removeAttribute(){this.failed=false;}};
 const workspace={inert:false,contains:()=>false},alreadyInert={inert:true,contains:()=>false};
 globalThis.document={body:{children:[screen,workspace,alreadyInert]},querySelector:()=>screen,getElementById:()=>workspace};
 t.mock.timers.enable({apis:['setTimeout']});
 t.after(()=>{finishLoading();globalThis.document=previous;});
 startLoading('Opening project');
 assert.equal(workspace.inert,true);assert.equal(label.textContent,'Opening project');
 loadingMessage('Preparing canvas');assert.equal(label.textContent,'Preparing canvas');
 t.mock.timers.tick(15000);assert.equal(actions.hidden,false);assert.equal(help.hidden,false);
 failLoading('Could not open project');assert.equal(screen.failed,true);assert.equal(help.hidden,true);assert.equal(workspace.inert,true);
 t.mock.timers.tick(30000);assert.equal(help.hidden,true);
 startLoading('Trying again');assert.equal(screen.failed,false);assert.equal(actions.hidden,true);
 finishLoading();assert.equal(screen.hidden,true);assert.equal(workspace.inert,false);assert.equal(alreadyInert.inert,true);
 t.mock.timers.tick(30000);assert.equal(actions.hidden,true);
});

test('failure before editor evaluation still exposes recovery actions',t=>{
 const previous=globalThis.document;
 const label={},help={},actions={},screen={contains:()=>false,querySelector:selector=>({'.loading-message':label,'.loading-help':help,'.loading-actions':actions}[selector]),setAttribute(){},removeAttribute(){}};
 globalThis.document={body:{children:[screen]},querySelector:()=>screen,getElementById:()=>null};
 t.after(()=>{finishLoading();globalThis.document=previous;});
 failLoading();assert.equal(actions.hidden,false);assert.equal(screen.hidden,false);assert.match(label.textContent,/Try again/);
});
