import {env} from 'cloudflare:workers';
import {versionApi} from '../../../../../lib/document-versions.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{id:string}>}){return versionApi(request,env.DB,(await context.params).id,null,false,env.BUCKET);}
export const GET=handle;
export const POST=handle;
