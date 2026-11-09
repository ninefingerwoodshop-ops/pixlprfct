// Sites (D1 + R2) storage wiring shared by the document API routes.
import {trackedObjectStore,quotaFromMegabytes,maybeSweepObjects,REFERENCE_TABLES} from './document-storage.mjs';

let warned=false;
export function cloudStorage(env){
 let quota=null;
 try{quota=quotaFromMegabytes(env.PIXL_STORAGE_QUOTA_MB);}catch(error){if(!warned){warned=true;console.error(error.message);}}
 return {bucket:trackedObjectStore(env.DB,env.BUCKET),storage:{quota,tables:REFERENCE_TABLES.cloud,objects:'document_objects'}};
}

// Successful writes occasionally run one bounded unreferenced-object sweep page.
export async function afterCloudWrite(request,response,env){
 if(!['GET','HEAD'].includes(request.method)&&response.ok)await maybeSweepObjects(env.DB,env.BUCKET);
 return response;
}
