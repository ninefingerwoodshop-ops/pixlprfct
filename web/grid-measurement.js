// Resolve placement from the active CSS grid, never from the base engine plan.
// Named areas supply exact lines; auto items use their measured margin box.
export function measuredGridPlacement(shape,grid,plan,box,style={}){
 const cell=shape.layout_item?.grid_cell??{},area=grid.areas?.find(a=>a.name===cell.area);
 const placement={id:shape.id};
 for(const [axis,key,position,size,startKey,endKey,alignment] of [
  ['columns','column','x','width','gridColumnStart','gridColumnEnd','justifySelf'],
  ['rows','row','y','height','gridRowStart','gridRowEnd','alignSelf']
 ]){
  const start=Number(style[startKey])||cell[key],span=Math.max(1,Number(/^span (\d+)$/.exec(style[endKey]??'')?.[1])||cell[key+'_span']||1);
  if(area){placement[key]=area[key];placement[key+'_span']=area[key+'_span'];continue;}
  placement[key+'_span']=span;
  if(start>0){placement[key]=start;continue;}
  const sizes=plan[axis],gap=plan[key+'_gap']??0,align=style[alignment]==='auto'||!style[alignment]?grid[key==='column'?'justify_items':'align_items']:style[alignment];
  let offset=0,best=Infinity,index=0;
  for(let i=0;i<=Math.max(0,sizes.length-span);i++){
   const extent=sizes.slice(i,i+span).reduce((a,b)=>a+b,0)+gap*(span-1),free=extent-box[size];
   const expected=offset+(align==='end'||align==='self-end'?free:align==='center'?free/2:0),distance=Math.abs(box[position]-expected);
   if(distance<best){best=distance;index=i;}
   offset+=(sizes[i]??0)+gap;
  }
  placement[key]=index+1;
 }
 return placement;
}
