import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const {updateFeed,installUpdates}=createRequire(import.meta.url)('../desktop/updates.cjs');
test('updates require pinned HTTPS configuration and serialize checks without forcing a quit',async()=>{
 assert.throws(()=>updateFeed('http://example.test/feed'));assert.throws(()=>updateFeed('https://secret@example.test/feed'));assert.equal(updateFeed(null),null);
 const updater=new EventEmitter(),messages=[];let checks=0,feed;updater.setFeedURL=v=>feed=v;updater.checkForUpdates=()=>checks++;
 const dialog={showMessageBox:async v=>messages.push(v)},app={isPackaged:true};
 const disabled=installUpdates({app,autoUpdater:updater,dialog,config:{release:false,feed:'https://example.test/feed'},platform:'darwin'});await disabled.check();assert.equal(checks,0);
 const enabled=installUpdates({app,autoUpdater:updater,dialog,config:{release:true,feed:'https://example.test/feed'},platform:'darwin'});enabled.check();enabled.check();assert.equal(checks,1);assert.equal(feed.serverType,'json');updater.emit('error',new Error('sensitive internal transport detail'));enabled.check();assert.equal(checks,2);updater.emit('update-downloaded');await enabled.check();assert.equal(checks,2);assert(!JSON.stringify(messages).includes('sensitive'));
});

test('signed releases can use manual installation without an automatic-update service',async()=>{
 const messages=[],updater=new EventEmitter();updater.setFeedURL=()=>assert.fail('No feed should be configured');updater.checkForUpdates=()=>assert.fail('Manual release must not contact an update host');
 const manual=installUpdates({app:{isPackaged:true},autoUpdater:updater,dialog:{showMessageBox:async value=>messages.push(value)},config:{release:true,feed:null},platform:'darwin'});await manual.check();assert.match(messages[0].detail,/Install newer versions from your distributor/);assert.match(messages[0].detail,/optional/);
});
