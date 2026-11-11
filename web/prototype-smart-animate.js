// Smart animate: layers with the same name and place in the hierarchy move,
// resize and recolor between two frames; the rest fade. Works on prototype
// scenes (the frame first, then its descendants) and only produces shapes to
// draw. Nothing here is written back to the document.
import {appearance} from './appearance.js';

const HEX=/^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const CURVES={linear:[0,0,1,1],'ease-in':[.42,0,1,1],'ease-out':[0,0,.58,1],'ease-in-out':[.42,0,.58,1]};
// CSS timing-function progress for the four easings the editor offers.
export function easeProgress(name,t){
 if(t<=0)return 0;if(t>=1)return 1;
 const [x1,y1,x2,y2]=CURVES[name]??CURVES['ease-in-out'];if(x1===y1&&x2===y2)return t;
 const at=(a,b,u)=>3*a*u*(1-u)**2+3*b*u*u*(1-u)+u**3;
 let low=0,high=1,u=t;
 for(let i=0;i<24;i++){const x=at(x1,x2,u);if(Math.abs(x-t)<1e-6)break;if(x<t)low=u;else high=u;u=(low+high)/2;}
 return at(y1,y2,u);
}
export const mix=(a,b,t)=>a+(b-a)*t;
export function mixColor(a,b,t){
 if(!HEX.test(a??'')||!HEX.test(b??''))return b;
 const parts=c=>[1,3,5,7].map(i=>c.length>i?parseInt(c.slice(i,i+2),16):255);
 const from=parts(a),to=parts(b),alpha=a.length>7||b.length>7;
 return '#'+from.slice(0,alpha?4:3).map((v,i)=>Math.round(mix(v,to[i],t)).toString(16).padStart(2,'0')).join('');
}
function childrenOf(scene){
 const map=new Map();for(const s of scene.slice(1)){if(!map.has(s.parent_id))map.set(s.parent_id,[]);map.get(s.parent_id).push(s);}return map;
}
// Pair layers top-down. Two layers pair when their parents pair, they share
// a name (the n-th of that name pairs with the n-th) and they are the same
// kind. Nothing below an unpaired layer pairs, so unpaired subtrees stay whole.
export function matchLayers(from,to){
 const pairs=new Map([[to[0].id,from[0]]]),fromChildren=childrenOf(from),toChildren=childrenOf(to),removed=[],added=[];
 const walk=(a,b)=>{
  const sources=fromChildren.get(a.id)??[],used=new Set(),seen=new Map();
  for(const target of toChildren.get(b.id)??[]){
   const ordinal=seen.get(target.name)??0;seen.set(target.name,ordinal+1);
   const source=sources.filter(s=>s.name===target.name)[ordinal];
   if(source&&source.kind===target.kind){used.add(source.id);pairs.set(target.id,source);walk(source,target);}
   else added.push(target.id);
  }
  // Remember where a departing layer sat: before the next sibling that stays.
  sources.forEach((source,index)=>{
   if(used.has(source.id))return;
   const next=sources.slice(index+1).find(s=>used.has(s.id));
   removed.push({shape:source,parent:b.id,before:next?[...pairs].find(([,s])=>s===next)[0]:null});
  });
 };
 walk(from[0],to[0]);
 return {pairs,added:new Set(added),removed};
}
const fade=(s,amount)=>({...s,appearance:{...appearance(s),opacity:appearance(s).opacity*amount}});
function tween(a,b,t,dx,dy){
 const next={...b,x:mix(a.x+dx,b.x,t),y:mix(a.y+dy,b.y,t),width:mix(a.width,b.width,t),height:mix(a.height,b.height,t),rotation:mix(a.rotation??0,b.rotation??0,t),stroke_width:mix(a.stroke_width??0,b.stroke_width??0,t),fill:mixColor(a.fill,b.fill,t)};
 if(a.appearance||b.appearance){
  const from=appearance(a),to=appearance(b),look={...to};
  for(const [key,value] of Object.entries(to)){
   if(typeof value==='number'&&typeof from[key]==='number')look[key]=mix(from[key],value,t);
   else if(typeof value==='string'&&HEX.test(value))look[key]=mixColor(from[key],value,t);
   else if(Array.isArray(value)&&Array.isArray(from[key])&&value.length===from[key].length&&value.every((v,i)=>typeof v==='number'&&typeof from[key][i]==='number'))look[key]=value.map((v,i)=>mix(from[key][i],v,t));
  }
  next.appearance=look;
 }
 if(a.typography&&b.typography){
  const type={...b.typography};
  for(const [key,value] of Object.entries(type))if(typeof value==='number'&&typeof a.typography[key]==='number')type[key]=mix(a.typography[key],value,t);
  next.typography=type;
 }
 return next;
}
// The scene to draw at progress t (0 = the frame being left, 1 = the
// destination). `match` may be passed to avoid pairing again every frame.
export function smartScene(from,to,t,match=matchLayers(from,to)){
 const dx=to[0].x-from[0].x,dy=to[0].y-from[0].y,fromChildren=childrenOf(from),inserts=new Map(),tail=[];
 // Departing subtrees get negative ids so they cannot collide with the destination's.
 const leaving=({shape,parent,before})=>{
  const copy=[],visit=(s,parentId,top)=>{const moved={...s,id:-s.id,parent_id:parentId,x:s.x+dx,y:s.y+dy};copy.push(top?fade(moved,1-t):moved);for(const child of fromChildren.get(s.id)??[])visit(child,-s.id,false);};
  visit(shape,parent,true);
  if(before==null)tail.push(...copy);else inserts.set(before,[...(inserts.get(before)??[]),...copy]);
 };
 match.removed.forEach(leaving);
 const scene=[];
 to.forEach((shape,index)=>{
  scene.push(...(inserts.get(shape.id)??[]));
  const source=match.pairs.get(shape.id);
  if(index===0)scene.push({...shape,fill:mixColor(source.fill,shape.fill,t)});
  else if(source)scene.push(tween(source,shape,t,dx,dy));
  else scene.push(match.added.has(shape.id)?fade(shape,t):shape);
 });
 return [...scene,...tail];
}
