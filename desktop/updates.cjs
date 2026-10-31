// The feed is embedded at build time. Workspace pages cannot redirect updates.
function updateFeed(value){if(!value)return null;const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error('Updates require a public HTTPS feed without credentials.');return url.href;}
function installUpdates({app,autoUpdater,dialog,config,platform=process.platform}){
 let busy=false,ready=false,configured=false;
 if(app.isPackaged&&!process.mas&&platform==='darwin'&&config?.release&&config.feed){autoUpdater.setFeedURL({url:updateFeed(config.feed),serverType:'json'});configured=true;
  autoUpdater.on('error',()=>{busy=false;dialog.showMessageBox({type:'error',message:'The update could not be verified or downloaded.',detail:'Your installed version is unchanged. Try checking again later.',buttons:['OK']});});
  autoUpdater.on('update-not-available',()=>{busy=false;dialog.showMessageBox({message:'You’re up to date.',buttons:['OK']});});
  autoUpdater.on('update-downloaded',()=>{busy=false;ready=true;dialog.showMessageBox({message:'A PixlPrfct update is ready.',detail:'Save your work, then quit and reopen PixlPrfct to install it.',buttons:['OK']});});
 }
 return {check(){if(!configured)return dialog.showMessageBox({message:'Automatic updates are not configured for this build.',detail:'Install newer versions from your distributor. Automatic updates are optional and require a signed release with an HTTPS update feed. App Store builds update through the App Store.',buttons:['OK']});if(ready)return dialog.showMessageBox({message:'Update ready',detail:'Save your work, then quit and reopen PixlPrfct.',buttons:['OK']});if(busy)return;busy=true;try{autoUpdater.checkForUpdates();}catch{busy=false;dialog.showMessageBox({message:'The update check could not start.',buttons:['OK']});}}};
}
module.exports={updateFeed,installUpdates};
