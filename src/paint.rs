use crate::Paint;
use serde::{Deserialize, Serialize};
pub fn normal() -> String {
    "normal".into()
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Media {
    pub kind: String,
    pub data_url: String,
    pub poster: String,
    pub width: u32,
    pub height: u32,
    pub mode: String,
    pub scale: f64,
    pub offset_x: f64,
    pub offset_y: f64,
    pub rotation: f64,
    pub filters: [f64; 7],
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Pattern {
    pub source_id: u32,
    pub tile_type: String,
    pub scale: f64,
    pub spacing_x: f64,
    pub spacing_y: f64,
    pub offset_x: f64,
    pub offset_y: f64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Shader {
    pub preset: String,
    pub color: String,
    pub scale: f64,
    pub time: f64,
    pub seed: f64,
    pub code: String,
    pub snapshot: String,
}
fn within(v: f64, min: f64, max: f64) -> bool {
    v.is_finite() && (min..=max).contains(&v)
}
fn data(value: &str, prefixes: &[&str], limit: usize) -> bool {
    if value.is_empty() {
        return true;
    }
    prefixes.iter().any(|p| {
        value.strip_prefix(p).is_some_and(|s| {
            !s.is_empty()
                && s.len() <= limit
                && s.len() % 4 == 0
                && s.bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"+/=".contains(&c))
        })
    })
}
pub fn validate(p: &Paint) -> Result<(), String> {
    let images = [
        "data:image/png;base64,",
        "data:image/jpeg;base64,",
        "data:image/webp;base64,",
        "data:image/gif;base64,",
    ];
    if [
        p.gradient.is_some(),
        p.media.is_some(),
        p.pattern.is_some(),
        p.shader.is_some(),
    ]
    .iter()
    .filter(|v| **v)
    .count()
        > 1
    {
        return Err("A paint can have only one type".into());
    }
    if ![
        "normal",
        "darken",
        "multiply",
        "color-burn",
        "lighten",
        "screen",
        "plus-lighter",
        "color-dodge",
        "overlay",
        "soft-light",
        "hard-light",
        "difference",
        "exclusion",
        "hue",
        "saturation",
        "color",
        "luminosity",
    ]
    .contains(&p.blend_mode.as_str())
    {
        return Err("Invalid paint blend mode".into());
    }
    if let Some(m) = &p.media {
        let valid_source = match m.kind.as_str() {
            "image" => data(&m.data_url, &images, 2_000_000),
            "video" => data(
                &m.data_url,
                &[
                    "data:video/mp4;base64,",
                    "data:video/webm;base64,",
                    "data:video/quicktime;base64,",
                ],
                3_000_000,
            ),
            _ => false,
        };
        if !valid_source
            || !data(&m.poster, &images, 2_000_000)
            || m.width == 0
            || m.height == 0
            || m.width > 16384
            || m.height > 16384
            || !["fill", "fit", "crop", "tile"].contains(&m.mode.as_str())
            || !within(m.scale, 0.01, 10.0)
            || !within(m.rotation, -360.0, 360.0)
            || !within(m.offset_x, 0.0, 1.0)
            || !within(m.offset_y, 0.0, 1.0)
            || m.filters.iter().any(|v| !within(*v, -1.0, 1.0))
        {
            return Err("Invalid image or video paint".into());
        }
    }
    if let Some(t) = &p.pattern {
        if !["grid", "horizontal", "vertical", "hexagonal"].contains(&t.tile_type.as_str())
            || !within(t.scale, 0.01, 10.0)
            || !within(t.spacing_x, 0.0, 10000.0)
            || !within(t.spacing_y, 0.0, 10000.0)
            || !within(t.offset_x, 0.0, 1.0)
            || !within(t.offset_y, 0.0, 1.0)
        {
            return Err("Invalid pattern paint".into());
        }
    }
    if let Some(s) = &p.shader {
        if !["mesh", "noise", "waves", "custom"].contains(&s.preset.as_str())
            || s.color.len() != 7
            || !s.color.starts_with('#')
            || !s.color[1..].bytes().all(|c| c.is_ascii_hexdigit())
            || !within(s.scale, 0.1, 100.0)
            || !within(s.time, 0.0, 10000.0)
            || !within(s.seed, 0.0, 10000.0)
            || s.code.len() > 16000
            || !data(&s.snapshot, &images, 2_000_000)
        {
            return Err("Invalid shader paint".into());
        }
    }
    Ok(())
}

pub fn validate_sources(shapes: &[crate::Shape]) -> Result<(), String> {
    if !shapes.iter().any(|s| {
        s.appearance.as_ref().is_some_and(|a| {
            a.fills
                .iter()
                .chain(a.strokes.iter())
                .flatten()
                .any(|p| p.pattern.is_some())
        })
    }) {
        return Ok(());
    }
    let mut edges = std::collections::HashMap::<u32, Vec<u32>>::new();
    for s in shapes {
        if s.parent_id != 0 {
            edges.entry(s.parent_id).or_default().push(s.id);
        }
        if let Some(a) = &s.appearance {
            for p in a.fills.iter().chain(a.strokes.iter()).flatten() {
                if let Some(p) = &p.pattern {
                    if p.source_id != 0 && shapes.iter().any(|n| n.id == p.source_id) {
                        edges.entry(s.id).or_default().push(p.source_id);
                    }
                }
            }
        }
    }
    fn visit(
        id: u32,
        edges: &std::collections::HashMap<u32, Vec<u32>>,
        active: &mut std::collections::HashSet<u32>,
        done: &mut std::collections::HashSet<u32>,
    ) -> bool {
        if done.contains(&id) {
            return true;
        }
        if !active.insert(id) {
            return false;
        }
        for next in edges.get(&id).into_iter().flatten() {
            if !visit(*next, edges, active, done) {
                return false;
            }
        }
        active.remove(&id);
        done.insert(id);
        true
    }
    let mut done = std::collections::HashSet::new();
    for s in shapes {
        if !visit(
            s.id,
            &edges,
            &mut std::collections::HashSet::new(),
            &mut done,
        ) {
            return Err("A pattern cannot reference itself or create a circular source".into());
        }
    }
    Ok(())
}
pub fn remap_sources(
    shape: &mut crate::Shape,
    ids: &std::collections::HashMap<u32, u32>,
    retain_external: bool,
) {
    if let Some(a) = &mut shape.appearance {
        for p in a.fills.iter_mut().chain(a.strokes.iter_mut()).flatten() {
            if let Some(p) = &mut p.pattern {
                p.source_id = ids
                    .get(&p.source_id)
                    .copied()
                    .unwrap_or(if retain_external { p.source_id } else { 0 });
            }
        }
    }
}
