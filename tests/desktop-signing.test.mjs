import test from 'node:test';
import assert from 'node:assert/strict';
import {configureSigning} from '../scripts/desktop/signing.mjs';
const setup=(args,env={},platform='mac')=>{const config={mac:{entitlements:'desktop/entitlements.mac.plist'},directories:{output:'releases/desktop'}};const result=configureSigning(config,{flags:new Set(args),platform,env});return {config,...result};};
test('a public Mac release cannot silently skip notarization',()=>{
 assert.throws(()=>setup(['--release']),/requires notarization/);
 assert.throws(()=>setup(['--release'],{APPLE_ID:'me@example.com',APPLE_KEYCHAIN_PROFILE:'saved'}),/requires notarization/);
 for(const env of [{APPLE_KEYCHAIN_PROFILE:'saved'},{APPLE_ID:'me@example.com',APPLE_APP_SPECIFIC_PASSWORD:'test-only',APPLE_TEAM_ID:'TESTTEAM12'},{APPLE_API_KEY:'/key',APPLE_API_KEY_ID:'id',APPLE_API_ISSUER:'issuer'}]){
  const {config}=setup(['--release'],env);assert.equal(config.forceCodeSigning,true);assert.equal(config.mac.notarize,true);assert.equal(config.mac.hardenedRuntime,true);assert.equal(config.dmg.sign,true);assert.equal(config.directories.output,'releases/desktop/release');
 }
});
test('signed-only Mac builds require signatures and remain separate from public releases',()=>{
 const {config}=setup(['--sign-only']);assert.equal(config.forceCodeSigning,true);assert.equal(config.mac.notarize,false);assert.equal(config.mac.hardenedRuntime,true);assert.equal(config.dmg.sign,true);assert.equal(config.directories.output,'releases/desktop/signed');
 assert.throws(()=>setup(['--sign-only','--release']),/only for a Mac/);assert.throws(()=>setup(['--sign-only'],{},'win'),/only for a Mac/);
});
test('test, Windows release and App Store paths retain distinct signing policies',()=>{
 const unsigned=setup([]);assert.equal(unsigned.config.mac.identity,'-');assert.equal(unsigned.config.mac.hardenedRuntime,false);assert.equal(unsigned.config.win.signExecutable,false);
 const windows=setup(['--release'],{},'win');assert.equal(windows.config.forceCodeSigning,true);assert.equal(windows.config.win?.signExecutable,undefined);
 const store=setup(['--mas']);assert.equal(store.config.forceCodeSigning,true);assert.equal(store.config.mac.notarize,undefined);assert.equal(store.config.directories.output,'releases/desktop/app-store');
});
