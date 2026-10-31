import {equal} from './library-model.js';
export function libraryChanges(previous,next){
 const before=typeof previous==='string'?JSON.parse(previous):previous??{},after=typeof next==='string'?JSON.parse(next):next,changes=[];
 for(const field of ['shapes','component_sets','component_properties','text_styles','color_styles','effect_styles','guide_styles','variables.values','variables.collections']){
  const get=doc=>field.split('.').reduce((value,key)=>value?.[key],doc)??[],a=new Map(get(before).map(v=>[v.id,v])),b=new Map(get(after).map(v=>[v.id,v]));
  for(const id of new Set([...a.keys(),...b.keys()])){const old=a.get(id),value=b.get(id);if(equal(old,value))continue;const properties=old&&value?[...new Set([...Object.keys(old),...Object.keys(value)])].filter(k=>!equal(old[k],value[k])):[];changes.push({kind:!old?'added':!value?'removed':'changed',type:field,id,name:value?.name??old?.name??String(id),properties});}
 }
 return {changes,added:changes.filter(c=>c.kind==='added').length,removed:changes.filter(c=>c.kind==='removed').length,changed:changes.filter(c=>c.kind==='changed').length};
}
