export const LAYER_MIME='application/x-pixlprfct-layers';
export function layerPayload(text){
 if(!text||text.length>5_000_000)return null;
 try{const value=JSON.parse(text);return value?.format==='pixlprfct.layers'?value:null;}catch{return null;}
}
export function pasteOffset(payload,target,overSelection=false,repeat=1){
 const roots=payload.shapes.filter(s=>!s.parent_id);if(!roots.length)throw new Error('Clipboard has no root layers');
 if(target)return{x:target.x+(overSelection?0:16)-Math.min(...roots.map(s=>s.x)),y:target.y+(overSelection?0:16)-Math.min(...roots.map(s=>s.y))};
 if(overSelection)return{x:0,y:0};
 return{x:24*repeat,y:24*repeat};
}
