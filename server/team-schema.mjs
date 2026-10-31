export async function migrateTeamFeatures(db,engine){
 const text=engine==='mysql'?'LONGTEXT':'TEXT';
 for(const sql of [
  `CREATE TABLE IF NOT EXISTS live_versions (id VARCHAR(96) PRIMARY KEY,document_id VARCHAR(64) NOT NULL,owner VARCHAR(191) NOT NULL,revision INTEGER NOT NULL,body ${text} NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS live_mutations (id VARCHAR(256) PRIMARY KEY,document_id VARCHAR(64) NOT NULL,revision INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS live_clients (id VARCHAR(128) PRIMARY KEY,document_id VARCHAR(64) NOT NULL,owner VARCHAR(191) NOT NULL,client_id VARCHAR(64) NOT NULL,user_id VARCHAR(191) NOT NULL,token VARCHAR(64) NOT NULL,policy_revision INTEGER NOT NULL,id_start BIGINT NOT NULL,id_end BIGINT NOT NULL,cursor ${text} NOT NULL,expires_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS library_release_notes (id VARCHAR(96) PRIMARY KEY,library_id VARCHAR(64) NOT NULL,owner VARCHAR(191) NOT NULL,revision INTEGER NOT NULL,notes ${text} NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS team_notifications (id VARCHAR(512) PRIMARY KEY,owner VARCHAR(191) NOT NULL,document_id VARCHAR(64) NOT NULL,user_id VARCHAR(191) NOT NULL,actor_id VARCHAR(191) NOT NULL,actor_name VARCHAR(256) NOT NULL,kind VARCHAR(32) NOT NULL,target_id VARCHAR(64) NOT NULL,created_at BIGINT NOT NULL,read_at BIGINT,email_state VARCHAR(16) NOT NULL DEFAULT 'pending')`,
  `CREATE TABLE IF NOT EXISTS notification_preferences (user_id VARCHAR(191) PRIMARY KEY,mode VARCHAR(16) NOT NULL DEFAULT 'mentions',email INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS document_reviews (id VARCHAR(64) PRIMARY KEY,document_id VARCHAR(64) NOT NULL,owner VARCHAR(191) NOT NULL,requester_id VARCHAR(191) NOT NULL,reviewer_id VARCHAR(191) NOT NULL,document_revision INTEGER NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'pending',note ${text} NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL)`,
 ])await db.query(sql,[],'run');
 const fields=engine==='sqlite'?await db.query('PRAGMA table_info(team_notifications)'):engine==='mysql'?await db.query('SHOW COLUMNS FROM team_notifications'):await db.query("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='team_notifications'");
 for(const [name,type]of [['email_attempts','INTEGER'],['email_next','BIGINT']])if(!fields.some(c=>(c.name??c.Field)===name))await db.query(`ALTER TABLE team_notifications ADD COLUMN ${name} ${type} NOT NULL DEFAULT 0`,[],'run');
 for(const [name,table,columns]of [['notifications_user_created','team_notifications','user_id,created_at'],['reviews_document_created','document_reviews','document_id,created_at']]){
  if(engine==='mysql'){if(!(await db.query(`SHOW INDEX FROM ${table} WHERE Key_name=?`,[name])).length)await db.query(`CREATE INDEX ${name} ON ${table} (${columns})`,[],'run');}
  else await db.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${columns})`,[],'run');
 }
}
