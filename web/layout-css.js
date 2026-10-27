import {layoutClass,renameLayoutSelector} from './layout-class.js';
import {gridCss,gridAlignment} from './grid-model.js';
const fail=message=>{throw new Error(message);};
const split=value=>{const parts=[];let depth=0,start=0;for(let i=0;i<value.length;i++){if(value[i]==='(')depth++;if(value[i]===')')depth--;if(depth<0)fail('Unmatched parentheses.');if(/\s/.test(value[i])&&depth===0){if(value.slice(start,i).trim())parts.push(value.slice(start,i).trim());start=i+1;}}if(depth)fail('Unmatched parentheses.');if(value.slice(start).trim())parts.push(value.slice(start).trim());return parts;};
function length(value){const m=/^(\d+(?:\.\d+)?)(px|%|em|fr)?$/.exec(value);if(!m||(!m[2]&&Number(m[1])!==0))fail(`Use a non-negative CSS length: ${value}`);return {value:Number(m[1]),unit:m[2]??'px'};}
function px(value){const n=length(value);if(n.unit!=='px')fail('Padding and Flex gaps currently use px.');return n.value;}
function track(value){
 if(['auto','min-content','max-content'].includes(value))return {mode:value,value:1};
 const mm=/^minmax\((.+),\s*(.+)\)$/.exec(value);if(mm){const endpoint=v=>['auto','min-content','max-content'].includes(v)?{value:0,unit:v}:length(v);const a=endpoint(mm[1].trim()),b=endpoint(mm[2].trim());return {mode:'minmax',min:a.value,min_unit:a.unit,value:b.value,max_unit:b.unit};}
 const n=length(value);return {mode:({px:'fixed','%':'percent',em:'em',fr:'fr'})[n.unit],value:n.value};
}
function tracks(value){
 if(value==='none')return [];
 const result=split(value).flatMap(v=>{const repeated=/^repeat\(\s*(\d+)\s*,\s*(.+)\)$/.exec(v);if(!repeated)return [track(v)];const count=+repeated[1];if(count<1||count>128)fail('Use between 1 and 128 tracks.');return Array.from({length:count},()=>tracks(repeated[2])).flat();});
 if(!result.length||result.length>128)fail('Use between 1 and 128 tracks.');return result;
}
const align=value=>({'flex-start':'start','flex-end':'end','space-between':'between','space-around':'around','space-evenly':'evenly'}[value]??value);
export function layoutDeclarations(shape){
 const l=shape.auto_layout,g=l.grid??{},vertical=l.direction==='vertical';
 return {display:l.direction==='grid'?'grid':'flex',...(l.direction==='grid'?Object.fromEntries(Object.entries(gridCss(g)).map(([k,v])=>[k,v||'none'])):{'flex-direction':vertical?'column':'row','flex-wrap':l.wrap?'wrap':'nowrap','align-items':l.text_baseline?'baseline':gridAlignment(l.align),'justify-content':gridAlignment(l.justify),'align-content':gridAlignment(l.align_content)}),'column-gap':`${(vertical?l.cross_gap:l.gap)??l.gap}${l.direction==='grid'?g.column_gap_unit??'px':'px'}`,'row-gap':`${(vertical?l.gap:l.cross_gap)??l.gap}${l.direction==='grid'?g.row_gap_unit??'px':'px'}`,padding:['top','right','bottom','left'].map(s=>`${l['padding_'+s]}px`).join(' ')};
}
export function applyLayoutDeclarations(shape,declarations){
 const next=structuredClone(shape),l=next.auto_layout;if(!l)fail('Select a Flex or Grid Layout frame.');
 if(declarations.display){if(!['grid','flex'].includes(declarations.display))fail('Display must be grid or flex.');l.direction=declarations.display==='grid'?'grid':l.direction==='vertical'?'vertical':'horizontal';}
 const g=l.grid??={columns:[{mode:'fr',value:1}],rows:[],cell_containers:true};
 if(declarations['flex-direction']){const v=declarations['flex-direction'];if(!['row','column'].includes(v))fail('Use row or column.');if(l.direction!=='grid')l.direction=v==='column'?'vertical':'horizontal';}
 for(const [key,value] of Object.entries(declarations)){
  if(['display','flex-direction'].includes(key))continue;
  if(key.startsWith('grid-')&&l.direction!=='grid')fail(`${key} requires display: grid.`);
  if(key==='flex-wrap'){if(!['wrap','nowrap'].includes(value))fail('Use wrap or nowrap.');l.wrap=value==='wrap';}
  else if(key==='padding'){const p=split(value).map(px);if(p.length<1||p.length>4)fail('Padding needs 1–4 values.');const [t,r=t,b=t,left=r]=p;Object.assign(l,{padding_top:t,padding_right:r,padding_bottom:b,padding_left:left});}
  else if(/^padding-(top|right|bottom|left)$/.test(key))l[key.replace('-','_')]=px(value);
  else if(['gap','row-gap','column-gap'].includes(key)){
   const values=split(value);if(values.length>(key==='gap'?2:1)||!values.length)fail('Invalid gap.');
   const set=(axis,v)=>{const n=length(v);if(n.unit==='fr'||(l.direction!=='grid'&&n.unit!=='px'))fail('Use px for Flex gaps, or px, % or em for Grid gaps.');const main=l.direction==='vertical'?axis==='row':axis==='column';l[main?'gap':'cross_gap']=n.value;if(l.direction==='grid')g[axis+'_gap_unit']=n.unit;};
   if(key==='gap'){set('row',values[0]);set('column',values[1]??values[0]);}else set(key.split('-')[0],value);
  }else if(['align-items','justify-content','align-content','justify-items'].includes(key)){
   const v=align(value);if(!['start','end','center','stretch','between','around','evenly','baseline'].includes(v))fail(`Unsupported alignment: ${value}`);
   if(l.direction==='grid'){if(v==='baseline')fail('Grid baseline alignment is not supported yet.');g[key.replace('-','_')]=v;}
   else{if(key==='justify-items')fail('justify-items is only supported for Grid Layout.');if(key==='align-items'&&!['start','end','center','baseline'].includes(v))fail('Flex align-items supports start, center, end or baseline.');l[key==='align-items'?'align':key==='justify-content'?'justify':'align_content']=v==='baseline'?'start':v;if(key==='align-items')l.text_baseline=v==='baseline';}
  }else if(['grid-template-columns','grid-template-rows','grid-auto-columns','grid-auto-rows'].includes(key)){
   if(l.direction!=='grid')fail(`${key} requires display: grid.`);const ts=tracks(value);if(key==='grid-template-columns'&&!ts.length)fail('Grid needs at least one column.');const axis=key.endsWith('columns')?'columns':'rows';if(key.includes('template'))g[axis]=ts;else{g['auto_'+axis]=ts[0]??{mode:'auto',value:1};g['auto_'+(axis==='rows'?'row':'column')+'_pattern']=ts;}
  }else if(key==='grid-auto-flow'){if(!/^(row|column)( dense)?$/.test(value))fail('Use row, column, row dense or column dense.');g.auto_flow=value.split(' ')[0];g.dense=value.includes('dense');}
  else if(key==='grid-template-areas'){
   if(value==='none'){g.areas=[];continue;}const rows=[...value.matchAll(/"([^"]+)"/g)].map(m=>m[1].trim().split(/\s+/));if(!rows.length||value.replace(/"[^"]+"/g,'').trim()||rows.some(r=>r.length!==rows[0].length))fail('Named areas need quoted rows with equal column counts.');
   const names=new Set(rows.flat().filter(n=>n!=='.'));g.areas=[...names].map(name=>{if(!/^[a-z][\w-]*$/i.test(name))fail('Use simple named area identifiers.');const cells=rows.flatMap((r,y)=>r.flatMap((n,x)=>n===name?[[x,y]]:[])),xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]),left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left+1,h=Math.max(...ys)-top+1;if(w*h!==cells.length)fail(`Area ${name} must be rectangular.`);return {name,column:left+1,row:top+1,column_span:w,row_span:h};});
  }else fail(`Unsupported property: ${key}. This editor currently supports Grid, Flex, gap and padding properties.`);
 }
 return next;
}
function declarations(text){const result={};for(const line of text.split(';')){if(!line.trim())continue;const m=/^\s*([a-z-]+)\s*:\s*([^{}]+?)\s*$/.exec(line);if(!m)fail(`Invalid declaration: ${line.trim()}`);result[m[1]]=m[2].trim();}return result;}
export function parseLayoutCss(text,shape){
 text=renameLayoutSelector(text,layoutClass(shape),'layout');
 text=text.replace(/\/\*[\s\S]*?\*\//g,'');let rules=[];
 text=text.replace(/@media\s*([^{}]+)\{\s*\.layout\s*\{([^{}]*)\}\s*\}/g,(_,query,body)=>{
  const parts=query.trim().split(/\s+and\s+/),limits={};for(const part of parts){const m=/^\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)$/.exec(part.trim());if(!m)fail('Media queries support (min-width: Npx) and (max-width: Npx), joined with and.');limits[m[1]]=+m[2];}if(limits.min>limits.max)fail('Minimum breakpoint cannot exceed maximum.');rules.push({query:query.trim(),...limits,declarations:declarations(body)});return '';});
 const block=/^\s*\.layout\s*\{([^{}]*)\}\s*$/.exec(text);if(!block)fail('Use one .layout rule, followed by optional @media rules containing .layout.');
 const base=applyLayoutDeclarations(shape,declarations(block[1]));for(const rule of rules)applyLayoutDeclarations(base,rule.declarations);base.layout_media=rules;return base;
}
const block=d=>Object.entries(d).map(([k,v])=>`  ${k}: ${v};`).join('\n');
export function formatLayoutCss(shape){return `.${layoutClass(shape)} {\n${block(layoutDeclarations(shape))}\n}`+(shape.layout_media??[]).map(r=>`\n\n@media ${r.query} {\n  .${layoutClass(shape)} {\n${block(r.declarations).split('\n').map(l=>'  '+l).join('\n')}\n  }\n}`).join('');}
export function layoutMediaState(shape,shapes){
 const byId=new Map(shapes.map(s=>[s.id,s]));let root=shape,seen=new Set();
 while(byId.has(root.parent_id)&&!seen.has(root.id)){seen.add(root.id);root=byId.get(root.parent_id);}
 const rules=(shape.layout_media??[]).filter(rule=>root.width>=(rule.min??0)&&root.width<=(rule.max??Infinity));
 return {root,width:root.width,rules,shape:rules.reduce((next,rule)=>applyLayoutDeclarations(next,rule.declarations),shape)};
}
export function responsiveLayoutShapes(shapes){return shapes.map(shape=>layoutMediaState(shape,shapes).shape);}
