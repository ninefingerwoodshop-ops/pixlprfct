export const MIN_ZOOM=.02,MAX_ZOOM=64;
export const clampZoom=value=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,value));
// Follow a continuous logarithmic target, including between input events.
export const PINCH_ZOOM_SENSITIVITY=.054;
export function zoomTarget(current,delta,sensitivity=PINCH_ZOOM_SENSITIVITY){return clampZoom(current*Math.exp(-delta*sensitivity));}
export function followZoom(current,target,elapsed,reduced=false){
 target=clampZoom(target);
 if(reduced||Math.abs(Math.log(target/current))<.0001)return target;
 const amount=1-Math.exp(-Math.max(0,Math.min(elapsed,64))/32);
 return Math.exp(Math.log(current)+(Math.log(target)-Math.log(current))*amount);
}
