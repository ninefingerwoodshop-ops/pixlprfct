import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {readPreferences,writePreferences,isOnlineFontURL}=require('../desktop/preferences.cjs');
test('online fonts require an explicit saved opt-in and malformed preferences fail closed',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'pixl-preferences-'));
 try{
  assert.equal(readPreferences(directory).onlineFonts,false);
  writePreferences(directory,{onlineFonts:true});assert.equal(readPreferences(directory).onlineFonts,true);
  writePreferences(directory,{onlineFonts:false});assert.equal(readPreferences(directory).onlineFonts,false);
  for(const value of ['{','null','{"onlineFonts":"true"}']){await writeFile(path.join(directory,'preferences.json'),value);assert.equal(readPreferences(directory).onlineFonts,false);}
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('font privacy controls recognize only the actual Google font hosts',()=>{
 assert.equal(isOnlineFontURL('https://fonts.googleapis.com/css2?family=Inter'),true);
 assert.equal(isOnlineFontURL('https://fonts.gstatic.com/s/inter/font.woff2'),true);
 for(const url of ['https://fonts.googleapis.com.example.org/','https://team.example.org/','pixlprfct://app/','bad'])assert.equal(isOnlineFontURL(url),false);
});
