use crate::{constrain_axis, Document, Shape};

// Layout has two acyclic passes: measure hugged frames bottom-up, then allocate
// fill space and place children top-down. Fill disables hugging on the same axis.
pub(crate) fn reflow(doc: &mut Document) {
    let lookup: std::collections::HashMap<u32, usize> = doc
        .shapes
        .iter()
        .enumerate()
        .map(|(i, s)| (s.id, i))
        .collect();
    let mut children = vec![vec![]; doc.shapes.len()];
    let mut roots = vec![];
    for (i, s) in doc.shapes.iter().enumerate() {
        if let Some(&p) = lookup.get(&s.parent_id) {
            children[p].push(i);
        } else {
            roots.push(i);
        }
    }
    fn geometry(
        shapes: &mut [Shape],
        children: &[Vec<usize>],
        i: usize,
        x: f64,
        y: f64,
        w: f64,
        h: f64,
    ) {
        let old = shapes[i].clone();
        shapes[i].x = x;
        shapes[i].y = y;
        shapes[i].width = w;
        shapes[i].height = h;
        for &c in &children[i] {
            let s = &shapes[c];
            let ((cx, cw), (cy, ch)) = if old.auto_layout.is_some() && !s.layout_item.absolute {
                ((s.x + x - old.x, s.width), (s.y + y - old.y, s.height))
            } else {
                (
                    constrain_axis(
                        s.x,
                        s.width,
                        old.x,
                        old.width,
                        x,
                        w,
                        &s.constraints.horizontal,
                    ),
                    constrain_axis(
                        s.y,
                        s.height,
                        old.y,
                        old.height,
                        y,
                        h,
                        &s.constraints.vertical,
                    ),
                )
            };
            geometry(shapes, children, c, cx, cy, cw, ch);
        }
    }
    fn flow(shapes: &[Shape], children: &[Vec<usize>], i: usize) -> Vec<usize> {
        children[i]
            .iter()
            .copied()
            .filter(|&c| !shapes[c].hidden && !shapes[c].layout_item.absolute)
            .collect()
    }
    fn measure(shapes: &mut [Shape], children: &[Vec<usize>], i: usize) {
        for &c in &children[i] {
            measure(shapes, children, c);
        }
        let Some(mut l) = shapes[i].auto_layout.clone() else {
            return;
        };
        let items = flow(shapes, children, i);
        if items.iter().any(|&c| shapes[c].layout_item.fill_width) {
            l.hug_width = false;
        }
        if items.iter().any(|&c| shapes[c].layout_item.fill_height) {
            l.hug_height = false;
        }
        let in_layout = !shapes[i].layout_item.absolute
            && shapes
                .iter()
                .any(|p| p.id == shapes[i].parent_id && p.auto_layout.is_some());
        if in_layout && shapes[i].layout_item.fill_width {
            l.hug_width = false;
        }
        if in_layout && shapes[i].layout_item.fill_height {
            l.hug_height = false;
        }
        let horizontal = l.direction == "horizontal";
        let sum_w: f64 = items.iter().map(|&c| shapes[c].width).sum();
        let sum_h: f64 = items.iter().map(|&c| shapes[c].height).sum();
        let max_w = items.iter().map(|&c| shapes[c].width).fold(0.0, f64::max);
        let max_h = items.iter().map(|&c| shapes[c].height).fold(0.0, f64::max);
        let gaps = l.gap * items.len().saturating_sub(1) as f64;
        let s = &shapes[i];
        let w = if l.hug_width {
            (if horizontal { sum_w + gaps } else { max_w }) + l.padding_left + l.padding_right
        } else {
            s.width.max(l.padding_left + l.padding_right)
        };
        let h = if l.hug_height {
            (if horizontal { max_h } else { sum_h + gaps }) + l.padding_top + l.padding_bottom
        } else {
            s.height.max(l.padding_top + l.padding_bottom)
        };
        let (x, y) = (s.x, s.y);
        shapes[i].auto_layout = Some(l);
        geometry(shapes, children, i, x, y, w.max(1.0), h.max(1.0));
    }
    fn arrange(shapes: &mut [Shape], children: &[Vec<usize>], i: usize) {
        if let Some(l) = shapes[i].auto_layout.clone() {
            let horizontal = l.direction == "horizontal";
            let items = flow(shapes, children, i);
            let parent = shapes[i].clone();
            let available = if horizontal {
                parent.width - l.padding_left - l.padding_right
            } else {
                parent.height - l.padding_top - l.padding_bottom
            };
            let cross = if horizontal {
                parent.height - l.padding_top - l.padding_bottom
            } else {
                parent.width - l.padding_left - l.padding_right
            };
            let fill = |s: &Shape| {
                if horizontal {
                    s.layout_item.fill_width
                } else {
                    s.layout_item.fill_height
                }
            };
            let count = items.iter().filter(|&&c| fill(&shapes[c])).count();
            let fixed: f64 = items
                .iter()
                .filter(|&&c| !fill(&shapes[c]))
                .map(|&c| {
                    if horizontal {
                        shapes[c].width
                    } else {
                        shapes[c].height
                    }
                })
                .sum();
            let filled = ((available - fixed - l.gap * items.len().saturating_sub(1) as f64)
                / count.max(1) as f64)
                .max(1.0);
            let occupied =
                fixed + filled * count as f64 + l.gap * items.len().saturating_sub(1) as f64;
            let spare = (available - occupied).max(0.0);
            let gap = if l.justify == "between" && items.len() > 1 {
                l.gap + spare / (items.len() - 1) as f64
            } else {
                l.gap
            };
            let mut cursor = match l.justify.as_str() {
                "center" => spare / 2.0,
                "end" => spare,
                _ => 0.0,
            };
            for c in items {
                let s = &shapes[c];
                let main = if fill(s) {
                    filled
                } else if horizontal {
                    s.width
                } else {
                    s.height
                };
                let cross_fill = if horizontal {
                    s.layout_item.fill_height
                } else {
                    s.layout_item.fill_width
                };
                let cs = if cross_fill {
                    cross.max(1.0)
                } else if horizontal {
                    s.height
                } else {
                    s.width
                };
                let offset = match l.align.as_str() {
                    "center" => (cross - cs) / 2.0,
                    "end" => cross - cs,
                    _ => 0.0,
                };
                let (x, y, w, h) = if horizontal {
                    (
                        parent.x + l.padding_left + cursor,
                        parent.y + l.padding_top + offset,
                        main,
                        cs,
                    )
                } else {
                    (
                        parent.x + l.padding_left + offset,
                        parent.y + l.padding_top + cursor,
                        cs,
                        main,
                    )
                };
                geometry(shapes, children, c, x, y, w, h);
                cursor += main + gap;
            }
        }
        for &c in &children[i] {
            arrange(shapes, children, c);
        }
    }
    for &root in &roots {
        measure(&mut doc.shapes, &children, root);
    }
    for &root in &roots {
        arrange(&mut doc.shapes, &children, root);
    }
}
