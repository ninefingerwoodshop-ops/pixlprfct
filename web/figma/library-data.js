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

// Native slot metadata. Figma stores a SLOT definition on the component (or
// on the variant set), and each slot frame references it through
// componentPropRefs with the SLOT_CONTENT_ID node field. PixlPrfct keeps one
// slot property per main component, so a set-level definition becomes one
// property in every variant that uses it.
export function importSlotProperties(nodes,children,mapped,warn){
 const properties=[],keys=new Map(),slotTargets=new Set(),byReference=new Map(nodes.map(n=>[reference(n.guid),n]));
 const isMaster=n=>mapped.get(reference(n.guid))?.component?.type==='master';
 for(const n of nodes.filter(isMaster))if(n.key)keys.set(n.key,mapped.get(reference(n.guid)).id);
 // A preferred variant set stands for its first variant.
 for(const n of nodes.filter(n=>n.key&&(n.isStateGroup||n.type==='COMPONENT_SET'))){const first=(children.get(reference(n.guid))??[]).find(isMaster);if(first)keys.set(n.key,mapped.get(reference(first.guid)).id);}
 const limit=value=>Number.isInteger(value)&&value>0&&value<=10_000?value:null;
 const within=(root,visit)=>{const stack=[...(children.get(reference(root.guid))??[])];while(stack.length){const n=stack.pop();visit(n);if(n.type!=='INSTANCE')stack.push(...(children.get(reference(n.guid))??[]));}};
 for(const owner of nodes){
  const defs=(owner.componentPropDefs??[]).filter(d=>d.type==='SLOT'&&!d.isDeleted);if(!defs.length)continue;
  const set=owner.isStateGroup||owner.type==='COMPONENT_SET',masters=set?(children.get(reference(owner.guid))??[]).filter(isMaster):isMaster(owner)?[owner]:[];
  if(!masters.length){warn('Slot properties outside an imported main component were not imported.',owner);continue;}
  for(const def of defs){
   const config=def.slotPropConfig??{},min=limit(config.minChildren);let max=limit(config.maxChildren);
   if(min!=null&&max!=null&&min>max)max=null;
   const preferred=[],wanted=def.preferredValues?.instanceSwapValues??[];
   for(const value of wanted.slice(0,1000)){const id=keys.get(value?.key);if(id&&!preferred.includes(id))preferred.push(id);}
   if(preferred.length<wanted.length)warn('Preferred slot instances that are not main components in this file were not imported.',owner);
   let description=String(def.description??'');
   if(bytes.encode(description).length>10_000){description='';warn('A slot description longer than 10 KB was not imported.',owner);}
   const settings={description,min_children:min,max_children:max,preferred_instances:preferred,only_preferred_instances:!!config.allowPreferredValuesOnly&&preferred.length===wanted.length,display_empty:!!config.displayByDefault,fill_counter_axis:!!config.stretchChildOnInsert};
   let used=false;
   for(const master of masters){
    const component=mapped.get(reference(master.guid)),targets=[];
    within(master,n=>{
     if(!(n.componentPropRefs??[]).some(r=>!r.isDeleted&&reference(r.defID)===reference(def.id)&&(r.componentPropNodeField==='SLOT_CONTENT_ID'||n.isSlot)))return;
     const shape=mapped.get(reference(n.guid));
     if(!shape||shape.kind!=='frame'||shape.component){warn('A Figma slot on a layer that is not a plain frame was not imported.',n);return;}
     targets.push({shape,node:n});
    });
    // The editor has no slot inside a slot; keep the outer one.
    const nested=t=>{for(let p=byReference.get(reference(t.node.parentIndex?.guid));p&&p!==master;p=byReference.get(reference(p.parentIndex?.guid))){const s=mapped.get(reference(p.guid));if(s&&(slotTargets.has(s.id)||targets.some(o=>o.shape===s)))return true;}return false;};
    const kept=targets.filter(t=>{if(slotTargets.has(t.shape.id))return false;if(nested(t)){warn('A slot nested inside another slot was imported as an ordinary frame.',t.node);return false;}return true;});
    if(!kept.length)continue;
    let name=definitionName(String(def.name??'Slot').replace(/#[^#]*$/,'')),n=2;const base=name;
    while(properties.some(p=>p.component_id===component.id&&p.name===name))name=definitionName(`${base} ${n++}`);
    // Loading a document does not derive slot state, so the frames carry it.
    for(const t of kept){slotTargets.add(t.shape.id);t.shape.slot={property:properties.length+1,modified:false};}
    properties.push({id:properties.length+1,component_id:component.id,name,kind:'slot',targets:kept.map(t=>t.shape.id),slot_settings:structuredClone(settings)});used=true;
   }
   if(!used)warn('A slot property that no layer uses was not imported.',owner);
  }
 }
 return properties;
}
