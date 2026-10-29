import {paints,withPaints,addPaint} from './paints.js';
import {appearance} from './appearance.js';

// Hiding retains a paint row; removing it leaves the section ready to add one.
export function hasPaint(shape,channel){return paints(shape,channel).length>0;}
export function setPaintState(shape,channel,action){
 if(!['fill','stroke'].includes(channel)||!['add','show','hide','remove'].includes(action))throw new Error('Invalid paint action');
 if(shape.appearance?.[channel==='fill'?'fills':'strokes']){if(action==='add')return addPaint(shape,channel);return withPaints(shape,channel,action==='remove'?[]:paints(shape,channel).map(p=>({...p,visible:action==='show'})));}
 return {...shape,appearance:{...appearance(shape),[channel+'_enabled']:action==='add'||action==='show',[channel+'_hidden']:action==='hide'}};
}
