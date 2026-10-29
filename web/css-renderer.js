import {motionCss} from './motion.js';
import {artworkShapes} from './canvas-tools.js';
import {resolvePatternPaints} from './paint-textures.js';
import {effectBlur} from './effect-values.js';
import {layoutClass} from './layout-class.js';
import {renderLayerStyles} from './layer-style.js';
import {responsiveLayoutShapes} from './layout-css.js';
import {mountMasonry} from './masonry.js';
import {gridCss} from './grid-model.js';
import {measuredGridPlacement} from './grid-measurement.js';
import {hasHugControlHeight} from './control-sizing.js';
import {inputBaseControl} from './input-base.js';
import {fontImports} from './google-fonts.js';
import {controlMarkup,controlCss,controlPreviewStates,controlWithStates} from './controls.js';
import {visualBounds,rotatedContains,worldShape,ancestorsOf,sceneToWorld} from './rotation.js';
import {appearance,radii} from './appearance.js';
import {textStyle} from './typography.js';
import {paintBindingPath} from './paints.js';
import {svgDocument} from './export.js';

export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const px=v=>`${number(v)}px`;
const color=v=>/^#[\da-f]{6}$/i.test(v??'')?v:'#000000';
const alpha=(v,a=1)=>`rgb(from ${color(v)} r g b / ${Math.max(0,Math.min(1,number(a)))})`;
const ident=v=>String(v).toLowerCase().replace(/[^a-z0-9_-]/g,'-');
const quoted=v=>JSON.stringify(String(v)).replace(/</g,'\\3c ').replace(/>/g,'\\3e ');
const automatic=v=>['between','around','evenly'].includes(v);
const align=v=>({start:'start',end:'end',center:'center',between:'space-between',around:'space-around',evenly:'space-evenly',stretch:'stretch'}[v]??'start');

export function variableName(v){return `--px-${ident(v.name)}-${number(v.id)}`;}
function valueFor(vars,v,modes,seen=new Set()){
 if(!v||seen.has(v.id))return undefined;seen.add(v.id);
 const collection=vars.collections.find(c=>c.id===v.collection_id),value=v.values?.[modes[v.collection_id]??collection?.default_mode];
 return value&&typeof value==='object'?valueFor(vars,vars.values.find(x=>x.id===value.alias),modes,seen):value;
}

