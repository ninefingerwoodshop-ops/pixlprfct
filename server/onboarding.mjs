import {libraryMembers} from './libraries.mjs';
export async function onboarding(db,access,collaboration){
 if(!access.organizationId)return {shared:false};
 const people=await libraryMembers(db,access),files=await db.query('SELECT id,name FROM documents WHERE owner=? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 100',[access.owner]),visible=[];
 for(const file of files){try{await collaboration.accessFor(file.id,access);visible.push(file);}catch(error){if(error.status!==403)throw error;}}
 const libraries=await db.query('SELECT id,name FROM component_libraries WHERE owner=?',[access.owner]);
 return {shared:true,manage:access.manage,organizationId:access.organizationId,teammates:people.length,firstProject:visible[0]??null,library:libraries.find(l=>visible.some(f=>f.id===l.id))??null};
}
