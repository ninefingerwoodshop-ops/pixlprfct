import {env} from 'cloudflare:workers';
import {documentApi} from '../../../../lib/documents.mjs';
import {cloudStorage,afterCloudWrite} from '../../../../lib/cloud-storage.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{id:string}>}){const {bucket,storage}=cloudStorage(env);return afterCloudWrite(request,await documentApi(request,env.DB,(await context.params).id,bucket,null,null,storage),env);}
export const GET=handle;
export const PUT=handle;
export const DELETE=handle;
export const PATCH=handle;
