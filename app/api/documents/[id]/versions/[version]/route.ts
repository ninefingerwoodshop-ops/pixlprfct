import {env} from 'cloudflare:workers';
import {versionApi} from '../../../../../../lib/document-versions.mjs';
import {cloudStorage} from '../../../../../../lib/cloud-storage.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string,version:string}>}){const p=await context.params,{bucket,storage}=cloudStorage(env);return versionApi(request,env.DB,p.id,p.version,false,bucket,null,null,storage);}
