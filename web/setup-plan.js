export const databaseProviders=[
 {id:'sqlite',name:'SQLite · simplest setup',engine:'sqlite',description:'A database file on your server. No separate database service. Keep the data folder on persistent storage and back it up.'},
 {id:'supabase',name:'Supabase',engine:'postgres',description:'Use the PostgreSQL connection string from your Supabase project. This app manages its own accounts; a Supabase browser API key is not needed.'},
 {id:'render',name:'Render Postgres',engine:'postgres',description:'Create a Render PostgreSQL database and use its connection URL. Keep the app and database in the same region.'},
 {id:'neon',name:'Neon',engine:'postgres',description:'Use the PostgreSQL connection string from your Neon project. Choose a persistent branch for your installation.'},
 {id:'postgres',name:'PostgreSQL',engine:'postgres',description:'Connect to your own PostgreSQL server or another compatible managed PostgreSQL provider.'},
 {id:'mysql',name:'MySQL',engine:'mysql',description:'Connect to MySQL using a database created for this installation. The app uses a verified TLS connection outside local development.'},
 {id:'mariadb',name:'MariaDB',engine:'mysql',description:'Use the MySQL-compatible connection string for your MariaDB database.'},
];
export function setupPlan({provider='sqlite',url='http://127.0.0.1:4174',email='',local=true}={}){
 const choice=databaseProviders.find(item=>item.id===provider);if(!choice)throw new Error('Choose a supported database.');
 let address;try{address=new URL(url);}catch{throw new Error('Enter the full address of your installation.');}
 if(address.username||address.password||address.pathname!=='/'||address.hash||address.search)throw new Error('Use only the site address, without a path or credentials.');
 if(local&&!['localhost','127.0.0.1','[::1]'].includes(address.hostname))throw new Error('A local trial must use localhost or 127.0.0.1.');
 if(address.protocol!=='https:'&&!(local&&address.protocol==='http:'))throw new Error('Internet installations need an HTTPS address.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/["`\r\n]/.test(email))throw new Error('Enter the installation administrator’s email address.');
 const env=[`PIXL_APP_URL="${address.origin}"`,`PIXL_DATABASE_PROVIDER="${provider}"`,`PIXL_LOCAL_DEVELOPMENT="${local}"`,`PIXL_ADMIN_EMAIL="${email}"`,'PIXL_REGISTRATION="open"','BETTER_AUTH_SECRET="REPLACE_WITH_A_RANDOM_SECRET"','PORT="4174"',choice.engine==='sqlite'?'PIXL_SQLITE_PATH="./data/pixlprfct.sqlite"':`DATABASE_URL="${choice.engine==='postgres'?'postgresql':'mysql'}://USER:PASSWORD@HOST:PORT/DATABASE"`,...(!local?['SMTP_URL="smtps://USER:PASSWORD@MAIL_HOST:465"','SMTP_FROM="PixlPrfct <noreply@example.com>"']:[])].join('\n')+'\n';
 return {env,provider:choice,commands:'npm ci\nnpm run selfhost:build\n# Save your completed configuration as .env.selfhost\nnpm run selfhost:migrate\nnpm run selfhost:start',secretCommand:'node -e "console.log(require(\'node:crypto\').randomBytes(48).toString(\'base64url\'))"'};
}
