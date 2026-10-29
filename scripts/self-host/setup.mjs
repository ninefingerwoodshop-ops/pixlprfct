import {createInterface} from 'node:readline/promises';
import {writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {providers,readConfig} from '../../server/config.mjs';
const readline=createInterface({input:process.stdin,output:process.stdout});
try {
 console.log('PixlPrfct — free, self-hosted design workspace');
 console.log('This creates .env.selfhost with server-only settings. Existing configuration will not be overwritten.');
 const local=(await readline.question('Local trial on this computer? [Y/n] ')).toLowerCase()!=='n';
 const provider=(await readline.question('Database: sqlite / postgres / supabase / render / neon / mysql / mariadb [sqlite]: ')).trim()||'sqlite';
 if(!providers[provider])throw new Error('Unknown database provider.');
 const env={PIXL_DATABASE_PROVIDER:provider,PIXL_APP_URL:local?'http://127.0.0.1:4174':(await readline.question('Public HTTPS address: ')).trim(),PIXL_LOCAL_DEVELOPMENT:String(local),BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),PIXL_SQLITE_PATH:'./data/pixlprfct.sqlite',PIXL_ADMIN_EMAIL:(await readline.question('Installation administrator email: ')).trim(),PIXL_REGISTRATION:'open',PORT:'4174'};
 if(providers[provider]!=='sqlite'){
   console.log('The connection string stays in .env.selfhost; it is never sent to a browser.');
   env.DATABASE_URL=(await readline.question('Database connection string: ')).trim();
 }
 if(!local){env.SMTP_URL=(await readline.question('SMTP connection URL (smtp:// or smtps://): ')).trim();env.SMTP_FROM=(await readline.question('Email sender (e.g. PixlPrfct <design@example.com>): ')).trim();}
 readConfig(env);
 const quote=value=>{if(/[\r\n\x00"`]/.test(value))throw new Error('Configuration values cannot contain line breaks, double quotes, or backticks. URL-encode credentials.');return '"'+value+'"';};
 await writeFile('.env.selfhost',Object.entries(env).map(([key,value])=>key+'='+quote(value)).join('\n')+'\n',{flag:'wx',mode:0o600});
 console.log('Saved .env.selfhost. Next: npm run selfhost:migrate, then npm run selfhost:start.');
 if(local)console.log('Development verification and invitation emails are saved privately in data/outbox.');
} catch(error){console.error(error.code==='EEXIST'?'A configuration already exists. Edit .env.selfhost directly to keep your current secret and data.':error.message);process.exitCode=1;}
finally{readline.close();}
