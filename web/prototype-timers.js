import {interactionFor} from './prototype-interactions.js';
import {visibleInTree} from './selection.js';

export function timedInteractions(scene){
 return scene.filter(s=>s.kind==='frame'&&interactionFor(s,'afterdelay')&&visibleInTree(s,scene)).map(s=>({id:s.id,delay:interactionFor(s,'afterdelay').delay??800}));
}

// A visit owns its timers. Repainting pauses elapsed time without rearming fired
// actions; navigation replaces the visit and invalidates every old callback.
export function prototypeTimers(fire,{now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}={}){
 let visit=null,entries=[],elapsed=0,started=0,running=false,handle=null,epoch=0;
 const clear=()=>{epoch++;if(handle!==null)cancel(handle);handle=null;};
 const time=()=>elapsed+(running?Math.max(0,now()-started):0);
 const pause=()=>{elapsed=time();running=false;clear();};
 const arm=()=>{
  clear();if(!running||!entries.length)return;const ticket=epoch;
  handle=schedule(()=>{
   if(ticket!==epoch||!running)return;handle=null;
   const item=entries.shift();fire(item.id);
   if(ticket===epoch)arm();
  },Math.max(0,entries[0].delay-time()));
 };
 return{
  scope(id,items){if(visit===id)return;pause();visit=id;elapsed=0;entries=items.map(x=>({...x})).sort((a,b)=>a.delay-b.delay||a.id-b.id);},
  pause,
  resume(){if(running)return;running=true;started=now();arm();},
  reset(){pause();visit=null;entries=[];elapsed=0;}
 };
}
