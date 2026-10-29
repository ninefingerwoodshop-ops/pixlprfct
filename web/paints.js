// Stacks are ordered topmost first. Absent arrays retain the original file format;
// an empty array explicitly means that the channel has no paints.
const style=s=>s.appearance??{opacity:1,corner_radius:0,fill_enabled:!s.points?.length||!!s.closed,stroke_enabled:!!s.points?.length,stroke_color:s.points?.length?s.fill:'#000000'};
export const paintKey=channel=>channel==='fill'?'fills':'strokes';
export function paints(s,channel){
 const a=style(s),stack=a[paintKey(channel)];if(stack)return stack;
 if(channel==='fill'&&s.kind==='image')return [];
 return a[channel+'_enabled']||a[channel+'_hidden']?[{id:1,color:channel==='fill'?s.fill:a.stroke_color??'#000000',opacity:a[channel+'_opacity']??1,visible:!!a[channel+'_enabled'],gradient:a[channel==='fill'?'gradient':'stroke_gradient']??null}]:[];
}
export function withPaints(s,channel,stack){
 const a={...style(s),[paintKey(channel)]:stack},first=stack[0];
 if(s.kind==='image'&&a.image_opacity==null)a.image_opacity=a.fill_opacity??1;
 const bindings={...s.variable_bindings},legacy=channel==='fill'?'fill':'appearance.stroke_color';
 if(!style(s)[paintKey(channel)]&&bindings[legacy]){const original=paints(s,channel)[0];if(original&&stack.some(p=>p.id===original.id))bindings[`appearance.${paintKey(channel)}.${original.id}.color`]=bindings[legacy];delete bindings[legacy];}
 a[channel+'_enabled']=stack.some(p=>p.visible);a[channel+'_hidden']=stack.length>0&&!a[channel+'_enabled'];
 a[channel+'_opacity']=first?.opacity??1;a[channel==='fill'?'gradient':'stroke_gradient']=first?.gradient??null;
 if(channel==='stroke')a.stroke_color=first?.color??a.stroke_color;
 return {...s,...(s.variable_bindings?{variable_bindings:bindings}:{}),...(channel==='fill'&&first?{fill:first.color}:{}),appearance:a};
}
export function updatePaint(s,channel,id,patch){const next=withPaints(s,channel,paints(s,channel).map(p=>p.id===id?{...p,...patch}:p));if(s._paintEdit)delete next._paintEdit;return next;}
export function addPaint(s,channel){const stack=paints(s,channel);return withPaints(s,channel,[{id:Math.max(0,...stack.map(p=>p.id))+1,color:channel==='fill'?'#d9d9d9':'#000000',opacity:1,visible:true,gradient:null},...stack]);}
export function removePaint(s,channel,id){const next=withPaints(s,channel,paints(s,channel).filter(p=>p.id!==id));if(next.variable_bindings){next.variable_bindings={...next.variable_bindings};delete next.variable_bindings[`appearance.${paintKey(channel)}.${id}.color`];}return next;}
export function movePaint(s,channel,id,to){const stack=[...paints(s,channel)],from=stack.findIndex(p=>p.id===id);if(from<0||to<0||to>=stack.length)return s;stack.splice(to,0,stack.splice(from,1)[0]);return withPaints(s,channel,stack);}
export function paintEdit(s,channel,id){
 if(!s)return s;const p=paints(s,channel).find(p=>p.id===id);if(!p)return s;
 return {...s,_paintEdit:{channel,id},...(channel==='fill'?{fill:p.color}:{}),appearance:{...style(s),[channel+'_enabled']:p.visible,[channel+'_opacity']:p.opacity,[channel==='fill'?'gradient':'stroke_gradient']:p.gradient,...(channel==='stroke'?{stroke_color:p.color}:{})}};
}
export function commitPaintEdit(s){
 if(!s?._paintEdit)return s;const {channel,id}=s._paintEdit,a=style(s),next=updatePaint(s,channel,id,{color:channel==='fill'?s.fill:a.stroke_color,opacity:a[channel+'_opacity']??1,visible:!!a[channel+'_enabled'],gradient:a[channel==='fill'?'gradient':'stroke_gradient']??null});delete next._paintEdit;return next;
}
// Keep legacy property editors (presets, multi-selection and native color inputs)
// useful on stacked layers without replacing the rest of the stack.
export function reconcilePaints(next,previous){
 if(next._paintEdit)return commitPaintEdit(next);if(!previous)return next;
 for(const channel of ['fill','stroke']){const key=paintKey(channel),a=style(next),old=style(previous);if(!a[key]||JSON.stringify(a[key])!==JSON.stringify(old[key]))continue;
  const color=channel==='fill'?'fill':'stroke_color',g=channel==='fill'?'gradient':'stroke_gradient',patch={};
  if((channel==='fill'?next.fill:a[color])!==(channel==='fill'?previous.fill:old[color]))patch.color=channel==='fill'?next.fill:a[color];
  if(JSON.stringify(a[g])!==JSON.stringify(old[g]))patch.gradient=a[g];
  if(a[channel+'_opacity']!==old[channel+'_opacity'])patch.opacity=a[channel+'_opacity'];
  if(a[channel+'_enabled']!==old[channel+'_enabled'])patch.visible=a[channel+'_enabled'];
  if(Object.keys(patch).length){if(!a[key].length)next=addPaint(next,channel);next=updatePaint(next,channel,paints(next,channel)[0].id,patch);}
 }return next;
}
export function paintLayers(source){
 const s=commitPaintEdit(source),a=style(s);if(!a.fills&&!a.strokes)return [s];
 const base={...s,appearance:{...a}};delete base.appearance.fills;delete base.appearance.strokes;
 const result=[];
 if(s.kind==='image')result.push({...base,id:`${s.id}-image`,appearance:{...base.appearance,stroke_enabled:false,gradient:null,fill_opacity:a.image_opacity??a.fill_opacity??1}});
 for(const channel of ['fill','stroke'])for(const p of [...paints(s,channel)].reverse())if(p.visible&&p.opacity>0){
  result.push({...base,id:`${s.id}-${channel}-${p.id}`,kind:s.kind==='image'?'rectangle':s.kind,fill:channel==='fill'?p.color:s.fill,appearance:{...base.appearance,fill_enabled:channel==='fill',stroke_enabled:channel==='stroke',fill_opacity:channel==='fill'?p.opacity:1,stroke_opacity:channel==='stroke'?p.opacity:1,gradient:channel==='fill'?p.gradient:null,stroke_gradient:channel==='stroke'?p.gradient:null,stroke_color:channel==='stroke'?p.color:a.stroke_color,[channel+'_texture']:p.media??p.shader??p.pattern,paint_blend_mode:p.blend_mode??'normal'}});
 }return result;
}

export function paintBindingPath(s,channel,id){return s.appearance?.[paintKey(channel)]?`appearance.${paintKey(channel)}.${id}.color`:channel==='fill'?'fill':'appearance.stroke_color';}
export function paintBinding(s,channel,id){const path=paintBindingPath(s,channel,id);return {path,variable:s.variable_bindings?.[path]};}

export const paintMode=p=>p?.media?.kind??(p?.pattern?'pattern':p?.shader?'shader':p?.gradient?'gradient':'solid');
export const clearPaintTypes={gradient:null,media:null,pattern:null,shader:null};
