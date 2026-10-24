import {textStyle} from './typography.js';
export function scaleShapes(shapes,origin,factor) {
  if(!Number.isFinite(factor)||factor<=0) throw new Error('Scale must be positive');
  return shapes.map(s=>{
    const scaled={...s,x:origin.x+(s.x-origin.x)*factor,y:origin.y+(s.y-origin.y)*factor,width:s.width*factor,height:s.height*factor};
    if(s.points?.length||s.appearance?.stroke_enabled) scaled.stroke_width=(s.stroke_width??2)*factor;
    if(s.appearance)scaled.appearance={...s.appearance,corner_radius:s.appearance.corner_radius*factor};
    if(s.auto_layout){scaled.auto_layout={...s.auto_layout};for(const key of ['gap','padding_top','padding_right','padding_bottom','padding_left'])scaled.auto_layout[key]*=factor;}
    if(s.kind==='text') scaled.typography={...textStyle(s),font_size:textStyle(s).font_size*factor};
    return scaled;
  });
}
