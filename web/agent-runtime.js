import {engineCommands,modelReference} from './editor-api.js';
import {newControl,controlTypes} from './controls.js';
import {compileCssScene} from './css-renderer.js';
import {editableLayerStyles,layerStyleOverrides,renderLayerStyles} from './layer-style.js';
import {codeExportFiles} from './code-export.js';
import {svgDocument,exportBounds,exportSize,exportShapes} from './export.js';
import {reconcilePaints} from './paints.js';
import {appearance} from './appearance.js';
import {exportChunks} from './export-chunks.js';
import {drawnShape,vectorTools} from './vectors.js';

export const layerKinds=['frame','group','rectangle','ellipse','text','image','line','arrow','polygon','star','pen','pencil'];
const commands=new Map(engineCommands.map(command=>[command.name,command]));
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function mergeProperties(base,patch){
 if(!plain(patch))throw new Error('properties must be an object.');
 const result={...base};for(const [key,value] of Object.entries(patch)){
  if(['__proto__','constructor'].includes(key))throw new Error('Invalid property name.');
  result[key]=plain(value)?mergeProperties(plain(base?.[key])?base[key]:{},value):structuredClone(value);
 }return result;
}
function invoke(editor,name,args=[]){
 const command=commands.get(name);if(!command)throw new Error('Unknown or unavailable engine command: '+name);
 if(!Array.isArray(args)||args.length!==command.args.length)throw new Error(`${name} expects ${command.args.length} arguments. Read the commands reference.`);
 const values=args.map((value,i)=>{const type=command.args[i].type;if(type==='json'){if(value===undefined)throw new Error('Missing JSON argument');return JSON.stringify(value);}if(typeof value!==type||type==='number'&&!Number.isFinite(value))throw new Error(`${command.args[i].name} must be ${type}.`);return value;});
 const result=editor[name](...values);if(typeof result==='string'){try{return JSON.parse(result);}catch{return result;}}return result??null;
}
const snapshot=editor=>JSON.parse(editor.snapshot());
const shapeAt=(editor,id)=>{const shape=snapshot(editor).shapes.find(s=>s.id===id);if(!shape)throw new Error('Layer not found: '+id);return shape;};
const summary=doc=>({name:doc.name,activePage:doc.active_page,pages:doc.pages,layerCount:doc.shapes.length,componentCount:doc.shapes.filter(s=>s.component?.type==='master').length});
const autoLayoutDefaults={direction:'horizontal',gap:16,padding_top:16,padding_right:16,padding_bottom:16,padding_left:16,align:'start',justify:'start',hug_width:false,hug_height:false,strokes_included:true,canvas_stacking:'last',wrap:false,align_content:'start'};
// The host owns persistence, permissions, and editor refresh. All mutations go
// through a scratch engine and commit once only after the whole batch succeeds.
export function createAgentRuntime({editor,createEditor,guard=()=>null,options=()=>({}),finalize=()=>{},changed=()=>{},busy=()=>false,selection=()=>[],select,libraries}){
 const epoch=globalThis.crypto.randomUUID();let last='',revision=0;
 const version=()=>{const document=snapshot(editor);delete document.active_page;const value=JSON.stringify(document);if(value!==last){last=value;revision++;}return `${epoch}:${revision}`;};
 const state=()=>({revision:version(),...summary(snapshot(editor)),selection:selection()});
 const checkRevision=value=>{if(typeof value!=='string'||value!==version())throw new Error('Revision conflict. Read the document again before editing.');if(busy())throw new Error('The editor has an active gesture or text/CSS preview. Finish it before editing through MCP.');};
 const transact=(expected,run,page)=>{
  checkRevision(expected);const before=editor.snapshot(),scratch=createEditor();
  try{
   scratch.load(before);if(page!==undefined)scratch.select_page(page);scratch.clear_history();scratch.set_write_guard((a,b,history)=>guard(JSON.parse(a),JSON.parse(b),history)??'');
   const result=run(scratch);finalize(scratch);if(page!==undefined&&snapshot(scratch).pages.some(p=>p.id===snapshot(editor).active_page))scratch.select_page(snapshot(editor).active_page);const after=scratch.snapshot();
   for(const shape of JSON.parse(after).shapes){if(shape.custom_css)renderLayerStyles(shape);if(shape.layout_media?.length&&!shape.auto_layout)throw new Error('Responsive layout rules require a Flex or CSS Grid frame. Use custom CSS media queries for other layers.');}
   const error=guard(JSON.parse(before),JSON.parse(after),false);if(error)throw new Error(error);
   if(editor.snapshot()!==before)throw new Error('Document changed while editing. Read it and retry.');
   if(after!==before){editor.load(after);changed();}
   return {...state(),result};
  }finally{scratch.free();}
 };
 const patch=(engine,id,properties)=>{
  properties=structuredClone(properties);
  // Accept the names agents use in design tools while keeping the stored schema stable.
  const sizing=properties.typography?.sizing;
  if(sizing==='auto_width'||sizing==='auto_height')properties.typography.sizing=sizing==='auto_width'?'width':'height';
  const stroke=properties.appearance?.stroke_color;
  if(typeof stroke==='string'&&/^#[\da-f]{8}$/i.test(stroke)){
   properties.appearance.stroke_color=stroke.slice(0,7);
   properties.appearance.stroke_opacity??=parseInt(stroke.slice(7),16)/255;
  }
  const document=snapshot(engine),before=document.shapes.find(s=>s.id===id);if(!before)throw new Error('Layer not found: '+id);
  for(const name of Object.keys(properties)){if(['id','page_id','component'].includes(name))throw new Error('Use engine commands to change identity, page, or component links.');if(!new RegExp('pub '+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+':').test(modelReference.Shape.declaration))throw new Error('Unknown layer property: '+name);}
  const base={...before,...(properties.appearance&&!before.appearance?{appearance:appearance(before)}:{}),...(properties.auto_layout&&!before.auto_layout?{auto_layout:autoLayoutDefaults}:{})};
  const next=reconcilePaints(mergeProperties(base,properties),before);if(next.custom_css)renderLayerStyles(next);
  if(before.page_id===document.active_page)engine.update(JSON.stringify(next));else engine.update_across_pages(JSON.stringify([next]));return id;
 };
 const build=(expected,operations,page)=>transact(expected,engine=>{
  if(!Array.isArray(operations)||!operations.length||operations.length>200)throw new Error('Supply 1–200 operations per batch.');
  const refs=Object.create(null),results=[];
  const resolve=value=>{if(plain(value)&&Object.keys(value).length===1&&Object.hasOwn(value,'$ref')){if(!Object.hasOwn(refs,value.$ref))throw new Error('Unknown batch reference: '+value.$ref);return refs[value.$ref];}if(Array.isArray(value))return value.map(resolve);if(plain(value))return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolve(v)]));return value;};
  for(const original of operations){const op=resolve(original);let result;
   if(op.op==='create'){
    if(!layerKinds.includes(op.kind??'rectangle'))throw new Error('Unknown layer kind. Read the catalog.');
    if(op.kind==='group')throw new Error('Create the layers first, then call group_many with their IDs. Empty groups are removed by the engine.');
    const kind=op.control?'frame':op.kind??'rectangle',vector=vectorTools.includes(kind);
    let properties=op.properties??{};
    if(!['world','parent'].includes(op.coordinate_space??'world'))throw new Error('coordinate_space must be world or parent.');
    const parent=op.parent?shapeAt(engine,op.parent):null;
    if(op.coordinate_space==='parent'&&!parent)throw new Error('Parent coordinates require a parent layer.');
    const x=properties.x??op.x??0,y=properties.y??op.y??0;
    if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Layer coordinates must be finite numbers.');
    const offset=op.coordinate_space==='parent'?parent:{x:0,y:0};
    result=engine.add(vector||kind==='image'?'rectangle':kind,x+offset.x,y+offset.y);
    properties={...properties,x:x+offset.x,y:y+offset.y};
    if(vector){const geometry=['pen','pencil'].includes(kind)?{points:[[0,0],[1,1]],closed:false}:drawnShape(kind,{x:0,y:0},{x:160,y:120});properties={points:geometry.points,closed:geometry.closed??false,...properties,kind};properties.appearance={...appearance({...properties,appearance:null,fill:properties.fill??'#d9d9d9'}),...properties.appearance};}
    if(kind==='image')properties={...properties,kind};
    if(op.control){if(!controlTypes.includes(op.control))throw new Error('Unknown control kind.');properties={...properties,control:mergeProperties({...newControl(op.control,properties.name??op.control),starter:true},properties.control??{})};}
    patch(engine,result,properties);
    if(op.parent)engine.reparent_many(JSON.stringify([result]),op.parent);
   }else if(op.op==='update')result=patch(engine,op.id,op.properties);
   else if(op.op==='rename_project'){const doc=snapshot(engine);if(typeof op.name!=='string'||!op.name.trim()||op.name.length>256)throw new Error('Project name must contain 1–256 characters.');engine.load(JSON.stringify({...doc,name:op.name}));result=op.name;}
   else if(op.op==='command')result=invoke(engine,op.name,op.args);
   else if(op.op==='css'){
    const shape=shapeAt(engine,op.id),doc=snapshot(engine),generated=compileCssScene(doc.shapes.filter(s=>s.page_id===shape.page_id).map(s=>({...s,hidden:false})),{...options(),variables:doc.variables,pageModes:doc.pages.find(p=>p.id===shape.page_id)?.variable_modes}).layerCss[shape.id]??'';
    result=patch(engine,op.id,{custom_css:op.reset?'':layerStyleOverrides(generated,op.source,shape)});
   }else throw new Error('Unknown batch operation: '+op.op);
   if(original.as){if(!/^[a-z][\w-]{0,63}$/i.test(original.as)||Object.hasOwn(refs,original.as))throw new Error('Batch names must be unique identifiers.');refs[original.as]=result;}results.push(result);
  }return {results,refs};
 },page);
 return {state,async request(method,args={}){
  if(method==='libraries'){
   if(!libraries)throw new Error('Library publishing and discovery require a connected live editor. Open the project in PixlPrfct and use its live session.');
   const action=args.action??'list',assertCurrent=()=>checkRevision(args.revision);if(action!=='list')assertCurrent();
   const result=await libraries({...args,action},assertCurrent);return {...state(),...result};
  }
  if(method==='read'){
   const doc=snapshot(editor);let layers=doc.shapes;
   if(args.page)layers=layers.filter(s=>s.page_id===args.page);
   if(args.ids)layers=layers.filter(s=>args.ids.includes(s.id));
   if(args.query)layers=layers.filter(s=>s.name.toLowerCase().includes(args.query.toLowerCase()));
   const current=state(),limit=args.limit??50,scope=JSON.stringify([args.page??null,args.ids??null,args.query??'',!!args.details,!!args.full]);
   if(!Number.isInteger(limit)||limit<1||limit>200)throw new Error('Read limit must be between 1 and 200.');
   let offset=args.offset??0;
   if(args.cursor){let cursor;try{cursor=JSON.parse(decodeURIComponent(args.cursor));}catch{throw new Error('Invalid read cursor.');}
    if(cursor.revision!==current.revision)throw new Error('Document changed during pagination. Start a new read.');
    if(cursor.scope!==scope)throw new Error('Keep the same filters when continuing a read.');offset=cursor.offset;
   }
   if(!Number.isInteger(offset)||offset<0||offset>layers.length)throw new Error('Read offset is outside the result set.');
   const total=layers.length;layers=layers.slice(offset,offset+limit);const next=offset+layers.length;
   const pagination={total,offset,limit,hasMore:next<total,nextCursor:next<total?encodeURIComponent(JSON.stringify({revision:current.revision,scope,offset:next})):null};
   return args.full?{...current,pagination,partial:offset>0||pagination.hasMore||!!args.page||!!args.ids||!!args.query,document:{...doc,shapes:layers}}:{...current,pagination,layers:args.details?layers:layers.map(({id,name,kind,parent_id,page_id,x,y,width,height,component,control,locked,hidden})=>({id,name,kind,parent_id,page_id,x,y,width,height,component,control:control?.kind,locked,hidden}))};
  }
  if(method==='build')return build(args.revision,args.operations,args.page);
  if(method==='command'){
   const command=commands.get(args.name);if(!command)throw new Error('Unknown engine command. Read the commands reference.');
   return command.readOnly?{...state(),result:invoke(editor,args.name,args.args)}:transact(args.revision,scratch=>invoke(scratch,args.name,args.args),args.page);
  }
  if(method==='css'){
   const shape=shapeAt(editor,args.id),doc=snapshot(editor),generated=compileCssScene(doc.shapes.filter(s=>s.page_id===shape.page_id).map(s=>({...s,hidden:false})),{...options(),variables:doc.variables,pageModes:doc.pages.find(p=>p.id===shape.page_id)?.variable_modes}).layerCss[shape.id]??'';
   return {...state(),id:shape.id,source:editableLayerStyles(generated,shape),custom_css:shape.custom_css??''};
  }
  if(method==='history'){
   checkRevision(args.revision);if(!['undo','redo'].includes(args.action))throw new Error('Choose undo or redo.');editor[args.action]();changed();return state();
  }
  if(method==='select'){
   if(!select)throw new Error('Selection is available only in live editor sessions.');
   if(busy())throw new Error('Finish the active editor gesture first.');
   const doc=snapshot(editor),page=args.page??doc.active_page;
   if(!doc.pages.some(p=>p.id===page)||!Array.isArray(args.ids)||args.ids.some(id=>!doc.shapes.some(s=>s.id===id&&s.page_id===page)))throw new Error('Selection contains a missing layer or a layer from another page.');
   select(args.ids,page);return state();
  }
  if(method==='export'){
   const doc=snapshot(editor),target=args.target??'pixl',current=state(),scope=JSON.stringify([target,args.scope??'page',args.page??doc.active_page,args.ids??[],doc.active_page]),result=files=>exportChunks(files,current,args,scope);
   if(target==='pixl')return result([{name:doc.name.replace(/[^\w-]/g,'_')+'.pixl',text:editor.snapshot()}]);
   if(target==='svg'){
    const layers=exportShapes(doc.shapes.filter(s=>s.page_id===(args.page??doc.active_page)),args.ids??[],args.scope==='selection'?'selection':'page'),box=exportBounds(layers);exportSize(box,1,'svg',layers);
    return result([{name:'design.svg',text:svgDocument(layers,box,1,null,options().textLayout)}]);
   }
   if(!['html','react','vue','angular','rust'].includes(target))throw new Error('Unsupported export target.');
   return result(codeExportFiles(doc,{scope:args.scope??'page',pageId:args.page??doc.active_page,ids:args.ids??[],target,textLayout:options().textLayout}).map(file=>({name:file.name,text:new TextDecoder().decode(file.data)})));
  }
  throw new Error('Unknown agent request: '+method);
 }};
}