// One compiler supplies both the isolated live DOM and the downloadable source.
// Free-position layers keep coordinates; auto-layout children participate in CSS layout.
export function compileCssScene(shapes,{variables={collections:[],values:[]},pageModes={},textLayout=()=>({lines:[],style:{}}),interactive=false,responsiveExport=false}={}){
 if(!responsiveExport)shapes=responsiveLayoutShapes(shapes);
 shapes=resolvePatternPaints(shapes,(source,box)=>svgDocument(source,box,1,null,textLayout));
 const vars={collections:variables.collections??[],values:variables.values??[]},byId=new Map(shapes.map(s=>[s.id,s])),children=new Map(),rules=[],warnings=new Set(),renderedControls=[],layerCss={};
 for(const s of shapes){const parent=byId.has(s.parent_id)?s.parent_id:0;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(s);}
 const visit=(s,parent,modes=pageModes)=>{
  if(s.hidden)return '';const ruleStart=rules.length;modes={...modes,...s.variable_modes};const a=appearance(s),layout=s.auto_layout,item=hasHugControlHeight(s)?{...s.layout_item,fill_height:false,min_height:null,max_height:null}:s.layout_item??{},flow=parent?.auto_layout&&!item.absolute;
  const style={position:flow?'relative':'absolute',width:px(s.width),height:px(s.height),'flex-shrink':'0','border-radius':s.kind==='ellipse'?'50%':radii(s).map(px).join(' ')};
  const bound=(path,fallback,unit='')=>{const v=vars.values.find(v=>v.id===s.variable_bindings?.[path]);return v&&['color','number'].includes(v.kind)?unit?`calc(var(${variableName(v)},${number(fallback)}) * 1${unit})`:`var(${variableName(v)},${fallback})`:unit?`${number(fallback)}${unit}`:String(fallback);};
  const strokeColor=`rgb(from ${bound('appearance.stroke_color',color(a.stroke_color))} r g b / ${a.stroke_opacity??1})`;
  for(const v of vars.values){const value=valueFor(vars,v,modes);if(v.kind==='color')style[variableName(v)]=color(value);if(v.kind==='number')style[variableName(v)]=number(value);if(['padding','margin','border_radius','border_width'].includes(v.kind))style[variableName(v)]=String(value).trim().split(/[\s,]+/).map(v=>px(v.replace(/px$/,''))).join(' ');}
  style.width=bound('width',s.width,'px');style.height=bound('height',s.height,'px');
  if(!flow&&s.control&&(item.fill_width||s.control.width_sizing==='fill'))style.width='100%';
  if(s.control?.width_sizing==='hug')style.width='max-content';
  if(!flow){style.left=px(s.x-(parent?.x??0));style.top=px(s.y-(parent?.y??0));if(parent&&s.control&&item.fill_width)style.left='0px';}
  for(const axis of ['width','height']){for(const limit of ['min','max'])if(item[`${limit}_${axis}`]!=null)style[`${limit}-${axis}`]=px(item[`${limit}_${axis}`]);}
  const margins=item.margin??[0,0,0,0];if(flow)style.margin=margins.map(px).join(' ');const marginVar=vars.values.find(v=>v.id===s.variable_bindings?.['layout_item.margin']&&v.kind==='margin');if(flow&&marginVar)style.margin=`var(${variableName(marginVar)},${style.margin})`;
  if(flow){const horizontal=parent.auto_layout.direction==='horizontal',grid=parent.auto_layout.direction==='grid';
   const siblings=(children.get(parent.id)??[]).filter(c=>!c.hidden&&!c.layout_item?.absolute);
   if(!grid&&!automatic(parent.auto_layout.justify)&&parent.auto_layout.gap<0&&siblings[0]?.id!==s.id)style[horizontal?'margin-left':'margin-top']=px(number(margins[horizontal?3:0])+parent.auto_layout.gap);
   if(item.fill_width){style.width=grid||!horizontal?'auto':'0px';if(horizontal&&!grid)style.flex='1 1 0px';else style['align-self']='stretch';style['min-width']=px(item.min_width??0);}
   if(item.fill_height){style.height=grid||horizontal?'auto':'0px';if(!horizontal&&!grid)style.flex='1 1 0px';else style['align-self']='stretch';style['min-height']=px(item.min_height??0);}
   if(grid){const cell=item.grid_cell??{};style['grid-column']=`${cell.column??'auto'} / span ${cell.column_span??1}`;style['grid-row']=`${cell.row??'auto'} / span ${cell.row_span??1}`;style['justify-self']=item.fill_width?'stretch':cell.align_x&&cell.align_x!=='auto'?align(cell.align_x):'auto';style['align-self']=item.fill_height?'stretch':cell.align_y&&cell.align_y!=='auto'?align(cell.align_y):'auto';if(cell.area&&(parent.auto_layout.grid?.areas??[]).some(a=>a.name===cell.area)){delete style['grid-column'];delete style['grid-row'];style['grid-area']=cell.area;}}
  }
  if(layout){style.display=layout.direction==='grid'?'grid':'flex';style['flex-direction']=layout.direction==='vertical'?'column':'row';style['flex-wrap']=layout.wrap?'wrap':'nowrap';
   const mainGap=automatic(layout.justify)?'0px':layout.gap<0?'0px':bound('auto_layout.gap',layout.gap,'px'),crossGap=(layout.cross_gap??layout.gap)<0?'0px':bound('auto_layout.cross_gap',layout.cross_gap??layout.gap,'px');
   style.gap=layout.direction==='vertical'?`${mainGap} ${crossGap}`:`${crossGap} ${mainGap}`;
   const border=layout.strokes_included&&a.stroke_enabled&&a.stroke_alignment==='inside'?number(s.stroke_width):0;
   style.padding=['top','right','bottom','left'].map((side,i)=>{const value=bound('auto_layout.padding_'+side,layout['padding_'+side],'px'),edge=border?(s.border_widths?.[i]??border):0;return edge?`calc(${value} + ${edge}px)`:value;}).join(' ');const paddingVar=vars.values.find(v=>v.id===s.variable_bindings?.['auto_layout.padding']&&v.kind==='padding');if(paddingVar&&!border)style.padding=`var(${variableName(paddingVar)},${style.padding})`;style['align-items']=layout.text_baseline?'baseline':align(layout.align);style['justify-content']=align(layout.justify);style['align-content']=align(layout.align_content);
   const hasFlow=s.control?.kind==='button'||(children.get(s.id)??[]).some(c=>!c.hidden&&!c.layout_item?.absolute);
   if(hasFlow&&layout.hug_width&&!item.fill_width)style.width='max-content';if(hasFlow&&layout.hug_height&&!item.fill_height)style.height='max-content';
   if(layout.direction==='grid'){const g=layout.grid??{};style['font-size']=px(s.typography?.font_size??16);Object.assign(style,gridCss(g));delete style['flex-direction'];delete style['flex-wrap'];style['column-gap']=(g.column_gap_unit??'px')==='px'?bound('auto_layout.gap',layout.gap,'px'):`${number(layout.gap)}${g.column_gap_unit}`;style['row-gap']=(g.row_gap_unit??'px')==='px'?bound('auto_layout.cross_gap',layout.cross_gap??layout.gap,'px'):`${number(layout.cross_gap??layout.gap)}${g.row_gap_unit}`;}
  }
  if(flow&&parent.auto_layout?.direction==='grid'&&parent.auto_layout.grid?.masonry){
   delete style['grid-area'];style['grid-column']='1';style['grid-row']='1';style['align-self']='start';
   style.top=px(s.y-parent.y-(parent.auto_layout.padding_top??0));
  }
  if(layout?.direction==='grid'&&layout.grid?.masonry){
   style['--px-masonry-gap']=style['row-gap'];style['grid-template-rows']='auto';style['grid-template-areas']='none';style['grid-auto-rows']='auto';style['row-gap']='0px';style['align-content']='start';
  }
  if(s.control){
   const t=s.typography??{font_family:'Arial',font_size:16,font_weight:400,line_height:1.2};
   style['font-family']=quoted(t.font_family)+', sans-serif';style['font-size']=px(t.font_size);style['font-weight']=t.font_weight;style['line-height']=t.line_height;
  }
  if(s.clip_content)style.overflow='hidden';
  if(a.blend_mode&&a.blend_mode!=='pass-through'){style['mix-blend-mode']=a.blend_mode;style.isolation='isolate';}
  if(a.opacity!==undefined&&a.opacity!==1)style.opacity=bound('appearance.opacity',a.opacity);
  if(s.variable_bindings?.['appearance.corner_radius'])style['border-radius']=bound('appearance.corner_radius',a.corner_radius,'px');
  const radiusVar=vars.values.find(v=>v.id===s.variable_bindings?.['appearance.corner_radii']&&v.kind==='border_radius');if(radiusVar)style['border-radius']=`var(${variableName(radiusVar)},${style['border-radius']})`;
  if(effectBlur(a,'backdrop_blur')){style['backdrop-filter']=`blur(${px(effectBlur(a,'backdrop_blur'))})`;style['-webkit-backdrop-filter']=style['backdrop-filter'];}
  if(effectBlur(a,'layer_blur'))style.filter=`blur(${px(effectBlur(a,'layer_blur')/2)})`;
  const shadows=(a.shadows??[]).filter(v=>v.visible!==false).map(v=>`${v.kind==='inner'?'inset ':''}${px(v.x)} ${px(v.y)} ${px(v.blur)} ${px(v.spread)} ${alpha(v.color,v.opacity)}`);if(shadows.length)style['box-shadow']=shadows.join(',');
  const container=['frame','group'].includes(s.kind),rotated=visualBounds(s);if(s.rotation&&!container){style.width=px(rotated.width);style.height=px(rotated.height);if(!flow){style.left=px(rotated.x-(parent?.x??0));style.top=px(rotated.y-(parent?.y??0));}}
  let content='';const vector=s.editor_meta?.text_path||a.fills||a.strokes||(!container&&s.rotation)||s.points?.length||a.gradient||a.stroke_gradient||s.kind==='image'||(a.stroke_dash?.length);
  if(vector){const paint={...s,rotation:container?0:s.rotation,parent_id:0,appearance:{...a,opacity:1,shadows:[],layer_blur:0,backdrop_blur:0,blend_mode:'pass-through'}};
   const bindPaint=layer=>{const stack=String(layer.id).match(/-(fill|stroke)-(\d+)$/),id=stack?Number(stack[2]):1;return {...layer,fill:bound(paintBindingPath(s,'fill',id),layer.fill),appearance:{...layer.appearance,stroke_color:bound(paintBindingPath(s,'stroke',id),layer.appearance.stroke_color)}};};
   content=`<span class="px-paint" aria-hidden="true">${svgDocument([paint],container?s:rotated,1,null,textLayout,bindPaint)}</span>`;warnings.add('Vector paths, images and gradient paint remain inline SVG inside CSS layout.');}
  else {
   if(s.kind==='text'){const t=textStyle(s);style.color=a.fill_enabled?`rgb(from ${bound('fill',color(s.fill))} r g b / ${a.fill_opacity??1})`:'transparent';style['font-family']=quoted(t.font_family)+', sans-serif';style['font-size']=bound('typography.font_size',t.font_size,'px');style['font-weight']=t.font_weight;style['line-height']=t.line_height;style['text-align']=t.align;style['white-space']=t.wrap?'pre-wrap':'pre';style['overflow-wrap']='anywhere';if(t.sizing==='width'&&!item.fill_width)style.width='max-content';if(t.sizing!=='fixed'&&!item.fill_height)style.height='auto';if(t.vertical_align&&t.vertical_align!=='top'){style.display='flex';style['flex-direction']='column';style['justify-content']=t.vertical_align==='center'?'center':'flex-end';}content=escapeHtml(s.text);}
   else if(s.kind!=='group'&&a.fill_enabled)style.background=`rgb(from ${bound('fill',color(s.fill))} r g b / ${a.fill_opacity??1})`;
   if(s.kind!=='group'&&a.stroke_enabled){const width=number(s.stroke_width??2);rules.push(`.px-node-${s.id}::after{content:"";position:absolute;pointer-events:none;border:${bound('stroke_width',width,'px')} solid ${strokeColor};border-radius:inherit;inset:${a.stroke_alignment==='inside'?0:a.stroke_alignment==='outside'?-width:-width/2}px;box-sizing:border-box;}`);}
  }
  if(container&&s.rotation){style.transform=`rotate(${-s.rotation}deg)`;style['transform-origin']='0 0';}
  if(s.border_widths&&a.stroke_enabled&&!vector){const widths=s.border_widths.map(px).join(' '),variable=vars.values.find(v=>v.id===s.variable_bindings?.border_widths&&v.kind==='border_width');rules.push(`.px-node-${s.id}::after{content:"";position:absolute;pointer-events:none;box-sizing:border-box;border-style:solid;border-color:${strokeColor};border-width:${variable?`var(${variableName(variable)},${widths})`:widths};border-radius:inherit;inset:0}`);}
  rules.push(`.${layoutClass(s)}{${Object.entries(style).filter(([,v])=>v!=='').map(([k,v])=>`${k}:${v}`).join(';')}}`);
  const chosenState=(!interactive&&controlPreviewStates.get(s.id))||s.control_state;
  const control=s.control?controlWithStates(inputBaseControl(s,vars,modes),chosenState):null;
  if(control)renderedControls.push({...s,control});
  if(control)rules.push(controlCss(control,s.id,{interactive,initialState:s.control_state,surface:{...Object.fromEntries(['background','border-radius','box-shadow','opacity','filter','backdrop-filter'].filter(key=>style[key]).map(key=>[key,style[key]])),...(a.stroke_enabled?{border:bound('stroke_width',Math.max(0,s.stroke_width??1),'px')+' solid '+strokeColor}:{}),...(control.kind==='button'&&layout?{position:'relative',inset:'auto',width:layout.hug_width&&!item.fill_width?'max-content':'100%',height:layout.hug_height&&!item.fill_height?'auto':'100%',padding:style.padding??'0','flex-shrink':0,'white-space':'pre'}:{})}}));
  if(control?.kind==='button'&&layout)rules.push('.px-node-'+s.id+'>[data-control-text]{display:none}');
  const native=controlMarkup(control,s.id);
  if(control?.width_sizing)rules.push('.px-node-'+s.id+'{width:'+style.width+'!important}');
  // SVG paint remains editable through ordinary CSS presentation properties.
  if(vector)for(const attribute of ['fill','stroke','stop-color']){let index=0;content=content.replace(new RegExp('\\s'+attribute+'="(#[a-f\\d]{3,8})"','gi'),(match,value)=>{const part=index++;rules.push(`.px-node-${s.id}>.px-paint [data-px-${attribute}="${part}"]{${attribute}:${value}}`);return match+` data-px-${attribute}="${part}"`;});}
  if(vector&&s.kind==='text'){const t=textStyle(s);rules.push(`.px-node-${s.id}>.px-paint text{font-family:${quoted(t.font_family)},sans-serif;font-size:${px(t.font_size)};font-weight:${t.font_weight}}`);}
  layerCss[s.id]=rules.slice(ruleStart).join('\n');
  const controlHtml=interactive?native:native.replaceAll(' class="px-control"',' tabindex="-1" class="px-control"');
  const contentHtml=`<div class="px-node px-node-${s.id} ${layoutClass(s)}" data-px-id="${s.id}" data-layer="${escapeHtml(s.name)}"${layout?.direction==='grid'&&layout.grid?.masonry?` data-masonry="" data-masonry-hug="${!!layout.hug_height&&!item.fill_height}"`:""}${flow&&parent.auto_layout?.direction==='grid'&&parent.auto_layout.grid?.masonry?` data-masonry-item="" data-masonry-column="${(item.grid_cell?.row==null&&!item.grid_cell?.area?item.grid_cell?.column:null)??''}"`:""}${s.kind==='text'?' data-control-text=""':''}${s.component?` data-component="${escapeHtml(s.name)}"`:''}>${content}${(children.get(s.id)??[]).map(c=>visit(c,s,modes)).join('')}${controlHtml}</div>`;
  if(container&&s.rotation&&flow){rules.push(`.px-node-${s.id}{position:absolute;left:${s.x-rotated.x}px;top:${s.y-rotated.y}px}`);return `<div style="position:relative;flex-shrink:0;width:${rotated.width}px;height:${rotated.height}px">${contentHtml}</div>`;}
  return contentHtml;
 };
 if(interactive)for(const shape of shapes)rules.push(motionCss(shape));
 if(responsiveExport)for(const shape of shapes)for(const rule of shape.layout_media??[])rules.push(`@media ${rule.query}{.${layoutClass(shape)}{${Object.entries(rule.declarations).map(([k,v])=>`${k}:${v}`).join(';')}}}`);
 const html=(children.get(0)??[]).map(s=>visit(s,null)).join('');
 for(const shape of shapes)if(shape.custom_css){try{rules.push(renderLayerStyles(shape));}catch(error){warnings.add(`${shape.name}: ${error.message}`);}}
 const css=`${fontImports([...shapes,...renderedControls])}\n.px-scene{position:relative;font-family:Arial,sans-serif}.px-node{box-sizing:border-box;margin:0;padding:0;min-width:0;min-height:0}.px-paint{position:absolute;inset:0;pointer-events:none}.px-paint>svg{display:block;width:100%;height:100%;overflow:visible}\n${rules.filter(Boolean).join('\n')}`;
 // Geometry must use this same resolved scene. Applying the media cascade a
 // second time can replay Grid declarations onto a frame already using Flex.
 return {html,css,warnings:[...warnings],shapes,layerCss};
}

