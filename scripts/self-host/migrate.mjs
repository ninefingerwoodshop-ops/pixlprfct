import {readConfig} from '../../server/config.mjs';
import {connectDatabase,migrateDocuments} from '../../server/database.mjs';
import {createAuth,migrateAuth} from '../../server/auth.mjs';
let db;
try {
 const config=readConfig();db=await connectDatabase(config);
 await db.query('SELECT 1 AS connected');
 await migrateAuth(createAuth(config,db,undefined,{migrating:true}));await migrateDocuments(db,config.engine);
 console.log('Database connected. Accounts, organizations, teams, and design tables are ready.');
} catch(error) {console.error('Setup failed. Check the configuration, database permissions, and TLS certificate. '+(error.name==='Error'&&!error.code?error.message:''));process.exitCode=1;}
finally {await db?.close();}
