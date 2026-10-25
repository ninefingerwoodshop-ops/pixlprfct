export const HISTORY_INTERVAL=5*60*1000;
export function automaticCheckpoint(db,{id,owner,revision,now}){
 return db.prepare(`INSERT INTO document_versions(id,document_id,owner,name,body,label,revision,created_at,kind)
 SELECT ?,id,owner,name,body,'Automatic backup',revision,?,'automatic' FROM documents
 WHERE id=? AND owner=? AND revision=? AND deleted_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM document_versions WHERE document_id=? AND owner=? AND kind='automatic' AND created_at>?)`)
 .bind(crypto.randomUUID(),now,id,owner,revision,id,owner,now-HISTORY_INTERVAL);
}
