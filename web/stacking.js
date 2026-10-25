export function paintChildren(shapes){
 const children=new Map();for(const s of shapes){const list=children.get(s.parent_id||0)??[];list.push(s);children.set(s.parent_id||0,list);}
 for(const s of shapes)if(s.auto_layout?.canvas_stacking==='first')children.get(s.id)?.reverse();
 return children;
}
export function paintOrder(shapes){const children=paintChildren(shapes),result=[];const visit=s=>{result.push(s);for(const c of children.get(s.id)??[])visit(c);};for(const root of children.get(0)??[])visit(root);return result;}
