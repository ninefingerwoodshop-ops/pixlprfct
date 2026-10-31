import {appearance} from './appearance.js';
import {svgDocument} from './export.js';
import {resolvePatternPaints} from './paint-textures.js';
import {resolveVariableValue} from './variable-manager.js';
const cache=new Map();

// Use the artwork renderer so thumbnails retain gradient geometry, paint order,
// opacity, blend modes and image/pattern/shader sources.
export function paintPreview(style,doc={},width=100,height=100,textLayout){
 const paints=(style.paints??[]).filter(p=>p.visible!==false).map(p=>({...p,visible:true,opacity:p.opacity??1,color:style.color_variables?.[p.id]?resolveVariableValue(doc.variables,style.color_variables[p.id]):p.color}));
 if(!paints.length)return 'transparent';
 if(paints.length===1&&!paints[0].gradient&&!paints[0].media&&!paints[0].pattern&&!paints[0].shader&&(!paints[0].blend_mode||paints[0].blend_mode==='normal'))return paints[0].color+Math.round(paints[0].opacity*255).toString(16).padStart(2,'0');
 const dependencies=paints.some(p=>p.pattern)?doc.shapes??[]:[],key=JSON.stringify([paints,width,height,dependencies]);
 const cacheable=key.length<32768&&!dependencies.some(s=>s.kind==='text');if(cacheable&&cache.has(key))return cache.get(key);
 const shape={id:4294967294,kind:'rectangle',x:0,y:0,width,height,parent_id:0,rotation:0,fill:'#000000',appearance:{...appearance({}),fills:paints,strokes:[]}};
 const render=(shapes,box)=>svgDocument(shapes,box,1,null,textLayout);
 const resolved=resolvePatternPaints([...dependencies,shape],render).at(-1),svg=render([resolved],{x:0,y:0,width,height});
 const background='center / 100% 100% no-repeat url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
 if(cacheable&&background.length<131072)cache.set(key,background);while(cache.size>64)cache.delete(cache.keys().next().value);return background;
}
