import {exportShapes,exportBounds,svgDocument} from './export.js';
import {fontCss,fontBaseline,textStyle,layoutText} from './typography.js';
import {isSvgAnimation} from './svg-animation-model.js';
import {animatedSvg} from './svg-animation-svg.js';
export function projectPreview(body,context){
 const file=JSON.parse(body);if(isSvgAnimation(file))return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(animatedSvg(file,{animated:false}));
 const page=file.shapes.filter(s=>!file.active_page||s.page_id===file.active_page),shapes=exportShapes(page,[],'page');
 if(!shapes.length)return null;
 const textLayout=shape=>{const style=textStyle(shape);context.font=fontCss(style);return layoutText(shape,text=>context.measureText(text).width,fontBaseline(style,context));};
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgDocument(shapes,exportBounds(shapes),1,null,textLayout));
}
