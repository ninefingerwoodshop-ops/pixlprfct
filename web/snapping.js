import {paintBounds} from './scene.js';
import {snapGuides} from './guide-snap.js';
export const snapDefaults={enabled:true,objects:true,grid:true,increment:1};
export function normalizeSnapping(value={}){return {enabled:value.enabled!==false,objects:value.objects!==false,grid:value.grid!==false,increment:Number.isFinite(value.increment)&&value.increment>=.1&&value.increment<=1000?value.increment:1};}
export function snapMovement(shapes,box,excluded,zoom,settings,axes={x:true,y:true},guides=true){
 if(!settings.enabled)return {dx:0,dy:0,lines:[]};
 const best={x:null,y:null},limit=6/Math.max(.01,zoom);
 if(settings.objects)for(const shape of shapes){if(excluded.has(shape.id))continue;const target=paintBounds(shape,shapes);if(!target)continue;
  for(const axis of ['x','y']){if(!axes[axis])continue;const size=axis==='x'?'width':'height',other=axis==='x'?'y':'x',otherSize=axis==='x'?'height':'width';
   for(const value of [target[axis],target[axis]+target[size]/2,target[axis]+target[size]])for(const anchor of [box[axis],box[axis]+box[size]/2,box[axis]+box[size]]){const delta=value-anchor;if(Math.abs(delta)<=limit&&(!best[axis]||Math.abs(delta)<Math.abs(best[axis].delta)))best[axis]={axis,value,delta,start:Math.min(box[other],target[other]),end:Math.max(box[other]+box[otherSize],target[other]+target[otherSize])};}
  }
 }
 if(guides){const result=snapGuides(shapes,box,excluded,zoom,axes);for(const line of result.lines)if(!best[line.axis]||Math.abs(line.delta)<Math.abs(best[line.axis].delta))best[line.axis]=line;}
 const delta=axis=>!axes[axis]?0:best[axis]?.delta??(settings.grid?Math.round(box[axis]/settings.increment)*settings.increment-box[axis]:0);
 return {dx:delta('x'),dy:delta('y'),lines:Object.values(best).filter(Boolean)};
}
