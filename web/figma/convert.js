import {reference,definitionName,registerReference,importVariables,importVariantSets} from './library-data.js';
const encoder=new TextEncoder();
const number=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clamp=(value,min,max,fallback=min)=>Math.max(min,Math.min(max,number(value,fallback)));
const unit=(value,fallback=1)=>clamp(value,0,1,fallback);
const guid=value=>typeof value==='string'?value:value&&`${value.sessionID}:${value.localID}`;
const lower=value=>String(value??'').toLowerCase().replaceAll('_','-');
const color=value=>'#'+['r','g','b'].map(key=>Math.round(unit(value?.[key],0)*255).toString(16).padStart(2,'0')).join('');
const name=value=>{const s=String(value??'').trim().slice(0,256)||'Untitled';let result='',size=0;for(const c of s){size+=encoder.encode(c).length;if(size>256)break;result+=c;}return result;};
const matrix=m=>m?[number(m.m00,1),number(m.m10),number(m.m01),number(m.m11,1),number(m.m02),number(m.m12)]:[1,0,0,1,0,0];
const blends=new Set(['normal','darken','multiply','color-burn','lighten','screen','plus-lighter','color-dodge','overlay','soft-light','hard-light','difference','exclusion','hue','saturation','color','luminosity']);
const blend=value=>value==='LINEAR_DODGE'?'plus-lighter':blends.has(lower(value))?lower(value):'normal';
const plainAppearance=()=>({opacity:1,corner_radius:0,fill_enabled:false,stroke_enabled:false,stroke_color:'#000000',fills:[],strokes:[]});

