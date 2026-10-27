import {hasHugControlHeight} from './control-sizing.js';
import {localPoint,worldPoint} from './rotation.js';
import {sizingPatch} from './layout-sizing.js';

// An explicit dimension edit changes only that axis from Hug/Fill to Fixed.
export function fixedResize(shape, widthChanged, heightChanged) {
  if(widthChanged&&shape.control)shape={...shape,control:{...shape.control,width_sizing:'fixed'}};
  if(widthChanged)shape=sizingPatch(shape,'width','fixed');
  if(heightChanged)shape=sizingPatch(shape,'height','fixed');
  return shape;
}

export const resizeHandles=[[0,0],[1,0],[0,1],[1,1],[0,.5],[1,.5],[.5,0],[.5,1]];
export function resizeHandleAt(shape,point,zoom,gridSpan=false){point=localPoint(shape,point);return resizeHandles.filter(([,y])=>gridSpan||!hasHugControlHeight(shape)||y===.5).find(([x,y])=>Math.abs(point.x-shape.x-x*shape.width)<9/zoom&&Math.abs(point.y-shape.y-y*shape.height)<9/zoom);}
export function resizeBox(original,point,cx,cy){
 if(hasHugControlHeight(original))cy=.5;
 const right=original.x+original.width,bottom=original.y+original.height;
 const x=cx===0?Math.min(right-1,point.x):original.x,y=cy===0?Math.min(bottom-1,point.y):original.y;
 return {...original,x,y,width:cx===.5?original.width:cx===1?Math.max(1,point.x-x):right-x,height:cy===.5?original.height:cy===1?Math.max(1,point.y-y):bottom-y};
}

export function rotationHandleAt(shape,point,zoom){
 const p=localPoint(shape,point),outside=p.x<shape.x||p.x>shape.x+shape.width||p.y<shape.y||p.y>shape.y+shape.height;
 return outside&&!resizeHandleAt(shape,point,zoom)&&resizeHandles.slice(0,4).some(([x,y])=>Math.hypot(p.x-shape.x-x*shape.width,p.y-shape.y-y*shape.height)<24/zoom);
}
export function resizeWorldBox(original,candidate){const p=worldPoint(original,candidate);return {...candidate,x:p.x,y:p.y};}
export function resizeCursor(shape,handle){const angle=(Math.atan2(handle[1]-.5,handle[0]-.5)*180/Math.PI-(shape.rotation??0)+360)%180;return ['ew-resize','nwse-resize','ns-resize','nesw-resize'][Math.round(angle/45)%4];}
export const rotateCursor=`url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M5 14a8 8 0 0 1 14-5M14 9h5V4" fill="none" stroke="white" stroke-width="4"/><path d="M5 14a8 8 0 0 1 14-5M14 9h5V4" fill="none" stroke="black" stroke-width="2"/></svg>')}") 12 12, crosshair`;
