import {env} from 'cloudflare:workers';
import {versionApi} from '../../../../../lib/document-versions.mjs';
import {cloudStorage,afterCloudWrite} from '../../../../../lib/cloud-storage.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{id:string}>}){const {bucket,storage}=cloudStorage(env);return afterCloudWrite(request,await versionApi(request,env.DB,(await context.params).id,null,false,bucket,null,null,storage),env);}
export const GET=handle;
export const POST=handle;
