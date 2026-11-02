import {icon} from './icons.js';

export const panelGlyphs={layers:'layers',elements:'layers',assets:'component',inspector:'settings-sliders',pen:'pen',tools:'tools',timeline:'mode-motion'};
export const panelIcon=key=>icon(panelGlyphs[key]??'panel-left');
export const panelSide=(key,node)=>node?.dataset.panelSide??(key==='inspector'?'right':['tools','timeline','pen'].includes(key)?'bottom':'left');
export const dockGlyph=side=>side==='right'?'panel-right':side==='bottom'?'panel-bottom':'panel-left';
