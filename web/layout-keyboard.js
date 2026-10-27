// Flow children change sibling order; absolute/free-position layers still nudge.
export function layoutArrowOrder(selected,all,key){
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)||!selected.length)return null;
 const ids=new Set(selected.map(s=>s.id));
 const roots=selected.filter(s=>{let parent=all.find(p=>p.id===s.parent_id),seen=new Set();while(parent&&!seen.has(parent.id)){if(ids.has(parent.id))return false;seen.add(parent.id);parent=all.find(p=>p.id===parent.parent_id);}return true;});
 const flow=roots.map(s=>({shape:s,parent:all.find(p=>p.id===s.parent_id)}));
 if(flow.some(({shape,parent})=>shape.layout_item?.absolute||!parent?.auto_layout))return null;
 const horizontal=key==='ArrowLeft'||key==='ArrowRight';
 const moving=flow.filter(({parent})=>parent.auto_layout.direction==='grid'||(parent.auto_layout.direction==='horizontal')===horizontal);
 return {ids:moving.map(({shape})=>shape.id),direction:key==='ArrowLeft'||key==='ArrowUp'?'backward':'forward'};
}
