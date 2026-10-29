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
    #[serde(default)]
    pub area: String,
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
            area: String::new(),
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
    #[serde(default)]
    pub min_unit: String,
    #[serde(default)]
    pub max_unit: String,
}
impl Default for GridTrack {
    fn default() -> Self {
        Self {
            mode: "fr".into(),
            value: 1.0,
            min: None,
            max: None,
            min_unit: String::new(),
            max_unit: String::new(),
        }
    }
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GridArea {
    pub name: String,
    pub column: u32,
    pub row: u32,
    pub column_span: u32,
    pub row_span: u32,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct GridOptions {
    pub cell_containers: bool,
    pub masonry: bool,
    pub auto_columns: GridTrack,
    pub auto_column_pattern: Vec<GridTrack>,
    pub auto_row_pattern: Vec<GridTrack>,
    pub auto_flow: String,
    pub dense: bool,
    pub justify_items: String,
    pub align_items: String,
    pub justify_content: String,
    pub align_content: String,
    pub column_gap_unit: String,
    pub row_gap_unit: String,
    pub areas: Vec<GridArea>,
}
impl Default for GridOptions {
    fn default() -> Self {
        Self {
            cell_containers: false,
            masonry: false,
            auto_columns: GridTrack::default(),
            auto_column_pattern: vec![],
            auto_row_pattern: vec![],
            auto_flow: "row".into(),
            dense: false,
            justify_items: start(),
            align_items: start(),
            justify_content: start(),
            align_content: start(),
            column_gap_unit: "px".into(),
            row_gap_unit: "px".into(),
            areas: vec![],
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
    #[serde(flatten)]
    pub options: GridOptions,
}
impl Default for GridLayout {
    fn default() -> Self {
        Self {
            columns: vec![GridTrack::default(); 2],
            rows: vec![],
            auto_rows: GridTrack::default(),
            options: GridOptions::default(),
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
    pub column_gap: f64,
    pub row_gap: f64,
    pub offset_x: f64,
    pub offset_y: f64,
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
    let inset = crate::layout::border_insets(frame);
    Some((
        index(
            x,
            frame.x + inset[3] + l.padding_left + p.offset_x,
            &p.columns,
            p.column_gap,
        ),
        index(
            y,
            frame.y + inset[0] + l.padding_top + p.offset_y,
            &p.rows,
            p.row_gap,
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
                || !["start", "center", "end", "stretch", "auto"].contains(&c.align_x.as_str())
                || !["start", "center", "end", "stretch", "auto"].contains(&c.align_y.as_str())
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
                let o = &g.options;
                if !["row", "column"].contains(&o.auto_flow.as_str())
                    || !["px", "%", "em"].contains(&o.column_gap_unit.as_str())
                    || !["px", "%", "em"].contains(&o.row_gap_unit.as_str())
                    || o.auto_column_pattern.len() > 128
                    || o.auto_row_pattern.len() > 128
                {
                    return Err("Invalid grid flow, gap units, or implicit tracks".into());
                }
                for a in [&o.justify_items, &o.align_items] {
                    if !["start", "center", "end", "stretch"].contains(&a.as_str()) {
                        return Err("Invalid grid item alignment".into());
                    }
                }
                for a in [&o.justify_content, &o.align_content] {
                    if ![
                        "start", "center", "end", "stretch", "between", "around", "evenly",
                    ]
                    .contains(&a.as_str())
                    {
                        return Err("Invalid grid content alignment".into());
                    }
                }
                let mut names = HashSet::new();
                let mut area_cells = HashSet::new();
                for a in &o.areas {
                    if a.name.is_empty()
                        || !a.name.chars().next().unwrap().is_ascii_alphabetic()
                        || !a
                            .name
                            .chars()
                            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
                        || !names.insert(&a.name)
                        || a.column == 0
                        || a.row == 0
                        || a.column_span == 0
                        || a.row_span == 0
                        || a.column + a.column_span - 1 > g.columns.len() as u32
                        || a.row + a.row_span - 1 > 128
                    {
                        return Err("Areas need unique CSS names and valid grid bounds".into());
                    }
                    for r in a.row..a.row + a.row_span {
                        for c in a.column..a.column + a.column_span {
                            if !area_cells.insert((r, c)) {
                                return Err("Named grid areas cannot overlap".into());
                            }
                        }
                    }
                }
                for t in g
                    .columns
                    .iter()
                    .chain(&g.rows)
                    .chain(std::iter::once(&g.auto_rows))
                    .chain(std::iter::once(&o.auto_columns))
                    .chain(&o.auto_column_pattern)
                    .chain(&o.auto_row_pattern)
                {
                    if ![
                        "fixed",
                        "hug",
                        "fr",
                        "percent",
                        "em",
                        "auto",
                        "min-content",
                        "max-content",
                        "minmax",
                    ]
                    .contains(&t.mode.as_str())
                        || !t.value.is_finite()
                        || !(0.0..=1e6).contains(&t.value)
                        || (t.mode == "fr" && t.value < 0.001)
                        || t.min
                            .into_iter()
                            .chain(t.max)
                            .any(|v| !v.is_finite() || !(0.0..=1e6).contains(&v))
                        || (t.mode != "minmax" && t.min.unwrap_or(0.0) > t.max.unwrap_or(1e6))
                        || (t.mode == "minmax"
                            && (!["", "px", "%", "em", "min-content", "max-content", "auto"]
                                .contains(&t.min_unit.as_str())
                                || ![
                                    "",
                                    "px",
                                    "%",
                                    "em",
                                    "fr",
                                    "min-content",
                                    "max-content",
                                    "auto",
                                ]
                                .contains(&t.max_unit.as_str())))
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
    let (_, _, visual_width, visual_height) = s.visual_bounds();
    let (fill, min, max, size) = if h {
        (l.fill_width, l.min_width, l.max_width, visual_width)
    } else {
        (l.fill_height, l.min_height, l.max_height, visual_height)
    };
    let floor = crate::layout::padding(s, h).max(1.0);
    let min = min.unwrap_or(1.0).max(floor);
    let max = max.unwrap_or(1e6).max(min);
    if fill {
        min + crate::layout::margin(s, h)
    } else {
        size.clamp(min, max) + crate::layout::margin(s, h)
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
    (cell - crate::layout::margin(s, h)).clamp(min, max) + crate::layout::margin(s, h)
}
fn unit(value: f64, unit: &str, available: f64, font: f64) -> f64 {
    match unit {
        "%" => available * value / 100.0,
        "em" => font * value,
        _ => value,
    }
}
fn resolved(t: &GridTrack, available: f64, font: f64) -> GridTrack {
    let mut r = t.clone();
    match t.mode.as_str() {
        "percent" | "em" => {
            r.mode = "fixed".into();
            r.value = unit(
                t.value,
                if t.mode == "percent" { "%" } else { "em" },
                available,
                font,
            );
        }
        "auto" | "min-content" | "max-content" => r.mode = "hug".into(),
        "minmax" => {
            let maxunit = if t.max_unit.is_empty() {
                "fr"
            } else {
                &t.max_unit
            };
            r.min = Some(unit(t.min.unwrap_or(0.0), &t.min_unit, available, font));
            r.max = None;
            if maxunit == "fr" {
                r.mode = "fr".into();
                r.value = t.value.max(0.001);
            } else if ["auto", "min-content", "max-content"].contains(&maxunit) {
                r.mode = "hug".into();
            } else {
                r.mode = "minmax".into();
                r.max = Some(unit(t.value, maxunit, available, font).max(r.min.unwrap_or(0.0)));
            }
        }
        _ => {}
    }
    r
}
fn distribution(
    mode: &str,
    sizes: &mut [f64],
    config: &[GridTrack],
    available: f64,
    gap: f64,
) -> (f64, f64) {
    let free = (available - extent(sizes, gap)).max(0.0);
    let n = sizes.len();
    match mode {
        "center" => (free / 2.0, gap),
        "end" => (free, gap),
        "between" if n > 1 => (0.0, gap + free / (n - 1) as f64),
        "around" if n > 0 => (free / (n * 2) as f64, gap + free / n as f64),
        "evenly" if n > 0 => (free / (n + 1) as f64, gap + free / (n + 1) as f64),
        "stretch" => {
            let ids: Vec<_> = config
                .iter()
                .enumerate()
                .filter(|(_, t)| t.mode == "auto")
                .map(|(i, _)| i)
                .collect();
            if !ids.is_empty() {
                let extra = free / ids.len() as f64;
                for i in ids {
                    sizes[i] += extra;
                }
            }
            (0.0, gap)
        }
        _ => (0.0, gap),
    }
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
                    config[i].mode != "fixed"
                        && (config[i].mode != "minmax"
                            || ["auto", "min-content", "max-content"]
                                .contains(&config[i].min_unit.as_str()))
                        && sizes[i] < config[i].max.unwrap_or(1e6) - 1e-7
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
    // Finite minmax tracks use available space up to their growth limits,
    // before fractional tracks receive the remainder (CSS Grid §11.6).
    // A hugging container is measured under a max-content constraint.
    let mut free = if hug {
        f64::INFINITY
    } else {
        (available - extent(&sizes, gap)).max(0.0)
    };
    for _ in 0..config.len() {
        let grow: Vec<_> = (0..config.len())
            .filter(|&i| {
                config[i].mode == "minmax" && sizes[i] < config[i].max.unwrap_or(1e6) - 1e-7
            })
            .collect();
        if grow.is_empty() || free < 1e-7 {
            break;
        }
        let share = free / grow.len() as f64;
        for i in grow {
            let add = share.min(config[i].max.unwrap_or(1e6) - sizes[i]);
            sizes[i] += add;
            free -= add;
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
        let end = start
            .saturating_add(span)
            .saturating_sub(1)
            .min(n.saturating_sub(1));
        for item in joined.iter_mut().take(end).skip(start) {
            *item = true;
        }
    };
    if let Some(g) = frame.auto_layout.as_ref().and_then(|l| l.grid.as_ref()) {
        for a in &g.options.areas {
            connect(
                if columns {
                    a.column as usize - 1
                } else {
                    a.row as usize - 1
                },
                if columns {
                    a.column_span as usize
                } else {
                    a.row_span as usize
                },
            );
        }
    }
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
    for (i, is_joined) in joined
        .iter()
        .copied()
        .chain(std::iter::once(true))
        .enumerate()
        .take(n)
    {
        groups.last_mut().unwrap().push(i);
        if i + 1 < n && !is_joined {
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
        (0..n)
            .map(|i| {
                g.columns
                    .get(i)
                    .cloned()
                    .unwrap_or_else(|| g.options.auto_columns.clone())
            })
            .collect()
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
    for a in &mut g.options.areas {
        if columns {
            a.column = mapping[a.column as usize - 1] as u32 + 1;
        } else {
            a.row = mapping[a.row as usize - 1] as u32 + 1;
        }
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

pub(crate) fn delete_track(
    doc: &crate::Document,
    id: u32,
    axis: &str,
    index: usize,
) -> Result<Vec<Shape>, String> {
    if !["columns", "rows"].contains(&axis) {
        return Err("Choose a grid axis".into());
    }
    let frame = doc
        .shapes
        .iter()
        .find(|s| s.id == id && s.page_id == doc.active_page)
        .ok_or("Grid frame not found")?;
    frame
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
        return Err("Choose an existing track (up to 128 tracks per axis)".into());
    }
    if n <= 1 {
        return Err("Keep at least one track per axis".into());
    }
    let mut changed = frame.clone();
    let g = changed
        .auto_layout
        .as_mut()
        .unwrap()
        .grid
        .get_or_insert_with(Default::default);
    if columns {
        g.columns = (0..n)
            .map(|i| {
                g.columns
                    .get(i)
                    .cloned()
                    .unwrap_or_else(|| g.options.auto_columns.clone())
            })
            .collect();
        g.columns.remove(index);
    } else {
        g.rows = (0..n)
            .filter(|i| *i != index)
            .map(|i| {
                g.rows
                    .get(i)
                    .cloned()
                    .unwrap_or_else(|| g.auto_rows.clone())
            })
            .collect();
    }
    for a in &mut g.options.areas {
        let (position, span) = if columns {
            (&mut a.column, &mut a.column_span)
        } else {
            (&mut a.row, &mut a.row_span)
        };
        let start = *position as usize - 1;
        if start <= index && index < start + *span as usize {
            *span = span.saturating_sub(1).max(1);
        }
        let next = if start > index {
            start - 1
        } else {
            start.min(n - 2)
        };
        *position = next as u32 + 1;
        *span = (*span).min((n - 1 - next).max(1) as u32);
    }
    let mut changes = vec![changed];
    for s in doc
        .shapes
        .iter()
        .filter(|s| s.parent_id == id && !s.layout_item.absolute)
    {
        let mut changed = s.clone();
        // Pin visible automatic placements before editing so unrelated cells do
        // not repack. Hidden automatic children retain their automatic placement.
        if let Some(placed) = p.placements.iter().find(|p| p.id == s.id) {
            let c = changed
                .layout_item
                .grid_cell
                .get_or_insert_with(Default::default);
            c.column = Some(placed.column as u32);
            c.row = Some(placed.row as u32);
            c.column_span = placed.column_span as u32;
            c.row_span = placed.row_span as u32;
        }
        if let Some(c) = &mut changed.layout_item.grid_cell {
            let (position, span) = if columns {
                (&mut c.column, &mut c.column_span)
            } else {
                (&mut c.row, &mut c.row_span)
            };
            if let Some(old) = *position {
                let start = old as usize - 1;
                if start <= index && index < start + *span as usize {
                    *span = span.saturating_sub(1).max(1);
                }
                let next = if start > index {
                    start - 1
                } else if start == index {
                    start.min(n - 2)
                } else {
                    start
                };
                *position = Some(next as u32 + 1);
                if columns {
                    *span = (*span).min((n - 1).saturating_sub(next).max(1) as u32);
                }
            }
        }
        if changed != *s {
            changes.push(changed);
        }
    }
    Ok(changes)
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
    let o = &g.options;
    if o.masonry {
        return masonry_plan(shapes, frame, items, hug_width, hug_height);
    }
    let column_flow = o.auto_flow == "column";
    let mut nc = g.columns.len().max(
        o.areas
            .iter()
            .map(|a| (a.column + a.column_span - 1) as usize)
            .max()
            .unwrap_or(0),
    );
    let mut nr = g.rows.len().max(
        o.areas
            .iter()
            .map(|a| (a.row + a.row_span - 1) as usize)
            .max()
            .unwrap_or(0),
    );
    for &i in items {
        if let Some(c) = &shapes[i].layout_item.grid_cell {
            nc = nc.max(
                c.column
                    .map(|v| (v + c.column_span - 1) as usize)
                    .unwrap_or(c.column_span as usize),
            );
            nr = nr.max(
                c.row
                    .map(|v| (v + c.row_span - 1) as usize)
                    .unwrap_or(if column_flow { c.row_span as usize } else { 0 }),
            );
        }
    }
    nc = nc.clamp(1, 128);
    if column_flow {
        nr = nr.max(1);
    }
    let wrap = if column_flow { nr } else { nc };
    let mut cells: Vec<Option<(usize, usize, usize, usize)>> = vec![None; items.len()];
    let mut used = HashSet::new();
    let mut cursor = 0;
    for explicit in [true, false] {
        for (j, &i) in items.iter().enumerate() {
            let mut c = shapes[i].layout_item.grid_cell.clone().unwrap_or_default();
            if let Some(a) = o.areas.iter().find(|a| a.name == c.area) {
                c.column = Some(a.column);
                c.row = Some(a.row);
                c.column_span = a.column_span;
                c.row_span = a.row_span;
            }
            if (c.column.is_some() || c.row.is_some()) != explicit {
                continue;
            }
            let cs = (c.column_span as usize).min(if column_flow { 128 } else { nc });
            let rs = c.row_span as usize;
            let (minor, major, ms, ls) = if column_flow {
                (c.row, c.column, rs.min(wrap), cs)
            } else {
                (c.column, c.row, cs, rs)
            };
            let fixed = minor.map(|v| (v as usize - 1).min(wrap - ms));
            let mut pos = major
                .map(|v| (v as usize - 1) * wrap)
                .unwrap_or(if explicit || o.dense { 0 } else { cursor })
                + fixed.unwrap_or(0);
            loop {
                let a = pos / wrap;
                let b = fixed.unwrap_or(pos % wrap);
                let (col, row, cspan, rspan) = if column_flow {
                    (a, b, ls, ms)
                } else {
                    (b, a, ms, ls)
                };
                if b + ms <= wrap
                    && ((c.column.is_some() && c.row.is_some())
                        || (row..row + rspan)
                            .all(|r| (col..col + cspan).all(|c| !used.contains(&(r, c)))))
                {
                    for r in row..row + rspan {
                        for c in col..col + cspan {
                            used.insert((r, c));
                        }
                    }
                    cells[j] = Some((col, row, cspan, rspan));
                    if !explicit {
                        cursor = a * wrap + b + ms;
                    }
                    nc = nc.max(col + cspan);
                    nr = nr.max(row + rspan);
                    break;
                }
                pos = if let Some(b) = fixed {
                    (a + 1) * wrap + b
                } else {
                    pos + 1
                };
            }
        }
    }
    let row_config: Vec<_> = (0..nr)
        .map(|i| {
            g.rows.get(i).cloned().unwrap_or_else(|| {
                if o.auto_row_pattern.is_empty() {
                    g.auto_rows.clone()
                } else {
                    o.auto_row_pattern[(i - g.rows.len()) % o.auto_row_pattern.len()].clone()
                }
            })
        })
        .collect();
    let column_config: Vec<_> = (0..nc)
        .map(|i| {
            g.columns.get(i).cloned().unwrap_or_else(|| {
                if o.auto_column_pattern.is_empty() {
                    o.auto_columns.clone()
                } else {
                    o.auto_column_pattern[(i - g.columns.len()) % o.auto_column_pattern.len()]
                        .clone()
                }
            })
        })
        .collect();
    let font = frame
        .typography
        .as_ref()
        .map(|t| t.font_size)
        .unwrap_or(16.0);
    let gx = unit(
        l.gap,
        &o.column_gap_unit,
        (frame.width - crate::layout::padding(frame, true)).max(0.0),
        font,
    );
    let gy = unit(
        l.cross_gap.unwrap_or(l.gap),
        &o.row_gap_unit,
        (frame.height - crate::layout::padding(frame, false)).max(0.0),
        font,
    );
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
    let rc: Vec<_> = column_config
        .iter()
        .map(|t| resolved(t, (frame.width - pw).max(0.0), font))
        .collect();
    let rr: Vec<_> = row_config
        .iter()
        .map(|t| resolved(t, (frame.height - ph).max(0.0), font))
        .collect();
    let mut columns = tracks(&rc, &xd, gx, (frame.width - pw).max(0.0), hug_width);
    let mut rows = tracks(&rr, &yd, gy, (frame.height - ph).max(0.0), hug_height);
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
    let (offset_x, gx) = distribution(
        &o.justify_content,
        &mut columns,
        &column_config,
        (width - pw).max(0.0),
        gx,
    );
    let (offset_y, gy) = distribution(
        &o.align_content,
        &mut rows,
        &row_config,
        (height - ph).max(0.0),
        gy,
    );
    let xs = offsets(&columns, gx);
    let ys = offsets(&rows, gy);
    let border = crate::layout::border_insets(frame);
    let mut placements = vec![];
    for (j, &i) in items.iter().enumerate() {
        let s = &shapes[i];
        let c = cells[j].unwrap();
        let style = s.layout_item.grid_cell.clone().unwrap_or_default();
        let cw = extent(&columns[c.0..c.0 + c.2], gx);
        let ch = extent(&rows[c.1..c.1 + c.3], gy);
        let ax = if s.layout_item.grid_cell.is_none() || style.align_x == "auto" {
            &o.justify_items
        } else {
            &style.align_x
        };
        let ay = if s.layout_item.grid_cell.is_none() || style.align_y == "auto" {
            &o.align_items
        } else {
            &style.align_y
        };
        let mut child = s.clone();
        if ax == "stretch" {
            child.layout_item.fill_width = true;
        }
        if ay == "stretch" {
            child.layout_item.fill_height = true;
        }
        let w = sized(&child, true, cw);
        let h = sized(&child, false, ch);
        placements.push(Placement {
            id: s.id,
            column: c.0 + 1,
            row: c.1 + 1,
            column_span: c.2,
            row_span: c.3,
            x: frame.x
                + border[3]
                + l.padding_left
                + xs[c.0]
                + offset_x
                + align(ax, cw - w)
                + s.layout_item.margin[3],
            y: frame.y
                + border[0]
                + l.padding_top
                + ys[c.1]
                + offset_y
                + align(ay, ch - h)
                + s.layout_item.margin[0],
            width: (w - crate::layout::margin(s, true)).max(1.0),
            height: (h - crate::layout::margin(s, false)).max(1.0),
        });
    }
    Plan {
        width,
        height,
        columns,
        rows,
        placements,
        column_gap: gx,
        row_gap: gy,
        offset_x,
        offset_y,
    }
}

// Direct size edits on an area wrapper edit its parent tracks atomically.
pub(crate) fn sync_area_size_edits(
    before: &crate::Document,
    document: &mut crate::Document,
    ids: &[u32],
) {
    for id in ids {
        let Some(old) = before.shapes.iter().find(|s| s.id == *id) else {
            continue;
        };
        let Some(shape) = document.shapes.iter().find(|s| s.id == *id).cloned() else {
            continue;
        };
        if !shape.layout_item.grid_container || ids.contains(&shape.parent_id) {
            continue;
        }
        let Some(cell) = shape
            .layout_item
            .grid_cell
            .as_ref()
            .filter(|c| !c.area.is_empty())
        else {
            continue;
        };
        let Some(frame) = document
            .shapes
            .iter()
            .find(|s| s.id == shape.parent_id)
            .cloned()
        else {
            continue;
        };
        let Some(grid) = frame
            .auto_layout
            .as_ref()
            .filter(|l| l.direction == "grid")
            .and_then(|l| l.grid.as_ref())
            .filter(|g| !g.options.masonry)
        else {
            continue;
        };
        let Some(area) = grid.options.areas.iter().find(|a| a.name == cell.area) else {
            continue;
        };
        let indices: Vec<_> = before
            .shapes
            .iter()
            .enumerate()
            .filter(|(_, s)| s.parent_id == frame.id && !s.layout_item.absolute)
            .map(|(i, _)| i)
            .collect();
        let old_frame = before
            .shapes
            .iter()
            .find(|s| s.id == frame.id)
            .unwrap_or(&frame);
        let measured = plan(&before.shapes, old_frame, &indices, false, false);
        for horizontal in [true, false] {
            let (size, old_size, start, span, tracks, gap) = if horizontal {
                (
                    shape.width,
                    old.width,
                    area.column,
                    area.column_span,
                    &measured.columns,
                    measured.column_gap,
                )
            } else {
                (
                    shape.height,
                    old.height,
                    area.row,
                    area.row_span,
                    &measured.rows,
                    measured.row_gap,
                )
            };
            if (size - old_size).abs() < 0.001 {
                continue;
            }
            let first = (start - 1) as usize;
            let end = first + span as usize;
            let total: f64 = (first..end)
                .map(|i| tracks.get(i).copied().unwrap_or(1.0))
                .sum();
            let available = (size - gap * (end - first - 1) as f64).max((end - first) as f64);
            let target = document
                .shapes
                .iter_mut()
                .find(|s| s.id == frame.id)
                .unwrap()
                .auto_layout
                .as_mut()
                .unwrap()
                .grid
                .as_mut()
                .unwrap();
            let target = if horizontal {
                &mut target.columns
            } else {
                &mut target.rows
            };
            while target.len() < end {
                target.push(GridTrack {
                    mode: "fixed".into(),
                    value: tracks.get(target.len()).copied().unwrap_or(1.0),
                    ..Default::default()
                });
            }
            for (i, track) in target.iter_mut().enumerate().take(end).skip(first) {
                let share = if total > 0.0 {
                    tracks.get(i).copied().unwrap_or(1.0) / total
                } else {
                    1.0 / (end - first) as f64
                };
                // minmax is a responsive sizing rule, not a preferred pixel size.
                // Keep both bounds (and their units) intact; the grid solver owns
                // its actual size during previews and commits alike.
                if track.mode == "minmax" {
                    continue;
                }
                let min = track.min;
                let max = track.max;
                *track = GridTrack {
                    mode: "fixed".into(),
                    value: (available * share)
                        .max(1.0)
                        .clamp(min.unwrap_or(0.0), max.unwrap_or(1e6)),
                    min,
                    max,
                    ..Default::default()
                };
            }
        }
    }
}

// Materialize real layout frames, so cells reuse the ordinary Flex/Grid inspector.
pub(crate) fn ensure_containers(
    document: &mut crate::Document,
    next_id: u32,
) -> Result<(), String> {
    let frames: Vec<_> = document
        .shapes
        .iter()
        .filter(|s| {
            !matches!(
                s.component,
                Some(crate::components::Component::Instance { .. })
            ) && s.auto_layout.as_ref().is_some_and(|l| {
                l.direction == "grid" && l.grid.as_ref().is_some_and(|g| g.options.cell_containers)
            })
        })
        .cloned()
        .collect();
    let mut next = next_id.max(
        document
            .shapes
            .iter()
            .map(|s| s.id)
            .max()
            .unwrap_or(0)
            .saturating_add(1),
    );
    for frame in frames {
        let masonry = frame
            .auto_layout
            .as_ref()
            .unwrap()
            .grid
            .as_ref()
            .unwrap()
            .options
            .masonry;
        let indices: Vec<_> = document
            .shapes
            .iter()
            .enumerate()
            .filter(|(_, s)| s.parent_id == frame.id && !s.layout_item.absolute)
            .map(|(i, _)| i)
            .collect();
        let planned = plan(&document.shapes, &frame, &indices, false, false);
        let mut buckets: Vec<(GridCell, Vec<u32>)> = vec![];
        for a in frame
            .auto_layout
            .as_ref()
            .unwrap()
            .grid
            .as_ref()
            .unwrap()
            .options
            .areas
            .iter()
            .filter(|_| !masonry)
        {
            buckets.push((
                GridCell {
                    area: a.name.clone(),
                    column: Some(a.column),
                    row: Some(a.row),
                    column_span: a.column_span,
                    row_span: a.row_span,
                    ..Default::default()
                },
                vec![],
            ));
        }
        for p in &planned.placements {
            let s = document.shapes.iter().find(|s| s.id == p.id).unwrap();
            // Existing wrappers are layout items in masonry, never unwrapped or merged.
            if masonry {
                if !s.layout_item.grid_container {
                    buckets.push((
                        s.layout_item.grid_cell.clone().unwrap_or_default(),
                        vec![s.id],
                    ));
                }
                continue;
            }
            let mut cell = s.layout_item.grid_cell.clone().unwrap_or_default();
            cell.column = Some(p.column as u32);
            cell.row = Some(p.row as u32);
            cell.column_span = p.column_span as u32;
            cell.row_span = p.row_span as u32;
            let bucket = buckets.iter().position(|(c, _)| {
                if !cell.area.is_empty() {
                    c.area == cell.area
                } else {
                    c.area.is_empty()
                        && c.column == cell.column
                        && c.row == cell.row
                        && c.column_span == cell.column_span
                        && c.row_span == cell.row_span
                }
            });
            if let Some(i) = bucket {
                buckets[i].1.push(s.id);
            } else {
                buckets.push((cell, vec![s.id]));
            }
        }
        for (cell, ids) in buckets {
            let existing = ids.iter().copied().find(|id| {
                document
                    .shapes
                    .iter()
                    .any(|s| s.id == *id && s.layout_item.grid_container && s.kind == "frame")
            });
            let container = if let Some(id) = existing {
                // The wrapper represents the named area in the layer tree.
                if !cell.area.is_empty() {
                    if let Some(shape) = document.shapes.iter_mut().find(|s| s.id == id) {
                        shape.name = cell.area.clone();
                    }
                }
                id
            } else {
                if next == u32::MAX {
                    return Err("Shape ID limit reached".into());
                }
                let id = next;
                next += 1;
                let name = if cell.area.is_empty() {
                    format!(
                        "Cell {}, {}",
                        cell.column.unwrap_or(1),
                        cell.row.unwrap_or(1)
                    )
                } else {
                    cell.area.clone()
                };
                let p = planned.placements.iter().find(|p| ids.contains(&p.id));
                let mut shape:Shape=serde_json::from_value(serde_json::json!({"id":id,"page_id":frame.page_id,"parent_id":frame.id,"kind":"frame","name":name,"x":p.map_or(frame.x,|p|p.x),"y":p.map_or(frame.y,|p|p.y),"width":p.map_or(1.0,|p|p.width),"height":1.0,"fill":"#ffffff","text":"","hidden":false})).map_err(|e|e.to_string())?;
                shape.appearance=Some(serde_json::from_value(serde_json::json!({"fill_enabled":false,"stroke_enabled":false,"opacity":1.0,"corner_radius":0.0,"stroke_color":"#000000"})).map_err(|e|e.to_string())?);
                shape.auto_layout = Some(crate::AutoLayout {
                    direction: "vertical".into(),
                    gap: 8.0,
                    padding_top: 0.0,
                    padding_right: 0.0,
                    padding_bottom: 0.0,
                    padding_left: 0.0,
                    hug_width: false,
                    hug_height: true,
                    ..Default::default()
                });
                shape.layout_item = crate::LayoutItem {
                    grid_container: true,
                    grid_cell: Some(cell.clone()),
                    fill_width: true,
                    ..Default::default()
                };
                document.shapes.push(shape);
                id
            };
            // Named-area wrappers occupy the area, rather than hugging their children.
            // Track sizes and spans remain owned by the parent grid.
            if !cell.area.is_empty() && !masonry {
                if let Some(shape) = document.shapes.iter_mut().find(|s| s.id == container) {
                    shape.layout_item.grid_cell = Some(cell.clone());
                    shape.layout_item.fill_width = true;
                    shape.layout_item.fill_height = true;
                    if let Some(layout) = shape.auto_layout.as_mut() {
                        layout.hug_width = false;
                        layout.hug_height = false;
                    }
                }
            }
            for id in ids {
                if id == container {
                    continue;
                }
                let index = document.shapes.iter().position(|s| s.id == id).unwrap();
                let mut s = document.shapes.remove(index);
                s.parent_id = container;
                s.layout_item.grid_cell = None;
                s.layout_item.grid_container = false;
                s.layout_item.fill_height = false;
                document.shapes.push(s);
            }
        }
    }
    Ok(())
}

fn masonry_plan(
    shapes: &[Shape],
    frame: &Shape,
    items: &[usize],
    hug_width: bool,
    hug_height: bool,
) -> Plan {
    let l = frame.auto_layout.as_ref().unwrap();
    let g = l.grid.as_ref().unwrap();
    let o = &g.options;
    let pw = crate::layout::padding(frame, true);
    let ph = crate::layout::padding(frame, false);
    let font = frame.typography.as_ref().map_or(16.0, |t| t.font_size);
    let gx = unit(l.gap, &o.column_gap_unit, (frame.width - pw).max(0.0), font);
    let gy = unit(
        l.cross_gap.unwrap_or(l.gap),
        &o.row_gap_unit,
        (frame.height - ph).max(0.0),
        font,
    );
    let config: Vec<_> = g
        .columns
        .iter()
        .map(|t| resolved(t, (frame.width - pw).max(0.0), font))
        .collect();
    let demands: Vec<_> = items
        .iter()
        .enumerate()
        .map(|(j, i)| (j % config.len(), 1, child_size(&shapes[*i], true)))
        .collect();
    let mut columns = tracks(
        &config,
        &demands,
        gx,
        (frame.width - pw).max(0.0),
        hug_width,
    );
    let width = if hug_width {
        extent(&columns, gx) + pw
    } else {
        frame.width.max(pw)
    };
    let (offset_x, gx) = distribution(
        &o.justify_content,
        &mut columns,
        &g.columns,
        (width - pw).max(0.0),
        gx,
    );
    let xs = offsets(&columns, gx);
    let border = crate::layout::border_insets(frame);
    let mut heights = vec![0.0_f64; columns.len()];
    let mut counts = vec![0; columns.len()];
    let mut placements = vec![];
    for &i in items {
        let s = &shapes[i];
        let column = s
            .layout_item
            .grid_cell
            .as_ref()
            .and_then(|c| {
                if c.row.is_none() && c.area.is_empty() {
                    c.column
                } else {
                    None
                }
            })
            .map(|v| (v.saturating_sub(1) as usize).min(columns.len() - 1))
            .unwrap_or_else(|| {
                (0..columns.len())
                    .min_by(|a, b| heights[*a].total_cmp(&heights[*b]))
                    .unwrap()
            });
        let mut child = s.clone();
        child.layout_item.fill_height = false;
        let w = sized(&child, true, columns[column]);
        let h = child_size(&child, false);
        let top = heights[column];
        placements.push(Placement {
            id: s.id,
            column: column + 1,
            row: 1,
            column_span: 1,
            row_span: 1,
            x: frame.x
                + border[3]
                + l.padding_left
                + xs[column]
                + offset_x
                + s.layout_item.margin[3],
            y: frame.y + border[0] + l.padding_top + top + s.layout_item.margin[0],
            width: (w - crate::layout::margin(s, true)).max(1.0),
            height: (h - crate::layout::margin(s, false)).max(1.0),
        });
        heights[column] += h + gy;
        counts[column] += 1;
    }
    let content = heights
        .iter()
        .enumerate()
        .map(|(i, h)| if counts[i] > 0 { h - gy } else { 0.0 })
        .fold(0.0_f64, f64::max);
    Plan {
        width,
        height: if hug_height {
            content + ph
        } else {
            frame.height.max(ph)
        },
        columns,
        rows: vec![content],
        placements,
        column_gap: gx,
        row_gap: gy,
        offset_x,
        offset_y: 0.0,
    }
}
