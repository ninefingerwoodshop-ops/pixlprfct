export const interactionDefaults={trigger:'load',onLeave:'reverse',onClick:'restart'};
export const interactionSettings=animation=>({...interactionDefaults,...animation.interaction});
export function validInteraction(value){return value&&typeof value==='object'&&!Array.isArray(value)&&['load','hover','click'].includes(value.trigger)&&['pause','reset','reverse','continue'].includes(value.onLeave)&&['pause','restart','reverse','continue'].includes(value.onClick);}

// This controller is serialized into interactive exports. Keep it self-contained.
export function interactionClock(options,render,clock){
 let time=0,direction=1,playing=false,started=false,last=0,frame=null;
 const emit=()=>render(time,playing,direction);
 function advance(now){if(!playing)return;time+=Math.max(0,now-last)*direction;last=Math.max(last,now);if(time>=options.duration){if(options.loop&&direction>0)time%=options.duration;else{time=options.duration;if(direction>0)playing=false;}}if(time<=0){time=0;if(direction<0)playing=false;}emit();}
 function cancel(){if(frame!==null)clock.cancel(frame);frame=null;}
 function tick(now){frame=null;advance(now);if(playing)frame=clock.request(tick);}
 function pause(){advance(clock.now());playing=false;cancel();emit();}
 function play(nextDirection=1,restart=false){advance(clock.now());cancel();direction=nextDirection;if(restart||direction>0&&time>=options.duration)time=0;playing=!(direction<0&&time===0);last=clock.now();emit();if(playing)frame=clock.request(tick);}
 function reset(){cancel();time=0;direction=1;playing=false;started=false;emit();}
 function activate(){
  if(!started){started=true;play();return;}
  if(options.onClick==='pause'){if(playing)pause();else play(direction);}
  else if(options.onClick==='reverse')play(-direction);
  else if(options.onClick==='restart')play(1,true);
  else if(!playing)play(1);
 }
 function enter(){started=true;play(1);}
 function leave(){if(options.onLeave==='pause')pause();else if(options.onLeave==='reset')reset();else if(options.onLeave==='reverse')play(-1);}
 emit();return {activate,enter,leave,reset,pause,play,destroy:cancel,state:()=>({time,direction,playing})};
}

// Scoped to the owning SVG: no imports, network calls, document-wide controls,
// or user-authored code. Native SVG animation still performs interpolation.
export function mountSvgInteraction(root,options,createClock){
 root.pauseAnimations();root.setCurrentTime(0);
 root.querySelectorAll('[data-pixl-motion]').forEach(node=>{node.removeAttribute('transform');node.removeAttribute('data-pixl-motion');});
 root.querySelectorAll('animate,animateTransform,animateMotion').forEach(node=>node.beginElement());
 const player=createClock(options,time=>root.setCurrentTime(time/1000),{now:()=>performance.now(),request:fn=>requestAnimationFrame(fn),cancel:id=>cancelAnimationFrame(id)});
 let pointer=false,focus=false,active=false;
 const hover=()=>{const next=pointer||focus;if(next===active)return;active=next;if(active)player.enter();else player.leave();};
 if(options.trigger==='hover'){
  root.addEventListener('pointerenter',()=>{pointer=true;hover();});root.addEventListener('pointerleave',()=>{pointer=false;hover();});
  root.addEventListener('focusin',()=>{focus=root.matches(':focus-visible');hover();});root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget)){focus=false;hover();}});
 }else root.addEventListener('click',()=>player.activate());
 root.addEventListener('keydown',event=>{if(event.repeat||!['Enter',' '].includes(event.key))return;event.preventDefault();if(options.trigger==='click')player.activate();else player.enter();});
 window.addEventListener('pagehide',()=>player.destroy(),{once:true});
}

export function interactionScript(settings,duration,loop){
 // All serialized options are validated enums, numbers and booleans.
 return `(${mountSvgInteraction.toString()})(document.currentScript.ownerSVGElement,${JSON.stringify({...settings,duration,loop})},${interactionClock.toString()});`;
}
