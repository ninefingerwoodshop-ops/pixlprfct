#!/usr/bin/env node
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {createProjectStore} from './projects.mjs';
import {createEditorBridge,defaultOrigins} from './bridge.mjs';
import {reference,topics,instructions} from './reference.mjs';

export async function createPixlMcp({workspace,port=4317,origins=defaultOrigins,live=true}={}){
 const store=await createProjectStore(workspace??path.resolve('.local/mcp-projects'));
 let bridge;try{bridge=live?await createEditorBridge({port,origins}):null;}catch(error){store.dispose();throw error;}
 const server=new McpServer({name:'pixlprfct',version:'0.1.0'},{instructions});
 const content=value=>({content:[{type:'text',text:typeof value==='string'?value:JSON.stringify(value,null,2)}],...(value&&typeof value==='object'&&!Array.isArray(value)?{structuredContent:value}:{})});
 const tool=(name,description,inputSchema,handler,readOnly=false)=>server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint:readOnly,destructiveHint:!readOnly,idempotentHint:readOnly,openWorldHint:false}},async args=>{try{return content(await handler(args));}catch(error){return {isError:true,content:[{type:'text',text:String(error.message??error)}]};}});
 const session=z.string().describe('Session ID from sessions or open_project.'),revision=z.string().describe('Latest revision from a read or successful edit; required for every mutation.');
 const ids=z.array(z.number().int().positive()).max(2000),properties=z.record(z.string(),z.unknown());
 const request=async(id,method,args)=>{const local=store.sessions.get(id);if(local)return local.runtime.request(method,args);if(id.startsWith('live:')&&bridge)return bridge.request(id,method,args);throw new Error('Session not found. List sessions or open a project.');};
 tool('pixlprfct_reference','Read the editor capability guide, all engine commands, exact model fields, layer/control defaults, and building examples. Start here; filter commands/models with query.',{topic:z.enum(topics).default('overview'),query:z.string().default('')},({topic,query})=>reference(topic,query),true);
 tool('pixlprfct_sessions','List connected editor tabs, open saved-project sessions, and .pixl files in the workspace.',{},async()=>({workspace:store.root,sessions:[...store.list(),...(bridge?.list()??[])],files:await store.files()}),true);
 tool('pixlprfct_connection','Get the temporary pairing code and loopback URL for connecting an editor tab. The user connects through Tools → MCP connection. Codes are secrets and expire when this server stops.',{},()=>{if(!bridge)throw new Error('Live editor bridge is disabled.');return bridge.info();},true);
 tool('pixlprfct_open_project','Open an existing workspace .pixl file, or create a new in-memory project. New projects are saved only when save_project is called.',{file:z.string().optional(),create:z.boolean().default(false),name:z.string().default('Untitled')},async args=>{const s=await store.open(args);return {id:s.id,file:s.file,...s.runtime.state(),textMetrics:'Headless text metrics are approximate. Verify typography in a live editor.'};});
 tool('pixlprfct_read','Read layers and the current revision. Use details for full layer properties, full for the entire document (variables, definitions, pages and libraries).',{session,page:z.number().int().positive().optional(),ids:ids.optional(),query:z.string().optional(),details:z.boolean().default(false),full:z.boolean().default(false)},({session,...args})=>request(session,'read',args),true);
 tool('pixlprfct_build','Build or edit any supported design in one atomic undoable batch. Operations: create {kind,x?,y?,parent?,control?,properties?,as?}; update {id,properties}; command {name,args,as?}; css {id,source} or {id,reset:true}; rename_project {name}. Controls create main-component frames. For groups use group_many. Use {"$ref":"alias"} to refer to previous results. Objects deep-merge; arrays replace. Read the reference for all properties and commands.',{session,revision,operations:z.array(properties).min(1).max(200)},({session,...args})=>request(session,'build',args));
 tool('pixlprfct_command','Execute any of the 80 catalogued engine commands. Pass arguments in catalog order, with structured JSON values rather than encoded JSON strings. Mutations require revision. Use build for multiple commands in one undo step.',{session,name:z.string(),args:z.array(z.unknown()).default([]),revision:revision.optional()},({session,...args})=>request(session,'command',args));
 tool('pixlprfct_css','Read generated CSS and existing overrides for any layer. To edit, send the modified source through build with op:css.',{session,id:z.number().int().positive()},({session,...args})=>request(session,'css',args),true);
 tool('pixlprfct_history','Undo or redo one editor transaction. In a live editor this shares the human user’s history, so inspect the latest state before using it.',{session,revision,action:z.enum(['undo','redo'])},({session,...args})=>request(session,'history',args));
 tool('pixlprfct_select','Select layers on a page in a connected live editor. This updates the visible selection, not project content.',{session,ids,page:z.number().int().positive().optional()},({session,...args})=>request(session,'select',args));
 tool('pixlprfct_export','Return editable .pixl data, SVG, or complete HTML/React/Vue/Angular/Rust files using the editor exporters. Does not execute behaviors or write files. SVG rejects custom CSS; use HTML/framework export for those layers.',{session,target:z.enum(['pixl','svg','html','react','vue','angular','rust']).default('pixl'),scope:z.enum(['project','page','selection']).default('page'),page:z.number().int().positive().optional(),ids:ids.optional()},({session,...args})=>request(session,'export',args),true);
 tool('pixlprfct_save_project','Save an open saved-project session atomically inside the workspace. Checks revisions and external file changes. A new destination must not already exist. Live sessions use normal editor autosave; export .pixl to obtain a copy.',{session,revision,file:z.string().optional()},({session,...args})=>store.save(session,args));
 tool('pixlprfct_close_project','Close a saved-project session, discarding any unsaved in-memory changes. Save first when needed. Does not delete the .pixl file.',{session},({session})=>{store.close(session);return {closed:session};});
 for(const topic of topics)server.registerResource('PixlPrfct '+topic,'pixlprfct://reference/'+topic,{mimeType:'text/plain',description:'Editor reference: '+topic},async uri=>({contents:[{uri:uri.href,mimeType:'text/plain',text:JSON.stringify(await reference(topic),null,2)}]}));
 server.registerPrompt('build-design',{description:'Build and verify a PixlPrfct design using engine-backed edits.',argsSchema:{brief:z.string()}},({brief})=>({messages:[{role:'user',content:{type:'text',text:instructions+'\n\nDesign brief (user content):\n'+brief}}]}));
 return {server,store,bridge,async close(){await server.close();await bridge?.close();store.dispose();}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let instance;
 try{
  const args=process.argv.slice(2),value=flag=>{const index=args.indexOf(flag);if(index<0)return undefined;if(!args[index+1]||args[index+1].startsWith('--'))throw new Error('Missing value for '+flag);return args[index+1];};
  if(args.includes('--help')){console.error('PixlPrfct MCP: node mcp/server.mjs [--workspace DIRECTORY] [--port 4317] [--origin http://127.0.0.1:4176] [--no-live]');process.exit(0);}
  const port=Number(value('--port')??process.env.PIXLPRFCT_MCP_PORT??4317);if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid bridge port.');
  const origin=value('--origin')??process.env.PIXLPRFCT_EDITOR_ORIGIN;
  instance=await createPixlMcp({workspace:value('--workspace')??process.env.PIXLPRFCT_WORKSPACE,port,origins:origin?[new URL(origin).origin]:defaultOrigins,live:!args.includes('--no-live')});
  await instance.server.connect(new StdioServerTransport());
  console.error('PixlPrfct MCP ready. Workspace: '+instance.store.root);
  let closing=false;const close=async()=>{if(closing)return;closing=true;await instance.close();};
  process.stdin.on('end',()=>void close());for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void close().then(()=>process.exit(0)));
 }catch(error){console.error('PixlPrfct MCP: '+String(error.message??error));await instance?.close();process.exitCode=1;}
}
