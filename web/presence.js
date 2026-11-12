// People with the file open: their colour, pointer and view, and following one
// of them. The server keeps the list (server/presence.mjs); this file holds the
// rules that do not need a page, plus the heartbeat that keeps this editor in it.
export const PRESENCE_COLORS=['#f24822','#ffa629','#14ae5c','#0d99ff','#9747ff','#ff24bd','#00a2c2','#b86200'];
// One colour per editor window, stable for as long as it stays open.
export function personColor(client){let hash=0;for(const c of String(client))hash=(hash*31+c.charCodeAt(0))>>>0;return PRESENCE_COLORS[hash%PRESENCE_COLORS.length];}
export const initials=name=>String(name??'').trim().split(/\s+/).filter(Boolean).map(part=>[...part][0].toUpperCase()).slice(0,2).join('')||'?';
// The zoom and pan that show another person's view rectangle whole, centred, on a canvas of this size.
export function followView(view,width,height,{min=.02,max=256}={}){
 const zoom=Math.max(min,Math.min(max,Math.min(width/view.width,height/view.height)));
 return {page:view.page,zoom,pan:{x:width/2-(view.x+view.width/2)*zoom,y:height/2-(view.y+view.height/2)*zoom}};
}
// Part of the way from one view to another, for a move that takes several frames.
export function blendView(from,to,t){const mix=(a,b)=>a+(b-a)*t;return {page:to.page,zoom:from.zoom*Math.pow(to.zoom/from.zoom,t),pan:{x:mix(from.pan.x,to.pan.x),y:mix(from.pan.y,to.pan.y)}};}
export const FAST_BEAT=250,SLOW_BEAT=1000;
export class Presence{
 // `call(path,options)` talks to the open file's API; `local()` gives this editor's {cursor, view}.
 constructor({call,local,changed=()=>{},left=()=>{}}){Object.assign(this,{call,local,changed,left});this.people=[];this.following=null;this.running=null;}
 others(){return this.people.filter(p=>!p.mine);}
 leader(){return this.following?this.people.find(p=>p.client===this.following)??null:null;}
 // Following, or being followed, needs the view sooner than once a second.
 interval(){const mine=this.people.find(p=>p.mine);return this.following||this.people.some(p=>mine&&p.following===mine.client)?FAST_BEAT:SLOW_BEAT;}
 follow(client){this.following=this.people.some(p=>p.client===client&&!p.mine)?client:null;this.changed();}
 stop(){if(!this.following)return;this.following=null;this.changed();}
 clear(){this.people=[];this.following=null;this.changed();}
 async beat(){
  if(this.running)return this.running;
  this.running=(async()=>{
   const {presence}=await this.call('/presence',{method:'POST',body:JSON.stringify({...this.local(),following:this.following})});this.people=presence??[];
   // The person being followed closed the file, or lost it.
   if(this.following&&!this.leader()){const gone=this.following;this.following=null;this.left(gone);}
   this.changed();
  })().finally(()=>{this.running=null;});
  return this.running;
 }
 leave(){return this.call('/presence',{method:'DELETE'}).catch(()=>{});}
}
