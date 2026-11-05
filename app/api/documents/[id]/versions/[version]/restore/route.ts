import {env} from 'cloudflare:workers';
import {versionApi} from '../../../../../../../lib/document-versions.mjs';
import {cloudStorage,afterCloudWrite} from '../../../../../../../lib/cloud-storage.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{id:string,version:string}>}){const p=await context.params,{bucket,storage}=cloudStorage(env);return afterCloudWrite(request,await versionApi(request,env.DB,p.id,p.version,true,bucket,null,null,storage),env);}
