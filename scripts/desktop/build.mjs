import {build,Platform,Arch} from 'electron-builder';
import {createRequire} from 'node:module';
import {access} from 'node:fs/promises';
import {configureSigning} from './signing.mjs';
const require=createRequire(import.meta.url),config=require('../../desktop/builder.config.cjs');
const flags=new Set(process.argv.slice(2)),store=flags.has('--mas')||flags.has('--mas-dev');
const platform=flags.has('--win')?Platform.WINDOWS:Platform.MAC;
if(platform===Platform.MAC&&process.platform!=='darwin')throw new Error('Build macOS packages on a Mac.');
if(store){
 for(const key of ['PIXL_DESKTOP_APP_ID','APPLE_TEAM_ID','PIXL_MAS_PROFILE'])if(!process.env[key])throw new Error(`${key} is required for an App Store build. See docs/DESKTOP.md.`);
 if(!/^[A-Z0-9]{10}$/.test(process.env.APPLE_TEAM_ID))throw new Error('APPLE_TEAM_ID must be your 10-character Apple Team ID.');
 await access(process.env.PIXL_MAS_PROFILE);
}
const {mode}=configureSigning(config,{flags,platform:platform===Platform.WINDOWS?'win':'mac'});
console.log(mode==='test'?'Building unsigned test packages. Use --release with signing credentials for public distribution.':mode==='signed'?'Building Developer ID signed packages. Notarization is still required before public distribution.':`Building ${mode} packages with required signing.`);
const arch=flags.has('--arm64')?Arch.arm64:flags.has('--x64')?Arch.x64:platform===Platform.WINDOWS?Arch.x64:flags.has('--dir')?Arch[process.arch]:Arch.universal;
const targets=flags.has('--dir')?['dir']:flags.has('--mas-dev')?['mas-dev']:flags.has('--mas')?['mas']:platform===Platform.WINDOWS?['nsis','zip']:['dmg','zip'];
await build({config,targets:platform.createTarget(targets,arch),publish:'never'});
