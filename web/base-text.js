export function baseTextVariable(vars){
 const collection=vars.collections.find(c=>c.preset==='typography_base');
 return vars.values.find(v=>v.collection_id===collection?.id&&v.name==='Text color'&&v.kind==='color');
}
export function textColorPath(path){
 return /^control\.states\.[^.]+\.parts\.(input|label|placeholder|helper|validation|menu|search|actions|actions_hover|option|option_hover|option_selected|category|pill|more)\.color$/.test(path??'');
}
export function baseTextColor(vars,modes={}){
 const base=baseTextVariable(vars),seen=new Set();
 const resolve=v=>{if(!v||seen.has(v.id))return '#222222';seen.add(v.id);const c=vars.collections.find(c=>c.id===v.collection_id),value=v.values[modes[c.id]??c.default_mode];return value&&typeof value==='object'?resolve(vars.values.find(x=>x.id===value.alias)):value;};
 return resolve(base);
}
export function ensureBaseTextDocument(doc){
 if(baseTextVariable(doc.variables))return null;
 const next=structuredClone(doc),vars=next.variables;
 const collection={id:Math.max(0,...vars.collections.map(c=>c.id))+1,name:'Typography Base',preset:'typography_base',default_mode:1,modes:[{id:1,name:'Default'}]};
 const variable={id:Math.max(0,...vars.values.map(v=>v.id))+1,collection_id:collection.id,name:'Text color',kind:'color',values:{1:'#222222'}};
 vars.collections.push(collection);vars.values.push(variable);
 // Migrate untouched neutral defaults. Deliberate semantic/custom colors remain overrides.
 const neutral=new Set(['#000000','#222222','#182230','#475569','#64748b']);
 for(const v of vars.values)if(v.id!==variable.id&&textColorPath(v.control_path))for(const [mode,value] of Object.entries(v.values))if(typeof value==='string'&&neutral.has(value.toLowerCase()))v.values[mode]={alias:variable.id};
 for(const shape of next.shapes)if(shape.kind==='text'&&!shape.variable_bindings?.fill&&['#000000','#222222'].includes(shape.fill?.toLowerCase()))shape.variable_bindings={...shape.variable_bindings,fill:variable.id};
 return next;
}
