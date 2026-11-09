import {env} from 'cloudflare:workers';
import {documentApi} from '../../../lib/documents.mjs';
import {cloudStorage,afterCloudWrite} from '../../../lib/cloud-storage.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const {bucket,storage}=cloudStorage(env);return afterCloudWrite(request,await documentApi(request,env.DB,null,bucket,null,null,storage),env);}
export const POST=GET;
