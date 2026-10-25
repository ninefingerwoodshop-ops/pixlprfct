import {env} from 'cloudflare:workers';
import {documentApi} from '../../../lib/documents.mjs';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>documentApi(request,env.DB,null,env.BUCKET);
export const POST=GET;
