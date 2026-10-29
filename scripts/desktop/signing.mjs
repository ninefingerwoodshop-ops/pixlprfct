export function configureSigning(config,{flags,platform,env=process.env}){
 const store=flags.has('--mas')||flags.has('--mas-dev'),signOnly=flags.has('--sign-only'),release=flags.has('--release')||store;
 if(signOnly&&(release||platform!=='mac'))throw new Error('--sign-only is only for a Mac build awaiting notarization.');
 if(!release&&!signOnly){
  env.CSC_IDENTITY_AUTO_DISCOVERY='false';
  config.mac={...config.mac,identity:'-',notarize:false,hardenedRuntime:false};config.win={...config.win,signExecutable:false};
  return {mode:'test',store};
 }
 config.forceCodeSigning=true;
 config.directories={...config.directories,output:`releases/desktop/${store?'app-store':signOnly?'signed':'release'}`};
 if(platform==='mac'&&!store){
  config.mac={...config.mac,hardenedRuntime:true,notarize:!signOnly};
  config.dmg={...config.dmg,sign:true};
  if(!signOnly){
   const credentials=env.APPLE_ID||env.APPLE_APP_SPECIFIC_PASSWORD
    ?env.APPLE_ID&&env.APPLE_APP_SPECIFIC_PASSWORD&&env.APPLE_TEAM_ID
    :env.APPLE_API_KEY||env.APPLE_API_KEY_ID||env.APPLE_API_ISSUER
     ?env.APPLE_API_KEY&&env.APPLE_API_KEY_ID&&env.APPLE_API_ISSUER
     :env.APPLE_KEYCHAIN_PROFILE;
   if(!credentials)throw new Error('A public Mac release requires notarization credentials. Set APPLE_KEYCHAIN_PROFILE after running notarytool store-credentials, or use --sign-only to prepare a signed build awaiting notarization.');
  }
 }
 return {mode:store?'app-store':signOnly?'signed':'release',store};
}
