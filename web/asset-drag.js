export const ASSET_MIME = 'application/x-pixlprfct-component';
export function assetDragPayload(token, master) { return JSON.stringify({token,master}); }
export function readAssetDrag(text, token) {
  try {const value=JSON.parse(text);return value.token===token&&Number.isSafeInteger(value.master)&&value.master>0?value.master:0;} catch {return 0;}
}
export function centeredPlacement(shape, point) {return {x:point.x-shape.width/2,y:point.y-shape.height/2};}
