import {appearance,radii} from './appearance.js';
import {textStyle} from './typography.js';
import {svgDocument} from './export.js';

export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const px=v=>`${number(v)}px`;
const color=v=>/^#[\da-f]{6}$/i.test(v??'')?v:'#000000';
const alpha=(v,a=1)=>`rgb(from ${color(v)} r g b / ${Math.max(0,Math.min(1,number(a)))})`;
const ident=v=>String(v).toLowerCase().replace(/[^a-z0-9_-]/g,'-');
const quoted=v=>JSON.stringify(String(v)).replace(/</g,'\\3c ').replace(/>/g,'\\3e ');
const align=v=>({start:'start',end:'end',center:'center',between:'space-between',around:'space-around',evenly:'space-evenly',stretch:'stretch'}[v]??'start');
const track=t=>{const value=t?.mode==='hug'?'max-content':t?.mode==='fr'?`${Math.max(.001,number(t.value))}fr`:px(t?.value);return t?.min!=null||t?.max!=null?`minmax(${px(t.min??0)},${t.max!=null?px(t.max):value})`:t?.mode==='fr'?`minmax(0,${value})`:value;};
export function variableName(v){return `--px-${ident(v.name)}-${number(v.id)}`;}
function valueFor(vars,v,modes,seen=new Set()){
 if(!v||seen.has(v.id))return undefined;seen.add(v.id);
 const collection=vars.collections.find(c=>c.id===v.collection_id),value=v.values?.[modes[v.collection_id]??collection?.default_mode];
 return value&&typeof value==='object'?valueFor(vars,vars.values.find(x=>x.id===value.alias),modes,seen):value;
}

