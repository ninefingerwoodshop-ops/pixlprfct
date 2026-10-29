const {readFileSync,writeFileSync,mkdirSync,renameSync}=require('node:fs');
const path=require('node:path');
const {serverURL}=require('./policy.cjs');
function normalizedPreferences(value){
 const result={onlineFonts:value?.onlineFonts===true};
 try{if(value?.workspaceServer)result.workspaceServer=serverURL(value.workspaceServer);}catch{ /* Ignore invalid saved addresses. */ }
 return result;
}
function readPreferences(directory){
 try{return normalizedPreferences(JSON.parse(readFileSync(path.join(directory,'preferences.json'),'utf8')));}
 catch{return {onlineFonts:false};}
}
function writePreferences(directory,value){
 mkdirSync(directory,{recursive:true});
 const file=path.join(directory,'preferences.json');
 const preferences=normalizedPreferences({...readPreferences(directory),...value});
 writeFileSync(file+'.tmp',JSON.stringify(preferences)+'\n',{mode:0o600});
 renameSync(file+'.tmp',file);
 return preferences;
}
function isOnlineFontURL(value){
 try{const url=new URL(value);return ['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname);}
 catch{return false;}
}
module.exports={readPreferences,writePreferences,isOnlineFontURL};
