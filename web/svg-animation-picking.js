// Let thin, open strokes be selected without requiring a pixel-perfect click.
// Only the preview is inspected; artwork, exports and undo remain unchanged.
export function pickSvgElement(root,layers,target,clientX,clientY){
 const ids=new Set(layers.map(layer=>layer.id));let direct=null;
 for(let node=target;node&&node!==root;node=node.parentElement)if(ids.has(node.id)){direct=node.id;break;}
 if(!Number.isFinite(clientX)||!Number.isFinite(clientY))return direct;
 const radius=6,painted=root.ownerDocument.elementsFromPoint.bind(root.ownerDocument);
 for(const node of [...root.querySelectorAll('[id]')].reverse()){
  if(!ids.has(node.id))continue;if(node.id===direct)return direct;
  if(typeof node.getTotalLength!=='function')continue;
  const style=getComputedStyle(node);if(style.stroke==='none'||Number.parseFloat(style.strokeWidth)<=0||Number.parseFloat(style.strokeOpacity)===0)continue;
  const box=node.getBoundingClientRect();if(clientX<box.left-radius||clientX>box.right+radius||clientY<box.top-radius||clientY>box.bottom+radius)continue;
  try{
   const matrix=node.getScreenCTM(),length=node.getTotalLength();if(!matrix||!length)continue;
   const at=t=>{const p=node.getPointAtLength(t);return new DOMPoint(p.x,p.y).matrixTransform(matrix);},distance=p=>(p.x-clientX)**2+(p.y-clientY)**2;
   const scale=Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d)),steps=Math.min(512,Math.max(8,Math.ceil(length*scale/8)));let best=0,d=Infinity;
   for(let i=0;i<=steps;i++){const t=length*i/steps,v=distance(at(t));if(v<d){d=v;best=t;}}
   let lo=Math.max(0,best-length/steps),hi=Math.min(length,best+length/steps);
   for(let i=0;i<14;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(distance(at(a))<distance(at(b)))hi=b;else lo=a;}
   const point=at((lo+hi)/2);if(distance(point)>radius**2)continue;
   // Native hit testing respects clipping, visibility and overlapping controls.
   if(painted(point.x,point.y).some(hit=>hit===node||node.contains(hit)))return node.id;
  }catch{/* Unsupported or hidden geometry is left to native hit testing. */}
 }
 return direct;
}
