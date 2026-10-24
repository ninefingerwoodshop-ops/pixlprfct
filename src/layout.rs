use crate::{constrain_axis, Document, Shape};

// Return the leading offset and additional inter-item space. The configured
// gap remains the minimum; distributed space never becomes negative.
fn distribution(mode: &str, count: usize, spare: f64) -> (f64, f64) {
    if count == 0 {
        return (0.0, 0.0);
    }
    let spare = spare.max(0.0);
    match mode {
        "center" => (spare / 2.0, 0.0),
        "end" => (spare, 0.0),
        "between" if count > 1 => (0.0, spare / (count - 1) as f64),
        "around" => (spare / (2 * count) as f64, spare / count as f64),
        "evenly" => {
            let space = spare / (count + 1) as f64;
            (space, space)
        }
        _ => (0.0, 0.0),
    }
}

fn inset(s: &Shape) -> f64 {
    if s.auto_layout.as_ref().is_some_and(|l| l.strokes_included)
        && s.appearance
            .as_ref()
            .is_some_and(|a| a.stroke_enabled && a.stroke_alignment == "inside")
    {
        s.stroke_width
    } else {
        0.0
    }
}
fn padding(s: &Shape, horizontal: bool) -> f64 {
    s.auto_layout.as_ref().map_or(0.0, |l| {
        (if horizontal {
            l.padding_left + l.padding_right
        } else {
            l.padding_top + l.padding_bottom
        }) + 2.0 * inset(s)
    })
}

// Use the existing rows while dragging: removing a child first would move the
// drop targets underneath the pointer and make wrapped reordering unstable.
pub(crate) fn drop_before(
    doc: &Document,
    parent: u32,
    moving: &[u32],
    x: f64,
    y: f64,
) -> Option<u32> {
    let frame = doc.shapes.iter().find(|s| s.id == parent)?;
    let layout = frame.auto_layout.as_ref()?;
    let horizontal = layout.direction == "horizontal";
    let main = if horizontal { x } else { y };
    let cross = if horizontal { y } else { x };
    let items: Vec<_> = doc
        .shapes
        .iter()
        .enumerate()
        .filter(|(_, s)| s.parent_id == parent && !s.hidden && !s.layout_item.absolute)
        .map(|(i, _)| i)
        .collect();
    let available = if horizontal {
        frame.width - padding(frame, true)
    } else {
        frame.height - padding(frame, false)
    };
    let rows = lines(
        &doc.shapes,
        &items,
        horizontal,
        layout.wrap,
        available,
        layout.gap,
    );
    let row = if layout.wrap {
        rows.iter()
            .enumerate()
            .min_by(|(_, a), (_, b)| {
                let distance = |line: &Vec<usize>| {
                    let start = line
                        .iter()
                        .map(|&i| {
                            if horizontal {
                                doc.shapes[i].y
                            } else {
                                doc.shapes[i].x
                            }
                        })
                        .fold(f64::INFINITY, f64::min);
                    let end = line
                        .iter()
                        .map(|&i| {
                            if horizontal {
                                doc.shapes[i].y + doc.shapes[i].height
                            } else {
                                doc.shapes[i].x + doc.shapes[i].width
                            }
                        })
                        .fold(f64::NEG_INFINITY, f64::max);
                    (start - cross).max(cross - end).max(0.0)
                };
                distance(a).total_cmp(&distance(b))
            })
            .map(|(i, _)| i)?
    } else {
        0
    };
    rows.iter()
        .enumerate()
        .skip(row)
        .flat_map(|(r, line)| line.iter().map(move |&i| (r, i)))
        .find_map(|(r, i)| {
            let s = &doc.shapes[i];
            let center = if horizontal {
                s.x + s.width / 2.0
            } else {
                s.y + s.height / 2.0
            };
            (!moving.contains(&s.id) && (r > row || main < center)).then_some(s.id)
        })
}
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
    let floor = padding(s, horizontal).max(1.0);
    if horizontal {
        (
            l.min_width.unwrap_or(1.0).max(floor),
            l.max_width.unwrap_or(1e6).max(floor),
        )
    } else {
        (
            l.min_height.unwrap_or(1.0).max(floor),
            l.max_height.unwrap_or(1e6).max(floor),
        )
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
            let pw = padding(s, true);
            let ph = padding(s, false);
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
            let border = inset(&parent);
            let items = flow(shapes, children, i);
            let available = if horizontal {
                parent.width - padding(&parent, true)
            } else {
                parent.height - padding(&parent, false)
            };
            let cross = if horizontal {
                parent.height - padding(&parent, false)
            } else {
                parent.width - padding(&parent, true)
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
            let (mut row_cursor, row_extra) = if l.wrap {
                distribution(&l.align_content, rows.len(), spare)
            } else {
                (0.0, 0.0)
            };
            let row_gap = cg + row_extra;
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
                        .map(|&j| {
                            bounded(
                                &shapes[line[j]],
                                horizontal,
                                share + padding(&shapes[line[j]], horizontal),
                            )
                        })
                        .sum();
                    if used <= budget {
                        low = share;
                    } else {
                        high = share;
                    }
                }
                for &j in &pending {
                    sizes[j] = bounded(
                        &shapes[line[j]],
                        horizontal,
                        low + padding(&shapes[line[j]], horizontal),
                    );
                }
                let extra = (available
                    - sizes.iter().sum::<f64>()
                    - l.gap * line.len().saturating_sub(1) as f64)
                    .max(0.0);
                let (mut cursor, gap_extra) = distribution(&l.justify, line.len(), extra);
                let gap = l.gap + gap_extra;
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
                            parent.x + border + l.padding_left + cursor,
                            parent.y + border + l.padding_top + row_cursor + offset,
                            sizes[j],
                            cs,
                        )
                    } else {
                        (
                            parent.x + border + l.padding_left + row_cursor + offset,
                            parent.y + border + l.padding_top + cursor,
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
