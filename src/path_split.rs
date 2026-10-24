use crate::Shape;

pub fn split(source: &Shape, index: usize) -> Result<Vec<Shape>, String> {
    let count = source.points.len();
    if count < 2 || index >= count || (!source.closed && (index == 0 || index + 1 == count)) {
        return Err("Select an interior anchor, or any anchor on a closed path".into());
    }
    if source.closed && count >= 4096 {
        return Err("Opening this path would exceed 4096 anchors".into());
    }
    let sections: Vec<Vec<usize>> = if source.closed {
        vec![(0..=count).map(|i| (index + i) % count).collect()]
    } else {
        vec![(0..=index).collect(), (index..count).collect()]
    };
    sections.into_iter().map(|section| {
        let mut shape=source.clone();shape.closed=false;
        if shape.kind!="pencil" { shape.kind="pen".into(); }
        if shape.appearance.is_none() {
            shape.appearance=Some(serde_json::from_value(serde_json::json!({"opacity":1,"corner_radius":0,"fill_enabled":source.closed,"stroke_enabled":true,"stroke_color":source.fill})).map_err(|e|e.to_string())?);
        }
        shape.points=section.iter().map(|i|source.points[*i]).collect();
        shape.handles=if source.handles.is_empty(){vec![]}else{section.iter().map(|i|source.handles[*i]).collect()};
        if !shape.handles.is_empty(){shape.handles[0][0]=shape.points[0];let last=shape.points.len()-1;shape.handles[last][1]=shape.points[last];}
        let all:Vec<[f64;2]>=shape.points.iter().copied().chain(shape.handles.iter().flat_map(|h|h.iter().copied())).collect();
        let min=[all.iter().map(|p|p[0]).fold(f64::INFINITY,f64::min),all.iter().map(|p|p[1]).fold(f64::INFINITY,f64::min)];
        let max=[all.iter().map(|p|p[0]).fold(f64::NEG_INFINITY,f64::max),all.iter().map(|p|p[1]).fold(f64::NEG_INFINITY,f64::max)];
        shape.x=source.x+min[0]*source.width;shape.y=source.y+min[1]*source.height;
        shape.width=((max[0]-min[0])*source.width).max(1.0);shape.height=((max[1]-min[1])*source.height).max(1.0);
        let convert=|p:&mut[f64;2]|{p[0]=(p[0]-min[0])*source.width/shape.width;p[1]=(p[1]-min[1])*source.height/shape.height;};
        for p in &mut shape.points {convert(p);}for h in &mut shape.handles {for p in h {convert(p);}}
        Ok(shape)
    }).collect()
}
