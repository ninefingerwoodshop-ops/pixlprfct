const bytes=new TextEncoder();
export const reference=value=>typeof value==='string'?value:value?.assetRef?.key??(value?.guid?reference(value.guid):Number.isInteger(value?.sessionID)&&Number.isInteger(value?.localID)?`${value.sessionID}:${value.localID}`:null);
export function definitionName(value){let result='';for(const char of String(value??'Untitled').trim()||'Untitled'){if(bytes.encode(result+char).length>120)break;result+=char;}return result;}
export function registerReference(map,node,value){for(const key of [reference(node.guid),reference(node.publishID),node.key].filter(Boolean))map.set(key,value);}

export function importVariables(nodes,color,warn){
 const collections=[],values=[],sets=new Map(),refs=new Map(),definitions=new Map();
 for(const node of nodes.filter(n=>n.type==='VARIABLE_SET')){
  const modes=(node.variableSetModes??[]).slice(0,32);if(!modes.length){warn('An empty variable collection was omitted.',node);continue;}
  const collection={id:collections.length+1,name:definitionName(node.name),default_mode:1,modes:modes.map((mode,i)=>({id:i+1,name:definitionName(mode.name)}))};
  collections.push(collection);registerReference(sets,node,{collection,modes});
 }
 const kinds={COLOR:'color',FLOAT:'number',STRING:'string',BOOLEAN:'boolean'};
 for(const node of nodes.filter(n=>n.type==='VARIABLE')){
  const set=sets.get(reference(node.variableSetID)),kind=kinds[node.variableResolvedType];
  if(!set||!kind){warn('A variable with an unsupported type or missing collection was resolved to its saved value.',node);continue;}
  const variable={id:values.length+1,collection_id:set.collection.id,name:definitionName(node.name),kind,values:{}};values.push(variable);registerReference(refs,node,variable);definitions.set(variable.id,{node,set});
 }
 for(const variable of values){const {node,set}=definitions.get(variable.id),entries=node.variableDataValues?.entries??[];
  for(const [i,mode]of set.modes.entries()){
   const data=entries.find(e=>reference(e.modeID)===reference(mode.id))?.variableData,value=data?.value,alias=refs.get(reference(value?.alias));let resolved;
   if(alias&&alias.kind===variable.kind)resolved={alias:alias.id};
   else if(variable.kind==='color'&&value?.colorValue){resolved=color(value.colorValue);if(value.colorValue.a!=null&&value.colorValue.a!==1)warn('Variable color opacity remains a layer paint value.',node);}
   else if(variable.kind==='number'&&Number.isFinite(value?.floatValue)&&Math.abs(value.floatValue)<=1e6)resolved=value.floatValue;
   else if(variable.kind==='string'&&typeof value?.textValue==='string'&&bytes.encode(value.textValue).length<=10000)resolved=value.textValue;
   else if(variable.kind==='boolean'&&typeof value?.boolValue==='boolean')resolved=value.boolValue;
   if(resolved!==undefined)variable.values[i+1]=resolved;
  }
 }
 const byId=new Map(values.map(v=>[v.id,v])),valid=(id,modes,seen=new Set())=>{if(seen.has(id))return false;const v=byId.get(id),set=v&&collections.find(c=>c.id===v.collection_id);if(!v||!set)return false;const value=v.values[modes.get(set.id)??set.default_mode];return value===undefined?false:typeof value==='object'?valid(value.alias,modes,new Set([...seen,id])):true;};
 const retained=values.filter(v=>collections.find(c=>c.id===v.collection_id).modes.every(m=>valid(v.id,new Map([[v.collection_id,m.id]]))));const ids=new Set(retained.map(v=>v.id));
 for(const v of values)if(!ids.has(v.id))warn('A variable with a missing value or cyclic alias was omitted.',definitions.get(v.id).node);
 for(const [key,v]of refs)if(!ids.has(v.id))refs.delete(key);
 if(collections.length>100||values.length>2000)throw new Error('The library exceeds the editor variable limit.');
 return {variables:{collections,values:retained},refs,sets};
}
export function importVariantSets(nodes,children,mapped,warn){
 const sets=[];
 for(const node of nodes.filter(n=>n.isStateGroup||n.type==='COMPONENT_SET')){
  const frame=mapped.get(reference(node.guid)),members=(children.get(reference(node.guid))??[]).filter(n=>mapped.get(reference(n.guid))?.component?.type==='master');if(!frame||!members.length)continue;
  const defs=(node.componentPropDefs??[]).filter(d=>d.type==='VARIANT'),names=members.map(n=>new Map(String(n.name??'').split(',').map(part=>{const at=part.indexOf('=');return at<0?['',part]:[part.slice(0,at).trim(),part.slice(at+1).trim()];}))),properties=defs.length?defs.map(d=>definitionName(d.name)):[...names[0].keys()].filter(Boolean);
  const variants=members.map((n,i)=>({component_id:mapped.get(reference(n.guid)).id,values:properties.map((p,j)=>definitionName(n.variantPropSpecs?.find(v=>reference(v.propDefId)===reference(defs[j]?.id))?.value??names[i].get(p)??''))}));
  // Do not turn ambiguous component names into a misleading variant selector.
  if(!properties.length||properties.length>16||new Set(properties).size!==properties.length||variants.some(v=>v.values.some(x=>x==='Untitled'))||new Set(variants.map(v=>JSON.stringify(v.values))).size!==variants.length){warn('An ambiguous variant set remains separate component masters.',node);continue;}
  sets.push({id:sets.length+1,name:definitionName(node.name),frame_id:frame.id,properties,variants});
 }
 return sets;
}
