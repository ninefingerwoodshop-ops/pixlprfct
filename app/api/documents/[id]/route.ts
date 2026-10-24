import {env} from 'cloudflare:workers';
import {documentApi} from '../../../../lib/documents.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{id:string}>}){return documentApi(request,env.DB,(await context.params).id);}
export const GET=handle;
export const PUT=handle;
export const DELETE=handle;
export const PATCH=handle;
