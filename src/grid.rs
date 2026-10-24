use crate::Shape;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

fn one() -> u32 {
    1
}
fn start() -> String {
    "start".into()
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GridCell {
    #[serde(default)]
    pub column: Option<u32>,
    #[serde(default)]
    pub row: Option<u32>,
    #[serde(default = "one")]
    pub column_span: u32,
    #[serde(default = "one")]
    pub row_span: u32,
    #[serde(default = "start")]
    pub align_x: String,
    #[serde(default = "start")]
    pub align_y: String,
}
impl Default for GridCell {
    fn default() -> Self {
        Self {
            column: None,
            row: None,
            column_span: 1,
            row_span: 1,
            align_x: start(),
            align_y: start(),
        }
    }
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GridTrack {
    pub mode: String,
    pub value: f64,
    #[serde(default)]
    pub min: Option<f64>,
    #[serde(default)]
    pub max: Option<f64>,
}
impl Default for GridTrack {
    fn default() -> Self {
        Self {
            mode: "fr".into(),
            value: 1.0,
            min: None,
            max: None,
        }
    }
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GridLayout {
    pub columns: Vec<GridTrack>,
    #[serde(default)]
    pub rows: Vec<GridTrack>,
    #[serde(default)]
    pub auto_rows: GridTrack,
}
impl Default for GridLayout {
    fn default() -> Self {
        Self {
            columns: vec![GridTrack::default(); 2],
            rows: vec![],
            auto_rows: GridTrack::default(),
        }
    }
}
#[derive(Clone, Debug, Serialize)]
pub(crate) struct Placement {
    pub id: u32,
    pub column: usize,
    pub row: usize,
    pub column_span: usize,
    pub row_span: usize,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}
#[derive(Clone, Debug, Serialize)]
pub(crate) struct Plan {
    pub width: f64,
    pub height: f64,
    pub columns: Vec<f64>,
    pub rows: Vec<f64>,
    pub placements: Vec<Placement>,
}

// Resolve the pointer against the original tracks, before moving children can
// change intrinsic sizes. Gaps belong to the nearest adjacent cell.
pub(crate) fn drop_cell(doc: &crate::Document, parent: u32, x: f64, y: f64) -> Option<(u32, u32)> {
    let frame = doc.shapes.iter().find(|s| s.id == parent)?;
    let l = frame.auto_layout.as_ref()?;
    let items: Vec<_> = doc
        .shapes
        .iter()
        .enumerate()
        .filter(|(_, s)| s.parent_id == parent && !s.hidden && !s.layout_item.absolute)
        .map(|(i, _)| i)
        .collect();
    let p = plan(&doc.shapes, frame, &items, false, false);
    let index = |position: f64, start: f64, sizes: &[f64], gap: f64| {
        let mut edge = start;
        for (i, size) in sizes.iter().enumerate() {
            edge += size;
            if position <= edge + gap / 2.0 {
                return i as u32 + 1;
            }
            edge += gap;
        }
        sizes.len().max(1) as u32
    };
    let inset = crate::layout::inset(frame);
    Some((
        index(x, frame.x + inset + l.padding_left, &p.columns, l.gap),
        index(
            y,
            frame.y + inset + l.padding_top,
            &p.rows,
            l.cross_gap.unwrap_or(l.gap),
        ),
    ))
}

pub(crate) fn validate(shapes: &[Shape]) -> Result<(), String> {
    let mut occupied_budget = 0u64;
    for s in shapes {
        if let Some(c) = &s.layout_item.grid_cell {
            if c.column.is_some_and(|n| n == 0 || n > 128)
                || c.row.is_some_and(|n| n == 0 || n > 10000)
                || !(1..=128).contains(&c.column_span)
                || !(1..=128).contains(&c.row_span)
                || !["start", "center", "end"].contains(&c.align_x.as_str())
                || !["start", "center", "end"].contains(&c.align_y.as_str())
            {
                return Err("Invalid grid cell position, span or alignment".into());
            }
            occupied_budget += u64::from(c.column_span) * u64::from(c.row_span);
        } else {
            occupied_budget += 1;
        }
        if let Some(l) = &s.auto_layout {
            if l.direction == "grid" && (l.gap < 0.0 || l.cross_gap.is_some_and(|v| v < 0.0)) {
                return Err("Grid gaps cannot be negative".into());
            }
            if let Some(g) = &l.grid {
                if g.columns.is_empty() || g.columns.len() > 128 || g.rows.len() > 128 {
                    return Err("Grid requires 1–128 columns and at most 128 explicit rows".into());
                }
                for t in g
                    .columns
                    .iter()
                    .chain(&g.rows)
                    .chain(std::iter::once(&g.auto_rows))
                {
                    if !["fixed", "hug", "fr"].contains(&t.mode.as_str())
                        || !t.value.is_finite()
                        || !(0.0..=1e6).contains(&t.value)
                        || (t.mode == "fr" && t.value < 0.001)
                        || t.min
                            .into_iter()
                            .chain(t.max)
                            .any(|v| !v.is_finite() || !(0.0..=1e6).contains(&v))
                        || t.min.unwrap_or(0.0) > t.max.unwrap_or(1e6)
                    {
                        return Err("Invalid grid track sizing or bounds".into());
                    }
                }
            }
        }
    }
    if occupied_budget > 100000 {
        return Err("Grid spans exceed the document cell budget".into());
    }
    Ok(())
}

fn child_size(s: &Shape, h: bool) -> f64 {
    let l = &s.layout_item;
    let (fill, min, max, size) = if h {
        (l.fill_width, l.min_width, l.max_width, s.width)
    } else {
        (l.fill_height, l.min_height, l.max_height, s.height)
    };
    let floor = crate::layout::padding(s, h).max(1.0);
    let min = min.unwrap_or(1.0).max(floor);
    let max = max.unwrap_or(1e6).max(min);
    if fill {
        min
    } else {
        size.clamp(min, max)
    }
}
fn sized(s: &Shape, h: bool, cell: f64) -> f64 {
    let l = &s.layout_item;
    let fill = if h { l.fill_width } else { l.fill_height };
    if !fill {
        return child_size(s, h);
    }
    let floor = crate::layout::padding(s, h).max(1.0);
    let min = (if h { l.min_width } else { l.min_height })
        .unwrap_or(1.0)
        .max(floor);
    let max = (if h { l.max_width } else { l.max_height })
        .unwrap_or(1e6)
        .max(min);
    cell.clamp(min, max)
}
fn tracks(
    config: &[GridTrack],
    demands: &[(usize, usize, f64)],
    gap: f64,
    available: f64,
    hug: bool,
) -> Vec<f64> {
    let mut sizes: Vec<_> = config
        .iter()
        .map(|t| {
            (if t.mode == "fixed" {
                t.value
            } else {
                t.min.unwrap_or(0.0)
            })
            .clamp(t.min.unwrap_or(0.0), t.max.unwrap_or(1e6))
        })
        .collect();
    let mut sorted = demands.to_vec();
    sorted.sort_by_key(|d| d.1);
    for &(start, span, want) in &sorted {
        let end = (start + span).min(sizes.len());
        let mut deficit = (want
            - sizes[start..end].iter().sum::<f64>()
            - gap * (end - start).saturating_sub(1) as f64)
            .max(0.0);
        for _ in start..end {
            let grow: Vec<_> = (start..end)
                .filter(|&i| {
                    config[i].mode != "fixed" && sizes[i] < config[i].max.unwrap_or(1e6) - 1e-7
                })
                .collect();
            if grow.is_empty() || deficit < 1e-7 {
                break;
            }
            let share = deficit / grow.len() as f64;
            for i in grow {
                let add = share.min(config[i].max.unwrap_or(1e6) - sizes[i]);
                sizes[i] += add;
                deficit -= add;
            }
        }
    }
    let fractions: Vec<_> = (0..config.len())
        .filter(|&i| config[i].mode == "fr")
        .collect();
    if !hug && !fractions.is_empty() {
        let budget = available
            - gap * sizes.len().saturating_sub(1) as f64
            - (0..config.len())
                .filter(|i| !fractions.contains(i))
                .map(|i| sizes[i])
                .sum::<f64>();
        if fractions.iter().map(|&i| sizes[i]).sum::<f64>() < budget {
            let (mut low, mut high) = (
                0.0,
                fractions
                    .iter()
                    .map(|&i| config[i].max.unwrap_or(1e6) / config[i].value)
                    .fold(0.0, f64::max),
            );
            for _ in 0..80 {
                let unit = (low + high) / 2.0;
                let used: f64 = fractions
                    .iter()
                    .map(|&i| {
                        (unit * config[i].value).clamp(sizes[i], config[i].max.unwrap_or(1e6))
                    })
                    .sum();
                if used <= budget {
                    low = unit;
                } else {
                    high = unit;
                }
            }
            for i in fractions {
                sizes[i] = (low * config[i].value).clamp(sizes[i], config[i].max.unwrap_or(1e6));
            }
        }
    }
    sizes
}
fn offsets(sizes: &[f64], gap: f64) -> Vec<f64> {
    let mut at = 0.0;
    sizes
        .iter()
        .map(|v| {
            let p = at;
            at += v + gap;
            p
        })
        .collect()
}
fn extent(sizes: &[f64], gap: f64) -> f64 {
    sizes.iter().sum::<f64>() + gap * sizes.len().saturating_sub(1) as f64
}
fn align(mode: &str, free: f64) -> f64 {
    match mode {
        "center" => free / 2.0,
        "end" => free,
        _ => 0.0,
    }
}

pub(crate) fn shift_track(
    doc: &crate::Document,
    id: u32,
    axis: &str,
    index: usize,
    delta: i32,
) -> Result<(Vec<Shape>, usize), String> {
    if !["columns", "rows"].contains(&axis) || ![-1, 1].contains(&delta) {
        return Err("Choose a grid axis and an adjacent track direction".into());
    }
    let frame = doc
        .shapes
        .iter()
        .find(|s| s.id == id && s.page_id == doc.active_page)
        .ok_or("Grid frame not found")?;
    let _layout = frame
        .auto_layout
        .as_ref()
        .filter(|l| l.direction == "grid")
        .ok_or("Select a grid auto-layout frame")?;
    let items: Vec<_> = doc
        .shapes
        .iter()
        .enumerate()
        .filter(|(_, s)| s.parent_id == id && !s.hidden && !s.layout_item.absolute)
        .map(|(i, _)| i)
        .collect();
    let p = plan(&doc.shapes, frame, &items, false, false);
    let columns = axis == "columns";
    let n = if columns {
        p.columns.len()
    } else {
        p.rows.len()
    };
    if index >= n || n > 128 {
        return Err("Track reordering supports up to 128 tracks per axis".into());
    }
    // Every spanned interval joins adjacent tracks. Taking connected components
    // also handles overlapping spans transitively, including the destination.
    let mut joined = vec![false; n.saturating_sub(1)];
    let mut connect = |start: usize, span: usize| {
        for i in start
            ..start
                .saturating_add(span)
                .saturating_sub(1)
                .min(n.saturating_sub(1))
        {
            joined[i] = true;
        }
    };
    for c in &p.placements {
        connect(
            if columns { c.column - 1 } else { c.row - 1 },
            if columns { c.column_span } else { c.row_span },
        );
    }
    for s in doc
        .shapes
        .iter()
        .filter(|s| s.parent_id == id && s.hidden && !s.layout_item.absolute)
    {
        if let Some(c) = &s.layout_item.grid_cell {
            if let Some(start) = if columns { c.column } else { c.row } {
                connect(
                    start as usize - 1,
                    if columns { c.column_span } else { c.row_span } as usize,
                );
            }
        }
    }
    let mut groups: Vec<Vec<usize>> = vec![vec![]];
    for i in 0..n {
        groups.last_mut().unwrap().push(i);
        if i + 1 < n && !joined[i] {
            groups.push(vec![]);
        }
    }
    let from = groups.iter().position(|g| g.contains(&index)).unwrap();
    let to = (from as i64 + delta as i64).clamp(0, groups.len() as i64 - 1) as usize;
    if from == to {
        return Ok((vec![], index));
    }
    groups.swap(from, to);
    let order: Vec<_> = groups.into_iter().flatten().collect();
    let mut mapping = vec![0; n];
    for (new, old) in order.iter().enumerate() {
        mapping[*old] = new;
    }
    let mut changed = frame.clone();
    let g = changed
        .auto_layout
        .as_mut()
        .unwrap()
        .grid
        .get_or_insert_with(Default::default);
    let tracks: Vec<_> = if columns {
        g.columns.clone()
    } else {
        (0..n)
            .map(|i| {
                g.rows
                    .get(i)
                    .cloned()
                    .unwrap_or_else(|| g.auto_rows.clone())
            })
            .collect()
    };
    let reordered = order.iter().map(|i| tracks[*i].clone()).collect();
    if columns {
        g.columns = reordered;
    } else {
        g.rows = reordered;
    }
    let mut changes = vec![changed];
    for s in doc
        .shapes
        .iter()
        .filter(|s| s.parent_id == id && !s.layout_item.absolute)
    {
        let mut changed = s.clone();
        if let Some(p) = p.placements.iter().find(|p| p.id == s.id) {
            let c = changed
                .layout_item
                .grid_cell
                .get_or_insert_with(Default::default);
            c.column = Some(if columns {
                mapping[p.column - 1] + 1
            } else {
                p.column
            } as u32);
            c.row = Some(if columns {
                p.row
            } else {
                mapping[p.row - 1] + 1
            } as u32);
        } else if let Some(c) = &mut changed.layout_item.grid_cell {
            let position = if columns { &mut c.column } else { &mut c.row };
            if let Some(old) = *position {
                if let Some(new) = mapping.get(old as usize - 1) {
                    *position = Some(*new as u32 + 1);
                }
            }
        }
        if changed != *s {
            changes.push(changed);
        }
    }
    Ok((changes, mapping[index]))
}

pub(crate) fn plan(
    shapes: &[Shape],
    frame: &Shape,
    items: &[usize],
    hug_width: bool,
    hug_height: bool,
) -> Plan {
    let l = frame.auto_layout.as_ref().unwrap();
    let g = l.grid.clone().unwrap_or_default();
    let nc = g.columns.len();
    let mut cells: Vec<Option<(usize, usize, usize, usize)>> = vec![None; items.len()];
    let mut used = HashSet::new();
    let mut cursor = 0usize;
    // Reserve explicitly positioned children before placing automatic children.
    for explicit in [true, false] {
        for (j, &i) in items.iter().enumerate() {
            let c = shapes[i].layout_item.grid_cell.clone().unwrap_or_default();
            if (c.column.is_some() || c.row.is_some()) != explicit {
                continue;
            }
            let cs = (c.column_span as usize).min(nc);
            let rs = c.row_span as usize;
            let fixed_col = c.column.map(|v| (v as usize - 1).min(nc - cs));
            let mut pos =
                c.row
                    .map(|v| (v as usize - 1) * nc)
                    .unwrap_or(if explicit { 0 } else { cursor })
                    + fixed_col.unwrap_or(0);
            loop {
                let row = pos / nc;
                let col = fixed_col.unwrap_or(pos % nc);
                if col + cs <= nc
                    && (row..row + rs).all(|r| (col..col + cs).all(|c| !used.contains(&(r, c))))
                {
                    for r in row..row + rs {
                        for c in col..col + cs {
                            used.insert((r, c));
                        }
                    }
                    cells[j] = Some((col, row, cs, rs));
                    if !explicit {
                        cursor = row * nc + col + cs;
                    }
                    break;
                }
                pos = if fixed_col.is_some() {
                    (row + 1) * nc + fixed_col.unwrap()
                } else {
                    pos + 1
                };
            }
        }
    }
    let nr = cells
        .iter()
        .flatten()
        .map(|c| c.1 + c.3)
        .max()
        .unwrap_or(0)
        .max(g.rows.len());
    let row_config: Vec<_> = (0..nr)
        .map(|i| {
            g.rows
                .get(i)
                .cloned()
                .unwrap_or_else(|| g.auto_rows.clone())
        })
        .collect();
    let gx = l.gap;
    let gy = l.cross_gap.unwrap_or(l.gap);
    let pw = crate::layout::padding(frame, true);
    let ph = crate::layout::padding(frame, false);
    let xd: Vec<_> = items
        .iter()
        .enumerate()
        .map(|(j, &i)| {
            let c = cells[j].unwrap();
            (c.0, c.2, child_size(&shapes[i], true))
        })
        .collect();
    let yd: Vec<_> = items
        .iter()
        .enumerate()
        .map(|(j, &i)| {
            let c = cells[j].unwrap();
            (c.1, c.3, child_size(&shapes[i], false))
        })
        .collect();
    let columns = tracks(&g.columns, &xd, gx, (frame.width - pw).max(0.0), hug_width);
    let rows = tracks(
        &row_config,
        &yd,
        gy,
        (frame.height - ph).max(0.0),
        hug_height,
    );
    let width = if hug_width {
        extent(&columns, gx) + pw
    } else {
        frame.width.max(pw)
    };
    let height = if hug_height {
        extent(&rows, gy) + ph
    } else {
        frame.height.max(ph)
    };
    let xs = offsets(&columns, gx);
    let ys = offsets(&rows, gy);
    let border = crate::layout::inset(frame);
    let mut placements = vec![];
    for (j, &i) in items.iter().enumerate() {
        let s = &shapes[i];
        let c = cells[j].unwrap();
        let style = s.layout_item.grid_cell.clone().unwrap_or_default();
        let cw = extent(&columns[c.0..c.0 + c.2], gx);
        let ch = extent(&rows[c.1..c.1 + c.3], gy);
        let w = sized(s, true, cw);
        let h = sized(s, false, ch);
        placements.push(Placement {
            id: s.id,
            column: c.0 + 1,
            row: c.1 + 1,
            column_span: c.2,
            row_span: c.3,
            x: frame.x + border + l.padding_left + xs[c.0] + align(&style.align_x, cw - w),
            y: frame.y + border + l.padding_top + ys[c.1] + align(&style.align_y, ch - h),
            width: w,
            height: h,
        });
    }
    Plan {
        width,
        height,
        columns,
        rows,
        placements,
    }
}