export function cssExport(shapes,options={}){
 shapes=artworkShapes(shapes);
 const roots=shapes.filter(s=>!shapes.some(p=>p.id===s.parent_id)),x=roots.length?Math.min(...roots.map(s=>visualBounds(s).x)):0,y=roots.length?Math.min(...roots.map(s=>visualBounds(s).y)):0;
 const source=new Map((options.sourceShapes??shapes).map(s=>[s.id,s]));
 const inherited=s=>{const chain=[],seen=new Set();let node=source.get(s.id);while(node&&!seen.has(node.id)){seen.add(node.id);chain.unshift(node.variable_modes??{});node=source.get(node.parent_id);}return Object.assign({},...chain,s.variable_modes);};
 const normalized=shapes.map(s=>({...s,x:s.x-x,y:s.y-y,...(roots.includes(s)?{variable_modes:inherited(s)}:{})})),result=compileCssScene(normalized,{...options,interactive:true,responsiveExport:true}),width=Math.max(1,...sceneToWorld(normalized).map(s=>{const b=visualBounds(s);return b.x+b.width})),height=Math.max(1,...sceneToWorld(normalized).map(s=>{const b=visualBounds(s);return b.y+b.height}));
 return {...result,html:`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.name??'PixlPrfct components')}</title><link rel="stylesheet" href="styles.css"></head><body><main class="px-scene">${result.html}</main></body></html>`,css:`${result.css}\nbody{margin:0}.px-scene{min-height:${height}px;min-width:${width}px}`};
}

