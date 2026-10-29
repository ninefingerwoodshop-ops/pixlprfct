const {readFileSync,writeFileSync,mkdirSync,renameSync}=require('node:fs');
const path=require('node:path');
function readPreferences(directory){
 try{return {onlineFonts:JSON.parse(readFileSync(path.join(directory,'preferences.json'),'utf8')).onlineFonts===true};}
 catch{return {onlineFonts:false};}
}
function writePreferences(directory,value){
 mkdirSync(directory,{recursive:true});
 const file=path.join(directory,'preferences.json');
 writeFileSync(file+'.tmp',JSON.stringify({onlineFonts:value.onlineFonts===true})+'\n',{mode:0o600});
 renameSync(file+'.tmp',file);
}
function isOnlineFontURL(value){
 try{const url=new URL(value);return ['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname);}
 catch{return false;}
}
module.exports={readPreferences,writePreferences,isOnlineFontURL};
