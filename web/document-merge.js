// A field-level three-way merge. Identity arrays merge by ID; ambiguous edits
// remain explicit conflicts. The remote document wins only in the preview.
export const sameValue=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keyed=a=>Array.isArray(a)&&a.every(v=>object(v)&&['string','number'].includes(typeof v.id))&&new Set(a.map(v=>v.id)).size===a.length;
export function mergeDocuments(base,local,remote,{prefer='remote'}={}){
 const conflicts=[];
 const conflict=(path,l,r)=>{conflicts.push(path||'document');return prefer==='local'?l:r;};
 function merge(b,l,r,path,depth=0){
  if(depth>60)return conflict(path,l,r);
  if(sameValue(l,b))return r;if(sameValue(r,b)||sameValue(l,r))return l;
  if(keyed(b)&&keyed(l)&&keyed(r)){
   const bm=new Map(b.map(v=>[v.id,v])),lm=new Map(l.map(v=>[v.id,v])),rm=new Map(r.map(v=>[v.id,v]));
   const common=b.filter(v=>lm.has(v.id)&&rm.has(v.id)).map(v=>v.id),retained=new Set(common),lo=l.filter(v=>retained.has(v.id)).map(v=>v.id),ro=r.filter(v=>retained.has(v.id)).map(v=>v.id);
   let order=r.map(v=>v.id);if(!sameValue(lo,common)){if(!sameValue(ro,common)&&!sameValue(lo,ro))conflict(path+'.order',lo,ro);if(sameValue(ro,common)||prefer==='local')order=l.map(v=>v.id);}
   const ordered=new Set(order);for(const v of [...l,...r])if(!ordered.has(v.id)){order.push(v.id);ordered.add(v.id);}
   return order.map(id=>merge(bm.get(id),lm.get(id),rm.get(id),path+'['+id+']',depth+1)).filter(v=>v!==undefined);
  }
  if(object(b)&&object(l)&&object(r)){
   const out={};for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){
    const v=path===''&&k==='active_page'?l[k]:merge(b[k],l[k],r[k],path?path+'.'+k:k,depth+1);if(v!==undefined)Object.defineProperty(out,k,{value:v,writable:true,enumerable:true,configurable:true});
   }return out;
  }
  return conflict(path,l,r);
 }
 return {document:merge(base,local,remote,''),conflicts};
}
export class PersonalHistory{
 constructor(){this.undoStack=[];this.redoStack=[];}
 record(before,after){if(sameValue(before,after))return;this.undoStack.push({before:structuredClone(before),after:structuredClone(after)});if(this.undoStack.length>100)this.undoStack.shift();this.redoStack=[];}
 apply(kind,current){const from=kind==='undo'?this.undoStack:this.redoStack,to=kind==='undo'?this.redoStack:this.undoStack,entry=from.at(-1);if(!entry)return current;const result=mergeDocuments(kind==='undo'?entry.after:entry.before,kind==='undo'?entry.before:entry.after,current);if(result.conflicts.length)throw new Error('A teammate changed this edit. Undo is paused to preserve their work.');from.pop();to.push(entry);return result.document;}
}