function measuredGrid(node,s,shapes){
 if(s.auto_layout?.direction!=='grid')return null;
 const css=getComputedStyle(node),tracks=text=>(text.match(/[-.\d]+px/g)??[]).map(parseFloat),columns=tracks(css.gridTemplateColumns),rows=tracks(css.gridTemplateRows);
 let column_gap=parseFloat(css.columnGap)||0,row_gap=parseFloat(css.rowGap)||0;
 const gapValue=(v,available)=>v.endsWith('%')?parseFloat(v)*available/100:parseFloat(v)||0;
 const width=node.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),height=node.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
 column_gap=gapValue(css.columnGap,width);row_gap=gapValue(css.rowGap,height);
 const dist=(mode,sizes,available,gap)=>{const free=Math.max(0,available-sizes.reduce((a,b)=>a+b,0)-Math.max(0,sizes.length-1)*gap),n=sizes.length;if(mode==='center')return [free/2,gap];if(mode==='end')return [free,gap];if(mode==='space-between'&&n>1)return [0,gap+free/(n-1)];if(mode==='space-around'&&n)return [free/(2*n),gap+free/n];if(mode==='space-evenly'&&n)return [free/(n+1),gap+free/(n+1)];return [0,gap];};
 const [offset_x,gx]=dist(css.justifyContent,columns,width,column_gap),[offset_y,gy]=dist(css.alignContent,rows,height,row_gap);
 if(s.auto_layout.grid?.masonry)rows.splice(0,rows.length,height);
 const plan={columns,rows,column_gap:gx,row_gap:gy,offset_x,offset_y};
 // Masonry positions come from its runtime, not CSS grid line placement.
 if(s.auto_layout.grid?.masonry)return plan;
 plan.placements=shapes.filter(child=>child.parent_id===s.id&&!child.hidden&&!child.layout_item?.absolute).flatMap(child=>{
  const item=node.querySelector(`[data-px-id="${child.id}"]`);if(!item)return [];
  const style=getComputedStyle(item),ml=parseFloat(style.marginLeft)||0,mr=parseFloat(style.marginRight)||0,mt=parseFloat(style.marginTop)||0,mb=parseFloat(style.marginBottom)||0;
  const box={x:item.offsetLeft-parseFloat(css.paddingLeft)-offset_x-ml,y:item.offsetTop-parseFloat(css.paddingTop)-offset_y-mt,width:item.offsetWidth+ml+mr,height:item.offsetHeight+mt+mb};
  return [{...measuredGridPlacement(child,s.auto_layout.grid??{},plan,box,style),x:s.x+item.offsetLeft,y:s.y+item.offsetTop,width:item.offsetWidth,height:item.offsetHeight}];
 });
 return plan;
}
export function mountCssCanvas(canvas,onLayout=()=>{}){
 const host=document.createElement('div');host.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none';canvas.before(host);const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style'),scene=document.createElement('div');scene.className='px-scene';scene.style.transformOrigin='0 0';shadow.append(style,scene);const masonry=mountMasonry(scene,onLayout);let previous='',geometry=[];
 return {hide(){host.hidden=true;},render(shapes,options,pan,zoom){host.hidden=false;const result=compileCssScene(shapes,options),key=result.html+result.css;shapes=result.shapes;if(key!==previous){style.textContent=result.css;scene.innerHTML=result.html;previous=key;}scene.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;masonry.layout();const origin=host.getBoundingClientRect();geometry=shapes.map(s=>{const node=scene.querySelector(`[data-px-id="${s.id}"]`);if(!node)return {...s,hidden:true};const _gridLayout=measuredGrid(node,s,shapes);const inherited=ancestorsOf(s,shapes).some(p=>p.rotation),pose=worldShape(s,shapes);if(inherited||(['frame','group'].includes(s.kind)&&s.rotation)){const b=visualBounds(pose);return {...b,rotation:0,_rotationHit:{...pose,_gridLayout},_gridLayout};}const r=node.getBoundingClientRect();const x=(r.x-origin.x-pan.x)/zoom,y=(r.y-origin.y-pan.y)/zoom,b=visualBounds(s);return {...s,_gridLayout,rotation:0,x,y,width:r.width/zoom,height:r.height/zoom,_rotationHit:s.rotation?{...s,x:s.x+x-b.x,y:s.y+y-b.y}:null};});return geometry;},hit(p){return [...geometry].reverse().find(s=>s.kind!=='group'&&!s.hidden&&!s.locked&&(!s._rotationHit||rotatedContains(s._rotationHit,p))&&p.x>=s.x&&p.x<=s.x+s.width&&p.y>=s.y&&p.y<=s.y+s.height&&(()=>{let parent=geometry.find(n=>n.id===s.parent_id);while(parent){if(parent.clip_content&&(parent._rotationHit?!rotatedContains(parent._rotationHit,p):(p.x<parent.x||p.x>parent.x+parent.width||p.y<parent.y||p.y>parent.y+parent.height)))return false;parent=geometry.find(n=>n.id===parent.parent_id);}return true;})())?.id??0;}};
}
