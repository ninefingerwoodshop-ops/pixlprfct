import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',testMatch:'**/*.spec.mjs',fullyParallel:true,workers:1,
 forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,timeout:30000,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4198',viewport:{width:1440,height:1000},deviceScaleFactor:1,colorScheme:'dark',locale:'en-US',timezoneId:'UTC',reducedMotion:'reduce',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run build:editor && node scripts/acceptance/serve.mjs',url:'http://127.0.0.1:4198/editor/project-home.html',reuseExistingServer:false,timeout:120000,env:{PIXL_ACCEPTANCE_PORT:'4198'}},
 expect:{toHaveScreenshot:{animations:'disabled',maxDiffPixelRatio:0.002}},
});
