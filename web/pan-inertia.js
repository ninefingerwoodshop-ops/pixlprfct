// Integrate exponential decay exactly so travel is independent of refresh rate.
export function panInertiaStep(velocity,elapsed){
 const dt=Math.max(0,Math.min(elapsed,64)),decay=Math.exp(-dt/100);
 return {dx:velocity.x*100*(1-decay),dy:velocity.y*100*(1-decay),velocity:{x:velocity.x*decay,y:velocity.y*decay}};
}
export function releasePanVelocity(velocity,idleMs,reduced=false){
 if(reduced||idleMs>80||Math.hypot(velocity.x,velocity.y)<.08)return {x:0,y:0};
 const scale=Math.min(.65,1.8/Math.hypot(velocity.x,velocity.y));
 return {x:velocity.x*scale,y:velocity.y*scale};
}
