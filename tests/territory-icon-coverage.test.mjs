import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inventory} from '../scripts/territory-icon-inventory.mjs';
import {iconPaths,iconWeights} from '../web/icons.js';
import {iconKeywords} from '../web/icon-keywords.js';
import {iconSvg} from '../web/icon-library.js';

test('every Territory Track reference has a searchable, exportable symbol in all weights',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../web/icon-library-assets/territory-track.json',import.meta.url),'utf8'));
 const keys=new Set();
 for(const {group,name,target,uses} of manifest.references){
  const key=`${group}:${name}`;
  assert.ok(!keys.has(key),`Duplicate ${key}`);keys.add(key);
  assert.ok(Object.hasOwn(iconPaths,target),`Missing ${key} → ${target}`);
  assert.ok(iconKeywords[target]?.includes(name),`Not searchable: ${key}`);
  assert.ok(uses.length,`Missing source evidence: ${key}`);
  for(const weight of Object.keys(iconWeights))assert.match(iconSvg(target,weight),/<path d="[^\"]+"/);
 }
 for(const group of ['web','lucide','avatar','custom','ios'])assert.ok(manifest.references.some(e=>e.group===group));
 for(const name of ['phone-off','user-settings','person-walking','brain-profile','document-scan','calendar-clock','apple-logo','google-logo','facebook-logo','instagram-logo','github-logo'])assert.ok(Object.hasOwn(iconPaths,name));
});

test('source scan catches template branches, indirect icon maps, avatars, Swift badges and shortcuts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'territory-icons-'));
 try{
  await mkdir(join(root,'client/src/app'),{recursive:true});
  for(const dir of ['TerritoryTrack','TerritoryTrackWidgets','Shared'])await mkdir(join(root,dir));
  await writeFile(join(root,'client/src/app/test.html'),`<span [appIcon]="ready === 'yes' ? 'check' : 'clock'"></span><app-icon [name]="item.icon"/><i class="ph ph-phone-slash"></i><span nfIcon="mail"></span>`);
  await writeFile(join(root,'client/src/app/test.ts'),`const ICON_SVG = { cat: '<svg/>' }; const ICONS = { globe: 'M3 4h5' }; function f(){return iconSvg('map');} class C { iconFor(){return { open:'folder-open', shut:'folder' }[state] || 'file';} }`);
  await writeFile(join(root,'TerritoryTrack/Icons.swift'),`Image(systemName: active ? "checkmark.circle.fill" : "circle")\nAppShortcut(systemImageName: "camera.viewfinder")\nvar icon: String { switch self { case .visit: return "figure.walk" } }\nvar secondaryIcon: String { tracking ? "clock.fill" : "dollarsign.circle.fill" }\nfunc insightIcon(_ type: String) -> String { switch type { case "win": return "trophy.fill"; default: return "lightbulb.fill" } }\nlet tabs = [(.more, "Account", "person.crop.circle.fill")]`);
  const actual=new Set((await inventory(root,root)).map(e=>`${e.group}:${e.name}`));
  for(const key of ['web:check','web:clock','web:phone-slash','web:map','web:folder-open','web:folder','web:file','lucide:mail','avatar:cat','custom:app.globe','ios:checkmark.circle.fill','ios:circle','ios:camera.viewfinder','ios:figure.walk','ios:person.crop.circle.fill','ios:clock.fill','ios:trophy.fill'])assert.ok(actual.has(key),key);
  for(const key of ['web:yes','web:item.icon','web:open','web:shut','ios:win'])assert.ok(!actual.has(key),key);
 }finally{await rm(root,{recursive:true,force:true});}
});