// One compiler supplies both the isolated live DOM and the downloadable source.
// Free-position layers keep coordinates; auto-layout children participate in CSS layout.
export function compileCssScene(shapes,{variables={collections:[],values:[]},textLayout=()=>({lines:[],style:{}})}={}){
 const vars={collections:variables.collections??[],values:variables.values??[]},byId=new Map(shapes.map(s=>[s.id,s])),children=new Map(),rules=[],warnings=new Set();
 for(const s of shapes){const parent=byId.has(s.parent_id)?s.parent_id:0;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(s);}
 const visit=(s,parent,modes={})=>{
  if(s.hidden)return '';modes={...modes,...s.variable_modes};const a=appearance(s),layout=s.auto_layout,item=s.layout_item??{},flow=parent?.auto_layout&&!item.absolute;
  const style={position:flow?'relative':'absolute',width:px(s.width),height:px(s.height),'flex-shrink':'0','border-radius':s.kind==='ellipse'?'50%':radii(s).map(px).join(' ')};
  const bound=(path,fallback,unit='')=>{const v=vars.values.find(v=>v.id===s.variable_bindings?.[path]);return v&&['color','number'].includes(v.kind)?unit?`calc(var(${variableName(v)},${number(fallback)}) * 1${unit})`:`var(${variableName(v)},${fallback})`:unit?`${number(fallback)}${unit}`:String(fallback);};
  for(const v of vars.values){const value=valueFor(vars,v,modes);if(v.kind==='color')style[variableName(v)]=color(value);if(v.kind==='number')style[variableName(v)]=number(value);}
  style.width=bound('width',s.width,'px');style.height=bound('height',s.height,'px');
  if(!flow){style.left=px(s.x-(parent?.x??0));style.top=px(s.y-(parent?.y??0));}
  for(const axis of ['width','height']){for(const limit of ['min','max'])if(item[`${limit}_${axis}`]!=null)style[`${limit}-${axis}`]=px(item[`${limit}_${axis}`]);}
  if(flow){const horizontal=parent.auto_layout.direction==='horizontal',grid=parent.auto_layout.direction==='grid';
   if(item.fill_width){style.width=grid||!horizontal?'auto':'0px';if(horizontal&&!grid)style.flex='1 1 0px';else style['align-self']='stretch';style['min-width']=px(item.min_width??0);}
   if(item.fill_height){style.height=grid||horizontal?'auto':'0px';if(!horizontal&&!grid)style.flex='1 1 0px';else style['align-self']='stretch';style['min-height']=px(item.min_height??0);}
   if(grid){const cell=item.grid_cell??{};style['grid-column']=`${cell.column??'auto'} / span ${cell.column_span??1}`;style['grid-row']=`${cell.row??'auto'} / span ${cell.row_span??1}`;style['justify-self']=item.fill_width?'stretch':align(cell.align_x);style['align-self']=item.fill_height?'stretch':align(cell.align_y);}
  }
  if(layout){style.display=layout.direction==='grid'?'grid':'flex';style['flex-direction']=layout.direction==='vertical'?'column':'row';style['flex-wrap']=layout.wrap?'wrap':'nowrap';style.gap=`${bound('auto_layout.cross_gap',layout.cross_gap??layout.gap,'px')} ${bound('auto_layout.gap',layout.gap,'px')}`;
   if(layout.direction==='vertical')style.gap=`${bound('auto_layout.gap',layout.gap,'px')} ${bound('auto_layout.cross_gap',layout.cross_gap??layout.gap,'px')}`;
   style.padding=['top','right','bottom','left'].map(side=>bound('auto_layout.padding_'+side,layout['padding_'+side],'px')).join(' ');style['align-items']=layout.text_baseline?'baseline':align(layout.align);style['justify-content']=align(layout.justify);style['align-content']=align(layout.align_content);
   if(layout.hug_width&&!item.fill_width)style.width='max-content';if(layout.hug_height&&!item.fill_height)style.height='max-content';
   if(layout.direction==='grid'){style['grid-template-columns']=(layout.grid?.columns??[]).map(track).join(' ')||'1fr';style['grid-template-rows']=(layout.grid?.rows??[]).map(track).join(' ');style['grid-auto-rows']=track(layout.grid?.auto_rows??{mode:'hug'});}
  }
  if(s.clip_content)style.overflow='hidden';
  if(a.opacity!==undefined&&a.opacity!==1)style.opacity=bound('appearance.opacity',a.opacity);
  if(s.variable_bindings?.['appearance.corner_radius'])style['border-radius']=bound('appearance.corner_radius',a.corner_radius,'px');
  if(a.backdrop_blur){style['backdrop-filter']=`blur(${px(a.backdrop_blur)})`;style['-webkit-backdrop-filter']=style['backdrop-filter'];}
  if(a.layer_blur)style.filter=`blur(${px(a.layer_blur/2)})`;
  const shadows=(a.shadows??[]).filter(v=>v.visible!==false).map(v=>`${v.kind==='inner'?'inset ':''}${px(v.x)} ${px(v.y)} ${px(v.blur)} ${px(v.spread)} ${alpha(v.color,v.opacity)}`);if(shadows.length)style['box-shadow']=shadows.join(',');
  let content='';const vector=s.points?.length||a.gradient||a.stroke_gradient||s.kind==='image'||(a.stroke_dash?.length);
  if(vector){const paint={...s,parent_id:0,appearance:{...a,opacity:1,shadows:[],layer_blur:0,backdrop_blur:0}};content=`<span class="px-paint" aria-hidden="true">${svgDocument([paint],s,1,null,textLayout)}</span>`;warnings.add('Vector paths, images and gradient paint remain inline SVG inside CSS layout.');}
  else {
   if(s.kind==='text'){const t=textStyle(s);style.color=a.fill_enabled?`rgb(from ${bound('fill',color(s.fill))} r g b / ${a.fill_opacity??1})`:'transparent';style['font-family']=quoted(t.font_family)+', sans-serif';style['font-size']=bound('typography.font_size',t.font_size,'px');style['font-weight']=t.font_weight;style['line-height']=t.line_height;style['text-align']=t.align;style['white-space']=t.wrap?'pre-wrap':'pre';style['overflow-wrap']='anywhere';if(t.sizing==='width'&&!item.fill_width)style.width='max-content';if(t.sizing!=='fixed'&&!item.fill_height)style.height='auto';content=escapeHtml(s.text);}
   else if(a.fill_enabled)style.background=`rgb(from ${bound('fill',color(s.fill))} r g b / ${a.fill_opacity??1})`;
   if(a.stroke_enabled){const width=number(s.stroke_width??2),stroke=alpha(a.stroke_color,a.stroke_opacity??1);rules.push(`.px-node-${s.id}::after{content:"";position:absolute;pointer-events:none;border:${width}px solid ${stroke};border-radius:inherit;inset:${a.stroke_alignment==='inside'?0:a.stroke_alignment==='outside'?-width:-width/2}px;box-sizing:border-box;}`);}
  }
  rules.push(`.px-node-${s.id}{${Object.entries(style).filter(([,v])=>v!=='').map(([k,v])=>`${k}:${v}`).join(';')}}`);
  return `<div class="px-node px-node-${s.id}" data-px-id="${s.id}" data-layer="${escapeHtml(s.name)}"${s.component?` data-component="${escapeHtml(s.name)}"`:''}>${content}${(children.get(s.id)??[]).map(c=>visit(c,s,modes)).join('')}</div>`;
 };
 const html=(children.get(0)??[]).map(s=>visit(s,null)).join('');
 const css=`.px-scene{position:relative;font-family:Arial,sans-serif}.px-node{box-sizing:border-box;margin:0;padding:0;min-width:0;min-height:0}.px-paint{position:absolute;inset:0;pointer-events:none}.px-paint>svg{display:block;width:100%;height:100%;overflow:visible}\n${rules.join('\n')}`;
 return {html,css,warnings:[...warnings]};
}

