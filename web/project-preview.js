import {exportShapes,exportBounds,svgDocument} from './export.js';
import {fontCss,textStyle,layoutText} from './typography.js';
export function projectPreview(body,context){
 const file=JSON.parse(body),page=file.shapes.filter(s=>!file.active_page||s.page_id===file.active_page),shapes=exportShapes(page,[],'page');
 if(!shapes.length)return null;
 const textLayout=shape=>{context.font=fontCss(textStyle(shape));return layoutText(shape,text=>context.measureText(text).width);};
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgDocument(shapes,exportBounds(shapes),1,null,textLayout));
}
