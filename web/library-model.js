// Shared by the editor and the self-hosted API. These checks are not UI-only locks.
const clone = value => structuredClone(value);
export const equal = (a,b) => stable(a) === stable(b);
function stable(value) { return JSON.stringify(value,(_,v)=>v && typeof v==='object' && !Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v); }
export function descendantsOf(shapes, roots) {
 const ids=new Set(roots);let changed=true;
 while(changed){changed=false;for(const s of shapes)if(ids.has(s.parent_id)&&!ids.has(s.id)){ids.add(s.id);changed=true;}}
 return ids;
}
export function libraryForMaster(doc,id){return (doc.libraries??[]).find(l=>Object.values(l.maps.shapes).includes(id));}
export function libraryForShape(doc,shape){return shape && libraryForMaster(doc,shape.component?.type==='instance'?shape.component.master:shape.id);}
export function librarySnapshot(doc) {
 const imported=new Set((doc.libraries??[]).flatMap(l=>Object.values(l.maps.shapes)));
 const roots=doc.shapes.filter(s=>s.component?.type==='master'&&!imported.has(s.id)).map(s=>s.id);
 if(!roots.length)throw new Error('Create at least one main component before publishing a library.');
 const ids=descendantsOf(doc.shapes,roots);
 for(const set of doc.component_sets??[])if(set.frame_id&&set.variants.every(v=>ids.has(v.component_id)))ids.add(set.frame_id);
 // Do not republish someone else's library under a different permission policy.
 if(doc.shapes.some(s=>ids.has(s.id)&&s.component?.type==='instance'&&imported.has(s.component.master)))throw new Error('This library contains an instance from another library. Publish its original components separately.');
 const source=clone(doc);source.libraries=[];
 source.shapes=source.shapes.filter(s=>ids.has(s.id)).map(s=>{
  if(!ids.has(s.parent_id)){
   const chain=[s],seen=new Set([s.id]);let parent=doc.shapes.find(p=>p.id===s.parent_id);
   while(parent&&!seen.has(parent.id)){seen.add(parent.id);chain.unshift(parent);parent=doc.shapes.find(p=>p.id===parent.parent_id);}
   s.parent_id=0;s.variable_modes=Object.assign({},doc.pages.find(p=>p.id===s.page_id)?.variable_modes??{},...chain.map(n=>n.variable_modes??{}));
  }
  s.prototype=s.prototype&&(!['navigate','overlay','swap'].includes(s.prototype.action)||ids.has(s.prototype.target))?s.prototype:null;
  s.additional_interactions=(s.additional_interactions??[]).filter(p=>!['navigate','overlay','swap'].includes(p.action)||ids.has(p.target));return s;
 });
 const byId=new Map(source.shapes.map(s=>[s.id,s]));
 const modes=(s,seen=new Set())=>{if(s.component?.type!=='instance'||seen.has(s.id))return s.variable_modes??{};seen.add(s.id);const main=byId.get(s.component.source);return main?modes(main,seen):s.variable_modes??{};};
 for(const s of source.shapes)if(s.component?.type==='instance')s.variable_modes=clone(modes(s));
 source.component_sets=(source.component_sets??[]).filter(s=>s.variants.every(v=>ids.has(v.component_id)));
 source.component_properties=(source.component_properties??[]).filter(p=>ids.has(p.component_id));
 return source;
}
const modeMap=(m,maps)=>Object.fromEntries(Object.entries(m??{}).map(([id,value])=>[maps.collections[id],value]).filter(([id])=>id));
export function mergeLibrary(document,release) {
 const doc=clone(document),source=typeof release.body==='string'?JSON.parse(release.body):clone(release.body);
 doc.libraries??=[];doc.variables??={collections:[],values:[]};doc.component_sets??=[];doc.component_properties??=[];doc.guide_styles??=[];doc.effect_styles??=[];
 const existing=doc.libraries.find(l=>l.id===release.id&&l.workspace===release.workspace);
 const link=existing??{id:release.id,workspace:release.workspace,page_id:Math.max(0,...doc.pages.map(p=>p.id))+1,maps:{shapes:{},collections:{},variables:{},sets:{},properties:{},guides:{}}};
 if(!existing&&doc.pages.length>=100)throw new Error('This project has reached its page limit.');
 const maps=link.maps;maps.effects??={};
 const allocate=(key,incoming,current)=>{let next=Math.max(0,...current.map(s=>s.id),...Object.values(maps[key]))+1;for(const item of incoming)if(!maps[key][item.id])maps[key][item.id]=next++;};
 allocate('shapes',source.shapes,doc.shapes);allocate('collections',source.variables?.collections??[],doc.variables.collections);allocate('variables',source.variables?.values??[],doc.variables.values);
 allocate('sets',source.component_sets??[],doc.component_sets);allocate('properties',source.component_properties??[],doc.component_properties);allocate('guides',source.guide_styles??[],doc.guide_styles);allocate('effects',source.effect_styles??[],doc.effect_styles);
 const present=new Set(source.shapes.map(s=>maps.shapes[s.id])),oldIds=new Set(Object.values(maps.shapes));
 if(doc.shapes.some(s=>s.component?.type==='instance'&&!oldIds.has(s.id)&&oldIds.has(s.component.master)&&!present.has(s.component.master)))throw new Error('This update removes a component used in this project. Remove its instances before accepting the update.');
 const remapInteraction=p=>p?{...p,target:maps.shapes[p.target]??0}:p;
 const shapes=source.shapes.map(original=>{
  const s=clone(original);s.id=maps.shapes[s.id];s.page_id=link.page_id;s.parent_id=maps.shapes[s.parent_id]??0;s.layout_class='';s.layout_class_generated=true;
  if(s.component?.type==='instance'){s.component.master=maps.shapes[s.component.master];s.component.source=maps.shapes[s.component.source];}
  s.variable_bindings=Object.fromEntries(Object.entries(s.variable_bindings??{}).map(([path,id])=>[path,maps.variables[id]]));s.variable_modes=modeMap(s.variable_modes,maps);
  s.guide_style=maps.guides[s.guide_style]??0;s.effect_style=maps.effects[s.effect_style]??0;if(s.control?.base_collection)s.control.base_collection=maps.collections[s.control.base_collection]??0;
  s.prototype=remapInteraction(s.prototype);s.additional_interactions=(s.additional_interactions??[]).map(remapInteraction);return s;
 });
 const replace=(old,added,key)=>old.filter(s=>!Object.values(maps[key]).includes(s.id)).concat(added);
 doc.shapes=replace(doc.shapes,shapes,'shapes');
 doc.variables.collections=replace(doc.variables.collections,(source.variables?.collections??[]).map(c=>({...c,id:maps.collections[c.id],preset:''})),'collections');
 doc.variables.values=replace(doc.variables.values,(source.variables?.values??[]).map(v=>({...v,id:maps.variables[v.id],collection_id:maps.collections[v.collection_id],values:Object.fromEntries(Object.entries(v.values).map(([mode,val])=>[mode,val&&typeof val==='object'&&'alias' in val?{alias:maps.variables[val.alias]}:val]))})),'variables');
 doc.component_sets=replace(doc.component_sets,(source.component_sets??[]).map(s=>({...s,id:maps.sets[s.id],...(s.frame_id?{frame_id:maps.shapes[s.frame_id]}:{}),variants:s.variants.map(v=>({...v,component_id:maps.shapes[v.component_id]}))})),'sets');
 doc.component_properties=replace(doc.component_properties,(source.component_properties??[]).map(p=>({...p,id:maps.properties[p.id],component_id:maps.shapes[p.component_id],targets:p.targets.map(id=>maps.shapes[id])})),'properties');
 doc.guide_styles=replace(doc.guide_styles,(source.guide_styles??[]).map(s=>({...s,id:maps.guides[s.id]})),'guides');
 // Distinguish imported definitions when another library or a local style uses the same name.
 const effectNames=new Set(doc.effect_styles.filter(s=>!Object.values(maps.effects).includes(s.id)).map(s=>s.name.trim().toLowerCase()));
 const bounded=value=>{let result='';for(const char of value){if(new TextEncoder().encode(result+char).length>110)break;result+=char;}return result;};
 const effects=(source.effect_styles??[]).map(s=>{let name=s.name;const base=bounded(release.name+' / '+s.name);let suffix=1;while(effectNames.has(name.trim().toLowerCase()))name=base+(suffix++>1?' ('+(suffix-1)+')':'');effectNames.add(name.trim().toLowerCase());return {...s,id:maps.effects[s.id],name};});
 const retiredEffects=new Set(Object.values(maps.effects).filter(id=>!effects.some(s=>s.id===id)));
 for(const shape of doc.shapes)if(retiredEffects.has(shape.effect_style))shape.effect_style=0;
 doc.effect_styles=replace(doc.effect_styles,effects,'effects');
 Object.assign(link,{name:release.name,revision:release.revision,enabled:true});
 if(!existing){doc.libraries.push(link);doc.pages.push({id:link.page_id,name:'Library · '+release.name,variable_modes:{}});}
 return doc;
}
function content(shape){const s=clone(shape);delete s.layout_class;delete s.layout_class_generated;return s;}
export function importedContentError(before,after,{updating=false}={}) {
 if(updating)return null;
 for(const link of before.libraries??[]){
  const next=(after.libraries??[]).find(l=>l.id===link.id&&l.workspace===link.workspace);
  if(!next||!equal({...link,enabled:true},{...next,enabled:true}))return 'Use Manage libraries to change a linked library.';
  for(const id of Object.values(link.maps.shapes)){const a=before.shapes.find(s=>s.id===id),b=after.shapes.find(s=>s.id===id);if(!equal(a&&content(a),b&&content(b)))return 'Library source is protected. Open the source project to edit it.';}
  for(const [key,field] of [['collections','collections'],['variables','values']])for(const id of Object.values(link.maps[key]??{}))if(!equal(before.variables?.[field]?.find(s=>s.id===id),after.variables?.[field]?.find(s=>s.id===id)))return 'Library variables are protected. Update them in the source project.';
  for(const [key,field] of [['sets','component_sets'],['properties','component_properties'],['guides','guide_styles'],['effects','effect_styles']])for(const id of Object.values(link.maps[key]??{}))if(!equal(before[field]?.find(s=>s.id===id),after[field]?.find(s=>s.id===id)))return 'Library definitions are protected. Update them in the source project.';
 }
 return null;
}
export function protectedInstanceError(before,after) {
 // Existing links may not be stripped to detach protected instances.
 for(const old of before.shapes){if(old.component?.type!=='instance'||!libraryForMaster(before,old.component.master))continue;const next=after.shapes.find(s=>s.id===old.id);if(next&&(next.component?.master!==old.component.master||next.component?.source!==old.component.source))return 'Library instances cannot be detached or changed to another component.';}
 const byId=new Map(after.shapes.map(s=>[s.id,s])),trees=new Map();
 const tree=id=>{if(!trees.has(id))trees.set(id,descendantsOf(after.shapes,[id]));return trees.get(id);};
 const roots=after.shapes.filter(s=>s.component?.type==='instance'&&s.component.master===s.component.source);
 const checked=new Set();
 for(const s of after.shapes){
  const c=s.component;if(c?.type!=='instance'||!libraryForMaster(after,c.master))continue;
  const source=byId.get(c.source),master=byId.get(c.master);if(!source||!master)return 'Library component source is missing.';
  const root=roots.find(n=>n.component.master===c.master&&tree(n.id).has(s.id));
  if(!root)return 'Library instance structure is invalid.';
  const a=content(source),b=content(s);
  for(const value of [a,b])for(const key of ['id','page_id','parent_id','component','x','y','flow_name'])delete value[key];
  if(!equal(a,b)||c.overrides?.some(p=>!['x','y'].includes(p)))return 'Library instance properties are protected. Ask a maintainer to update the source.';
  if(Math.abs((s.x-root.x)-(source.x-master.x))>0.01||Math.abs((s.y-root.y)-(source.y-master.y))>0.01)return 'Internal library layers cannot be moved.';
  if(s.id!==root.id){const parent=byId.get(s.parent_id);if(parent?.component?.source!==source.parent_id)return 'Library instance structure is protected.';}
  if(!checked.has(root.id)){checked.add(root.id);const expected=tree(c.master),actual=[...tree(root.id)].map(id=>byId.get(id));
   if(actual.length!==expected.size||new Set(actual.map(n=>n.component?.source)).size!==expected.size||actual.some(n=>!expected.has(n.component?.source)))return 'Library instance structure is protected.';
  }
 }
 return null;
}
export function sourceEditError(before,after,access) {
 if(!access||access.manage||access.editAll)return null;
 const roots=access.components??[],allowed=descendantsOf(before.shapes,roots),nextAllowed=descendantsOf(after.shapes,roots);
 const editable=s=>allowed.has(s.id)||(!before.shapes.some(n=>n.id===s.id)&&nextAllowed.has(s.id))||(s.component?.type==='instance'&&roots.includes(s.component.master));
 for(const s of before.shapes){const next=after.shapes.find(n=>n.id===s.id);if(!editable(s)&&!equal(content(s),next&&content(next)))return 'You do not have permission to edit this part of the design system.';if(allowed.has(s.id)&&next&&!nextAllowed.has(s.id))return 'Move layers only within a component you maintain.';}
 for(const s of after.shapes)if(!before.shapes.some(n=>n.id===s.id)&&!editable(s))return 'Add layers inside a component you maintain.';
 for(const root of roots){const a=before.shapes.find(s=>s.id===root),b=after.shapes.find(s=>s.id===root);if(!b||b.component?.type!=='master'||a?.parent_id!==b.parent_id||a?.page_id!==b.page_id)return 'Only a library maintainer can remove or move a main component out of its source page.';}
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
  if(['shapes','active_page','component_properties'].includes(key))continue;
  if(!equal(before[key],after[key]))return 'Only a library maintainer can change shared project settings and definitions.';
 }
 const fixed=doc=>(doc.component_properties??[]).filter(p=>!roots.includes(p.component_id));
 if(!equal(fixed(before),fixed(after)))return 'You cannot change another component’s properties.';
 return null;
}
