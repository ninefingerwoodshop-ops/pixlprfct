import {easeProgress} from './prototype-smart-animate.js';
// Smart animate redraws the scene every frame instead of moving snapshots.
export function smartSpec(config={},reduced=false){
 const duration=config.duration??300;
 return config.transition==='smart-animate'&&!reduced&&duration>0?{duration,easing:config.easing??'ease-in-out'}:null;
}
export function transitionSpec(config={},reduced=false){
 const kind=config.transition??'instant',duration=config.duration??300;
 if(reduced||kind==='instant'||duration===0)return null;
 const options={duration,easing:config.easing??'ease-in-out',fill:'both'};
 if(kind==='dissolve')return{incoming:[{opacity:1},{opacity:1}],outgoing:[{opacity:1},{opacity:0}],options};
 const direction={'slide-left':[-100,0],'slide-right':[100,0],'slide-up':[0,-100],'slide-down':[0,100]}[kind];if(!direction)return null;
 const [x,y]=direction,move=(x,y)=>({transform:`translate(${x}%, ${y}%)`});
 return{incoming:[move(-x,-y),move(0,0)],outgoing:[move(0,0),move(x,y)],options};
}
export function canvasTransitions(canvas,area){
 let animations=[],ghost=null,running=false,epoch=0,frame=0,settle=null;
 const cancel=()=>{epoch++;for(const a of animations)a.cancel();animations=[];ghost?.remove();ghost=null;if(frame)cancelAnimationFrame(frame);frame=0;settle?.();settle=null;running=false;area.removeAttribute('aria-busy');};
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 return{get running(){return running;},cancel,reduced,
  // Call draw(progress) once per frame with eased progress, ending exactly at 1.
  tween(draw,spec){
   cancel();if(!spec)return Promise.resolve();const ticket=epoch;let start=null;running=true;area.setAttribute('aria-busy','true');
   return new Promise(resolve=>{settle=resolve;const step=now=>{if(ticket!==epoch)return;start??=now;const t=Math.min(1,(now-start)/spec.duration);draw(easeProgress(spec.easing,t));if(t<1)frame=requestAnimationFrame(step);else{frame=0;cancel();}};frame=requestAnimationFrame(step);});
  },
  capture(config){if(!transitionSpec(config,reduced()))return null;const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);copy.style.width=canvas.style.width;copy.style.height=canvas.style.height;copy.style.pointerEvents='none';copy.setAttribute('aria-hidden','true');return copy;},play(copy,config){
  cancel();const spec=transitionSpec(config,reduced());if(!copy||!spec)return;const ticket=epoch;ghost=copy;area.append(copy);running=true;area.setAttribute('aria-busy','true');
  animations=[canvas.animate(spec.incoming,spec.options),copy.animate(spec.outgoing,spec.options)];return Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(ticket===epoch)cancel();});
 }};
}
