use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
mod arrangement;
mod grid;
mod guide_styles;
mod variables;
mod path_join;
mod path_split;
mod stacking;
mod stroke_alignment;
mod stroke_tips;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Shape {
    #[serde(default)]
    pub aspect_ratio_locked: bool,
    #[serde(default)]
    pub variable_bindings: std::collections::BTreeMap<String, u32>,
    #[serde(default)]
    pub variable_modes: std::collections::BTreeMap<u32, u32>,
    pub id: u32,
    #[serde(default = "first_page")]
    pub page_id: u32,
    #[serde(default)]
    pub group_id: u32,
    #[serde(default)]
    pub group_name: String,
    #[serde(default)]
    pub parent_id: u32,
    #[serde(default)]
    pub clip_content: bool,
    #[serde(default)]
    pub image: Option<RasterImage>,
    #[serde(default)]
    pub constraints: Constraints,
    #[serde(default)]
    pub appearance: Option<Appearance>,
    #[serde(default)]
    pub auto_layout: Option<AutoLayout>,
    #[serde(default)]
    pub layout_grids: Vec<LayoutGrid>,
    #[serde(default)]
    pub guide_style: u32,
    #[serde(default)]
    pub prototype: Option<Prototype>,
    #[serde(default)]
    pub additional_interactions: Vec<Prototype>,
    #[serde(default)]
    pub flow_name: String,
    #[serde(default)]
    pub layout_item: LayoutItem,
    pub kind: String,
    pub name: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub fill: String,
    pub text: String,
    pub hidden: bool,
    #[serde(default)]
    pub locked: bool,
    #[serde(default)]
    pub component: Option<components::Component>,
    #[serde(default)]
    pub typography: Option<Typography>,
    #[serde(skip)]
    pub measured_baseline: Option<f64>,
    #[serde(default)]
    pub points: Vec<[f64; 2]>,
    #[serde(default)]
    pub handles: Vec<[[f64; 2]; 2]>,
    #[serde(default)]
    pub closed: bool,
    #[serde(default = "default_stroke")]
    pub stroke_width: f64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct LayoutItem {
    #[serde(default)]
    pub grid_cell: Option<grid::GridCell>,
    pub fill_width: bool,
    pub fill_height: bool,
    pub absolute: bool,
    #[serde(default)]
    pub min_width: Option<f64>,
    #[serde(default)]
    pub max_width: Option<f64>,
    #[serde(default)]
    pub min_height: Option<f64>,
    #[serde(default)]
    pub max_height: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct LayoutGrid {
    pub kind: String,
    pub size: f64,
    pub count: u32,
    pub gutter: f64,
    pub margin: f64,
    pub alignment: String,
    pub color: String,
    pub opacity: f64,
    pub visible: bool,
}

impl Shape {
    fn interactions(&self) -> impl Iterator<Item = &Prototype> {
        self.prototype
            .iter()
            .chain(self.additional_interactions.iter())
    }
    fn interactions_mut(&mut self) -> impl Iterator<Item = &mut Prototype> {
        self.prototype
            .iter_mut()
            .chain(self.additional_interactions.iter_mut())
    }
    fn retain_interactions(&mut self, keep: impl Fn(&Prototype) -> bool) {
        let mut interactions: Vec<_> = self
            .prototype
            .take()
            .into_iter()
            .chain(self.additional_interactions.drain(..))
            .filter(keep)
            .collect();
        self.prototype = if interactions.is_empty() {
            None
        } else {
            Some(interactions.remove(0))
        };
        self.additional_interactions = interactions;
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Prototype {
    #[serde(default = "default_trigger")]
    pub trigger: String,
    #[serde(default = "default_delay")]
    pub delay: u32,
    pub action: String,
    #[serde(default)]
    pub target: u32,
    #[serde(default)]
    pub close_on_outside: bool,
    #[serde(default = "default_overlay_position")]
    pub overlay_position: String,
    #[serde(default)]
    pub overlay_x: f64,
    #[serde(default)]
    pub overlay_y: f64,
    #[serde(default = "default_backdrop_color")]
    pub backdrop_color: String,
    #[serde(default = "default_backdrop_opacity")]
    pub backdrop_opacity: f64,
    #[serde(default = "default_transition")]
    pub transition: String,
    #[serde(default = "default_duration")]
    pub duration: u32,
    #[serde(default = "default_easing")]
    pub easing: String,
}

fn default_trigger() -> String {
    "click".into()
}

fn default_delay() -> u32 {
    800
}

fn default_transition() -> String {
    "instant".into()
}
fn default_backdrop_color() -> String {
    "#000000".into()
}
fn default_backdrop_opacity() -> f64 {
    0.4
}
fn default_duration() -> u32 {
    300
}
fn default_easing() -> String {
    "ease-in-out".into()
}

fn default_overlay_position() -> String {
    "center".into()
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AutoLayout {
    #[serde(default)]
    pub grid: Option<grid::GridLayout>,
    pub direction: String,
    pub gap: f64,
    pub padding_top: f64,
    pub padding_right: f64,
    pub padding_bottom: f64,
    pub padding_left: f64,
    pub align: String,
    pub justify: String,
    pub hug_width: bool,
    pub hug_height: bool,
    #[serde(default)]
    pub strokes_included: bool,
    #[serde(default)]
    pub text_baseline: bool,
    #[serde(default = "default_canvas_stacking")]
    pub canvas_stacking: String,
    #[serde(default)]
    pub wrap: bool,
    #[serde(default)]
    pub cross_gap: Option<f64>,
    #[serde(default = "default_content_align")]
    pub align_content: String,
}

fn default_content_align() -> String {
    "start".into()
}
fn default_canvas_stacking() -> String {
    "last".into()
}

impl Default for AutoLayout {
    fn default() -> Self {
        Self {
            grid: None,
            direction: "horizontal".into(),
            gap: 16.0,
            padding_top: 16.0,
            padding_right: 16.0,
            padding_bottom: 16.0,
            padding_left: 16.0,
            align: "start".into(),
            justify: "start".into(),
            hug_width: true,
            hug_height: true,
            strokes_included: true,
            text_baseline: false,
            canvas_stacking: default_canvas_stacking(),
            wrap: false,
            cross_gap: None,
            align_content: default_content_align(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Appearance {
    #[serde(default = "default_blend_mode")]
    pub blend_mode: String,
    #[serde(default)]
    pub backdrop_blur: f64,
    #[serde(default)]
    pub layer_blur: f64,
    #[serde(default)]
    pub shadows: Vec<DropShadow>,
    #[serde(default)]
    pub gradient: Option<Gradient>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stroke_gradient: Option<Gradient>,
    pub opacity: f64,
    pub corner_radius: f64,
    #[serde(default)]
    pub corner_radii: Option<[f64; 4]>,
    pub fill_enabled: bool,
    #[serde(default = "opaque_paint")]
    pub fill_opacity: f64,
    #[serde(default = "opaque_paint")]
    pub stroke_opacity: f64,
    pub stroke_enabled: bool,
    pub stroke_color: String,
    #[serde(default)]
    pub stroke_dash: Vec<f64>,
    #[serde(default)]
    pub stroke_dash_offset: f64,
    #[serde(default = "default_round")]
    pub stroke_cap: String,
    #[serde(default = "center_stroke")]
    pub stroke_alignment: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stroke_start: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stroke_end: Option<String>,
    #[serde(default = "default_round")]
    pub stroke_join: String,
    #[serde(default = "default_miter_limit")]
    pub stroke_miter_limit: f64,
}

fn center_stroke() -> String {
    "center".into()
}

fn opaque_paint() -> f64 {
    1.0
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DropShadow {
    #[serde(default = "shadow_kind")]
    pub kind: String,
    pub x: f64,
    pub y: f64,
    pub blur: f64,
    #[serde(default)]
    pub spread: f64,
    pub color: String,
    pub opacity: f64,
    #[serde(default = "shadow_visible")]
    pub visible: bool,
}

fn shadow_visible() -> bool {
    true
}

fn shadow_kind() -> String {
    "drop".into()
}

fn default_miter_limit() -> f64 {
    10.0
}

fn default_round() -> String {
    "round".into()
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Gradient {
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub radial_transform: Option<[f64; 4]>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub focal: Option<[f64; 2]>,
    #[serde(default, skip_serializing_if = "is_zero")]
    pub focal_radius: f64,
    pub start: [f64; 2],
    pub end: [f64; 2],
    pub stops: Vec<GradientStop>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GradientStop {
    pub position: f64,
    pub color: String,
    pub opacity: f64,
}

fn is_zero(value: &f64) -> bool {
    *value == 0.0
}

fn in_rounded_rect(s: &Shape, x: f64, y: f64) -> bool {
    if x < s.x || x > s.x + s.width || y < s.y || y > s.y + s.height {
        return false;
    }
    let r = s
        .appearance
        .as_ref()
        .map_or([0.0; 4], |a| a.corner_radii.unwrap_or([a.corner_radius; 4]));
    let scale = 1.0_f64
        .min(s.width / (r[0] + r[1]))
        .min(s.width / (r[3] + r[2]))
        .min(s.height / (r[0] + r[3]))
        .min(s.height / (r[1] + r[2]));
    let r = r.map(|v| v * scale);
    for (radius, cx, cy, left, top) in [
        (r[0], s.x + r[0], s.y + r[0], true, true),
        (r[1], s.x + s.width - r[1], s.y + r[1], false, true),
        (
            r[2],
            s.x + s.width - r[2],
            s.y + s.height - r[2],
            false,
            false,
        ),
        (r[3], s.x + r[3], s.y + s.height - r[3], true, false),
    ] {
        if (if left { x < cx } else { x > cx })
            && (if top { y < cy } else { y > cy })
            && (x - cx).hypot(y - cy) > radius
        {
            return false;
        }
    }
    true
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Constraints {
    pub horizontal: Constraint,
    pub vertical: Constraint,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Constraint {
    #[default]
    Min,
    Max,
    Center,
    Stretch,
    Scale,
}

fn constrain_axis(
    position: f64,
    size: f64,
    old_origin: f64,
    old_size: f64,
    origin: f64,
    parent_size: f64,
    mode: &Constraint,
) -> (f64, f64) {
    let relative = position - old_origin;
    let delta = parent_size - old_size;
    match mode {
        Constraint::Min => (origin + relative, size),
        Constraint::Max => (origin + relative + delta, size),
        Constraint::Center => (origin + relative + delta / 2.0, size),
        Constraint::Stretch => (origin + relative, (size + delta).max(1.0)),
        Constraint::Scale => (
            origin + relative * parent_size / old_size,
            (size * parent_size / old_size).max(1.0),
        ),
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct RasterImage {
    pub data_url: String,
    pub width: u32,
    pub height: u32,
    pub mode: String,
    pub zoom: f64,
    pub offset_x: f64,
    pub offset_y: f64,
}

fn default_stroke() -> f64 {
    2.0
}

// Adaptive subdivision keeps selection close to the visible cubic curve.
fn flatten_curve(p: [[f64; 2]; 4], depth: u8, output: &mut Vec<[f64; 2]>) {
    let mid = |a: [f64; 2], b: [f64; 2]| [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0];
    let chord = (p[3][0] - p[0][0]).hypot(p[3][1] - p[0][1]);
    let polygon = (p[1][0] - p[0][0]).hypot(p[1][1] - p[0][1])
        + (p[2][0] - p[1][0]).hypot(p[2][1] - p[1][1])
        + (p[3][0] - p[2][0]).hypot(p[3][1] - p[2][1]);
    if depth >= 12 || polygon - chord < 0.1 {
        output.push(p[3]);
        return;
    }
    let a = mid(p[0], p[1]);
    let b = mid(p[1], p[2]);
    let c = mid(p[2], p[3]);
    let d = mid(a, b);
    let e = mid(b, c);
    let f = mid(d, e);
    flatten_curve([p[0], a, d, f], depth + 1, output);
    flatten_curve([f, e, c, p[3]], depth + 1, output);
}
fn path_polyline(shape: &Shape) -> Vec<[f64; 2]> {
    let world = |p: [f64; 2]| [shape.x + p[0] * shape.width, shape.y + p[1] * shape.height];
    if shape.handles.is_empty() {
        return shape.points.iter().map(|p| world(*p)).collect();
    }
    let mut result = vec![world(shape.points[0])];
    let count = shape.points.len() - if shape.closed { 0 } else { 1 };
    for i in 0..count {
        let j = (i + 1) % shape.points.len();
        flatten_curve(
            [
                world(shape.points[i]),
                world(shape.handles[i][1]),
                world(shape.handles[j][0]),
                world(shape.points[j]),
            ],
            0,
            &mut result,
        );
    }
    result
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Typography {
    #[serde(default = "default_vertical_align")]
    pub vertical_align: String,
    #[serde(default = "fixed_text")]
    pub sizing: String,
    pub font_size: f64,
    pub font_family: String,
    pub font_weight: u16,
    pub align: String,
    pub line_height: f64,
    pub wrap: bool,
}

impl Default for Typography {
    fn default() -> Self {
        Self {
            sizing: fixed_text(),
            vertical_align: default_vertical_align(),
            font_size: 32.0,
            font_family: "Manrope".into(),
            font_weight: 600,
            align: "left".into(),
            line_height: 1.2,
            wrap: true,
        }
    }
}

fn fixed_text() -> String {
    "fixed".into()
}
fn default_vertical_align() -> String { "top".into() }
fn default_blend_mode() -> String { "pass-through".into() }

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Document {
    #[serde(default)]
    pub variables: variables::Variables,
    pub version: u32,
    pub name: String,
    pub shapes: Vec<Shape>,
    #[serde(default = "default_pages")]
    pub pages: Vec<Page>,
    #[serde(default = "first_page")]
    pub active_page: u32,
    #[serde(default)]
    pub component_sets: Vec<variants::ComponentSet>,
    #[serde(default)]
    pub guide_styles: Vec<guide_styles::GuideStyle>,
    #[serde(default)]
    pub component_properties: Vec<component_properties::ComponentProperty>,
}

#[derive(Serialize, Deserialize)]
struct LayerClipboard {
    format: String,
    version: u32,
    shapes: Vec<Shape>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Page {
    pub id: u32,
    pub name: String,
}

fn first_page() -> u32 {
    1
}
fn default_pages() -> Vec<Page> {
    vec![Page {
        id: 1,
        name: "Page 1".into(),
    }]
}

#[wasm_bindgen]
pub struct Editor {
    text_measurer: Option<js_sys::Function>,
    document: Document,
    undo: Vec<Document>,
    redo: Vec<Document>,
    next_id: u32,
    next_page_id: u32,
}

fn validate(document: &Document) -> Result<(), String> {
    variables::validate_variables(document)?;
    variants::validate_sets(document)?;
    guide_styles::validate_styles(document)?;
    if document.version != 2 || document.shapes.len() > 10_000 || document.name.len() > 256 {
        return Err("Unsupported document version or document too large".into());
    }
    let mut ids = std::collections::HashSet::new();
    let mut pages = std::collections::HashSet::new();
    if document.pages.is_empty() || document.pages.len() > 100 {
        return Err("Documents must have between 1 and 100 pages".into());
    }
    for page in &document.pages {
        if page.id == 0
            || page.id == u32::MAX
            || !pages.insert(page.id)
            || page.name.trim().is_empty()
            || page.name.len() > 256
        {
            return Err("Invalid page name or ID".into());
        }
    }
    if !pages.contains(&document.active_page) {
        return Err("Active page not found".into());
    }
    let by_id: std::collections::HashMap<u32, &Shape> =
        document.shapes.iter().map(|s| (s.id, s)).collect();
    for shape in &document.shapes {
        if shape.flow_name.len() > 128
            || (!shape.flow_name.is_empty()
                && (shape.kind != "frame" || shape.flow_name.trim().is_empty()))
        {
            return Err(
                "Flow starting points require a frame and a name of at most 128 bytes".into(),
            );
        }
        if shape.additional_interactions.len() > 5
            || (shape.prototype.is_none() && !shape.additional_interactions.is_empty())
        {
            return Err("Additional interactions require a primary interaction; at most six triggers are supported".into());
        }
        let mut triggers = std::collections::HashSet::new();
        for p in shape.interactions() {
            if !triggers.insert(&p.trigger) {
                return Err("Each prototype trigger may occur only once per layer".into());
            }
            if ![
                "click",
                "mouseenter",
                "mouseleave",
                "afterdelay",
                "mousedown",
                "mouseup",
            ]
            .contains(&p.trigger.as_str())
            {
                return Err("Invalid prototype trigger".into());
            }
            if !(1..=600_000).contains(&p.delay)
                || (p.trigger == "afterdelay" && shape.kind != "frame")
            {
                return Err(
                    "Prototype delay must be 1–600000 ms; timed triggers require a frame".into(),
                );
            }
            if ![
                "instant",
                "dissolve",
                "slide-left",
                "slide-right",
                "slide-up",
                "slide-down",
            ]
            .contains(&p.transition.as_str())
                || p.duration > 10_000
                || !["linear", "ease-in", "ease-out", "ease-in-out"].contains(&p.easing.as_str())
                || (["overlay", "close", "swap"].contains(&p.action.as_str())
                    && p.transition.starts_with("slide-"))
            {
                return Err("Invalid prototype transition, duration or easing".into());
            }
            if !["navigate", "back", "overlay", "close", "swap"].contains(&p.action.as_str())
                || (["navigate", "overlay", "swap"].contains(&p.action.as_str())
                    && !document
                        .shapes
                        .iter()
                        .any(|s| s.id == p.target && s.kind == "frame"))
                || (["back", "close"].contains(&p.action.as_str()) && p.target != 0)
                || ![
                    "center",
                    "manual",
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right",
                ]
                .contains(&p.overlay_position.as_str())
            {
                return Err("Invalid prototype action, destination or overlay position".into());
            }
            if [p.overlay_x, p.overlay_y]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
                || !p.backdrop_opacity.is_finite()
                || !(0.0..=1.0).contains(&p.backdrop_opacity)
                || p.backdrop_color.len() != 7
                || !p.backdrop_color.starts_with('#')
                || !p.backdrop_color[1..].bytes().all(|c| c.is_ascii_hexdigit())
            {
                return Err("Invalid overlay offset or backdrop".into());
            }
        }
        if shape.layout_grids.len() > 8 || (!shape.layout_grids.is_empty() && shape.kind != "frame")
        {
            return Err("Layout guides require a frame and allow at most eight grids".into());
        }
        guide_styles::validate_grids(&shape.layout_grids)?;
        for (min, max) in [
            (shape.layout_item.min_width, shape.layout_item.max_width),
            (shape.layout_item.min_height, shape.layout_item.max_height),
        ] {
            if min
                .into_iter()
                .chain(max)
                .any(|v| !v.is_finite() || !(1.0..=1_000_000.0).contains(&v))
                || matches!((min,max),(Some(a),Some(b)) if a>b)
            {
                return Err(
                    "Size limits must be positive, with minimum no larger than maximum".into(),
                );
            }
        }
        if let Some(l) = &shape.auto_layout {
            if shape.kind != "frame"
                || !["horizontal", "vertical", "grid"].contains(&l.direction.as_str())
                || !["first", "last"].contains(&l.canvas_stacking.as_str())
                || !["start", "center", "end"].contains(&l.align.as_str())
                || !["start", "center", "end", "between", "around", "evenly"]
                    .contains(&l.justify.as_str())
                || ![
                    "start", "center", "end", "between", "around", "evenly", "stretch",
                ]
                .contains(&l.align_content.as_str())
                || l.cross_gap
                    .is_some_and(|v| !v.is_finite() || !(-100_000.0..=100_000.0).contains(&v))
                || !l.gap.is_finite()
                || !(-100_000.0..=100_000.0).contains(&l.gap)
                || ![
                    l.padding_top,
                    l.padding_right,
                    l.padding_bottom,
                    l.padding_left,
                ]
                .iter()
                .all(|v| v.is_finite() && (0.0..=100_000.0).contains(v))
            {
                return Err("Invalid auto layout settings".into());
            }
        }
        if let Some(a) = &shape.appearance {
            for g in a.gradient.iter().chain(a.stroke_gradient.iter()) {
                if g.radial_transform.is_some_and(|m| {
                    m.iter().any(|v| !v.is_finite() || v.abs() > 100000.0)
                        || (m[0] * m[3] - m[1] * m[2]).abs() < 1e-12
                }) || g
                    .focal
                    .is_some_and(|p| p.iter().any(|v| !v.is_finite() || v.abs() > 10.0))
                    || !g.focal_radius.is_finite()
                    || !(0.0..=1.0).contains(&g.focal_radius)
                {
                    return Err("Invalid radial gradient transform or focal circle".into());
                }
                if !["linear", "radial"].contains(&g.kind.as_str())
                    || g.start
                        .iter()
                        .chain(g.end.iter())
                        .any(|v| !v.is_finite() || !(-10.0..=10.0).contains(v))
                    || (g.start[0] - g.end[0]).hypot(g.start[1] - g.end[1]) < 0.0001
                    || !(2..=16).contains(&g.stops.len())
                    || g.stops.windows(2).any(|s| s[0].position > s[1].position)
                    || g.stops.iter().any(|s| {
                        !s.position.is_finite()
                            || !(0.0..=1.0).contains(&s.position)
                            || !s.opacity.is_finite()
                            || !(0.0..=1.0).contains(&s.opacity)
                            || s.color.len() != 7
                            || !s.color.starts_with('#')
                            || !s.color[1..].bytes().all(|c| c.is_ascii_hexdigit())
                    })
                {
                    return Err("Invalid gradient geometry or color stops".into());
                }
            }
            if !a.layer_blur.is_finite() || !(0.0..=100_000.0).contains(&a.layer_blur) {
                return Err("Layer blur must be between 0 and 100000".into());
            }
            if !["pass-through", "normal", "darken", "multiply", "color-burn", "lighten", "screen", "plus-lighter", "color-dodge", "overlay", "soft-light", "hard-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"].contains(&a.blend_mode.as_str()) {
                return Err("Unsupported blend mode".into());
            }
            if !a.backdrop_blur.is_finite() || !(0.0..=200.0).contains(&a.backdrop_blur) {
                return Err("Background blur must be between 0 and 200".into());
            }
            if a.shadows.len() > 8
                || a.shadows.iter().any(|shadow| {
                    !["drop", "inner"].contains(&shadow.kind.as_str())
                        || [shadow.x, shadow.y, shadow.spread]
                            .iter()
                            .any(|v| !v.is_finite() || v.abs() > 100_000.0)
                        || !shadow.blur.is_finite()
                        || !(0.0..=100_000.0).contains(&shadow.blur)
                        || !shadow.opacity.is_finite()
                        || !(0.0..=1.0).contains(&shadow.opacity)
                        || shadow.color.len() != 7
                        || !shadow.color.starts_with('#')
                        || !shadow.color[1..].bytes().all(|c| c.is_ascii_hexdigit())
                })
            {
                return Err("Invalid drop shadows: use at most eight with bounded geometry, hex colors and 0–1 opacity".into());
            }
            if [a.fill_opacity, a.stroke_opacity]
                .iter()
                .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
                || !a.opacity.is_finite()
                || !(0.0..=1.0).contains(&a.opacity)
                || !a.corner_radius.is_finite()
                || !(0.0..=1_000_000.0).contains(&a.corner_radius)
                || a.corner_radii.is_some_and(|r| {
                    r.iter()
                        .any(|v| !v.is_finite() || !(0.0..=1_000_000.0).contains(v))
                })
                || a.stroke_color.len() != 7
                || !a.stroke_color.starts_with('#')
                || !a.stroke_color[1..].bytes().all(|c| c.is_ascii_hexdigit())
                || a.stroke_dash.len() > 16
                || a.stroke_dash
                    .iter()
                    .any(|v| !v.is_finite() || !(0.0..=100_000.0).contains(v))
                || (!a.stroke_dash.is_empty() && a.stroke_dash.iter().sum::<f64>() == 0.0)
                || !a.stroke_dash_offset.is_finite()
                || a.stroke_dash_offset.abs() > 1_000_000.0
                || !["inside", "center", "outside"].contains(&a.stroke_alignment.as_str())
                || !["butt", "round", "square"].contains(&a.stroke_cap.as_str())
                || [&a.stroke_start, &a.stroke_end].iter().any(|v| {
                    v.as_ref().is_some_and(|v| {
                        ![
                            "none",
                            "line",
                            "triangle",
                            "reverse_triangle",
                            "diamond",
                            "circle",
                        ]
                        .contains(&v.as_str())
                    })
                })
                || !["miter", "round", "bevel"].contains(&a.stroke_join.as_str())
                || !a.stroke_miter_limit.is_finite()
                || !(1.0..=1000.0).contains(&a.stroke_miter_limit)
            {
                return Err("Invalid appearance settings".into());
            }
        }
        let mut parent = shape.parent_id;
        let mut seen = std::collections::HashSet::from([shape.id]);
        while parent != 0 {
            if !seen.insert(parent) || seen.len() > 128 {
                return Err("Frame hierarchy contains a cycle or exceeds 128 levels".into());
            }
            let ancestor = by_id.get(&parent).ok_or("Parent frame not found")?;
            if ancestor.kind != "frame" || ancestor.page_id != shape.page_id {
                return Err("Parent must be a frame on the same page".into());
            }
            parent = ancestor.parent_id;
        }
    }
    let mut groups = std::collections::HashMap::new();
    for shape in &document.shapes {
        if shape.group_id == u32::MAX
            || shape.group_name.len() > 256
            || (shape.group_id > 0 && shape.group_name.trim().is_empty())
        {
            return Err("Invalid group".into());
        }
        if shape.group_id > 0 {
            let value = (shape.page_id, shape.parent_id, shape.group_name.as_str());
            if let Some(previous) = groups.insert(shape.group_id, value) {
                if previous != value {
                    return Err("Group members must share a page and name".into());
                }
            }
        }
        if let Some(style) = &shape.typography {
            if !style.font_size.is_finite()
                || !["fixed", "width", "height"].contains(&style.sizing.as_str())
                || !(1.0..=512.0).contains(&style.font_size)
                || !style.line_height.is_finite()
                || !(0.5..=4.0).contains(&style.line_height)
                || ![400, 500, 600, 700, 800].contains(&style.font_weight)
                || !["Manrope", "DM Sans", "Georgia", "monospace"]
                    .contains(&style.font_family.as_str())
                || !["left", "center", "right"].contains(&style.align.as_str())
                || !["top", "center", "bottom"].contains(&style.vertical_align.as_str())
            {
                return Err("Invalid typography settings".into());
            }
        }
        if !pages.contains(&shape.page_id) {
            return Err("Shape belongs to a missing page".into());
        }
        if !ids.insert(shape.id) || shape.id == 0 || shape.id == u32::MAX {
            return Err("Invalid or duplicate shape ID".into());
        }
        if shape.kind == "image" && shape.image.is_none() {
            return Err("Image data is required".into());
        }
        if let Some(image) = &shape.image {
            let prefix = [
                "data:image/png;base64,",
                "data:image/jpeg;base64,",
                "data:image/webp;base64,",
            ]
            .iter()
            .find(|p| image.data_url.starts_with(**p))
            .ok_or("Unsupported image format")?;
            let encoded = &image.data_url[prefix.len()..];
            if image.width == 0
                || image.height == 0
                || image.width > 8192
                || image.height > 8192
                || encoded.is_empty()
                || encoded.len() > 2_000_000
                || encoded.len() % 4 != 0
                || !encoded
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"+/=".contains(&c))
                || !["fill", "fit"].contains(&image.mode.as_str())
                || !image.zoom.is_finite()
                || !(1.0..=10.0).contains(&image.zoom)
                || ![image.offset_x, image.offset_y]
                    .iter()
                    .all(|v| v.is_finite() && (0.0..=1.0).contains(v))
            {
                return Err("Invalid image data or crop settings".into());
            }
        }
        let vector =
            ["line", "arrow", "polygon", "star", "pen", "pencil"].contains(&shape.kind.as_str());
        if (!shape.handles.is_empty() && shape.handles.len() != shape.points.len())
            || shape
                .handles
                .iter()
                .flatten()
                .flatten()
                .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
        {
            return Err("Invalid curve handles".into());
        }
        if !shape.stroke_width.is_finite()
            || !(0.1..=100.0).contains(&shape.stroke_width)
            || shape.points.len() > 4096
            || (vector && shape.points.len() < 2)
            || shape
                .points
                .iter()
                .flatten()
                .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
        {
            return Err("Invalid vector geometry or stroke width".into());
        }
        if ![
            "image",
            "rectangle",
            "ellipse",
            "frame",
            "text",
            "line",
            "arrow",
            "polygon",
            "star",
            "pen",
            "pencil",
        ]
        .contains(&shape.kind.as_str())
            || shape.name.len() > 256
            || shape.text.len() > 10_000
            || shape.fill.len() != 7
            || !shape.fill.starts_with('#')
            || !shape.fill[1..].bytes().all(|c| c.is_ascii_hexdigit())
            || ![shape.x, shape.y, shape.width, shape.height]
                .iter()
                .all(|v| v.is_finite() && v.abs() <= 1_000_000.0)
            || shape.width < 1.0
            || shape.height < 1.0
        {
            return Err("Invalid shape data".into());
        }
    }
    component_properties::validate_properties(document)?;
    grid::validate(&document.shapes)?;
    Ok(())
}

impl Editor {
    fn reflow_text(&self, document: &mut Document) -> Result<(), String> {
        let baseline_parents: std::collections::HashSet<_> = document
            .shapes
            .iter()
            .filter(|s| {
                s.auto_layout
                    .as_ref()
                    .is_some_and(|l| l.text_baseline && l.direction == "horizontal")
            })
            .map(|s| s.id)
            .collect();
        if !document.shapes.iter().any(|s| {
            s.kind == "text"
                && (baseline_parents.contains(&s.parent_id)
                    || s.typography.as_ref().is_some_and(|t| t.sizing != "fixed"))
        }) {
            reflow(document);
            return Ok(());
        }
        let Some(measure) = &self.text_measurer else {
            reflow(document);
            return Ok(());
        };
        // Width allocation can change wrapped text height, which can change a
        // hugged ancestor. Iterate to a fixed point, rejecting cyclic sizing.
        for _ in 0..130 {
            let before: Vec<_> = document
                .shapes
                .iter()
                .map(|s| (s.x, s.y, s.width, s.height))
                .collect();
            let layout_parents: std::collections::HashSet<_> = document
                .shapes
                .iter()
                .filter(|s| s.auto_layout.is_some())
                .map(|s| s.id)
                .collect();
            for s in &mut document.shapes {
                if s.kind != "text" {
                    continue;
                }
                let in_layout = layout_parents.contains(&s.parent_id) && !s.layout_item.absolute;
                let Some(style) = &mut s.typography else {
                    continue;
                };
                if in_layout && s.layout_item.fill_height {
                    style.sizing = "fixed".into();
                } else if in_layout && s.layout_item.fill_width && style.sizing == "width" {
                    style.sizing = "height".into();
                }
                if style.sizing == "fixed" && !baseline_parents.contains(&s.parent_id) {
                    continue;
                }
                let sizing = style.sizing.clone();
                let mut measured = s.clone();
                // Fill controls its allocated axis; width-auto text becomes
                // wrapped height-auto text when its parent supplies a width.
                if in_layout && s.layout_item.fill_width {
                    measured.typography.as_mut().unwrap().sizing = "height".into();
                }
                let result = measure
                    .call1(
                        &JsValue::NULL,
                        &JsValue::from_str(&serde_json::to_string(&measured).unwrap()),
                    )
                    .map_err(|_| "Text measurement failed")?;
                let size: Vec<f64> =
                    serde_json::from_str(&result.as_string().ok_or("Invalid text measurement")?)
                        .map_err(|_| "Invalid text measurement")?;
                if !(2..=3).contains(&size.len())
                    || size
                        .iter()
                        .take(2)
                        .any(|v| !v.is_finite() || !(1.0..=1_000_000.0).contains(v))
                {
                    return Err("Text exceeds supported dimensions".into());
                }
                if let Some(baseline) = size.get(2) {
                    if !baseline.is_finite() || !(0.0..=1_000_000.0).contains(baseline) {
                        return Err("Invalid text baseline measurement".into());
                    }
                }
                s.measured_baseline = size.get(2).copied();
                if sizing == "width" && !(in_layout && s.layout_item.fill_width) {
                    s.width = size[0];
                }
                if sizing != "fixed" && !(in_layout && s.layout_item.fill_height) {
                    s.height = size[1];
                }
            }
            reflow(document);
            if document.shapes.iter().zip(before).all(|(s, (x, y, w, h))| {
                (s.x - x).abs() < 0.001
                    && (s.y - y).abs() < 0.001
                    && (s.width - w).abs() < 0.001
                    && (s.height - h).abs() < 0.001
            }) {
                return Ok(());
            }
        }
        Err("Text and frame sizing did not converge; use a fixed frame size".into())
    }

    fn descendants(&self, ids: &[u32]) -> Vec<u32> {
        let mut found: std::collections::HashSet<u32> = ids.iter().copied().collect();
        loop {
            let before = found.len();
            for s in &self.document.shapes {
                if s.parent_id != 0 && found.contains(&s.parent_id) {
                    found.insert(s.id);
                }
            }
            if found.len() == before {
                break;
            }
        }
        self.document
            .shapes
            .iter()
            .filter(|s| found.contains(&s.id))
            .map(|s| s.id)
            .collect()
    }
    fn prototype_hit_ids(&self, root: u32, x: f64, y: f64) -> [Vec<u32>; 5] {
        let Some(frame) = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == root && s.kind == "frame" && !s.hidden)
        else {
            return std::array::from_fn(|_| vec![]);
        };
        if !in_rounded_rect(frame, x, y) {
            return std::array::from_fn(|_| vec![]);
        }
        let mut document = self.document.clone();
        document.active_page = frame.page_id;
        document.shapes = components::subtree(&self.document.shapes, root);
        for s in &mut document.shapes {
            s.locked = false;
            if s.id == root {
                s.parent_id = 0;
                s.clip_content = true;
            }
        }
        let staged = Editor {
            text_measurer: None,
            document,
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        let mut result: [Vec<u32>; 5] = std::array::from_fn(|_| vec![]);
        let mut hit = staged.hit_test(x, y);
        while hit != 0 {
            let s = staged.document.shapes.iter().find(|s| s.id == hit).unwrap();
            for p in s.interactions() {
                if let Some(index) = ["click", "mouseenter", "mouseleave", "mousedown", "mouseup"]
                    .iter()
                    .position(|t| *t == p.trigger)
                {
                    result[index].push(s.id);
                }
            }
            hit = s.parent_id;
        }
        result
    }

    fn selection_ids(&self, json: &str) -> Result<Vec<u32>, String> {
        let ids: Vec<u32> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let unique: std::collections::HashSet<u32> = ids.iter().copied().collect();
        if ids.is_empty()
            || unique.len() != ids.len()
            || ids.iter().any(|id| {
                !self
                    .document
                    .shapes
                    .iter()
                    .any(|s| s.id == *id && s.page_id == self.document.active_page)
            })
        {
            return Err("Selection must contain unique layers from the current page".into());
        }
        Ok(ids)
    }

    fn commit(&mut self, mut document: Document) -> Result<(), String> {
        let removed: std::collections::HashSet<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| {
                s.kind == "frame"
                    && !document
                        .shapes
                        .iter()
                        .any(|n| n.id == s.id && n.kind == "frame")
            })
            .map(|s| s.id)
            .collect();
        for s in &mut document.shapes {
            s.retain_interactions(|p| {
                !(["navigate", "overlay", "swap"].contains(&p.action.as_str())
                    && removed.contains(&p.target))
            });
        }
        variants::prune(&mut document);
        component_properties::prune(&mut document);
        validate(&document)?;
        components::protect_structure(&self.document, &document)?;
        self.commit_document(document)
    }

    fn commit_document(&mut self, mut document: Document) -> Result<(), String> {
        validate(&document)?;
        variables::resolve(&mut document)?;
        validate(&document)?;
        components::validate_links(&document)?;
        if serde_json::to_string(&document)
            .map_err(|e| e.to_string())?
            .len()
            > 5_000_000
        {
            return Err("Document exceeds 5 MB; use smaller images or remove unused layers".into());
        }
        fn append(parent: u32, source: &[Shape], out: &mut Vec<Shape>) {
            for s in source.iter().filter(|s| s.parent_id == parent) {
                out.push(s.clone());
                append(s.id, source, out);
            }
        }
        let mut ordered = vec![];
        append(0, &document.shapes, &mut ordered);
        document.shapes = ordered;
        self.reflow_text(&mut document)?;
        let base = self.next_id.max(
            document
                .shapes
                .iter()
                .map(|s| s.id.max(s.group_id))
                .max()
                .unwrap_or(0)
                .saturating_add(1),
        );
        let mut next = base;
        let before_sync: std::collections::HashSet<_> = document
            .shapes
            .iter()
            .filter(|s| s.kind == "frame")
            .map(|s| s.id)
            .collect();
        components::sync(&mut document, &mut next)?;
        guide_styles::resolve(&mut document);
        variables::resolve(&mut document)?;
        let after_sync: std::collections::HashSet<_> = document
            .shapes
            .iter()
            .filter(|s| s.kind == "frame")
            .map(|s| s.id)
            .collect();
        for s in &mut document.shapes {
            s.retain_interactions(|p| {
                !(["navigate", "overlay", "swap"].contains(&p.action.as_str())
                    && before_sync.contains(&p.target)
                    && !after_sync.contains(&p.target))
            });
        }
        self.reflow_text(&mut document)?;
        validate(&document)?;
        components::validate_links(&document)?;
        if serde_json::to_string(&document)
            .map_err(|e| e.to_string())?
            .len()
            > 5_000_000
        {
            return Err("Document exceeds 5 MB; use smaller images or remove unused layers".into());
        }
        if next > base {
            self.next_id = next;
        }
        if document != self.document {
            self.undo.push(self.document.clone());
            if self.undo.len() > 100 {
                self.undo.remove(0);
            }
            self.redo.clear();
            self.document = document;
        }
        Ok(())
    }
}

impl Default for Editor {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl Editor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            text_measurer: None,
            document: Document {
                variables: variables::Variables::default(),
                version: 2,
                name: "Untitled design".into(),
                shapes: vec![],
                pages: default_pages(),
                active_page: 1,
                component_sets: vec![],
                guide_styles: vec![],
                component_properties: vec![],
            },
            undo: vec![],
            redo: vec![],
            next_id: 1,
            next_page_id: 2,
        }
    }

    pub fn snapshot(&self) -> String {
        serde_json::to_string(&self.document).unwrap()
    }

    pub fn set_text_measurer(&mut self, callback: js_sys::Function) {
        self.text_measurer = Some(callback);
    }

    // Font availability is environment state, not a user edit.
    pub fn refresh_text_layout(&mut self) -> Result<(), String> {
        let mut document = self.document.clone();
        self.reflow_text(&mut document)?;
        let mut next = self.next_id;
        components::sync(&mut document, &mut next)?;
        self.reflow_text(&mut document)?;
        validate(&document)?;
        self.next_id = next;
        self.document = document;
        Ok(())
    }

    pub fn copy_layers(&self, json: &str) -> Result<String, String> {
        let ids = self.descendants(&self.selection_ids(json)?);
        let shapes = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .map(|s| {
                let mut copy = s.clone();
                copy.component = None;
                copy.guide_style = 0;
                copy.variable_bindings.clear();
                copy.variable_modes.clear();
                copy.retain_interactions(|p| {
                    !(["navigate", "overlay", "swap"].contains(&p.action.as_str())
                        && !ids.contains(&p.target))
                });
                if !ids.contains(&copy.parent_id) {
                    copy.parent_id = 0;
                }
                copy.page_id = 1;
                copy
            })
            .collect();
        serde_json::to_string(&LayerClipboard {
            format: "pixlprfct.layers".into(),
            version: 1,
            shapes,
        })
        .map_err(|e| e.to_string())
    }

    pub fn paste_layers(
        &mut self,
        json: &str,
        dx: f64,
        dy: f64,
        parent: u32,
    ) -> Result<String, String> {
        if json.len() > 5_000_000 || !dx.is_finite() || !dy.is_finite() {
            return Err("Invalid clipboard size or position".into());
        }
        let mut payload: LayerClipboard = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if payload.format != "pixlprfct.layers" || payload.version != 1 || payload.shapes.is_empty()
        {
            return Err("Unsupported layer clipboard".into());
        }
        if parent != 0
            && !self.document.shapes.iter().any(|s| {
                s.id == parent && s.kind == "frame" && s.page_id == self.document.active_page
            })
        {
            return Err("Paste target must be a frame on this page".into());
        }
        for s in &mut payload.shapes {
            s.page_id = 1;
            s.component = None;
            s.guide_style = 0;
            s.variable_bindings.clear();
            s.variable_modes.clear();
        }
        validate(&Document {
            variables: variables::Variables::default(),
            version: 2,
            name: String::new(),
            shapes: payload.shapes.clone(),
            pages: default_pages(),
            active_page: 1,
            component_sets: vec![],
            guide_styles: vec![],
            component_properties: vec![],
        })?;
        let next = self
            .next_id
            .checked_add(payload.shapes.len() as u32)
            .ok_or("Shape ID limit reached")?;
        let ids: std::collections::HashMap<u32, u32> = payload
            .shapes
            .iter()
            .enumerate()
            .map(|(i, s)| (s.id, self.next_id + i as u32))
            .collect();
        let mut groups = std::collections::HashMap::new();
        let mut roots = vec![];
        let mut document = self.document.clone();
        for mut s in payload.shapes {
            for p in s.interactions_mut() {
                if ["navigate", "overlay", "swap"].contains(&p.action.as_str()) {
                    p.target = ids[&p.target];
                }
            }
            s.id = ids[&s.id];
            s.page_id = document.active_page;
            if s.parent_id == 0 {
                s.parent_id = parent;
                roots.push(s.id);
            } else {
                s.parent_id = ids[&s.parent_id];
            }
            if s.group_id > 0 {
                s.group_id = *groups.entry(s.group_id).or_insert(s.id);
            }
            s.x += dx;
            s.y += dy;
            document.shapes.push(s);
        }
        self.commit(document)?;
        self.next_id = self.next_id.max(next);
        Ok(serde_json::to_string(&roots).unwrap())
    }

    pub fn paste_into_frames(&mut self, json: &str, selection: &str) -> Result<String, String> {
        let ids = self.selection_ids(selection)?;
        let targets: Vec<Shape> = ids
            .iter()
            .map(|id| {
                self.document
                    .shapes
                    .iter()
                    .find(|s| s.id == *id)
                    .unwrap()
                    .clone()
            })
            .collect();
        for frame in &targets {
            if frame.kind != "frame" {
                return Err("Select only destination frames".into());
            }
            let mut node = Some(frame);
            while let Some(s) = node {
                if s.locked {
                    return Err("Unlock every destination frame and its parents".into());
                }
                node = self.document.shapes.iter().find(|p| p.id == s.parent_id);
            }
        }
        let mut template = Editor::new();
        template.paste_layers(json, 0.0, 0.0, 0)?;
        let shapes = &template.document.shapes;
        if self.document.shapes.len() + shapes.len() * targets.len() > 10_000 {
            return Err("Document layer limit reached".into());
        }
        let left = shapes
            .iter()
            .filter(|s| s.parent_id == 0)
            .map(|s| s.x)
            .fold(f64::INFINITY, f64::min);
        let top = shapes
            .iter()
            .filter(|s| s.parent_id == 0)
            .map(|s| s.y)
            .fold(f64::INFINITY, f64::min);
        let mut document = self.document.clone();
        let mut next = self.next_id;
        let mut roots = vec![];
        for target in targets {
            let end = next
                .checked_add(shapes.len() as u32)
                .ok_or("Shape ID limit reached")?;
            let mapping: std::collections::HashMap<u32, u32> = shapes
                .iter()
                .enumerate()
                .map(|(i, s)| (s.id, next + i as u32))
                .collect();
            let mut groups = std::collections::HashMap::new();
            for source in shapes {
                let mut s = source.clone();
                s.id = mapping[&source.id];
                s.page_id = document.active_page;
                s.x += target.x + 16.0 - left;
                s.y += target.y + 16.0 - top;
                if s.parent_id == 0 {
                    s.parent_id = target.id;
                    roots.push(s.id);
                } else {
                    s.parent_id = mapping[&s.parent_id];
                }
                if s.group_id > 0 {
                    s.group_id = *groups.entry(s.group_id).or_insert(s.id);
                }
                for p in s.interactions_mut() {
                    if ["navigate", "overlay", "swap"].contains(&p.action.as_str()) {
                        p.target = mapping[&p.target];
                    }
                }
                document.shapes.push(s);
            }
            next = end;
        }
        self.commit(document)?;
        self.next_id = self.next_id.max(next);
        Ok(serde_json::to_string(&roots).unwrap())
    }

    pub fn paste_replace(&mut self, json: &str, selection: &str) -> Result<String, String> {
        let selected = self.selection_ids(selection)?;
        let removed = self.descendants(&selected);
        let targets: Vec<Shape> = self
            .document
            .shapes
            .iter()
            .filter(|s| selected.contains(&s.id) && !removed.contains(&s.parent_id))
            .cloned()
            .collect();
        for target in &targets {
            let mut node = Some(target);
            while let Some(s) = node {
                if s.locked {
                    return Err("Cannot replace a locked layer".into());
                }
                node = self.document.shapes.iter().find(|p| p.id == s.parent_id);
            }
        }
        // Validate and normalize the portable payload before allocating any document IDs.
        let mut template = Editor::new();
        template.paste_layers(json, 0.0, 0.0, 0)?;
        let shapes = &template.document.shapes;
        let left = shapes
            .iter()
            .filter(|s| s.parent_id == 0)
            .map(|s| s.x)
            .fold(f64::INFINITY, f64::min);
        let top = shapes
            .iter()
            .filter(|s| s.parent_id == 0)
            .map(|s| s.y)
            .fold(f64::INFINITY, f64::min);
        if self.document.shapes.len() - removed.len() + shapes.len() * targets.len() > 10_000 {
            return Err("Document layer limit reached".into());
        }
        let mut document = self.document.clone();
        document.shapes.clear();
        let mut next = self.next_id;
        let mut roots = vec![];
        for original in &self.document.shapes {
            if let Some(target) = targets.iter().find(|s| s.id == original.id) {
                let end = next
                    .checked_add(shapes.len() as u32)
                    .ok_or("Shape ID limit reached")?;
                let ids: std::collections::HashMap<u32, u32> = shapes
                    .iter()
                    .enumerate()
                    .map(|(i, s)| (s.id, next + i as u32))
                    .collect();
                let mut groups = std::collections::HashMap::new();
                for source in shapes {
                    let mut s = source.clone();
                    s.id = ids[&source.id];
                    s.page_id = target.page_id;
                    s.x += target.x - left;
                    s.y += target.y - top;
                    if source.parent_id == 0 {
                        s.parent_id = target.parent_id;
                        s.layout_item = target.layout_item.clone();
                        s.constraints = target.constraints.clone();
                        roots.push(s.id);
                    } else {
                        s.parent_id = ids[&source.parent_id];
                    }
                    if s.group_id > 0 {
                        s.group_id = *groups.entry(s.group_id).or_insert(s.id);
                    }
                    if source.parent_id == 0 && target.group_id > 0 {
                        s.group_id = target.group_id;
                        s.group_name = target.group_name.clone();
                    }
                    for p in s.interactions_mut() {
                        if ["navigate", "overlay", "swap"].contains(&p.action.as_str()) {
                            p.target = ids[&p.target];
                        }
                    }
                    document.shapes.push(s);
                }
                next = end;
            } else if !removed.contains(&original.id) {
                document.shapes.push(original.clone());
            }
        }
        self.commit(document)?;
        self.next_id = self.next_id.max(next);
        Ok(serde_json::to_string(&roots).unwrap())
    }

    pub fn load(&mut self, json: &str) -> Result<(), String> {
        if json.len() > 5_000_000 {
            return Err("Document exceeds 5 MB".into());
        }
        let mut document: Document = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if document.version == 1 {
            document.version = 2;
            document.pages = default_pages();
            document.active_page = 1;
            for shape in &mut document.shapes {
                shape.page_id = 1;
            }
        }
        validate(&document)?;
        // Preserve legacy text size and wrapping when opening older documents.
        for shape in &mut document.shapes {
            if shape.kind == "text" && shape.typography.is_none() {
                shape.typography = Some(Typography {
                    font_size: (shape.height * 0.66).clamp(10.0, 72.0),
                    wrap: false,
                    ..Typography::default()
                });
            }
        }
        self.next_page_id = self
            .next_page_id
            .max(document.pages.iter().map(|p| p.id).max().unwrap_or(1) + 1);
        self.next_id = self.next_id.max(
            document
                .shapes
                .iter()
                .map(|s| s.id.max(s.group_id))
                .max()
                .unwrap_or(0)
                + 1,
        );
        self.commit_document(document)
    }

    pub fn add(&mut self, kind: &str, x: f64, y: f64) -> Result<u32, String> {
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let id = self.next_id;
        let mut document = self.document.clone();
        let (width, height, fill) = match kind {
            "frame" => (600.0, 400.0, "#ffffff"),
            "text" => (240.0, 56.0, "#000000"),
            _ => (160.0, 120.0, "#d9d9d9"),
        };
        document.shapes.push(Shape {
            aspect_ratio_locked: false,
            variable_bindings: Default::default(),
            variable_modes: Default::default(),
            id,
            page_id: document.active_page,
            group_id: 0,
            group_name: String::new(),
            parent_id: 0,
            clip_content: false,
            image: None,
            constraints: Constraints::default(),
            appearance: None,
            auto_layout: None,
            layout_grids: vec![],
            guide_style: 0,
            prototype: None,
            additional_interactions: vec![],
            flow_name: String::new(),
            layout_item: LayoutItem::default(),
            kind: kind.into(),
            name: format!("{} {}", kind, id),
            x,
            y,
            width,
            height,
            fill: fill.into(),
            text: "Your next big idea".into(),
            hidden: false,
            locked: false,
            component: None,
            points: vec![],
            handles: vec![],
            closed: false,
            stroke_width: default_stroke(),
            typography: if kind == "text" {
                Some(Typography::default())
            } else {
                None
            },
            measured_baseline: None,
        });
        self.commit(document)?;
        self.next_id += 1;
        Ok(id)
    }

    pub fn join_paths(&mut self, selection: &str) -> Result<u32, String> {
        let ids = self.selection_ids(selection)?;
        if ids.len() != 2 {
            return Err("Select exactly two open paths".into());
        }
        let a = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == ids[0])
            .unwrap();
        let b = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == ids[1])
            .unwrap();
        if a.parent_id != b.parent_id {
            return Err("Paths must share the same parent".into());
        }
        for original in [a, b] {
            let mut node = Some(original);
            while let Some(s) = node {
                if s.locked {
                    return Err("Unlock both paths and their parent before joining".into());
                }
                node = self.document.shapes.iter().find(|p| p.id == s.parent_id);
            }
        }
        let mut joined = path_join::join(a, b)?;
        components::record_overrides(a, &mut joined)?;
        let mut document = self.document.clone();
        document.shapes.retain(|s| s.id != ids[1]);
        let i = document.shapes.iter().position(|s| s.id == ids[0]).unwrap();
        document.shapes[i] = joined;
        self.commit(document)?;
        Ok(ids[0])
    }

    pub fn split_path(&mut self, id: u32, index: usize) -> Result<String, String> {
        self.selection_ids(&serde_json::to_string(&vec![id]).unwrap())?;
        let original = self.document.shapes.iter().find(|s| s.id == id).unwrap();
        let mut node = Some(original);
        while let Some(s) = node {
            if s.locked {
                return Err("Unlock the path or its parent before splitting".into());
            }
            node = self.document.shapes.iter().find(|p| p.id == s.parent_id);
        }
        let mut parts = path_split::split(original, index)?;
        if parts.len() > 1 && self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        components::record_overrides(original, &mut parts[0])?;
        let mut ids = vec![id];
        if parts.len() > 1 {
            parts[1].id = self.next_id;
            parts[1].component = None;
            parts[1].name = format!("{} split", original.name);
            ids.push(self.next_id);
        }
        let mut document = self.document.clone();
        let position = document.shapes.iter().position(|s| s.id == id).unwrap();
        document.shapes.splice(position..=position, parts);
        self.commit(document)?;
        if ids.len() > 1 {
            self.next_id = self.next_id.max(ids[1] + 1);
        }
        Ok(serde_json::to_string(&ids).unwrap())
    }

    pub fn insert(&mut self, json: &str) -> Result<u32, String> {
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let mut shape: Shape = serde_json::from_str(json).map_err(|e| e.to_string())?;
        shape.id = self.next_id;
        shape.page_id = self.document.active_page;
        shape.group_id = 0;
        shape.group_name.clear();
        let id = shape.id;
        let mut document = self.document.clone();
        document.shapes.push(shape);
        self.commit(document)?;
        self.next_id += 1;
        Ok(id)
    }

    pub fn update(&mut self, json: &str) -> Result<(), String> {
        let shape: Shape = serde_json::from_str(json).map_err(|e| e.to_string())?;
        self.update_many(&serde_json::to_string(&vec![shape]).unwrap())
    }

    pub fn update_many(&mut self, json: &str) -> Result<(), String> {
        let shapes: Vec<Shape> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let ids: Vec<u32> = shapes.iter().map(|s| s.id).collect();
        self.selection_ids(&serde_json::to_string(&ids).unwrap())?;
        let mut document = self.document.clone();
        for mut shape in shapes {
            if shape.page_id != document.active_page {
                return Err("Cannot move a layer to another page through a selection edit".into());
            }
            let id = shape.id;
            components::record_overrides(
                document.shapes.iter().find(|s| s.id == id).unwrap(),
                &mut shape,
            )?;
            *document.shapes.iter_mut().find(|s| s.id == id).unwrap() = shape;
        }
        validate(&document)?;
        component_properties::propagate_edits(&self.document, &mut document, &ids)?;
        // The committed scene is parent-first. Explicit edits (including Scale's
        // entire subtree) win; other children inherit their immediate frame's change.
        for i in 0..document.shapes.len() {
            let child = &document.shapes[i];
            if ids.contains(&child.id) || child.parent_id == 0 {
                continue;
            }
            let old = self
                .document
                .shapes
                .iter()
                .find(|s| s.id == child.parent_id)
                .unwrap();
            let parent = document
                .shapes
                .iter()
                .find(|s| s.id == child.parent_id)
                .unwrap();
            if old.auto_layout.is_some() && !child.layout_item.absolute {
                let (x, y) = (child.x + parent.x - old.x, child.y + parent.y - old.y);
                document.shapes[i].x = x;
                document.shapes[i].y = y;
                continue;
            }
            let (x, width) = constrain_axis(
                child.x,
                child.width,
                old.x,
                old.width,
                parent.x,
                parent.width,
                &child.constraints.horizontal,
            );
            let (y, height) = constrain_axis(
                child.y,
                child.height,
                old.y,
                old.height,
                parent.y,
                parent.height,
                &child.constraints.vertical,
            );
            let child = &mut document.shapes[i];
            child.x = x;
            child.y = y;
            child.width = width;
            child.height = height;
        }
        self.commit(document)
    }

    pub fn preview_update_many(&self, json: &str) -> Result<String, String> {
        let mut staged = Editor {
            text_measurer: self.text_measurer.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        staged.update_many(json)?;
        Ok(staged.snapshot())
    }

    pub fn preview_layout_update(&self, json: &str, id: u32) -> Result<String, String> {
        let mut staged = Editor {
            text_measurer: self.text_measurer.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        staged.update_many(json)?;
        let grid: serde_json::Value =
            serde_json::from_str(&staged.grid_layout(id)?).map_err(|e| e.to_string())?;
        Ok(serde_json::json!({"document":staged.document,"grid":grid}).to_string())
    }

    pub fn remove_many(&mut self, json: &str) -> Result<(), String> {
        let ids = self.descendants(&self.selection_ids(json)?);
        let mut document = self.document.clone();
        document.shapes.retain(|s| !ids.contains(&s.id));
        self.commit(document)
    }

    pub fn duplicate_many(&mut self, json: &str) -> Result<String, String> {
        let ids = self.descendants(&self.selection_ids(json)?);
        let next_id = self
            .next_id
            .checked_add(ids.len() as u32)
            .ok_or("Shape ID limit reached")?;
        let mut document = self.document.clone();
        let mut created = vec![];
        let mut copied_groups = std::collections::HashMap::new();
        let mapping: std::collections::HashMap<u32, u32> = ids
            .iter()
            .enumerate()
            .map(|(i, id)| (*id, self.next_id + i as u32))
            .collect();
        // Copy in document order, independent of the order of selection clicks.
        for shape in &self.document.shapes {
            if ids.contains(&shape.id) {
                let mut copy = shape.clone();
                copy.id = self.next_id + created.len() as u32;
                copy.parent_id = *mapping.get(&copy.parent_id).unwrap_or(&copy.parent_id);
                for p in copy.interactions_mut() {
                    if ["navigate", "overlay", "swap"].contains(&p.action.as_str()) {
                        p.target = *mapping.get(&p.target).unwrap_or(&p.target);
                    }
                }
                if copy.group_id > 0 {
                    copy.group_id = *copied_groups.entry(copy.group_id).or_insert(copy.id);
                }
                copy.x += 24.0;
                copy.y += 24.0;
                created.push(copy.id);
                document.shapes.push(copy);
            }
        }
        component_properties::duplicate_definitions(&mut document, &mapping)?;
        self.commit(document)?;
        self.next_id = self.next_id.max(next_id);
        Ok(serde_json::to_string(&created).unwrap())
    }

    pub fn move_into(&mut self, json: &str, parent: u32) -> Result<(), String> {
        let shapes: Vec<Shape> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let ids: Vec<u32> = shapes.iter().map(|s| s.id).collect();
        let mut staged = Editor {
            text_measurer: self.text_measurer.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        staged.update_many(json)?;
        staged.reparent_many(&serde_json::to_string(&ids).unwrap(), parent)?;
        if let Some(layout) = staged
            .document
            .shapes
            .iter()
            .find(|s| s.id == parent)
            .and_then(|s| s.auto_layout.clone())
        {
            let roots: Vec<_> = shapes
                .iter()
                .filter(|s| !ids.contains(&s.parent_id) && !s.layout_item.absolute)
                .collect();
            if !roots.is_empty() {
                let x = roots.iter().map(|s| s.x + s.width / 2.0).sum::<f64>() / roots.len() as f64;
                let y =
                    roots.iter().map(|s| s.y + s.height / 2.0).sum::<f64>() / roots.len() as f64;
                let target = if layout.direction == "grid" {
                    // Reserve dropped cells before the remaining siblings so a
                    // previously pinned child cannot displace the dragged one.
                    for root in &roots {
                        if let Some((column, row)) = grid::drop_cell(
                            &self.document,
                            parent,
                            root.x + root.width / 2.0,
                            root.y + root.height / 2.0,
                        ) {
                            if let Some(s) =
                                staged.document.shapes.iter_mut().find(|s| s.id == root.id)
                            {
                                let previous = s.clone();
                                let cell =
                                    s.layout_item.grid_cell.get_or_insert_with(Default::default);
                                cell.column = Some(column);
                                cell.row = Some(row);
                                components::record_overrides(&previous, s)?;
                            }
                        }
                    }
                    staged
                        .document
                        .shapes
                        .iter()
                        .find(|s| s.parent_id == parent && !ids.contains(&s.id))
                        .map(|s| s.id)
                } else {
                    layout::drop_before(&self.document, parent, &ids, x, y)
                };
                let root_ids: Vec<_> = roots.iter().map(|s| s.id).collect();
                let moving: Vec<_> = staged
                    .document
                    .shapes
                    .iter()
                    .filter(|s| root_ids.contains(&s.id))
                    .cloned()
                    .collect();
                staged.document.shapes.retain(|s| !root_ids.contains(&s.id));
                let index = target
                    .and_then(|id| staged.document.shapes.iter().position(|s| s.id == id))
                    .unwrap_or(staged.document.shapes.len());
                staged.document.shapes.splice(index..index, moving);
            }
        }
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(())
    }

    pub fn auto_layout_selection(&mut self, json: &str) -> Result<u32, String> {
        let ids = self.selection_ids(json)?;
        if ids.len() == 1 {
            let s = self
                .document
                .shapes
                .iter()
                .find(|s| s.id == ids[0])
                .unwrap();
            if s.kind == "frame" {
                if s.auto_layout.is_some() {
                    return Ok(ids[0]);
                }
                let mut changed = s.clone();
                changed.auto_layout = Some(AutoLayout::default());
                self.update(&serde_json::to_string(&changed).unwrap())?;
                return Ok(ids[0]);
            }
        }
        let selected: Vec<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .collect();
        let parent = selected[0].parent_id;
        if selected.iter().any(|s| s.parent_id != parent) {
            return Err("Auto layout selection must share a parent frame".into());
        }
        let x = selected.iter().map(|s| s.x).fold(f64::INFINITY, f64::min) - 16.0;
        let y = selected.iter().map(|s| s.y).fold(f64::INFINITY, f64::min) - 16.0;
        let width = selected
            .iter()
            .map(|s| s.x + s.width)
            .fold(f64::NEG_INFINITY, f64::max)
            - x
            + 16.0;
        let height = selected
            .iter()
            .map(|s| s.y + s.height)
            .fold(f64::NEG_INFINITY, f64::max)
            - y
            + 16.0;
        let mut staged = Editor {
            text_measurer: self.text_measurer.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        let id = staged.add("frame", x, y);
        let frame_id = id?;
        let frame = staged
            .document
            .shapes
            .iter_mut()
            .find(|s| s.id == frame_id)
            .unwrap();
        frame.parent_id = parent;
        frame.name = "Auto layout".into();
        frame.width = width;
        frame.height = height;
        frame.auto_layout = Some(AutoLayout::default());
        for shape in staged
            .document
            .shapes
            .iter_mut()
            .filter(|s| ids.contains(&s.id))
        {
            shape.parent_id = frame_id;
        }
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(frame_id)
    }

    pub fn reparent_many(&mut self, json: &str, parent: u32) -> Result<(), String> {
        let ids = self.selection_ids(json)?;
        let mut document = self.document.clone();
        let groups: Vec<u32> = document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id) && s.group_id > 0)
            .map(|s| s.group_id)
            .collect();
        let moved: Vec<u32> = document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id) || groups.contains(&s.group_id))
            .map(|s| s.id)
            .collect();
        for shape in document.shapes.iter_mut().filter(|s| moved.contains(&s.id)) {
            // Selected descendants stay attached to a selected ancestor.
            let mut ancestor = shape.parent_id;
            let mut nested = false;
            while ancestor != 0 {
                if moved.contains(&ancestor) {
                    nested = true;
                    break;
                }
                ancestor = self
                    .document
                    .shapes
                    .iter()
                    .find(|s| s.id == ancestor)
                    .unwrap()
                    .parent_id;
            }
            if !nested {
                shape.parent_id = parent;
            }
        }
        self.commit(document)
    }

    pub fn group_many(&mut self, json: &str) -> Result<u32, String> {
        let ids = self.selection_ids(json)?;
        if ids.len() < 2 {
            return Err("Select at least two layers to group".into());
        }
        if self.next_id == u32::MAX {
            return Err("Group ID limit reached".into());
        }
        let group = self.next_id;
        let mut document = self.document.clone();
        for shape in document.shapes.iter_mut().filter(|s| ids.contains(&s.id)) {
            shape.group_id = group;
            shape.group_name = format!("Group {}", group);
        }
        // A group occupies one contiguous paint stack at its topmost member.
        let top = document
            .shapes
            .iter()
            .rposition(|s| ids.contains(&s.id))
            .unwrap();
        let slot = document.shapes[..=top]
            .iter()
            .filter(|s| !ids.contains(&s.id))
            .count();
        let members: Vec<Shape> = document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .cloned()
            .collect();
        document.shapes.retain(|s| !ids.contains(&s.id));
        document.shapes.splice(slot..slot, members);
        self.commit(document)?;
        self.next_id += 1;
        Ok(group)
    }

    pub fn ungroup_many(&mut self, json: &str) -> Result<(), String> {
        let ids = self.selection_ids(json)?;
        let groups: Vec<u32> = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id) && s.group_id > 0)
            .map(|s| s.group_id)
            .collect();
        let mut document = self.document.clone();
        for shape in document
            .shapes
            .iter_mut()
            .filter(|s| s.page_id == document.active_page && groups.contains(&s.group_id))
        {
            shape.group_id = 0;
            shape.group_name.clear();
        }
        self.commit(document)
    }

    pub fn rename_group(&mut self, id: u32, name: &str) -> Result<(), String> {
        if id == 0 || name.trim().is_empty() || name.len() > 256 {
            return Err("Enter a group name between 1 and 256 characters".into());
        }
        let mut document = self.document.clone();
        let mut found = false;
        for shape in document
            .shapes
            .iter_mut()
            .filter(|s| s.page_id == document.active_page && s.group_id == id)
        {
            shape.group_name = name.trim().into();
            found = true;
        }
        if !found {
            return Err("Group not found".into());
        }
        self.commit(document)
    }

    pub fn align_many(&mut self, json: &str, alignment: &str) -> Result<(), String> {
        let ids = self.selection_ids(json)?;
        let mut document = self.document.clone();
        let mut shapes: Vec<&Shape> = document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .collect();
        if shapes.len() == 1 {
            let child = shapes[0];
            let parent = document
                .shapes
                .iter()
                .find(|s| s.id == child.parent_id)
                .ok_or("Select a layer inside a frame, or multiple layers to align")?;
            if parent.auto_layout.is_some() && !child.layout_item.absolute {
                return Err("Use the parent auto-layout alignment for flow children".into());
            }
            shapes = vec![parent];
        }
        let left = shapes.iter().map(|s| s.x).fold(f64::INFINITY, f64::min);
        let top = shapes.iter().map(|s| s.y).fold(f64::INFINITY, f64::min);
        let right = shapes
            .iter()
            .map(|s| s.x + s.width)
            .fold(f64::NEG_INFINITY, f64::max);
        let bottom = shapes
            .iter()
            .map(|s| s.y + s.height)
            .fold(f64::NEG_INFINITY, f64::max);
        for shape in document.shapes.iter_mut().filter(|s| ids.contains(&s.id)) {
            match alignment {
                "left" => shape.x = left,
                "center" => shape.x = (left + right - shape.width) / 2.0,
                "right" => shape.x = right - shape.width,
                "top" => shape.y = top,
                "middle" => shape.y = (top + bottom - shape.height) / 2.0,
                "bottom" => shape.y = bottom - shape.height,
                _ => return Err("Unknown alignment".into()),
            }
        }
        let changed: Vec<Shape> = document
            .shapes
            .into_iter()
            .filter(|s| ids.contains(&s.id))
            .collect();
        self.update_many(&serde_json::to_string(&changed).unwrap())
    }

    pub fn distribute_many(&mut self, json: &str, axis: &str) -> Result<(), String> {
        let ids = self.selection_ids(json)?;
        if ids.len() < 3 {
            return Err("Select at least three layers to distribute".into());
        }
        if axis != "horizontal" && axis != "vertical" {
            return Err("Unknown distribution axis".into());
        }
        let horizontal = axis == "horizontal";
        let mut document = self.document.clone();
        let mut shapes: Vec<Shape> = document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .cloned()
            .collect();
        let pos = |s: &Shape| if horizontal { s.x } else { s.y };
        let size = |s: &Shape| if horizontal { s.width } else { s.height };
        shapes.sort_by(|a, b| pos(a).total_cmp(&pos(b)));
        let first = pos(&shapes[0]);
        let last = shapes.last().unwrap();
        let gap = (pos(last) + size(last) - first - shapes.iter().map(size).sum::<f64>())
            / (shapes.len() - 1) as f64;
        let mut cursor = first;
        for shape in shapes.iter_mut() {
            if horizontal {
                shape.x = cursor;
            } else {
                shape.y = cursor;
            }
            cursor += size(shape) + gap;
        }
        for shape in shapes {
            let id = shape.id;
            *document.shapes.iter_mut().find(|s| s.id == id).unwrap() = shape;
        }
        let changed: Vec<Shape> = document
            .shapes
            .into_iter()
            .filter(|s| ids.contains(&s.id))
            .collect();
        self.update_many(&serde_json::to_string(&changed).unwrap())
    }

    pub fn remove(&mut self, id: u32) -> Result<(), String> {
        self.remove_many(&serde_json::to_string(&vec![id]).unwrap())
    }

    pub fn duplicate(&mut self, id: u32) -> Result<u32, String> {
        if self
            .document
            .shapes
            .iter()
            .any(|s| s.id == id && s.kind == "frame")
        {
            let result = self.duplicate_many(&serde_json::to_string(&vec![id]).unwrap())?;
            let ids: Vec<u32> = serde_json::from_str(&result).unwrap();
            return Ok(ids[0]);
        }
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let mut shape = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id && s.page_id == self.document.active_page)
            .ok_or("Shape not found")?
            .clone();
        shape.id = self.next_id;
        shape.x += 24.0;
        shape.group_id = 0;
        shape.group_name.clear();
        shape.y += 24.0;
        let id = shape.id;
        let mut document = self.document.clone();
        document.shapes.push(shape);
        self.commit(document)?;
        self.next_id += 1;
        Ok(id)
    }

    pub fn reorder(&mut self, id: u32, delta: i32) -> Result<(), String> {
        let mut document = self.document.clone();
        let parent = document
            .shapes
            .iter()
            .find(|s| s.id == id && s.page_id == document.active_page)
            .ok_or("Shape not found")?
            .parent_id;
        let indices: Vec<usize> = document
            .shapes
            .iter()
            .enumerate()
            .filter(|(_, s)| s.page_id == document.active_page && s.parent_id == parent)
            .map(|(i, _)| i)
            .collect();
        let index = indices
            .iter()
            .position(|&i| document.shapes[i].id == id)
            .ok_or("Shape not found")?;
        let target = (index as i64 + delta as i64).clamp(0, indices.len() as i64 - 1) as usize;
        // Rotate only this page's slots, leaving every other page's order intact.
        let mut shapes: Vec<Shape> = indices
            .iter()
            .map(|&i| document.shapes[i].clone())
            .collect();
        let shape = shapes.remove(index);
        shapes.insert(target, shape);
        for (&i, shape) in indices.iter().zip(shapes) {
            document.shapes[i] = shape;
        }
        self.commit(document)
    }

    // Presentation ignores editing locks and isolates the displayed frame. Its
    // viewport always clips descendants, even when canvas overflow is enabled.
    pub fn prototype_hit_test(&self, root: u32, x: f64, y: f64) -> u32 {
        self.prototype_hit_ids(root, x, y)[0]
            .first()
            .copied()
            .unwrap_or(0)
    }

    pub fn grid_layout(&self, id: u32) -> Result<String, String> {
        let frame = self
            .document
            .shapes
            .iter()
            .find(|s| {
                s.id == id
                    && s.auto_layout
                        .as_ref()
                        .is_some_and(|l| l.direction == "grid")
            })
            .ok_or("Select a grid auto-layout frame")?;
        let items: Vec<_> = self
            .document
            .shapes
            .iter()
            .enumerate()
            .filter(|(_, s)| s.parent_id == id && !s.hidden && !s.layout_item.absolute)
            .map(|(i, _)| i)
            .collect();
        serde_json::to_string(&grid::plan(
            &self.document.shapes,
            frame,
            &items,
            false,
            false,
        ))
        .map_err(|e| e.to_string())
    }
    pub fn shift_grid_track(
        &mut self,
        id: u32,
        axis: &str,
        index: usize,
        delta: i32,
    ) -> Result<usize, String> {
        let (changes, next) = grid::shift_track(&self.document, id, axis, index, delta)?;
        if changes.is_empty() {
            return Ok(next);
        }
        self.update_many(&serde_json::to_string(&changes).map_err(|e| e.to_string())?)?;
        Ok(next)
    }
    pub fn delete_grid_track(&mut self, id: u32, axis: &str, index: usize) -> Result<(), String> {
        let changes = grid::delete_track(&self.document, id, axis, index)?;
        self.update_many(&serde_json::to_string(&changes).map_err(|e| e.to_string())?)
    }
    pub fn prototype_hits(&self, root: u32, x: f64, y: f64) -> String {
        let ids = self.prototype_hit_ids(root, x, y);
        serde_json::json!({"click":ids[0].first().copied().unwrap_or(0),"mouseenter":ids[1],"mouseleave":ids[2]}).to_string()
    }

    pub fn prototype_pointer_hits(&self, root: u32, x: f64, y: f64) -> String {
        let ids = self.prototype_hit_ids(root, x, y);
        serde_json::json!({"click":ids[0].first().copied().unwrap_or(0),"mouseenter":ids[1],"mouseleave":ids[2],"mousedown":ids[3].first().copied().unwrap_or(0),"mouseup":ids[4].first().copied().unwrap_or(0)}).to_string()
    }

    pub fn hit_test(&self, x: f64, y: f64) -> u32 {
        stacking::paint_order(&self.document.shapes)
            .into_iter()
            .rev()
            .find(|s| {
                if s.page_id != self.document.active_page || s.hidden || s.locked {
                    return false;
                }
                let mut parent = s.parent_id;
                while parent != 0 {
                    let ancestor = self
                        .document
                        .shapes
                        .iter()
                        .find(|s| s.id == parent)
                        .unwrap();
                    if ancestor.hidden
                        || ancestor.locked
                        || (ancestor.clip_content && !in_rounded_rect(ancestor, x, y))
                    {
                        return false;
                    }
                    parent = ancestor.parent_id;
                }
                if stroke_alignment::hit(s, x, y) {
                    return true;
                }
                if !s.points.is_empty() {
                    if stroke_tips::hit(s, x, y) {
                        return true;
                    }
                    let margin = stroke_alignment::reach(s).max(4.0);
                    if x < s.x - margin
                        || x > s.x + s.width + margin
                        || y < s.y - margin
                        || y > s.y + s.height + margin
                    {
                        return false;
                    }
                    let points = path_polyline(s);
                    let mut inside = false;
                    let count = if s.closed {
                        points.len()
                    } else {
                        points.len() - 1
                    };
                    for i in 0..count {
                        let a = points[i];
                        let b = points[(i + 1) % points.len()];
                        let dx = b[0] - a[0];
                        let dy = b[1] - a[1];
                        let t = (((x - a[0]) * dx + (y - a[1]) * dy)
                            / (dx * dx + dy * dy).max(0.000001))
                        .clamp(0.0, 1.0);
                        if (x - a[0] - t * dx).hypot(y - a[1] - t * dy) <= margin {
                            return true;
                        }
                        if s.closed
                            && ((a[1] > y) != (b[1] > y))
                            && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]
                        {
                            inside = !inside;
                        }
                    }
                    return inside;
                }
                if x < s.x || x > s.x + s.width || y < s.y || y > s.y + s.height {
                    return false;
                }
                if s.kind == "ellipse" {
                    let dx = (x - s.x - s.width / 2.0) / (s.width / 2.0);
                    let dy = (y - s.y - s.height / 2.0) / (s.height / 2.0);
                    dx * dx + dy * dy <= 1.0
                } else {
                    in_rounded_rect(s, x, y)
                }
            })
            .map(|s| s.id)
            .unwrap_or(0)
    }

    pub fn add_page(&mut self) -> Result<u32, String> {
        if self.next_page_id == u32::MAX {
            return Err("Page ID limit reached".into());
        }
        let id = self.next_page_id;
        let mut document = self.document.clone();
        let mut number = 1;
        while document
            .pages
            .iter()
            .any(|p| p.name == format!("Page {}", number))
        {
            number += 1;
        }
        document.pages.push(Page {
            id,
            name: format!("Page {}", number),
        });
        document.active_page = id;
        self.commit(document)?;
        self.next_page_id += 1;
        Ok(id)
    }

    pub fn select_page(&mut self, id: u32) -> Result<(), String> {
        if !self.document.pages.iter().any(|p| p.id == id) {
            return Err("Page not found".into());
        }
        // Navigation is not an edit and must not consume undo or discard redo.
        self.document.active_page = id;
        Ok(())
    }

    pub fn rename_page(&mut self, id: u32, name: &str) -> Result<(), String> {
        let mut document = self.document.clone();
        let page = document
            .pages
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or("Page not found")?;
        page.name = name.trim().into();
        self.commit(document)
    }

    pub fn delete_page(&mut self, id: u32) -> Result<(), String> {
        if self.document.pages.len() == 1 {
            return Err("Keep at least one page in your document".into());
        }
        let mut document = self.document.clone();
        let index = document
            .pages
            .iter()
            .position(|p| p.id == id)
            .ok_or("Page not found")?;
        document.pages.remove(index);
        document.shapes.retain(|s| s.page_id != id);
        if document.active_page == id {
            document.active_page = document.pages[index.min(document.pages.len() - 1)].id;
        }
        self.commit(document)
    }

    pub fn undo(&mut self) {
        if let Some(document) = self.undo.pop() {
            self.redo.push(self.document.clone());
            self.document = document;
        }
    }
    pub fn redo(&mut self) {
        if let Some(document) = self.redo.pop() {
            self.undo.push(self.document.clone());
            self.document = document;
        }
    }
    pub fn can_undo(&self) -> bool {
        !self.undo.is_empty()
    }
    pub fn can_redo(&self) -> bool {
        !self.redo.is_empty()
    }
    pub fn clear_history(&mut self) {
        self.undo.clear();
        self.redo.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn history_restores_edits_and_invalidates_redo() {
        let mut editor = Editor::new();
        let id = editor.add("rectangle", 10.0, 20.0).unwrap();
        editor.remove(id).unwrap();
        editor.undo();
        assert_eq!(editor.hit_test(20.0, 30.0), id);
        editor.undo();
        editor.add("ellipse", 10.0, 20.0).unwrap();
        assert!(!editor.can_redo());
    }
    #[test]
    fn load_is_atomic_and_roundtrips() {
        let mut editor = Editor::new();
        editor.add("rectangle", 0.0, 0.0).unwrap();
        let original = editor.snapshot();
        assert!(editor
            .load(&original.replace("#d9d9d9", "invalid"))
            .is_err());
        assert_eq!(editor.snapshot(), original);
        let mut restored = Editor::new();
        restored.load(&original).unwrap();
        assert_eq!(restored.snapshot(), original);
        assert_eq!(restored.add("text", 0.0, 0.0).unwrap(), 2);
    }
    #[test]
    fn hit_testing_respects_ellipses_visibility_and_order() {
        let mut editor = Editor::new();
        let back = editor.add("rectangle", 0.0, 0.0).unwrap();
        let front = editor.add("ellipse", 0.0, 0.0).unwrap();
        assert_eq!(editor.hit_test(0.0, 0.0), back);
        assert_eq!(editor.hit_test(80.0, 60.0), front);
        editor.reorder(front, -1).unwrap();
        assert_eq!(editor.hit_test(80.0, 60.0), back);
        let mut shape = editor.document.shapes[1].clone();
        shape.hidden = true;
        editor
            .update(&serde_json::to_string(&shape).unwrap())
            .unwrap();
        assert_eq!(editor.hit_test(80.0, 60.0), front);
    }
}
mod component_properties;
mod components;
mod layout;
mod variants;
use layout::reflow;
