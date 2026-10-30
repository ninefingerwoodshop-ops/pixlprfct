use crate::{constrain_axis, Document, Shape};

// Automatic spacing replaces the stored numeric gap and never overlaps.
fn automatic(mode: &str) -> bool {
    matches!(mode, "between" | "around" | "evenly")
}
fn main_gap(l: &crate::AutoLayout) -> f64 {
    if automatic(&l.justify) {
        0.0
    } else {
        l.gap
    }
}
fn cross_gap(l: &crate::AutoLayout) -> f64 {
    if automatic(&l.align_content) {
        0.0
    } else {
        l.cross_gap.unwrap_or(l.gap)
    }
}
fn track_bounds(sizes: impl Iterator<Item = f64>, gap: f64) -> (f64, f64) {
    let (mut cursor, mut lo, mut hi) = (0.0_f64, 0.0_f64, 0.0_f64);
    for size in sizes {
        lo = lo.min(cursor);
        hi = hi.max(cursor + size);
        cursor += size + gap;
    }
    (lo, hi)
}
fn distribution(mode: &str, count: usize, spare: f64) -> (f64, f64) {
    if count == 0 {
        return (0.0, 0.0);
    }
    let spare = if automatic(mode) {
        spare.max(0.0)
    } else {
        spare
    };
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

pub(crate) fn border_insets(s: &Shape) -> [f64; 4] {
    if s.auto_layout.as_ref().is_some_and(|l| l.strokes_included)
        && s.appearance
            .as_ref()
            .is_some_and(|a| a.stroke_enabled && a.stroke_alignment == "inside")
    {
        s.border_widths.unwrap_or([s.stroke_width; 4])
    } else {
        [0.0; 4]
    }
}
pub(crate) fn padding(s: &Shape, horizontal: bool) -> f64 {
    s.auto_layout.as_ref().map_or(0.0, |l| {
        (if horizontal {
            l.padding_left + l.padding_right
        } else {
            l.padding_top + l.padding_bottom
        }) + {
            let b = border_insets(s);
            if horizontal {
                b[1] + b[3]
            } else {
                b[0] + b[2]
            }
        }
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
        main_gap(layout),
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
    let (_, _, w, h) = s.visual_bounds();
    if horizontal {
        w
    } else {
        h
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
pub(crate) fn margin(s: &Shape, h: bool) -> f64 {
    let m = s.layout_item.margin;
    if h {
        m[1] + m[3]
    } else {
        m[0] + m[2]
    }
}
fn basis(s: &Shape, h: bool) -> f64 {
    if fill(s, h) {
        limits(s, h).0 + margin(s, h)
    } else {
        bounded(s, h, size(s, h)) + margin(s, h)
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
    let (mut cursor, mut lo, mut hi) = (0.0_f64, 0.0_f64, 0.0_f64);
    for &c in items {
        let n = basis(&shapes[c], h);
        if wrap && !line.is_empty() && hi.max(cursor + n) - lo.min(cursor) > available + 1e-7 {
            result.push(line);
            line = vec![];
            cursor = 0.0;
            lo = 0.0;
            hi = 0.0;
        }
        lo = lo.min(cursor);
        hi = hi.max(cursor + n);
        cursor += n + gap;
        line.push(c);
    }
    if !line.is_empty() {
        result.push(line);
    }
    result
}
fn baseline(s: &Shape, height: f64) -> f64 {
    if s.kind == "text" {
        s.measured_baseline.unwrap_or_else(|| {
            s.typography
                .as_ref()
                .map_or(height * 0.8, |t| t.font_size * 0.8)
        })
    } else {
        height
    }
}
fn cross_size(shapes: &[Shape], line: &[usize], h: bool, align_baseline: bool) -> f64 {
    if h && align_baseline {
        let top = line
            .iter()
            .map(|&c| baseline(&shapes[c], basis(&shapes[c], false)))
            .fold(0.0, f64::max);
        let bottom = line
            .iter()
            .map(|&c| {
                let height = basis(&shapes[c], false);
                height - baseline(&shapes[c], height)
            })
            .fold(0.0, f64::max);
        return top + bottom;
    }
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
        // Constraints inside groups refer to the enclosing frame. Auto-layout
        // still positions a group as one item, and explicit group resize scales it.
        fn constraint_children(
            shapes: &[Shape],
            children: &[Vec<usize>],
            i: usize,
            out: &mut Vec<usize>,
            groups: &mut Vec<usize>,
        ) {
            for &c in &children[i] {
                if shapes[c].kind == "group" {
                    groups.push(c);
                    constraint_children(shapes, children, c, out, groups);
                } else {
                    out.push(c);
                }
            }
        }
        let mut targets = children[i].clone();
        let mut groups = vec![];
        if old.kind != "group" && old.auto_layout.is_none() {
            targets.clear();
            constraint_children(shapes, children, i, &mut targets, &mut groups);
        }
        for &c in &targets {
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
                        if old.kind == "group" {
                            &crate::Constraint::Scale
                        } else {
                            &s.constraints.horizontal
                        },
                    ),
                    constrain_axis(
                        s.y,
                        s.height,
                        old.y,
                        old.height,
                        y,
                        h,
                        if old.kind == "group" {
                            &crate::Constraint::Scale
                        } else {
                            &s.constraints.vertical
                        },
                    ),
                )
            };
            geometry(shapes, children, c, cx, cy, cw, ch);
        }
        for &g in groups.iter().rev() {
            crate::groups::fit(shapes, g, &children[g]);
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
        if shapes[i].kind == "group" {
            crate::groups::fit(shapes, i, &children[i]);
            return;
        }
        let s = &shapes[i];
        let (x, y) = (s.x, s.y);
        let (mut w, mut h) = (bounded(s, true, s.width), bounded(s, false, s.height));
        if let Some(mut l) = s.auto_layout.clone() {
            if l.direction == "grid" {
                let items = flow(shapes, children, i);
                let in_layout = !s.layout_item.absolute
                    && shapes
                        .iter()
                        .any(|p| p.id == s.parent_id && p.auto_layout.is_some());
                if items.iter().any(|&c| fill(&shapes[c], true)) || in_layout && fill(s, true) {
                    l.hug_width = false;
                }
                if items.iter().any(|&c| fill(&shapes[c], false)) || in_layout && fill(s, false) {
                    l.hug_height = false;
                }
                let mut frame = s.clone();
                frame.width = w;
                frame.height = h;
                frame.auto_layout = Some(l.clone());
                let plan = crate::grid::plan(shapes, &frame, &items, l.hug_width, l.hug_height);
                w = bounded(s, true, plan.width);
                h = bounded(s, false, plan.height);
                shapes[i].auto_layout = Some(l);
                geometry(shapes, children, i, x, y, w, h);
                return;
            }
            let horizontal = l.direction == "horizontal";
            let items = flow(shapes, children, i);
            if (l.wrap && horizontal) || (!l.wrap && items.iter().any(|&c| fill(&shapes[c], true)))
            {
                l.hug_width = false;
            }
            if (l.wrap && !horizontal)
                || (!l.wrap && items.iter().any(|&c| fill(&shapes[c], false)))
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
            let rows = lines(shapes, &items, horizontal, l.wrap, available, main_gap(&l));
            let (main_lo, main_hi) = track_bounds(
                items
                    .iter()
                    .map(|&c| size(&shapes[c], horizontal) + margin(&shapes[c], horizontal)),
                main_gap(&l),
            );
            let main = main_hi - main_lo;
            let cross = if l.wrap {
                {
                    let (lo, hi) = track_bounds(
                        rows.iter()
                            .map(|r| cross_size(shapes, r, horizontal, l.text_baseline)),
                        cross_gap(&l),
                    );
                    hi - lo
                }
            } else if horizontal && l.text_baseline {
                cross_size(shapes, &items, horizontal, true)
            } else {
                items
                    .iter()
                    .map(|&c| size(&shapes[c], !horizontal) + margin(&shapes[c], !horizontal))
                    .fold(0.0, f64::max)
            };
            if l.hug_width
                && !items.is_empty()
                && s.control.as_ref().is_none_or(|c| c.kind != "button")
            {
                w = if horizontal { main + pw } else { cross + pw };
            } else {
                w = w.max(pw);
            }
            if l.hug_height
                && !items.is_empty()
                && s.control.as_ref().is_none_or(|c| c.kind != "button")
            {
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
            if l.direction == "grid" {
                let items = flow(shapes, children, i);
                let plan = crate::grid::plan(shapes, &shapes[i], &items, false, false);
                for (&c, p) in items.iter().zip(plan.placements) {
                    let child = &shapes[c];
                    if child.rotation != 0.0 {
                        let (bx, by, _, _) = child.visual_bounds();
                        let (x, y, w, h) = (
                            p.x + child.x - bx,
                            p.y + child.y - by,
                            child.width,
                            child.height,
                        );
                        geometry(shapes, children, c, x, y, w, h);
                    } else {
                        geometry(shapes, children, c, p.x, p.y, p.width, p.height);
                    }
                }
                for &c in &children[i] {
                    arrange(shapes, children, c);
                }
                return;
            }
            let horizontal = l.direction == "horizontal";
            let parent = shapes[i].clone();
            let border = border_insets(&parent);
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
            let rows = lines(shapes, &items, horizontal, l.wrap, available, main_gap(&l));
            let cg = cross_gap(&l);
            let heights: Vec<f64> = rows
                .iter()
                .map(|r| {
                    if l.wrap {
                        cross_size(shapes, r, horizontal, l.text_baseline)
                    } else {
                        cross
                    }
                })
                .collect();
            let (row_lo, row_hi) = track_bounds(heights.iter().copied(), cg);
            let spare = (cross - (row_hi - row_lo)).max(0.0);
            let stretch = if l.wrap && l.align_content == "stretch" {
                // With negative gaps, extending rows can first reduce their
                // combined extent before increasing it. Starting from a fitting
                // extent, find the largest common growth that still fits.
                if cg >= 0.0 {
                    spare / rows.len().max(1) as f64
                } else if row_hi - row_lo <= cross && !rows.is_empty() {
                    let (mut low, mut high) = (0.0, 1e6);
                    for _ in 0..64 {
                        let growth = (low + high) / 2.0;
                        let (lo, hi) = track_bounds(heights.iter().map(|h| h + growth), cg);
                        if hi - lo <= cross {
                            low = growth;
                        } else {
                            high = growth;
                        }
                    }
                    low
                } else {
                    0.0
                }
            } else {
                0.0
            };
            let (mut row_cursor, row_extra) = if l.wrap {
                distribution(&l.align_content, rows.len(), spare)
            } else {
                (0.0, 0.0)
            };
            let (stretched_lo, _) = track_bounds(heights.iter().map(|h| h + stretch), cg);
            row_cursor -= stretched_lo;
            let row_gap = cg + row_extra;
            for (row, line) in rows.iter().enumerate() {
                let row_cross = heights[row] + stretch;
                let row_baseline = line
                    .iter()
                    .map(|&c| {
                        let s = &shapes[c];
                        let height =
                            bounded(s, false, if fill(s, false) { row_cross } else { s.height });
                        baseline(s, height)
                    })
                    .fold(0.0, f64::max);
                let mut sizes: Vec<f64> = line
                    .iter()
                    .map(|&c| basis(&shapes[c], horizontal))
                    .collect();
                let pending: Vec<usize> = (0..line.len())
                    .filter(|&j| fill(&shapes[line[j]], horizontal))
                    .collect();
                let budget = available
                    - main_gap(&l) * line.len().saturating_sub(1) as f64
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
                            ) + margin(&shapes[line[j]], horizontal)
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
                    ) + margin(&shapes[line[j]], horizontal);
                }
                let (lo, hi) = track_bounds(sizes.iter().copied(), main_gap(&l));
                let extra = available - (hi - lo);
                let (mut cursor, gap_extra) = distribution(&l.justify, line.len(), extra);
                cursor -= lo;
                let gap = main_gap(&l) + gap_extra;
                for (j, &c) in line.iter().enumerate() {
                    let s = &shapes[c];
                    let cs = bounded(
                        s,
                        !horizontal,
                        if fill(s, !horizontal) {
                            row_cross - margin(s, !horizontal)
                        } else {
                            size(s, !horizontal)
                        },
                    ) + margin(s, !horizontal);
                    let offset = if horizontal && l.text_baseline {
                        row_baseline - baseline(s, cs)
                    } else {
                        match l.align.as_str() {
                            "center" => (row_cross - cs) / 2.0,
                            "end" => row_cross - cs,
                            _ => 0.0,
                        }
                    };
                    let (x, y, w, h) = if horizontal {
                        (
                            parent.x + border[3] + l.padding_left + cursor,
                            parent.y + border[0] + l.padding_top + row_cursor + offset,
                            sizes[j],
                            cs,
                        )
                    } else {
                        (
                            parent.x + border[3] + l.padding_left + row_cursor + offset,
                            parent.y + border[0] + l.padding_top + cursor,
                            cs,
                            sizes[j],
                        )
                    };
                    let m = shapes[c].layout_item.margin;
                    let (x, y, w, h) = (
                        x + m[3],
                        y + m[0],
                        (w - m[1] - m[3]).max(1.0),
                        (h - m[0] - m[2]).max(1.0),
                    );
                    let child = &shapes[c];
                    if child.rotation != 0.0 {
                        let (bx, by, _, _) = child.visual_bounds();
                        let (origin_x, origin_y, width, height) = (
                            x + child.x - bx,
                            y + child.y - by,
                            child.width,
                            child.height,
                        );
                        geometry(shapes, children, c, origin_x, origin_y, width, height);
                    } else {
                        geometry(shapes, children, c, x, y, w, h);
                    }
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

// Match Add Auto Layout's row/column and regular-grid inference from the current canvas
// geometry. Keep the conversion atomic: the caller commits after fitting.
pub(crate) fn infer(doc: &mut Document, id: u32, single_wrapper: bool) {
    let index = doc.shapes.iter().position(|s| s.id == id).unwrap();
    // A rectangle enclosing text is the visual background of a control, not a
    // layout child. Promote its paint onto the wrapper before inferring flow.
    let children: Vec<_> = doc
        .shapes
        .iter()
        .filter(|s| s.parent_id == id && !s.hidden)
        .cloned()
        .collect();
    if let Some(background) = children
        .iter()
        .find(|s| s.kind == "rectangle" && s.rotation == 0.0 && s.points.is_empty())
    {
        let content: Vec<_> = children.iter().filter(|s| s.id != background.id).collect();
        if !content.is_empty()
            && content.iter().all(|s| {
                s.kind == "text"
                    && s.rotation == 0.0
                    && s.x >= background.x
                    && s.y >= background.y
                    && s.x + s.width <= background.x + background.width + 0.01
                    && s.y + s.height <= background.y + background.height + 0.01
            })
        {
            let (left, top) = (
                content.iter().map(|s| s.x).fold(f64::INFINITY, f64::min),
                content.iter().map(|s| s.y).fold(f64::INFINITY, f64::min),
            );
            let (right, bottom) = (
                content
                    .iter()
                    .map(|s| s.x + s.width)
                    .fold(f64::NEG_INFINITY, f64::max),
                content
                    .iter()
                    .map(|s| s.y + s.height)
                    .fold(f64::NEG_INFINITY, f64::max),
            );
            let background = background.clone();
            let wrapper = &mut doc.shapes[index];
            wrapper.kind = "frame".into();
            wrapper.x = background.x;
            wrapper.y = background.y;
            wrapper.width = background.width;
            wrapper.height = background.height;
            wrapper.fill = background.fill.clone();
            wrapper.stroke_width = background.stroke_width;
            wrapper.border_widths = background.border_widths;
            wrapper.appearance = background.appearance.clone();
            wrapper.aspect_ratio_locked = background.aspect_ratio_locked;
            wrapper
                .variable_bindings
                .extend(background.variable_bindings.clone());
            wrapper
                .variable_modes
                .extend(background.variable_modes.clone());
            doc.shapes.retain(|s| s.id != background.id);
            infer(doc, id, false);
            let wrapper = doc.shapes.iter_mut().find(|s| s.id == id).unwrap();
            let layout = wrapper.auto_layout.as_mut().unwrap();
            layout.padding_left = left - background.x;
            layout.padding_right = (background.x + background.width - right).max(0.0);
            layout.padding_top = top - background.y;
            layout.padding_bottom = (background.y + background.height - bottom).max(0.0);
            layout.hug_width = true;
            layout.hug_height = true;
            if content.len() == 1 {
                layout.gap = 0.0;
            }
            for child in &mut doc.shapes {
                if child.parent_id == id {
                    child.layout_item.fill_width = false;
                    child.layout_item.fill_height = false;
                }
            }
            return;
        }
    }
    let before = doc.shapes[index].clone();
    let mut items: Vec<_> = doc
        .shapes
        .iter()
        .filter(|s| s.parent_id == id && !s.hidden)
        .cloned()
        .collect();
    let originals: std::collections::HashMap<_, _> =
        items.iter().map(|s| (s.id, s.clone())).collect();
    for item in &mut items {
        let (x, y, w, h) = item.visual_bounds();
        item.x = x;
        item.y = y;
        item.width = w;
        item.height = h;
    }
    // Layers completely inside another sibling remain overlays in Figma.
    let overlays: Vec<_> = items
        .iter()
        .filter(|s| {
            items.iter().any(|p| {
                p.id != s.id
                    && p.width * p.height > s.width * s.height
                    && s.x >= p.x
                    && s.y >= p.y
                    && s.x + s.width <= p.x + p.width
                    && s.y + s.height <= p.y + p.height
            })
        })
        .map(|s| s.id)
        .collect();
    items.retain(|s| !overlays.contains(&s.id));
    for child in &mut doc.shapes {
        if overlays.contains(&child.id) {
            child.layout_item.absolute = true;
            child.layout_item.fill_width = false;
            child.layout_item.fill_height = false;
        }
    }
    let mut layout = crate::AutoLayout {
        gap: 10.0,
        padding_left: 10.0,
        padding_right: 10.0,
        padding_top: 10.0,
        padding_bottom: 10.0,
        ..Default::default()
    };
    if !items.is_empty() {
        let x = items.iter().map(|s| s.x).fold(f64::INFINITY, f64::min);
        let y = items.iter().map(|s| s.y).fold(f64::INFINITY, f64::min);
        let right = items
            .iter()
            .map(|s| s.x + s.width)
            .fold(f64::NEG_INFINITY, f64::max);
        let bottom = items
            .iter()
            .map(|s| s.y + s.height)
            .fold(f64::NEG_INFINITY, f64::max);
        let spread = |horizontal: bool| {
            let positions: Vec<_> = items
                .iter()
                .map(|s| {
                    if horizontal {
                        s.x + s.width / 2.0
                    } else {
                        s.y + s.height / 2.0
                    }
                })
                .collect();
            positions.iter().copied().fold(f64::NEG_INFINITY, f64::max)
                - positions.iter().copied().fold(f64::INFINITY, f64::min)
        };
        let horizontal = items.len() > 1 && spread(true) > spread(false);
        layout.direction = if horizontal { "horizontal" } else { "vertical" }.into();
        layout.align = if horizontal
            && items
                .iter()
                .all(|s| (s.height - items[0].height).abs() < 0.01)
        {
            "center"
        } else {
            "start"
        }
        .into();
        let px = if single_wrapper {
            10.0
        } else if before.kind == "group" {
            0.0
        } else {
            (x - before.x).min(before.x + before.width - right).max(0.0)
        };
        let py = if single_wrapper {
            10.0
        } else if before.kind == "group" {
            0.0
        } else {
            (y - before.y)
                .min(before.y + before.height - bottom)
                .max(0.0)
        };
        layout.padding_left = px;
        layout.padding_right = px;
        layout.padding_top = py;
        layout.padding_bottom = py;
        // Figma recognizes aligned rows with unequal sizes and empty cells.
        // Require repeated row/column anchors and non-overlapping tracks so
        // staggered or overlapping artwork remains a one-dimensional layout.
        let coordinates = |horizontal: bool| {
            let mut values: Vec<f64> = items
                .iter()
                .map(|s| if horizontal { s.x } else { s.y })
                .collect();
            values.sort_by(f64::total_cmp);
            values.dedup_by(|a, b| (*a - *b).abs() < 0.01);
            values
        };
        let xs = coordinates(true);
        let ys = coordinates(false);
        // Overlapping, equally sized 2D tiles are packed into explicit grid
        // cells. Prioritize tiles intersecting the most siblings; retain the
        // inferred track height when collision resolution adds rows.
        let intersects = |a: &Shape, b: &Shape| {
            a.id != b.id
                && a.x < b.x + b.width
                && b.x < a.x + a.width
                && a.y < b.y + b.height
                && b.y < a.y + a.height
        };
        let overlap_tiles = items.len() > 2
            && items.len() <= 128
            && xs.len() > 1
            && ys.len() > 1
            && ys[ys.len() - 1] - ys[0] > items[0].height / 2.0
            && items.iter().all(|s| {
                s.rotation == 0.0
                    && (s.width - items[0].width).abs() < 0.01
                    && (s.height - items[0].height).abs() < 0.01
            })
            && items.iter().any(|a| items.iter().any(|b| intersects(a, b)));
        if overlap_tiles {
            let columns = ((right - x) / items[0].width)
                .floor()
                .clamp(1.0, items.len() as f64) as usize;
            let rows = items.len().div_ceil(columns);
            let original_rows = ((bottom - y) / items[0].height).ceil().max(1.0);
            let track_height = (before.height - 2.0 * py) / original_rows;
            let counts: std::collections::HashMap<_, _> = items
                .iter()
                .map(|a| (a.id, items.iter().filter(|b| intersects(a, b)).count()))
                .collect();
            items.sort_by(|a, b| {
                counts[&b.id].cmp(&counts[&a.id]).then_with(|| {
                    if columns == 1 {
                        b.x.total_cmp(&a.x).then(a.y.total_cmp(&b.y))
                    } else {
                        a.y.total_cmp(&b.y).then(a.x.total_cmp(&b.x))
                    }
                })
            });
            layout.direction = "grid".into();
            layout.hug_width = false;
            layout.hug_height = false;
            layout.gap =
                ((xs[xs.len() - 1] - xs[0]) / (xs.len() - 1) as f64 - items[0].width).max(0.0);
            let mut row_starts = vec![ys[0]];
            for &v in &ys[1..] {
                if v >= row_starts.last().unwrap() + items[0].height {
                    row_starts.push(v);
                }
            }
            layout.cross_gap = Some(if row_starts.len() > 1 {
                (row_starts[row_starts.len() - 1] - row_starts[0]) / (row_starts.len() - 1) as f64
                    - items[0].height
            } else {
                0.0
            });
            layout.grid = Some(crate::grid::GridLayout {
                columns: vec![crate::grid::GridTrack::default(); columns],
                rows: vec![crate::grid::GridTrack::default(); rows],
                ..Default::default()
            });
            doc.shapes[index].height = before.height.max(2.0 * py + rows as f64 * track_height);
            let mut occupied = std::collections::HashSet::new();
            for (order, child) in items.iter().enumerate() {
                let target = if columns == 1 {
                    order
                } else {
                    let col = ((child.x - x) / ((before.width - 2.0 * px) / columns as f64))
                        .round_ties_even()
                        .max(0.0) as usize;
                    let row = ((child.y - y) / ((before.height - 2.0 * py) / rows as f64))
                        .round_ties_even()
                        .max(0.0) as usize;
                    row.min(rows - 1) * columns + col.min(columns - 1)
                };
                let cell = (target..rows * columns)
                    .chain(0..target)
                    .find(|c| !occupied.contains(c))
                    .unwrap();
                occupied.insert(cell);
                let node = doc.shapes.iter_mut().find(|s| s.id == child.id).unwrap();
                node.layout_item.fill_width = true;
                node.layout_item.fill_height = true;
                node.layout_item.absolute = false;
                node.layout_item.grid_cell = Some(crate::grid::GridCell {
                    column: Some((cell % columns + 1) as u32),
                    row: Some((cell / columns + 1) as u32),
                    ..Default::default()
                });
            }
            doc.shapes[index].kind = "frame".into();
            doc.shapes[index].auto_layout = Some(layout);
            return;
        }
        let regular_grid = items.iter().all(|s| s.rotation == 0.0)
            && xs.len() > 1
            && ys.len() > 1
            && xs.len() < items.len()
            && ys.len() < items.len()
            && xs.len() * ys.len() <= items.len() * 2
            && items.iter().all(|s| {
                items
                    .iter()
                    .filter(|other| (other.x - s.x).abs() < 0.01 && (other.y - s.y).abs() < 0.01)
                    .count()
                    == 1
                    && xs
                        .iter()
                        .find(|&&x| x > s.x + 0.01)
                        .is_none_or(|x| s.x + s.width <= x + 0.01)
                    && ys
                        .iter()
                        .find(|&&y| y > s.y + 0.01)
                        .is_none_or(|y| s.y + s.height <= y + 0.01)
            });
        if regular_grid {
            layout.direction = "grid".into();
            layout.hug_width = false;
            layout.hug_height = false;
            let mut gaps = Vec::new();
            for y in &ys {
                let mut row: Vec<_> = items.iter().filter(|s| (s.y - y).abs() < 0.01).collect();
                row.sort_by(|a, b| a.x.total_cmp(&b.x));
                gaps.extend(row.windows(2).map(|p| p[1].x - p[0].x - p[0].width));
            }
            layout.gap = if gaps.is_empty() {
                0.0
            } else {
                gaps.iter().sum::<f64>() / gaps.len() as f64
            };
            layout.cross_gap = Some(
                ys.windows(2)
                    .map(|p| {
                        let row_height = items
                            .iter()
                            .filter(|s| (s.y - p[0]).abs() < 0.01)
                            .map(|s| s.height)
                            .fold(f64::INFINITY, f64::min);
                        p[1] - p[0] - row_height
                    })
                    .sum::<f64>()
                    / (ys.len() - 1) as f64,
            );
            layout.grid = Some(crate::grid::GridLayout {
                columns: vec![crate::grid::GridTrack::default(); xs.len()],
                rows: vec![crate::grid::GridTrack::default(); ys.len()],
                ..Default::default()
            });
            for child in &mut doc.shapes {
                if child.parent_id != id || child.hidden {
                    continue;
                }
                child.layout_item.fill_width = true;
                child.layout_item.fill_height = true;
                child.layout_item.absolute = false;
                child.layout_item.grid_cell = Some(crate::grid::GridCell {
                    column: Some(
                        xs.iter().position(|x| (child.x - x).abs() < 0.01).unwrap() as u32 + 1,
                    ),
                    row: Some(
                        ys.iter().position(|y| (child.y - y).abs() < 0.01).unwrap() as u32 + 1,
                    ),
                    ..Default::default()
                });
            }
            doc.shapes[index].kind = "frame".into();
            doc.shapes[index].auto_layout = Some(layout);
            return;
        }
        items.sort_by(|a, b| {
            (if horizontal { a.x } else { a.y }).total_cmp(&(if horizontal { b.x } else { b.y }))
        });
        if items.len() > 1 {
            layout.gap = items
                .windows(2)
                .map(|p| {
                    if horizontal {
                        p[1].x - p[0].x - p[0].width
                    } else {
                        p[1].y - p[0].y - p[0].height
                    }
                })
                .sum::<f64>()
                / (items.len() - 1) as f64;
            layout.gap = layout.gap.max(0.0);
            if items.iter().any(|s| s.rotation != 0.0) {
                layout.gap = layout.gap.round();
            }
        }
        // An intrinsically sized label must not be converted to Fill: doing so
        // changes it to auto-height and creates a Hug/Fill dependency cycle.
        let intrinsic_text = |s: &Shape| {
            s.kind == "text" && s.typography.as_ref().is_some_and(|t| t.sizing == "width")
        };
        layout.hug_width = horizontal || items.iter().all(intrinsic_text);
        if !horizontal {
            doc.shapes[index].width = right - x + 2.0 * px;
            for child in &mut items {
                child.layout_item.fill_width = !intrinsic_text(child)
                    && child.rotation == 0.0
                    && (child.width - (right - x)).abs() < 0.01;
                child.layout_item.fill_height = false;
                child.layout_item.absolute = false;
            }
        } else {
            for child in &mut items {
                child.layout_item.fill_width = false;
                child.layout_item.fill_height = false;
                child.layout_item.absolute = false;
            }
        }
        if single_wrapper {
            doc.shapes[index].x -= px;
            doc.shapes[index].y -= py;
        }
        let slots: Vec<_> = doc
            .shapes
            .iter()
            .enumerate()
            .filter(|(_, s)| s.parent_id == id && !s.hidden && !overlays.contains(&s.id))
            .map(|(i, _)| i)
            .collect();
        for (slot, mut child) in slots.into_iter().zip(items) {
            if child.rotation != 0.0 {
                let original = &originals[&child.id];
                child.x = original.x;
                child.y = original.y;
                child.width = original.width;
                child.height = original.height;
            }
            doc.shapes[slot] = child;
        }
    }
    doc.shapes[index].kind = "frame".into();
    doc.shapes[index].auto_layout = Some(layout);
}
