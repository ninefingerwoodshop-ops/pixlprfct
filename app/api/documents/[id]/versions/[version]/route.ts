import {env} from 'cloudflare:workers';
import {versionApi} from '../../../../../../lib/document-versions.mjs';
import {cloudStorage,afterCloudWrite} from '../../../../../../lib/cloud-storage.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string,version:string}>}){const p=await context.params,{bucket,storage}=cloudStorage(env);return versionApi(request,env.DB,p.id,p.version,false,bucket,null,null,storage);}
export async function DELETE(request:Request,context:{params:Promise<{id:string,version:string}>}){const p=await context.params,{bucket,storage}=cloudStorage(env);return afterCloudWrite(request,await versionApi(request,env.DB,p.id,p.version,false,bucket,null,null,storage),env);}
