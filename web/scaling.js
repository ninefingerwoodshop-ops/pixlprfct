import {textStyle} from './typography.js';
export function scaleShapes(shapes,origin,factor) {
  if(!Number.isFinite(factor)||factor<=0) throw new Error('Scale must be positive');
  return shapes.map(s=>{
    const scaled={...s,x:origin.x+(s.x-origin.x)*factor,y:origin.y+(s.y-origin.y)*factor,width:s.width*factor,height:s.height*factor};
    if(s.points?.length||s.appearance?.stroke_enabled) scaled.stroke_width=(s.stroke_width??2)*factor;
    if(s.appearance)scaled.appearance={...s.appearance,corner_radius:s.appearance.corner_radius*factor};
    if(s.appearance?.layer_blur!=null)scaled.appearance.layer_blur=s.appearance.layer_blur*factor;
    if(s.appearance?.shadows)scaled.appearance.shadows=s.appearance.shadows.map(shadow=>({...shadow,x:shadow.x*factor,y:shadow.y*factor,blur:shadow.blur*factor,spread:(shadow.spread??0)*factor}));
    if(s.appearance?.corner_radii)scaled.appearance.corner_radii=s.appearance.corner_radii.map(v=>v*factor);
    if(s.appearance?.stroke_dash)scaled.appearance.stroke_dash=s.appearance.stroke_dash.map(v=>v*factor);
    if(s.appearance?.stroke_dash_offset!=null)scaled.appearance.stroke_dash_offset=s.appearance.stroke_dash_offset*factor;
    if(s.auto_layout){scaled.auto_layout={...s.auto_layout};for(const key of ['gap','padding_top','padding_right','padding_bottom','padding_left'])scaled.auto_layout[key]*=factor;}
    if(s.auto_layout?.cross_gap!=null)scaled.auto_layout.cross_gap*=factor;
    if(s.layout_grids)scaled.layout_grids=s.layout_grids.map(g=>({...g,size:g.size*factor,gutter:g.gutter*factor,margin:g.margin*factor}));
    if(s.layout_item){scaled.layout_item={...s.layout_item};for(const key of ['min_width','max_width','min_height','max_height'])if(s.layout_item[key]!=null)scaled.layout_item[key]*=factor;}
    if(s.kind==='text') scaled.typography={...textStyle(s),font_size:textStyle(s).font_size*factor};
    return scaled;
  });
}
