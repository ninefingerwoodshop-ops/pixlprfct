// Overflow scrolling in presentations. A frame whose `overflow_scroll` is
// vertical, horizontal or both scrolls the content that extends past it.
// Offsets live in the player; these helpers only compute geometry and return
// shapes to draw, so the document is never changed.
const axes=frame=>({x:['horizontal','both'].includes(frame?.overflow_scroll),y:['vertical','both'].includes(frame?.overflow_scroll)});
export const scrolls=frame=>frame?.kind==='frame'&&(axes(frame).x||axes(frame).y);
// Layers that move when `frame` scrolls: its children that are not fixed, and everything inside them.
function moving(scene,frame){
 const ids=new Set(scene.filter(s=>s.parent_id===frame.id&&!s.scroll_fixed).map(s=>s.id));
 for(let grew=true;grew;){grew=false;for(const s of scene)if(!ids.has(s.id)&&ids.has(s.parent_id)){ids.add(s.id);grew=true;}}
 return ids;
}
// How far the frame can scroll on each axis: the content's far edge (plus the
// frame's end padding) past the frame's own far edge. Hidden layers do not count.
export function scrollExtent(scene,frame){
 if(!scrolls(frame))return {x:0,y:0};
 const content=scene.filter(s=>s.parent_id===frame.id&&!s.scroll_fixed&&!s.hidden),allow=axes(frame),layout=frame.auto_layout;
 if(!content.length)return {x:0,y:0};
 const right=Math.max(...content.map(s=>s.x+s.width))+(layout?.padding_right??0),bottom=Math.max(...content.map(s=>s.y+s.height))+(layout?.padding_bottom??0);
 return {x:allow.x?Math.max(0,right-(frame.x+frame.width)):0,y:allow.y?Math.max(0,bottom-(frame.y+frame.height)):0};
}
export function clampScroll(extent,offset){
 return {x:Math.min(extent.x,Math.max(0,offset?.x??0)),y:Math.min(extent.y,Math.max(0,offset?.y??0))};
}
// The scene as shown: scrolled content moved, scrolling frames clipping.
// `offsets` maps frame id to {x, y}. Returns the same array when nothing scrolls.
export function scrolledScene(scene,offsets){
 const frames=scene.filter(scrolls);if(!frames.length)return scene;
 const shift=new Map();
 for(const frame of frames){const o=clampScroll(scrollExtent(scene,frame),offsets?.get(frame.id));if(!o.x&&!o.y)continue;for(const id of moving(scene,frame)){const at=shift.get(id)??{x:0,y:0};shift.set(id,{x:at.x+o.x,y:at.y+o.y});}}
 return pinOnTop(scene.map(s=>{const by=shift.get(s.id),clip=scrolls(s)&&!s.clip_content;return by||clip?{...s,...(by?{x:s.x-by.x,y:s.y-by.y}:{}),...(clip?{clip_content:true}:{})}:s;}),frames);
}
// Pinned layers are drawn above the content that scrolls beneath them: each
// pinned subtree moves to the top of its scrolling frame's stack.
function pinOnTop(scene,frames){
 for(const frame of frames){
  const pinned=new Set(scene.filter(s=>s.parent_id===frame.id&&s.scroll_fixed).map(s=>s.id));if(!pinned.size)continue;
  for(let grew=true;grew;){grew=false;for(const s of scene)if(!pinned.has(s.id)&&pinned.has(s.parent_id)){pinned.add(s.id);grew=true;}}
  const top=scene.filter(s=>pinned.has(s.id)),rest=scene.filter(s=>!pinned.has(s.id));
  // A frame that paints its first child on top needs them at the front.
  if(frame.auto_layout?.canvas_stacking==='first')rest.splice(rest.findIndex(s=>s.id===frame.id)+1,0,...top);else rest.push(...top);
  scene=rest;
 }
 return scene;
}
// Offsets in the shape the engine's scrolled hit test expects.
export function scrollJson(scene,offsets){
 const out={};for(const frame of scene.filter(scrolls)){const o=clampScroll(scrollExtent(scene,frame),offsets?.get(frame.id));if(o.x||o.y)out[frame.id]=[o.x,o.y];}
 return JSON.stringify(out);
}
const inside=(s,p)=>p.x>=s.x&&p.x<=s.x+s.width&&p.y>=s.y&&p.y<=s.y+s.height;
// Scroll by a wheel or drag delta at `point` (in shown coordinates). The
// innermost scrolling frame under the point that can still move takes each
// axis; what it cannot use passes to the scrolling frames around it.
// Returns the new offsets map, or null when nothing moved.
export function scrollBy(scene,offsets,point,dx,dy){
 const shown=scrolledScene(scene,offsets),byId=new Map(shown.map(s=>[s.id,s])),depth=s=>{let n=0;for(let p=byId.get(s.parent_id);p;p=byId.get(p.parent_id))n++;return n;};
 // Every ancestor must contain the point too, or the frame is clipped away there.
 const visible=s=>{for(let at=s;at;at=byId.get(at.parent_id))if(at.hidden||(at!==s&&at.clip_content&&!inside(at,point)))return false;return inside(s,point);};
 const candidates=shown.filter(s=>scrolls(s)&&visible(s)).sort((a,b)=>depth(b)-depth(a));
 let next=null,restX=dx,restY=dy;
 for(const frame of candidates){
  if(!restX&&!restY)break;
  const original=scene.find(s=>s.id===frame.id),extent=scrollExtent(scene,original),from=clampScroll(extent,(next??offsets)?.get(frame.id)),to=clampScroll(extent,{x:from.x+restX,y:from.y+restY});
  if(to.x===from.x&&to.y===from.y)continue;
  next??=new Map(offsets??[]);next.set(frame.id,to);restX-=to.x-from.x;restY-=to.y-from.y;
 }
 return next;
}
// The frame keyboard scrolling acts on: the outermost scrolling frame that has somewhere to go.
export function keyboardScrollFrame(scene){
 return scene.find(s=>scrolls(s)&&!s.hidden&&(scrollExtent(scene,s).x||scrollExtent(scene,s).y))??null;
}
// Arrow, Page, Home and End keys as a scroll delta for a frame of the given size.
export function keyScrollDelta(key,frame,extent){
 const page=Math.max(40,frame.height*.9);
 return ({ArrowDown:{x:0,y:40},ArrowUp:{x:0,y:-40},ArrowRight:{x:40,y:0},ArrowLeft:{x:-40,y:0},PageDown:{x:0,y:page},PageUp:{x:0,y:-page},End:{x:extent.x,y:extent.y},Home:{x:-extent.x,y:-extent.y}})[key]??null;
}
