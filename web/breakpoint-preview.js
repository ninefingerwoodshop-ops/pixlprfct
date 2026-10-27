import {fixedResize} from './resizing.js';

// Store the baseline on the frame so autosave, reload and undo keep it together
// with the preview width. Never restore unrelated properties from an old snapshot.
const original=root=>Number.isFinite(root?.breakpoint_original?.width)&&root.breakpoint_original.width>0?root.breakpoint_original:undefined;
export function restoredBreakpointShape(root){
 const saved=original(root);if(!saved)return null;
 return {...root,width:saved.width,breakpoint_original:null,
  ...(root.layout_item?{layout_item:{...root.layout_item,fill_width:saved.fill}}:{}),
  ...(root.auto_layout?{auto_layout:{...root.auto_layout,hug_width:saved.hug}}:{}),
  ...(root.control?{control:{...root.control,width_sizing:saved.control}}:{})};
}
export function restoreAllBreakpointWidths(shapes,changeMany){
 const updates=shapes.map(restoredBreakpointShape).filter(Boolean);
 if(updates.length)changeMany(updates);
 return updates.length;
}
export function createBreakpointPreview(change){
 return {
  original,
  preview(root,width){
   if(root.locked||root.width===width)return;
   const saved=original(root)??{width:root.width,fill:root.layout_item?.fill_width,hug:root.auto_layout?.hug_width,control:root.control?.width_sizing};
   change(fixedResize({...root,width,breakpoint_original:saved},true,false));
  },
  restore(root){
   const saved=original(root);if(!saved||root.locked)return;
   change(restoredBreakpointShape(root));
  }
 };
}
