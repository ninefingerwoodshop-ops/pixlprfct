module.exports={
 appId:process.env.PIXL_DESKTOP_APP_ID||'app.pixlprfct.desktop',productName:'PixlPrfct',
 directories:{app:'.desktop/app',output:'releases/desktop',buildResources:'.desktop/icons'},
 files:['main.cjs','updates.cjs','update-config.json','design-files.cjs','policy.cjs','preferences.cjs','mcp-discovery.cjs','preload*.cjs','desktop/**/*','web/**/*','package.json','LICENSE','LICENSING.md','licenses/**/*','PRIVACY.md','CODE_SIGNING.md','!node_modules/**/*','!**/.DS_Store','!**/*.map'],asar:true,npmRebuild:false,publish:null,
 artifactName:'PixlPrfct-${version}-${os}-${arch}.${ext}',
 electronFuses:{runAsNode:false,enableNodeOptionsEnvironmentVariable:false,enableNodeCliInspectArguments:false,enableEmbeddedAsarIntegrityValidation:true,onlyLoadAppFromAsar:true,grantFileProtocolExtraPrivileges:false},
 fileAssociations:[{ext:'pixl',name:'PixlPrfct design',role:'Editor',mimeType:'application/vnd.pixlprfct+json'}],
 mac:{category:'public.app-category.graphics-design',icon:'.desktop/icons/icon.png',minimumSystemVersion:'13.0',hardenedRuntime:true,entitlements:'desktop/entitlements.mac.plist',entitlementsInherit:'desktop/entitlements.mac.plist',target:['dmg','zip'],...(process.env.APPLE_TEAM_ID?{extendInfo:{ElectronTeamID:process.env.APPLE_TEAM_ID}}:{})},
 dmg:{title:'PixlPrfct',contents:[{x:140,y:180,type:'file'},{x:400,y:180,type:'link',path:'/Applications'}]},
 win:{icon:'.desktop/icons/icon.ico',target:['nsis','zip'],requestedExecutionLevel:'asInvoker'},
 nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,createDesktopShortcut:true,createStartMenuShortcut:true,deleteAppDataOnUninstall:false},
 mas:{type:'distribution',hardenedRuntime:false,entitlements:'desktop/entitlements.mas.plist',entitlementsInherit:'desktop/entitlements.mas.inherit.plist',...(process.env.PIXL_MAS_PROFILE?{provisioningProfile:process.env.PIXL_MAS_PROFILE}:{})},
 masDev:{type:'development',hardenedRuntime:false,entitlements:'desktop/entitlements.mas.plist',entitlementsInherit:'desktop/entitlements.mas.inherit.plist',...(process.env.PIXL_MAS_PROFILE?{provisioningProfile:process.env.PIXL_MAS_PROFILE}:{})},
};