export function cssExport(shapes,options={}){
 const roots=shapes.filter(s=>!shapes.some(p=>p.id===s.parent_id)),x=roots.length?Math.min(...roots.map(s=>s.x)):0,y=roots.length?Math.min(...roots.map(s=>s.y)):0;
 const source=new Map((options.sourceShapes??shapes).map(s=>[s.id,s]));
 const inherited=s=>{const chain=[],seen=new Set();let node=source.get(s.id);while(node&&!seen.has(node.id)){seen.add(node.id);chain.unshift(node.variable_modes??{});node=source.get(node.parent_id);}return Object.assign({},...chain,s.variable_modes);};
 const normalized=shapes.map(s=>({...s,x:s.x-x,y:s.y-y,...(roots.includes(s)?{variable_modes:inherited(s)}:{})})),result=compileCssScene(normalized,options),width=Math.max(1,...normalized.map(s=>s.x+s.width)),height=Math.max(1,...normalized.map(s=>s.y+s.height));
 return {...result,html:`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.name??'PixlPrfct components')}</title><link rel="stylesheet" href="styles.css"></head><body><main class="px-scene">${result.html}</main></body></html>`,css:`body{margin:0}.px-scene{min-height:${height}px;min-width:${width}px}\n${result.css}`};
}

export function mountCssCanvas(canvas){
 const host=document.createElement('div');host.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none';canvas.before(host);const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style'),scene=document.createElement('div');scene.className='px-scene';scene.style.transformOrigin='0 0';shadow.append(style,scene);let previous='',geometry=[];
 return {hide(){host.hidden=true;},render(shapes,options,pan,zoom){host.hidden=false;const result=compileCssScene(shapes,options),key=result.html+result.css;if(key!==previous){style.textContent=result.css;scene.innerHTML=result.html;previous=key;}scene.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;const origin=host.getBoundingClientRect();geometry=shapes.map(s=>{const node=scene.querySelector(`[data-px-id="${s.id}"]`);if(!node)return {...s,hidden:true};const r=node.getBoundingClientRect();return {...s,x:(r.x-origin.x-pan.x)/zoom,y:(r.y-origin.y-pan.y)/zoom,width:r.width/zoom,height:r.height/zoom};});return geometry;},hit(p){return [...geometry].reverse().find(s=>!s.hidden&&!s.locked&&p.x>=s.x&&p.x<=s.x+s.width&&p.y>=s.y&&p.y<=s.y+s.height&&(()=>{let parent=geometry.find(n=>n.id===s.parent_id);while(parent){if(parent.clip_content&&(p.x<parent.x||p.x>parent.x+parent.width||p.y<parent.y||p.y>parent.y+parent.height))return false;parent=geometry.find(n=>n.id===parent.parent_id);}return true;})())?.id??0;}};
}