export function vectorCommands(bytes){
 if(!(bytes instanceof Uint8Array))throw new Error('Missing vector geometry.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),paths=[];let at=0,path;
 const float=()=>{if(at+4>bytes.length)throw new Error('Truncated vector geometry.');const v=view.getFloat32(at,true);at+=4;if(!Number.isFinite(v)||Math.abs(v)>1e6)throw new Error('Invalid vector coordinate.');return v;};
 const point=()=>({x:float(),y:float()});
 while(at<bytes.length){
  const op=bytes[at++];
  if(op===1){path={points:[point()],closed:false};paths.push(path);}
  else if(op===0){if(!path)throw new Error('Invalid vector path.');path.closed=true;}
  else if(op===2){if(!path)throw new Error('Invalid vector path.');path.points.push(point());}
  else if(op===4){if(!path)throw new Error('Invalid vector curve.');const a=point(),b=point(),end=point();path.points.at(-1).out=a;end.in=b;path.points.push(end);}
  else throw new Error('Unsupported vector command.');
  if(paths.length>512||path?.points.length>4096)throw new Error('Vector path exceeds the editor limit.');
 }
 for(const p of paths){const first=p.points[0],last=p.points.at(-1);if(p.closed&&p.points.length>2&&Math.hypot(first.x-last.x,first.y-last.y)<1e-5){first.in=last.in;p.points.pop();}}
 return paths.filter(p=>p.points.length>=2);
}
function geometry(points,closed,transform){
 const map=p=>({x:transform[0]*p.x+transform[2]*p.y,y:transform[1]*p.x+transform[3]*p.y});
 const mapped=points.map(p=>({...map(p),in:map(p.in??p),out:map(p.out??p)}));
 let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
 for(const p of mapped.flatMap(p=>[p,p.in,p.out])){x=Math.min(x,p.x);y=Math.min(y,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}
 const width=Math.max(1,right-x),height=Math.max(1,bottom-y),norm=p=>[(p.x-x)/width,(p.y-y)/height];
 return {x,y,width,height,closed,points:mapped.map(norm),handles:mapped.map(p=>[norm(p.in),norm(p.out)])};
}
function gradient(p,warn,node){
 const kinds={GRADIENT_LINEAR:'linear',GRADIENT_RADIAL:'radial',GRADIENT_ANGULAR:'angular',GRADIENT_DIAMOND:'diamond'},kind=kinds[p.type];
 const source=p.stops??p.gradientStops;if(!kind||!Array.isArray(source)||source.length<2)return null;
 if(source.length>16)warn('Gradient stops were reduced to the editor’s 16-stop limit.',node);
 const stops=source.filter((_,i)=>source.length<=16||i===0||i===source.length-1||i%Math.ceil(source.length/14)===0).slice(0,16).map(s=>({position:unit(s.position,0),color:color(s.color),opacity:unit(s.color?.a)})).sort((a,b)=>a.position-b.position);
 let start,end,radial_transform;
 if(p.gradientHandlePositions){start=[p.gradientHandlePositions[0].x,p.gradientHandlePositions[0].y];end=[p.gradientHandlePositions[1].x,p.gradientHandlePositions[1].y];}
 else{
  const [a,b,c,d,e,f]=matrix(p.transform),det=a*d-b*c;if(Math.abs(det)<1e-9)return null;
  const map=(x,y)=>[(d*(x-e)-c*(y-f))/det,(-b*(x-e)+a*(y-f))/det];
  start=map(kind==='linear'?0:.5,.5);end=map(1,.5);
  if(kind==='radial'){const third=map(.5,1),r=Math.hypot(end[0]-start[0],end[1]-start[1]);radial_transform=[(end[0]-start[0])/r,(end[1]-start[1])/r,(third[0]-start[0])/r,(third[1]-start[1])/r];}
 }
 if([...start,...end].some(v=>!Number.isFinite(v)||Math.abs(v)>10)||Math.hypot(end[0]-start[0],end[1]-start[1])<.0001){warn('A gradient with unsupported geometry became a solid color.',node);return null;}
 return {kind,start,end,stops,...(radial_transform?{radial_transform}: {})};
}
function bytesURL(bytes,type){let binary='';for(let at=0;at<bytes.length;at+=8192)binary+=String.fromCharCode(...bytes.subarray(at,at+8192));return `data:${type};base64,${btoa(binary)}`;}
export function imageType(bytes){
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return 'image/png';
 if(bytes[0]===255&&bytes[1]===216)return 'image/jpeg';
 if(String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP')return 'image/webp';
 if(String.fromCharCode(...bytes.subarray(0,3))==='GIF')return 'image/gif';return null;
}

export async function convertFigma(parsed,fileName='Figma design.fig',{prepareImage}={}){
 const warningMap=new Map(),warn=(message,node)=>{let item=warningMap.get(message);if(!item){item={message,count:0,layers:[]};warningMap.set(message,item);}item.count++;if(item.layers.length<3&&node?.name&&!item.layers.includes(node.name))item.layers.push(name(node.name));};
 const nodes=parsed.message.nodeChanges.filter(n=>n.phase!=='REMOVED'),byId=new Map(),children=new Map();
 for(const n of nodes){const id=guid(n.guid);if(!id)continue;if(byId.has(id))throw new Error('The Figma file contains duplicate node IDs.');byId.set(id,n);}
 for(const n of nodes){const parent=guid(n.parentIndex?.guid);if(parent){if(!children.has(parent))children.set(parent,[]);children.get(parent).push(n);}}
 for(const list of children.values())list.sort((a,b)=>{const x=a.parentIndex?.position??'',y=b.parentIndex?.position??'';return x<y?-1:x>y?1:0;});
 for(const node of nodes){const chain=new Set();let current=node;while(current){const id=guid(current.guid);if(chain.has(id))throw new Error('The Figma file contains a cyclic layer hierarchy.');chain.add(id);if(chain.size>96)throw new Error('The Figma hierarchy is nested too deeply.');current=byId.get(guid(current.parentIndex?.guid));}}
 const canvases=nodes.filter(n=>n.type==='CANVAS'&&!n.isInternalOnly&&n.name!=='Internal Only Canvas').sort((a,b)=>{const x=a.parentIndex?.position??'',y=b.parentIndex?.position??'';return x<y?-1:x>y?1:0;});
 if(!canvases.length)throw new Error('The Figma file has no design pages.');if(canvases.length>100)throw new Error('This file exceeds the editor’s 100-page limit.');
 const doc={version:2,name:name(parsed.meta?.file_name??parsed.meta?.name??fileName.replace(/\.(fig|json)$/i,'')),pages:canvases.map((p,i)=>({id:i+1,name:name(p.name)})),active_page:1,shapes:[]};
 const report={pages:doc.pages.length,layers:0,components:0,instances:0,images:0,warnings:[]};
 const cache=new Map(),mapped=new Map(),colorRefs=new Map(),effectRefs=new Map(),textRefs=new Map(),variableData=importVariables(nodes,color,warn);doc.variables=variableData.variables;const variable=ref=>variableData.refs.get(reference(ref));let next=1;
 const image=async(p,n)=>{
  const hash=p.image?.hash?Array.from(p.image.hash,b=>b.toString(16).padStart(2,'0')).join(''):p.image?.name??p.imageRef;
  const bytes=parsed.images?.get(hash);if(!bytes){warn('Missing embedded images were replaced with a gray fill.',n);return null;}
  if(cache.has(hash))return cache.get(hash);
  const type=imageType(bytes);if(!type){warn('An unsupported image format was replaced with a gray fill.',n);return null;}
  let result;
  if(prepareImage)result=await prepareImage(bytes,type);
  else {if(bytes.length>1_500_000){warn('An image exceeds the editor’s image-size limit.',n);return null;}result={data_url:bytesURL(bytes,type),width:Math.max(1,number(p.originalImageWidth,1)),height:Math.max(1,number(p.originalImageHeight,1))};}
  if(result.resized)warn('Large embedded images were resized to fit the editor’s image limits.',n);
  cache.set(hash,result);report.images++;return result;
 };
 const paints=async(list,n)=>{
  if(!Array.isArray(list))return [];if(list.length>64)warn('Paints beyond the editor’s 64-paint limit were omitted.',n);
  const result=[];for(const [index,p]of list.slice(0,64).entries()){
   const paint={id:index+1,color:color(p.color??p.stops?.[0]?.color),opacity:unit(p.opacity)*unit(p.color?.a),visible:p.visible!==false,blend_mode:blend(p.blendMode)};
   if((p.colorVar&&!variable(p.colorVar.value?.alias))||p.boundVariables)warn('An unavailable paint variable was resolved to its saved value.',n);
   if(p.type?.startsWith('GRADIENT_')){paint.gradient=gradient(p,warn,n);if(!paint.gradient)warn('An unsupported gradient became a solid color.',n);}
   else if(p.type==='IMAGE'){
    const asset=await image(p,n);paint.color='#d9d9d9';
    if(asset){const mode=['FILL','FIT','TILE'].includes(p.imageScaleMode)?lower(p.imageScaleMode):'fill';paint.media={...asset,kind:'image',poster:'',mode,scale:clamp(p.scale,.01,10,1),offset_x:.5,offset_y:.5,rotation:0,filters:[0,0,0,0,0,0,0]};delete paint.media.resized;
     if(p.imageScaleMode==='CROP'||p.imageScaleMode==='STRETCH')warn('Custom image crops were imported using Fill sizing.',n);if(p.imageFilters)warn('Image color adjustments are not imported.',n);}
   }else if(p.type!=='SOLID'){warn(`Unsupported ${p.type??'unknown'} paints were replaced with a gray fill.`,n);paint.color='#d9d9d9';}
   result.push(paint);
  }return result;
 };
 const appearance=async n=>{
  const fills=await paints(n.fillPaints,n),strokes=await paints(n.strokePaints,n),a={...plainAppearance(),opacity:unit(n.opacity),blend_mode:n.blendMode==='PASS_THROUGH'?'pass-through':blend(n.blendMode),corner_radius:clamp(n.cornerRadius,0,1e6),fills,strokes,fill_enabled:!!fills.length,stroke_enabled:!!strokes.length,stroke_color:strokes[0]?.color??'#000000',shadows:[]};
  const corners=['rectangleTopLeftCornerRadius','rectangleTopRightCornerRadius','rectangleBottomRightCornerRadius','rectangleBottomLeftCornerRadius'];if(corners.some(key=>n[key]!=null))a.corner_radii=corners.map(key=>clamp(n[key]??n.cornerRadius,0,1e6));
  a.stroke_alignment=['INSIDE','OUTSIDE'].includes(n.strokeAlign)?lower(n.strokeAlign):'center';a.stroke_cap=['NONE','BUTT'].includes(n.strokeCap)?'butt':n.strokeCap==='SQUARE'?'square':'round';
  if(n.strokeDashes?.length)a.stroke_dash=n.strokeDashes.slice(0,16).map(v=>clamp(v,0,1e5));if(a.stroke_dash?.every(v=>v===0))a.stroke_dash=[];
  if(n.strokeCap&&!['NONE','BUTT','ROUND','SQUARE'].includes(n.strokeCap))warn('Custom stroke endpoint decorations were replaced with round caps.',n);a.stroke_join=['MITER','BEVEL'].includes(n.strokeJoin)?lower(n.strokeJoin):'round';
  for(const effect of n.effects??[]){
   if(['DROP_SHADOW','INNER_SHADOW'].includes(effect.type)){if(a.shadows.length===8){warn('Additional shadows were omitted after the editor’s eight-shadow limit.',n);continue;}a.shadows.push({kind:effect.type==='INNER_SHADOW'?'inner':'drop',x:clamp(effect.offset?.x,-1e5,1e5,0),y:clamp(effect.offset?.y,-1e5,1e5,0),blur:clamp(effect.radius,0,1e5),spread:clamp(effect.spread,-1e5,1e5,0),color:color(effect.color),opacity:unit(effect.color?.a)*unit(effect.opacity),visible:effect.visible!==false});}
   else if(['FOREGROUND_BLUR','LAYER_BLUR','BACKGROUND_BLUR'].includes(effect.type)){const key=effect.type==='BACKGROUND_BLUR'?'backdrop_blur':'layer_blur';if(a[key+'_present'])warn('Multiple blur effects were combined into one setting.',n);a[key]=clamp(effect.radius,0,key==='backdrop_blur'?200:1e5);a[key+'_present']=true;a[key+'_enabled']=effect.visible!==false;}
   else warn(`The ${effect.type??'unknown'} effect is not supported.`,n);
  }return a;
 };
 function typography(n){
   const fontSize=clamp(n.fontSize,1,512,16),fontStyle=lower(n.fontName?.style),weights=[['thin',100],['extra-light',200],['light',300],['medium',500],['semi',600],['extra-bold',800],['black',900],['heavy',900],['bold',700]],weight=weights.find(([label])=>fontStyle.includes(label))?.[1]??400;
   const line=n.lineHeight,lineHeight=line?.units==='PIXELS'?line.value/fontSize:line?.units==='PERCENT'?line.value/100:line?.units==='RAW'?line.value:1.2;
   let family=n.fontName?.family??'Inter';if(!/^[a-z0-9 -]{1,100}$/i.test(family)){family='Inter';warn('A font name unsupported by the editor was replaced with Inter.',n);}
   return {letter_spacing:clamp(n.letterSpacing?.value,-1000,1000,0),letter_spacing_unit:(n.letterSpacing?.unit??n.letterSpacing?.units)==='PERCENT'?'%':'px',text_case:({UPPER:'upper',LOWER:'lower',TITLE:'title'})[n.textCase]??'',font_size:fontSize,font_family:family,font_weight:weight,align:['CENTER','RIGHT'].includes(n.textAlignHorizontal)?lower(n.textAlignHorizontal):'left',vertical_align:n.textAlignVertical==='CENTER'?'center':n.textAlignVertical==='BOTTOM'?'bottom':'top',line_height:clamp(lineHeight,.5,4,1.2),sizing:n.textAutoResize==='WIDTH_AND_HEIGHT'?'width':n.textAutoResize==='HEIGHT'?'height':'fixed',wrap:n.textAutoResize!=='WIDTH_AND_HEIGHT'};
 }
 const uniqueName=(list,value)=>{const base=definitionName(value);let result=base,i=2;while(list.some(s=>s.name.toLowerCase()===result.toLowerCase()))result=base+' '+i++;return result;};
 doc.color_styles=[];doc.effect_styles=[];doc.text_styles=[];
 for(const n of nodes.filter(n=>n.styleType)){
  const a=await appearance(n);
  if(n.styleType==='FILL'&&a.fills.length){const style={id:doc.color_styles.length+1,name:uniqueName(doc.color_styles,n.name),paints:a.fills,color_variables:{}};for(const [i,p]of (n.fillPaints??[]).entries()){const v=variable(p.colorVar?.value?.alias);if(v?.kind==='color')style.color_variables[i+1]=v.id;}doc.color_styles.push(style);registerReference(colorRefs,n,style.id);}
  else if(n.styleType==='EFFECT'){const style={id:doc.effect_styles.length+1,name:uniqueName(doc.effect_styles,n.name),effects:Object.fromEntries(Object.entries(a).filter(([key])=>key==='shadows'||key.startsWith('layer_blur')||key.startsWith('backdrop_blur')))};doc.effect_styles.push(style);registerReference(effectRefs,n,style.id);}
  else if(n.styleType==='TEXT'){const style={id:doc.text_styles.length+1,name:uniqueName(doc.text_styles,n.name),typography:typography(n)};doc.text_styles.push(style);registerReference(textRefs,n,style.id);}
  else warn('An unsupported shared style was resolved to saved layer values.',n);
 }
 const append=s=>{if(doc.shapes.length>=10_000)throw new Error('This import exceeds the editor’s 10,000-layer limit.');doc.shapes.push(s);};
 async function walk(original,parent,context,depth=0,chain=new Set(),overridePath=[],overrides=[]){
  if(depth>64)throw new Error('The Figma hierarchy is nested too deeply.');
  const id=guid(original.guid);if(chain.has(id))throw new Error('The Figma file contains a cyclic layer or component reference.');const active=new Set([...chain,id]);
  const key=guid(original.overrideKey??original.guid),nodePath=[...overridePath,key];
  let n=original;
  for(const override of overrides){const path=override.guidPath?.guids?.map(guid);if(path&&path.length===nodePath.length&&path.every((v,i)=>v===nodePath[i])){const properties={...override};delete properties.guid;delete properties.parentIndex;delete properties.guidPath;n={...n,...properties};}}
  if(['VARIABLE','VARIABLE_SET','STYLE'].includes(n.type)||n.styleType)return;
  let descendants=children.get(id)??[],source;
  if(n.type==='INSTANCE'){
   source=byId.get(guid(n.symbolData?.symbolID));report.instances++;warn('Component instances were detached into editable layers; Figma library links are not retained.',n);
   if(source){n={...source,...n};if(!descendants.length)descendants=children.get(guid(source.guid))??[];overrides=n.symbolData?.symbolOverrides??[];overridePath=[];}
   else if(!descendants.length)warn('An instance’s main component is missing from this file.',n);
  }
  const [a,b,c,d,tx,ty]=matrix(n.transform),sx=Math.hypot(a,b)*context.sx,sy=Math.hypot(c,d)*context.sy,rotation=-Math.atan2(b,a)*180/Math.PI;
  if(a*d-b*c<0||Math.abs(a*c+b*d)>.001)warn('Mirrored or skewed transforms may need adjustment.',n);
  const types={FRAME:'frame',SYMBOL:'frame',COMPONENT:'frame',INSTANCE:'frame',COMPONENT_SET:'frame',SECTION:'frame',GROUP:'group',RECTANGLE:'rectangle',ROUNDED_RECTANGLE:'rectangle',ELLIPSE:'ellipse',TEXT:'text',LINE:'line',VECTOR:'pen',BOOLEAN_GROUP:'pen',BOOLEAN_OPERATION:'pen',POLYGON:'pen',REGULAR_POLYGON:'pen',STAR:'pen'};
  let kind=types[n.type];if(n.type==='FRAME'&&!n.isStateGroup&&n.resizeToFit&&!n.stackMode&&!n.fillPaints?.length)kind='group';
  if(!kind){kind='frame';warn(`Unsupported ${n.type??'unknown'} layers were retained as empty containers.`,n);}
  const style=await appearance(n),s={id:next++,page_id:context.page,parent_id:parent,kind,name:name(n.name??n.type),x:context.x+tx*context.sx,y:context.y+ty*context.sy,width:Math.max(1,number(n.size?.x,100)*sx),height:Math.max(1,number(n.size?.y,100)*sy),rotation,fill:style.fills[0]?.color??'#d9d9d9',text:'',hidden:n.visible===false,locked:!!n.locked,appearance:style,stroke_width:clamp(n.strokeWeight,.1,100,1),clip_content:kind==='frame'&&!n.frameMaskDisabled,layout_item:{fill_width:false,fill_height:false,absolute:n.stackPositioning==='ABSOLUTE'},aspect_ratio_locked:!!n.proportionsConstrained};
  // Figma transforms rotate around the local origin; the editor rotates about the center.
  s.x+=(a*number(n.size?.x,100)+c*number(n.size?.y,100))*context.sx/2-s.width/2;
  s.y+=(b*number(n.size?.x,100)+d*number(n.size?.y,100))*context.sy/2-s.height/2;
  if(n.componentPropDefs?.some(p=>p.type!=='VARIANT'))warn('Exposed component properties and slot metadata are not imported; their saved layers remain.',n);
  if(n.layoutGrids?.length)warn('Layout guides are not imported.',n);
  if(n.isMask)warn('Masks are imported as ordinary layers; their clipping behavior is not retained.',n);
  if(n.reactions?.length||n.transitionNodeID||n.prototypeInteractions?.length)warn('Prototype connections are not imported.',n);
  if(n.boundVariables||n.variableBindings)warn('Variable bindings were resolved to their saved values.',n);
  if(['SYMBOL','COMPONENT'].includes(n.type)&&!context.master){s.component={type:'master'};report.components++;}
  if(!source&&!context.instance)mapped.set(id,s);
  if(kind==='text'){
   s.text=String(n.textData?.characters??'');if(encoder.encode(s.text).length>10_000)throw new Error(`“${s.name}” exceeds the editor’s 10 KB text-layer limit.`);
   s.typography=typography(n);
   if(n.textAlignHorizontal==='JUSTIFIED')warn('Justified text was imported with left alignment.',n);
   if(n.textData?.styleOverrideTable?.length||lower(n.fontName?.style).includes('italic'))warn('Mixed text styles and italics use the layer’s base text style.',n);
  }
  if(['HORIZONTAL','VERTICAL'].includes(n.stackMode)&&kind==='frame'){
   const horizontal=n.stackMode==='HORIZONTAL',alignment={MIN:'start',CENTER:'center',MAX:'end',BASELINE:'start',SPACE_BETWEEN:'between',SPACE_EVENLY:'evenly'};
   s.auto_layout={direction:horizontal?'horizontal':'vertical',gap:number(n.stackSpacing),padding_top:clamp(n.stackVerticalPadding??n.stackPadding,0,1e5),padding_right:clamp(n.stackPaddingRight??n.stackHorizontalPadding??n.stackPadding,0,1e5),padding_bottom:clamp(n.stackPaddingBottom??n.stackVerticalPadding??n.stackPadding,0,1e5),padding_left:clamp(n.stackHorizontalPadding??n.stackPadding,0,1e5),align:alignment[n.stackCounterAlignItems]??'start',justify:alignment[n.stackPrimaryAlignItems]??'start',hug_width:(horizontal?n.stackPrimarySizing:n.stackCounterSizing)?.startsWith('RESIZE_TO_FIT')??false,hug_height:(horizontal?n.stackCounterSizing:n.stackPrimarySizing)?.startsWith('RESIZE_TO_FIT')??false,wrap:n.stackWrap==='WRAP'};
  }else if(n.stackMode&&n.stackMode!=='NONE')warn('This layout mode was imported with fixed positions.',n);
  if(parent&&context.direction&&rotation===0){s.layout_item.fill_width=context.direction==='HORIZONTAL'?n.stackChildPrimaryGrow===1:n.stackChildAlignSelf==='STRETCH';s.layout_item.fill_height=context.direction==='VERTICAL'?n.stackChildPrimaryGrow===1:n.stackChildAlignSelf==='STRETCH';}
  s.variable_bindings={};
  for(const [channel,paints]of [['fills',n.fillPaints],['strokes',n.strokePaints]])for(const [i,p]of (paints??[]).entries()){const v=variable(p.colorVar?.value?.alias);if(v?.kind==='color'&&s.appearance[channel]?.some(p=>p.id===i+1))s.variable_bindings['appearance.'+channel+'.'+(i+1)+'.color']=v.id;}
  const fields={WIDTH:'width',HEIGHT:'height',MIN_WIDTH:'layout_item.min_width',MAX_WIDTH:'layout_item.max_width',MIN_HEIGHT:'layout_item.min_height',MAX_HEIGHT:'layout_item.max_height',ITEM_SPACING:'auto_layout.gap',PADDING_TOP:'auto_layout.padding_top',PADDING_RIGHT:'auto_layout.padding_right',PADDING_BOTTOM:'auto_layout.padding_bottom',PADDING_LEFT:'auto_layout.padding_left',FONT_SIZE:'typography.font_size',CORNER_RADIUS:'appearance.corner_radius',STROKE_WEIGHT:'stroke_width',OPACITY:'appearance.opacity'};
  for(const entry of n.variableConsumptionMap?.entries??[]){const v=variable(entry.variableData?.value?.alias),path=fields[entry.variableField];if(v?.kind==='number'&&path&&(!path.startsWith('typography.')||s.kind==='text')&&(!path.startsWith('auto_layout.')||s.auto_layout))s.variable_bindings[path]=v.id;else warn('An unsupported variable binding was resolved to its saved value.',n);}
  s.fill_style=colorRefs.get(reference(n.styleIdForFill))??0;s.stroke_style=colorRefs.get(reference(n.styleIdForStrokeFill))??0;s.effect_style=effectRefs.get(reference(n.styleIdForEffect))??0;if(s.kind==='text')s.text_style=textRefs.get(reference(n.styleIdForText))??0;
  if(kind==='line'){s.points=[[0,0],[1,n.size?.y?1:0]];s.closed=false;style.fill_enabled=false;}
  if(kind==='pen'){
   let paths=[];
   try{for(const path of n.fillGeometry??[])paths.push(...vectorCommands(parsed.message.blobs?.[path.commandsBlob]?.bytes));}catch(error){warn(error.message,n);}
   if(!paths.length&&n.vectorData?.vectorNetworkBlob!=null){
    try{paths=networkPaths(parsed.message.blobs?.[n.vectorData.vectorNetworkBlob]?.bytes);}catch(error){warn(error.message,n);}
   }
   if(paths.length){
    if(paths.length>1)warn('Compound vectors were split into editable paths; holes may need adjustment.',n);
    const container={...s,kind:'frame',appearance:{...plainAppearance(),opacity:style.opacity,blend_mode:style.blend_mode},clip_content:false};append(container);
    style.opacity=1;style.blend_mode='normal';
    for(const [i,path]of paths.entries()){
     const g=geometry(path.points,path.closed,[sx,0,0,sy]);append({...s,...g,id:next++,parent_id:s.id,name:s.name+(paths.length>1?` / Path ${i+1}`:''),x:s.x+g.x,y:s.y+g.y,rotation:0,appearance:structuredClone(style),component:undefined});
    }
    if(['BOOLEAN_GROUP','BOOLEAN_OPERATION'].includes(n.type)){warn('Boolean results were imported as editable vector paths.',n);descendants=[];}
   }else{s.kind='frame';s.clip_content=false;warn('A vector without supported path data was retained as an empty container.',n);s.appearance=plainAppearance();append(s);}
  }else append(s);
  const childContext={page:context.page,x:s.x,y:s.y,sx,sy,master:context.master||!!s.component,direction:n.stackMode,instance:context.instance||!!source};
  if(source){childContext.sx*=number(n.size?.x,1)/Math.max(1,number(source.size?.x,1));childContext.sy*=number(n.size?.y,1)/Math.max(1,number(source.size?.y,1));active.add(guid(source.guid));}
  for(const child of descendants)await walk(child,s.id,childContext,depth+1,active,source?[]:nodePath,overrides);
 }
 for(const [i,page]of canvases.entries())for(const child of children.get(guid(page.guid))??[])await walk(child,0,{page:i+1,x:0,y:0,sx:1,sy:1,master:false},0,new Set());
 doc.component_sets=importVariantSets(nodes,children,mapped,warn);report.variables=doc.variables.values.length;report.styles=doc.color_styles.length+doc.effect_styles.length+doc.text_styles.length;report.variantSets=doc.component_sets.length;
 report.layers=doc.shapes.length;report.warnings=[...warningMap.values()];
 const body=JSON.stringify(doc);if(encoder.encode(body).length>5_000_000)throw new Error('The converted design exceeds the editor’s 5 MB project limit. Export a smaller selection or page from Figma.');
 return {body,report};
}

// Unfilled open paths have no fillGeometry; follow their editable network.
function networkPaths(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<12)throw new Error('Missing editable vector network.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),nv=v.getUint32(0,true),ns=v.getUint32(4,true),nr=v.getUint32(8,true);
 if(nv>4096||ns>4096||12+nv*12+ns*28>bytes.length)throw new Error('Unsupported vector network size.');
 if(nr)throw new Error('Filled vector networks without rendered paths are not supported.');
 const vertices=Array.from({length:nv},(_,i)=>({x:v.getFloat32(16+i*12,true),y:v.getFloat32(20+i*12,true)})),edges=[];
 for(let i=0;i<ns;i++){const at=12+nv*12+i*28,a=v.getUint32(at+4,true),b=v.getUint32(at+16,true);if(!vertices[a]||!vertices[b])throw new Error('Invalid vector endpoint.');edges.push({a,b,out:{x:vertices[a].x+v.getFloat32(at+8,true),y:vertices[a].y+v.getFloat32(at+12,true)},in:{x:vertices[b].x+v.getFloat32(at+20,true),y:vertices[b].y+v.getFloat32(at+24,true)}});}
 const paths=[];while(edges.length){const edge=edges.shift(),points=[{...vertices[edge.a],out:edge.out},{...vertices[edge.b],in:edge.in}];let end=edge.b,index;
  while((index=edges.findIndex(e=>e.a===end))!==-1){const next=edges.splice(index,1)[0];points.at(-1).out=next.out;points.push({...vertices[next.b],in:next.in});end=next.b;}
  paths.push({points,closed:false});}return paths;
}
