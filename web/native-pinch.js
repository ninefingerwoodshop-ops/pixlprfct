// WebKit reports cumulative scale, unlike Chromium's Ctrl-wheel deltas.
export function installNativePinch(target,{start,scale,end}){
 let previous=null;
 const valid=value=>Number.isFinite(value)&&value>0;
 const consume=event=>{event.preventDefault();event.stopPropagation();};
 target.addEventListener('gesturestart',event=>{
  consume(event);previous=valid(event.scale)?event.scale:1;start();
 },{capture:true,passive:false});
 target.addEventListener('gesturechange',event=>{
  consume(event);
  if(previous===null){previous=1;start();}
  if(!valid(event.scale))return;
  scale(event.scale/previous,event);previous=event.scale;
 },{capture:true,passive:false});
 target.addEventListener('gestureend',event=>{
  consume(event);
  if(previous!==null&&valid(event.scale))scale(event.scale/previous,event);
  previous=null;end();
 },{capture:true,passive:false});
 target.addEventListener('blur',()=>{previous=null;end();},true);
 return ()=>previous!==null;
}
