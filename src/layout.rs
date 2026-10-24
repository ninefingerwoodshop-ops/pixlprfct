use crate::{constrain_axis, Document, Shape};
fn size(s: &Shape, horizontal: bool) -> f64 {
    if horizontal {
        s.width
    } else {
        s.height
    }
}
fn fill(s: &Shape, horizontal: bool) -> bool {
    if horizontal {
        s.layout_item.fill_width
    } else {
        s.layout_item.fill_height
    }
}
fn limits(s: &Shape, horizontal: bool) -> (f64, f64) {
    let l = &s.layout_item;
    if horizontal {
        (l.min_width.unwrap_or(1.0), l.max_width.unwrap_or(1e6))
    } else {
        (l.min_height.unwrap_or(1.0), l.max_height.unwrap_or(1e6))
    }
}
fn bounded(s: &Shape, horizontal: bool, value: f64) -> f64 {
    let (min, max) = limits(s, horizontal);
    value.clamp(min, max)
}
fn basis(s: &Shape, h: bool) -> f64 {
    if fill(s, h) {
        limits(s, h).0
    } else {
        bounded(s, h, size(s, h))
    }
}
fn lines(
    shapes: &[Shape],
    items: &[usize],
    h: bool,
    wrap: bool,
    available: f64,
    gap: f64,
) -> Vec<Vec<usize>> {
    let mut result = vec![];
    let mut line = vec![];
    let mut used = 0.0;
    for &c in items {
        let n = basis(&shapes[c], h);
        if wrap && !line.is_empty() && used + gap + n > available + 1e-7 {
            result.push(line);
            line = vec![];
            used = 0.0;
        }
        if !line.is_empty() {
            used += gap;
        }
        used += n;
        line.push(c);
    }
    if !line.is_empty() {
        result.push(line);
    }
    result
}
fn cross_size(shapes: &[Shape], line: &[usize], h: bool) -> f64 {
    line.iter()
        .map(|&c| basis(&shapes[c], !h))
        .fold(0.0, f64::max)
}
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
        let s = &shapes[i];
        let (x, y) = (s.x, s.y);
        let (mut w, mut h) = (bounded(s, true, s.width), bounded(s, false, s.height));
        if let Some(mut l) = s.auto_layout.clone() {
            let horizontal = l.direction == "horizontal";
            let items = flow(shapes, children, i);
            if (l.wrap && horizontal)
                || items.iter().any(|&c| fill(&shapes[c], true)) && (!l.wrap || horizontal)
            {
                l.hug_width = false;
            }
            if (l.wrap && !horizontal)
                || items.iter().any(|&c| fill(&shapes[c], false)) && (!l.wrap || !horizontal)
            {
                l.hug_height = false;
            }
            let in_layout = !s.layout_item.absolute
                && shapes
                    .iter()
                    .any(|p| p.id == s.parent_id && p.auto_layout.is_some());
            if in_layout && fill(s, true) {
                l.hug_width = false;
            }
            if in_layout && fill(s, false) {
                l.hug_height = false;
            }
            let pw = l.padding_left + l.padding_right;
            let ph = l.padding_top + l.padding_bottom;
            let available = if horizontal { w - pw } else { h - ph };
            let rows = lines(shapes, &items, horizontal, l.wrap, available, l.gap);
            let main = items
                .iter()
                .map(|&c| size(&shapes[c], horizontal))
                .sum::<f64>()
                + l.gap * items.len().saturating_sub(1) as f64;
            let cross = if l.wrap {
                rows.iter()
                    .map(|r| cross_size(shapes, r, horizontal))
                    .sum::<f64>()
                    + l.cross_gap.unwrap_or(l.gap) * rows.len().saturating_sub(1) as f64
            } else {
                items
                    .iter()
                    .map(|&c| size(&shapes[c], !horizontal))
                    .fold(0.0, f64::max)
            };
            if l.hug_width {
                w = if horizontal { main + pw } else { cross + pw };
            } else {
                w = w.max(pw);
            }
            if l.hug_height {
                h = if horizontal { cross + ph } else { main + ph };
            } else {
                h = h.max(ph);
            }
            shapes[i].auto_layout = Some(l);
        }
        w = bounded(&shapes[i], true, w);
        h = bounded(&shapes[i], false, h);
        geometry(shapes, children, i, x, y, w, h);
    }
    fn arrange(shapes: &mut [Shape], children: &[Vec<usize>], i: usize) {
        if let Some(l) = shapes[i].auto_layout.clone() {
            let horizontal = l.direction == "horizontal";
            let parent = shapes[i].clone();
            let items = flow(shapes, children, i);
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
            let rows = lines(shapes, &items, horizontal, l.wrap, available, l.gap);
            let cg = l.cross_gap.unwrap_or(l.gap);
            let heights: Vec<f64> = rows
                .iter()
                .map(|r| {
                    if l.wrap {
                        cross_size(shapes, r, horizontal)
                    } else {
                        cross
                    }
                })
                .collect();
            let spare =
                (cross - heights.iter().sum::<f64>() - cg * rows.len().saturating_sub(1) as f64)
                    .max(0.0);
            let stretch = if l.wrap && l.align_content == "stretch" {
                spare / rows.len().max(1) as f64
            } else {
                0.0
            };
            let row_gap = cg
                + if l.wrap && l.align_content == "between" && rows.len() > 1 {
                    spare / (rows.len() - 1) as f64
                } else {
                    0.0
                };
            let mut row_cursor = if l.wrap {
                match l.align_content.as_str() {
                    "center" => spare / 2.0,
                    "end" => spare,
                    _ => 0.0,
                }
            } else {
                0.0
            };
            for (row, line) in rows.iter().enumerate() {
                let row_cross = heights[row] + stretch;
                let mut sizes: Vec<f64> = line
                    .iter()
                    .map(|&c| basis(&shapes[c], horizontal))
                    .collect();
                let pending: Vec<usize> = (0..line.len())
                    .filter(|&j| fill(&shapes[line[j]], horizontal))
                    .collect();
                let budget = available
                    - l.gap * line.len().saturating_sub(1) as f64
                    - line
                        .iter()
                        .enumerate()
                        .filter(|(_, &c)| !fill(&shapes[c], horizontal))
                        .map(|(j, _)| sizes[j])
                        .sum::<f64>();
                // Solve the common fill size with independent minimum/maximum bounds.
                let (mut low, mut high) = (0.0, 1e6);
                for _ in 0..64 {
                    let share = (low + high) / 2.0;
                    let used: f64 = pending
                        .iter()
                        .map(|&j| bounded(&shapes[line[j]], horizontal, share))
                        .sum();
                    if used <= budget {
                        low = share;
                    } else {
                        high = share;
                    }
                }
                for &j in &pending {
                    sizes[j] = bounded(&shapes[line[j]], horizontal, low);
                }
                let extra = (available
                    - sizes.iter().sum::<f64>()
                    - l.gap * line.len().saturating_sub(1) as f64)
                    .max(0.0);
                let gap = l.gap
                    + if l.justify == "between" && line.len() > 1 {
                        extra / (line.len() - 1) as f64
                    } else {
                        0.0
                    };
                let mut cursor = match l.justify.as_str() {
                    "center" => extra / 2.0,
                    "end" => extra,
                    _ => 0.0,
                };
                for (j, &c) in line.iter().enumerate() {
                    let s = &shapes[c];
                    let cs = bounded(
                        s,
                        !horizontal,
                        if fill(s, !horizontal) {
                            row_cross
                        } else {
                            size(s, !horizontal)
                        },
                    );
                    let offset = match l.align.as_str() {
                        "center" => (row_cross - cs) / 2.0,
                        "end" => row_cross - cs,
                        _ => 0.0,
                    };
                    let (x, y, w, h) = if horizontal {
                        (
                            parent.x + l.padding_left + cursor,
                            parent.y + l.padding_top + row_cursor + offset,
                            sizes[j],
                            cs,
                        )
                    } else {
                        (
                            parent.x + l.padding_left + row_cursor + offset,
                            parent.y + l.padding_top + cursor,
                            cs,
                            sizes[j],
                        )
                    };
                    geometry(shapes, children, c, x, y, w, h);
                    cursor += sizes[j] + gap;
                }
                row_cursor += row_cross + row_gap;
            }
        }
        for &c in &children[i] {
            arrange(shapes, children, c);
        }
    }
    for _ in 0..128 {
        let before: Vec<_> = doc
            .shapes
            .iter()
            .map(|s| (s.x, s.y, s.width, s.height))
            .collect();
        for &r in &roots {
            measure(&mut doc.shapes, &children, r);
        }
        for &r in &roots {
            arrange(&mut doc.shapes, &children, r);
        }
        if doc
            .shapes
            .iter()
            .zip(before)
            .all(|(s, b)| (s.x, s.y, s.width, s.height) == b)
        {
            break;
        }
    }
}
