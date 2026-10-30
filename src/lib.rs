mod layer_drop;
mod rotation;
mod starter_defaults;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
mod arrangement;
mod editor_tools;
mod effect_styles;
mod grid;
mod groups;
mod guide_styles;
mod paint;
mod path_join;
mod path_split;
mod stacking;
mod stroke_alignment;
mod stroke_tips;
mod text_styles;
mod variables;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Shape {
    #[serde(default)]
    pub layout_class: String,
    #[serde(default)]
    pub layout_class_generated: bool,
    #[serde(default)]
    pub layout_media: Vec<serde_json::Value>,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub custom_css: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub breakpoint_original: Option<serde_json::Value>,
    #[serde(default)]
    pub device_chrome: String,
    #[serde(default)]
    pub device_chrome_breakpoints: Option<serde_json::Value>,
    #[serde(default)]
    pub device_chrome_hidden: bool,
    #[serde(default)]
    pub control: Option<Control>,
    #[serde(default)]
    pub control_state: String,
    #[serde(default)]
    pub behaviors: Vec<Behavior>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub editor_meta: Option<editor_tools::EditorMeta>,
    #[serde(default)]
    pub border_widths: Option<[f64; 4]>,
    #[serde(default)]
    pub rotation: f64,
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
    pub effect_style: u32,
    #[serde(default)]
    pub text_style: u32,
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

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Behavior {
    pub id: String,
    pub name: String,
    pub code: String,
    pub trigger: String,
    pub enabled: bool,
    pub duration: f64,
    pub distance: f64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Control {
    pub dropdown: Option<DropdownControl>,
    pub selected_values: Vec<String>,
    pub left_adornment: ControlAdornment,
    pub right_adornment: ControlAdornment,
    pub calendar: Option<serde_json::Value>,
    pub textarea: Option<serde_json::Value>,
    pub upload: Option<serde_json::Value>,
    pub number: Option<serde_json::Value>,
    pub password: Option<serde_json::Value>,
    pub segmented: Option<serde_json::Value>,
    pub base_collection: u32,
    pub starter: bool,
    pub starter_linked: bool,
    pub shared_overrides: Vec<String>,
    pub validation_trigger: String,
    pub pattern: String,
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub toggle: bool,
    pub kind: String,
    pub label: String,
    pub label_position: String,
    pub width_sizing: String,
    pub name: String,
    pub value: String,
    pub placeholder: String,
    pub helper_message: String,
    pub hide_helper: bool,
    pub validation_message: String,
    pub invalid: bool,
    pub disabled: bool,
    pub readonly: bool,
    pub checked: bool,
    pub required: bool,
    pub required_icon: String,
    pub required_svg: String,
    pub required_icon_size: f64,
    pub required_icon_weight: f64,
    pub required_icon_offset: f64,
    pub required_icon_color: String,
    pub multiple: bool,
    pub min: String,
    pub max: String,
    pub step: String,
    pub accept: String,
    pub src: String,
    pub options: Vec<String>,
    pub states: std::collections::BTreeMap<String, ControlStyle>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct DropdownControl {
    pub preview_open: bool,
    pub search: bool,
    pub select_all: bool,
    pub deselect_all: bool,
    pub bulk_style: String,
    pub select_all_label: String,
    pub deselect_all_label: String,
    pub checkboxes: bool,
    pub pills: bool,
    pub pill_limit: u32,
    pub menu_width: f64,
    pub menu_height: f64,
    pub selected: Vec<String>,
    pub items: Vec<DropdownItem>,
}
impl Default for DropdownControl {
    fn default() -> Self {
        Self {
            preview_open: false,
            search: true,
            select_all: true,
            deselect_all: true,
            bulk_style: "links".into(),
            select_all_label: "Select all".into(),
            deselect_all_label: "Deselect all".into(),
            checkboxes: true,
            pills: true,
            pill_limit: 3,
            menu_width: 0.0,
            menu_height: 280.0,
            selected: Vec::new(),
            items: Vec::new(),
        }
    }
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct DropdownItem {
    pub label: String,
    pub value: String,
    pub category: String,
    pub disabled: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct ControlAdornment {
    pub size: Option<f64>,
    pub weight: Option<f64>,
    pub gap: Option<f64>,
    pub offset: Option<f64>,
    pub color: String,
    pub enabled: bool,
    pub outside: bool,
    pub icon: String,
    pub text: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct ControlStyle {
    pub parts:
        std::collections::BTreeMap<String, std::collections::BTreeMap<String, serde_json::Value>>,
    pub background: String,
    pub color: String,
    pub border_color: String,
    pub opacity: Option<f64>,
    pub radius: Option<f64>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct LayoutItem {
    #[serde(default)]
    pub grid_container: bool,
    #[serde(default)]
    pub margin: [f64; 4],
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
pub struct Paint {
    pub id: u32,
    pub color: String,
    #[serde(default = "opaque_paint")]
    pub opacity: f64,
    #[serde(default = "effect_enabled")]
    pub visible: bool,
    #[serde(default)]
    pub gradient: Option<Gradient>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media: Option<paint::Media>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pattern: Option<paint::Pattern>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shader: Option<paint::Shader>,
    #[serde(default = "paint::normal")]
    pub blend_mode: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Appearance {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fills: Option<Vec<Paint>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_opacity: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strokes: Option<Vec<Paint>>,
    #[serde(default = "default_blend_mode")]
    pub blend_mode: String,
    #[serde(default)]
    pub backdrop_blur: f64,
    #[serde(default = "effect_enabled")]
    pub backdrop_blur_enabled: bool,
    #[serde(default)]
    pub backdrop_blur_present: bool,
    #[serde(default)]
    pub layer_blur: f64,
    #[serde(default = "effect_enabled")]
    pub layer_blur_enabled: bool,
    #[serde(default)]
    pub layer_blur_present: bool,
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
    #[serde(default)]
    pub fill_hidden: bool,
    #[serde(default = "opaque_paint")]
    pub fill_opacity: f64,
    #[serde(default = "opaque_paint")]
    pub stroke_opacity: f64,
    pub stroke_enabled: bool,
    #[serde(default)]
    pub stroke_hidden: bool,
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

fn effect_enabled() -> bool {
    true
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
    #[serde(default)]
    pub color_variable: u32,
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
    if old_size == 0.0 {
        return (position + origin - old_origin, size);
    }
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
#[serde(default)]
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
fn default_vertical_align() -> String {
    "top".into()
}
fn default_blend_mode() -> String {
    "pass-through".into()
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Document {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub libraries: Vec<serde_json::Value>,
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
    pub component_order: Vec<String>,
    #[serde(default)]
    pub guide_styles: Vec<guide_styles::GuideStyle>,
    #[serde(default)]
    pub effect_styles: Vec<effect_styles::EffectStyle>,
    #[serde(default)]
    pub text_styles: Vec<text_styles::TextStyle>,
    #[serde(default)]
    pub component_properties: Vec<component_properties::ComponentProperty>,
}

#[derive(Serialize, Deserialize)]
struct LayerClipboard {
    #[serde(default)]
    protected_library: bool,
    #[serde(default)]
    origin: String,
    #[serde(default)]
    components: std::collections::BTreeMap<u32, components::Component>,
    format: String,
    version: u32,
    shapes: Vec<Shape>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Page {
    #[serde(default, skip_serializing_if = "std::collections::BTreeMap::is_empty")]
    pub variable_modes: std::collections::BTreeMap<u32, u32>,
    pub id: u32,
    pub name: String,
}

fn first_page() -> u32 {
    1
}
fn default_pages() -> Vec<Page> {
    vec![Page {
        variable_modes: Default::default(),
        id: 1,
        name: "Page 1".into(),
    }]
}

fn clipboard_origin() -> String {
    #[cfg(target_arch = "wasm32")]
    {
        format!("{}-{}", js_sys::Date::now(), js_sys::Math::random())
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);
        NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
            .to_string()
    }
}

#[wasm_bindgen]
pub struct Editor {
    clipboard_origin: String,
    text_measurer: Option<js_sys::Function>,
    write_guard: Option<js_sys::Function>,
    document: Document,
    undo: Vec<Document>,
    redo: Vec<Document>,
    next_id: u32,
    next_page_id: u32,
}

// Legacy scalar fields remain a summary for layout bounds and older consumers.
fn sync_paint_stacks(document: &mut Document) {
    for s in &mut document.shapes {
        if let Some(a) = &mut s.appearance {
            if let Some(stack) = &a.fills {
                a.fill_enabled = stack.iter().any(|p| p.visible);
                a.fill_hidden = !stack.is_empty() && !a.fill_enabled;
                a.gradient = stack.first().and_then(|p| p.gradient.clone());
                a.fill_opacity = stack.first().map_or(1.0, |p| p.opacity);
                if let Some(p) = stack.first() {
                    s.fill = p.color.clone();
                }
            }
            if let Some(stack) = &a.strokes {
                a.stroke_enabled = stack.iter().any(|p| p.visible);
                a.stroke_hidden = !stack.is_empty() && !a.stroke_enabled;
                a.stroke_gradient = stack.first().and_then(|p| p.gradient.clone());
                a.stroke_opacity = stack.first().map_or(1.0, |p| p.opacity);
                if let Some(p) = stack.first() {
                    a.stroke_color = p.color.clone();
                }
            }
        }
    }
}

fn validate(document: &Document) -> Result<(), String> {
    if document.component_order.len() > 11000
        || document
            .component_order
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len()
            != document.component_order.len()
        || document.component_order.iter().any(|key| {
            let Some((kind, id)) = key.split_once(':') else {
                return true;
            };
            !["set", "component"].contains(&kind) || id.parse::<u32>().map_or(true, |n| n == 0)
        })
    {
        return Err("Invalid component order".into());
    }
    variables::validate_variables(document)?;
    variants::validate_sets(document)?;
    guide_styles::validate_styles(document)?;
    effect_styles::validate_styles(document)?;
    text_styles::validate_styles(document)?;
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
            if a.image_opacity
                .is_some_and(|v| !v.is_finite() || !(0.0..=1.0).contains(&v))
            {
                return Err("Invalid image opacity".into());
            }
            for stack in [&a.fills, &a.strokes].into_iter().flatten() {
                for p in stack {
                    paint::validate(p)?;
                }
                let mut ids = std::collections::HashSet::new();
                if stack.len() > 64
                    || stack.iter().any(|p| {
                        p.id == 0
                            || !ids.insert(p.id)
                            || !p.opacity.is_finite()
                            || !(0.0..=1.0).contains(&p.opacity)
                            || p.color.len() != 7
                            || !p.color.starts_with('#')
                            || !p.color[1..].bytes().all(|c| c.is_ascii_hexdigit())
                    })
                {
                    return Err("Invalid paint stack (up to 64 paints per channel)".into());
                }
            }
            for g in a.gradient.iter().chain(a.stroke_gradient.iter()).chain(
                a.fills
                    .iter()
                    .chain(a.strokes.iter())
                    .flatten()
                    .filter_map(|p| p.gradient.as_ref()),
            ) {
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
                if !["linear", "radial", "angular", "diamond"].contains(&g.kind.as_str())
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
            effect_styles::Effects::from_appearance(Some(a)).validate()?;
            if ![
                "pass-through",
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
            .contains(&a.blend_mode.as_str())
            {
                return Err("Unsupported blend mode".into());
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
            if !ancestor.is_container() || ancestor.page_id != shape.page_id {
                return Err("Parent must be a frame or group on the same page".into());
            }
            parent = ancestor.parent_id;
        }
    }
    for shape in &document.shapes {
        if let Some(d) = shape.control.as_ref().and_then(|c| c.dropdown.as_ref()) {
            if ![
                "none",
                "links",
                "buttons",
                "checkbox",
                "switch",
                "toggle_button",
            ]
            .contains(&d.bulk_style.as_str())
                || d.select_all_label.len() > 200
                || d.deselect_all_label.len() > 200
                || !d.menu_width.is_finite()
                || !(0.0..=2000.0).contains(&d.menu_width)
                || !d.menu_height.is_finite()
                || !(80.0..=1200.0).contains(&d.menu_height)
                || d.pill_limit > 30
                || d.items.len() > 500
            {
                return Err("Invalid dropdown settings".into());
            }
            let mut values = std::collections::HashSet::new();
            for item in &d.items {
                if item.value.is_empty()
                    || item.value.len() > 1000
                    || item.label.len() > 1000
                    || item.category.len() > 200
                    || !values.insert(&item.value)
                {
                    return Err("Dropdown item values must be unique and non-empty".into());
                }
            }
        }
        if let Some(style) = &shape.typography {
            text_styles::validate_typography(style)?;
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
        if shape.rotation != 0.0 && (shape.layout_item.fill_width || shape.layout_item.fill_height)
        {
            return Err("Rotated layers require fixed sizing".into());
        }
        if shape.border_widths.is_some_and(|v| {
            v.iter()
                .any(|n| !n.is_finite() || *n < 0.0 || *n > 100000.0)
        }) || shape
            .layout_item
            .margin
            .iter()
            .any(|n| !n.is_finite() || n.abs() > 100000.0)
        {
            return Err("Invalid border widths or margins".into());
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
            "group",
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
            || shape.custom_css.len() > 65_536
            || shape.fill.len() != 7
            || !shape.fill.starts_with('#')
            || !shape.fill[1..].bytes().all(|c| c.is_ascii_hexdigit())
            || ![shape.x, shape.y, shape.width, shape.height, shape.rotation]
                .iter()
                .all(|v| v.is_finite() && v.abs() <= 1_000_000.0)
            || shape.width < if shape.kind == "group" { 0.0 } else { 1.0 }
            || shape.height < if shape.kind == "group" { 0.0 } else { 1.0 }
        {
            return Err("Invalid shape data".into());
        }
        editor_tools::validate(shape)?;
    }
    component_properties::validate_properties(document)?;
    paint::validate_sources(&document.shapes)?;
    grid::validate(&document.shapes)?;
    Ok(())
}

impl Editor {
    fn check_write(&self, document: &Document, history: bool) -> Result<(), String> {
        if let Some(guard) = &self.write_guard {
            let result = guard
                .call3(
                    &JsValue::NULL,
                    &JsValue::from_str(&serde_json::to_string(&self.document).unwrap()),
                    &JsValue::from_str(&serde_json::to_string(document).unwrap()),
                    &JsValue::from_bool(history),
                )
                .map_err(|_| "Library permissions could not be checked")?;
            if let Some(message) = result.as_string().filter(|s| !s.is_empty()) {
                return Err(message);
            }
        }
        Ok(())
    }
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
            (s.control.as_ref().is_some_and(|c| c.kind == "button") && s.auto_layout.is_some())
                || s.kind == "text"
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
                if s.control.as_ref().is_some_and(|c| c.kind == "button") {
                    if let Some(layout) = &s.auto_layout {
                        let result = measure
                            .call1(
                                &JsValue::NULL,
                                &JsValue::from_str(&serde_json::to_string(s).unwrap()),
                            )
                            .map_err(|_| "Control measurement failed")?;
                        let size: Vec<f64> = serde_json::from_str(
                            &result.as_string().ok_or("Invalid control measurement")?,
                        )
                        .map_err(|_| "Invalid control measurement")?;
                        if size.len() < 2
                            || size
                                .iter()
                                .take(2)
                                .any(|v| !v.is_finite() || !(1.0..=1_000_000.0).contains(v))
                        {
                            return Err("Control exceeds supported dimensions".into());
                        }
                        if layout.hug_width && !s.layout_item.fill_width {
                            s.width = size[0] + layout.padding_left + layout.padding_right;
                        }
                        if layout.hug_height && !s.layout_item.fill_height {
                            s.height = size[1] + layout.padding_top + layout.padding_bottom;
                        }
                    }
                    continue;
                }
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
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: None,
            write_guard: None,
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
        groups::prune_empty(&mut document);
        variants::prune(&mut document);
        component_properties::prune(&mut document);
        validate(&document)?;
        components::protect_structure(&self.document, &document)?;
        self.commit_document(document)
    }

    fn commit_document(&mut self, mut document: Document) -> Result<(), String> {
        validate(&document)?;
        let original_shape_count = document.shapes.len();
        grid::ensure_containers(&mut document, self.next_id)?;
        let containers_added = document.shapes.len() > original_shape_count;
        starter_defaults::sync(&mut document);
        starter_defaults::sync_dropdown(&mut document);
        variables::resolve(&mut document)?;
        sync_paint_stacks(&mut document);
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
                .map(|s| s.id)
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
        effect_styles::resolve(&mut document);
        text_styles::resolve(&mut document);
        variables::resolve(&mut document)?;
        sync_paint_stacks(&mut document);
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
        // Reserve custom names before assigning generated names across every page.
        fn valid_class(name: &str) -> bool {
            !name.is_empty()
                && name
                    .chars()
                    .next()
                    .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
                && name
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
                && !name.starts_with("px-")
                && name != "layout"
        }
        fn legacy_class(name: &str) -> bool {
            name.strip_prefix("layout-").is_some_and(|tail| {
                !tail.is_empty()
                    && tail
                        .split('-')
                        .all(|part| !part.is_empty() && part.chars().all(|c| c.is_ascii_digit()))
            })
        }
        let mut indices: Vec<_> = (0..document.shapes.len()).collect();
        indices.sort_by_key(|i| {
            (
                document.shapes[*i].layout_class_generated
                    || !valid_class(&document.shapes[*i].layout_class)
                    || legacy_class(&document.shapes[*i].layout_class),
                document.shapes[*i].id,
            )
        });
        let mut used = std::collections::HashSet::new();
        for i in indices {
            let shape = &mut document.shapes[i];
            let generated = shape.layout_class_generated
                || !valid_class(&shape.layout_class)
                || legacy_class(&shape.layout_class);
            let base = if generated {
                let mut slug = String::new();
                for c in shape.name.chars() {
                    if c.is_ascii_alphanumeric() {
                        slug.push(c.to_ascii_lowercase());
                    } else if !slug.is_empty() && !slug.ends_with('-') {
                        slug.push('-');
                    }
                }
                let mut slug = slug.trim_matches('-').to_string();
                if slug.is_empty() {
                    slug = "layer".into();
                }
                if slug.starts_with("px-")
                    || slug.chars().next().is_some_and(|c| c.is_ascii_digit())
                {
                    slug = format!("layer-{}", slug);
                }
                format!("{}-{}", slug, shape.id)
            } else {
                shape.layout_class.clone()
            };
            let mut candidate = base.clone();
            let mut n = 1;
            while used.contains(&candidate) {
                candidate = if n == 1 {
                    format!("{}-{}", base, shape.id)
                } else {
                    format!("{}-{}-{}", base, shape.id, n)
                };
                n += 1;
            }
            used.insert(candidate.clone());
            shape.layout_class = candidate;
            shape.layout_class_generated = generated;
        }
        validate(&document)?;
        components::validate_links(&document)?;
        if serde_json::to_string(&document)
            .map_err(|e| e.to_string())?
            .len()
            > 5_000_000
        {
            return Err("Document exceeds 5 MB; use smaller images or remove unused layers".into());
        }
        self.check_write(&document, false)?;
        if next > base || containers_added {
            self.next_id = self.next_id.max(next);
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
            clipboard_origin: clipboard_origin(),
            text_measurer: None,
            write_guard: None,
            document: Document {
                libraries: vec![],
                variables: variables::Variables::default(),
                version: 2,
                name: "Untitled design".into(),
                shapes: vec![],
                pages: default_pages(),
                active_page: 1,
                component_sets: vec![],
                component_order: vec![],
                guide_styles: vec![],
                effect_styles: vec![],
                text_styles: vec![],
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

    pub fn set_write_guard(&mut self, callback: js_sys::Function) {
        self.write_guard = Some(callback);
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
                copy.effect_style = 0;
                copy.text_style = 0;
                if let Some(a) = &mut copy.appearance {
                    for shadow in &mut a.shadows {
                        shadow.color_variable = 0;
                    }
                }
                copy.variable_bindings.clear();
                copy.variable_modes.clear();
                copy.retain_interactions(|p| {
                    !["navigate", "overlay", "swap"].contains(&p.action.as_str())
                        || ids.contains(&p.target)
                });
                if !ids.contains(&copy.parent_id) {
                    copy.parent_id = 0;
                }
                copy.page_id = 1;
                copy
            })
            .collect();
        serde_json::to_string(&LayerClipboard {
            protected_library: self.document.shapes.iter().any(|s| {
                if !ids.contains(&s.id) {
                    return false;
                }
                let master = match s.component {
                    Some(components::Component::Instance { master, .. }) => master,
                    _ => s.id,
                };
                self.document.libraries.iter().any(|l| {
                    l["maps"]["shapes"].as_object().is_some_and(|map| {
                        map.values().any(|id| id.as_u64() == Some(master as u64))
                    })
                })
            }),
            origin: self.clipboard_origin.clone(),
            components: self
                .document
                .shapes
                .iter()
                .filter(|s| ids.contains(&s.id))
                .filter_map(|s| {
                    let mut ancestor = Some(s);
                    while let Some(node) = ancestor {
                        if ids.contains(&node.id)
                            && node.component == Some(components::Component::Master)
                        {
                            return Some((
                                s.id,
                                components::Component::Instance {
                                    master: node.id,
                                    source: s.id,
                                    overrides: vec![],
                                },
                            ));
                        }
                        ancestor = self.document.shapes.iter().find(|p| p.id == node.parent_id);
                    }
                    match &s.component {
                        Some(c @ components::Component::Instance { master, source, .. })
                            if master == source || ids.contains(&s.parent_id) =>
                        {
                            Some((s.id, c.clone()))
                        }
                        _ => None,
                    }
                })
                .collect(),
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
        if payload.protected_library && payload.origin != self.clipboard_origin {
            return Err(
                "Add the library from Assets in this project, then insert its protected component"
                    .into(),
            );
        }
        if payload.format != "pixlprfct.layers" || payload.version != 1 || payload.shapes.is_empty()
        {
            return Err("Unsupported layer clipboard".into());
        }
        if parent != 0
            && !self.document.shapes.iter().any(|s| {
                s.id == parent && s.is_container() && s.page_id == self.document.active_page
            })
        {
            return Err("Paste target must be a frame or group on this page".into());
        }
        for s in &mut payload.shapes {
            s.page_id = 1;
            s.component = None;
            s.guide_style = 0;
            s.effect_style = 0;
            s.text_style = 0;
            if let Some(a) = &mut s.appearance {
                for shadow in &mut a.shadows {
                    shadow.color_variable = 0;
                }
            }
            s.variable_bindings.clear();
            s.variable_modes.clear();
        }
        validate(&Document {
            libraries: vec![],
            variables: variables::Variables::default(),
            version: 2,
            name: String::new(),
            shapes: payload.shapes.clone(),
            pages: default_pages(),
            active_page: 1,
            component_sets: vec![],
            component_order: vec![],
            guide_styles: vec![],
            effect_styles: vec![],
            text_styles: vec![],
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
        let mut roots = vec![];
        let mut document = self.document.clone();
        for mut s in payload.shapes {
            if payload.origin == self.clipboard_origin {
                s.component = payload.components.get(&s.id).filter(|c| matches!(c, components::Component::Instance {master,..} if self.document.shapes.iter().any(|m| m.id == *master && m.component == Some(components::Component::Master)))).cloned();
            }
            for p in s.interactions_mut() {
                if ["navigate", "overlay", "swap"].contains(&p.action.as_str()) {
                    p.target = ids[&p.target];
                }
            }
            paint::remap_sources(&mut s, &ids, payload.origin == self.clipboard_origin);
            s.id = ids[&s.id];
            s.page_id = document.active_page;
            if s.parent_id == 0 {
                s.parent_id = parent;
                roots.push(s.id);
            } else {
                s.parent_id = ids[&s.parent_id];
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
        let payload: LayerClipboard = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut template = Editor::new();
        // Validation uses a temporary editor, but protected clipboard provenance
        // must be checked against the actual destination document.
        if payload.protected_library {
            template.clipboard_origin = self.clipboard_origin.clone();
        }
        template.paste_layers(json, 0.0, 0.0, 0)?;
        if payload.origin == self.clipboard_origin {
            for (shape, original) in template.document.shapes.iter_mut().zip(&payload.shapes) {
                shape.component = payload.components.get(&original.id).filter(|c| matches!(c, components::Component::Instance {master,..} if self.document.shapes.iter().any(|m| m.id == *master && m.component == Some(components::Component::Master)))).cloned();
            }
        }
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
            for source in shapes {
                let mut s = source.clone();
                paint::remap_sources(&mut s, &mapping, true);
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
        let payload: LayerClipboard = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut template = Editor::new();
        // Validation uses a temporary editor, but protected clipboard provenance
        // must be checked against the actual destination document.
        if payload.protected_library {
            template.clipboard_origin = self.clipboard_origin.clone();
        }
        template.paste_layers(json, 0.0, 0.0, 0)?;
        if payload.origin == self.clipboard_origin {
            for (shape, original) in template.document.shapes.iter_mut().zip(&payload.shapes) {
                shape.component = payload.components.get(&original.id).filter(|c| matches!(c, components::Component::Instance {master,..} if self.document.shapes.iter().any(|m| m.id == *master && m.component == Some(components::Component::Master)))).cloned();
            }
        }
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
                for source in shapes {
                    let mut s = source.clone();
                    paint::remap_sources(&mut s, &ids, true);
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
        self.next_id = self
            .next_id
            .max(document.shapes.iter().map(|s| s.id).max().unwrap_or(0) + 1);
        variables::resolve(&mut document)?;
        sync_paint_stacks(&mut document);
        // Upgrade older editable starters once; detached controls stay detached.
        for shape in &mut document.shapes {
            if let Some(control) = &mut shape.control {
                if control.starter && !control.starter_linked {
                    control.starter_linked = true;
                    if shape.component.is_none() {
                        shape.component = Some(components::Component::Master);
                    }
                }
            }
        }
        components::restore_detached_button_labels(&mut document, &mut self.next_id)?;
        self.commit_document(document)?;
        self.clipboard_origin = clipboard_origin();
        Ok(())
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
            layout_class: String::new(),
            layout_class_generated: false,
            layout_media: Vec::new(),
            custom_css: String::new(),
            breakpoint_original: None,
            device_chrome: String::new(),
            device_chrome_breakpoints: None,
            device_chrome_hidden: false,
            control: None,
            control_state: String::new(),
            behaviors: Vec::new(),
            editor_meta: None,
            border_widths: None,
            rotation: 0.0,
            aspect_ratio_locked: false,
            variable_bindings: if kind == "text" {
                self.document
                    .variables
                    .values
                    .iter()
                    .find(|v| {
                        v.name == "Text color"
                            && v.kind == "color"
                            && self
                                .document
                                .variables
                                .collections
                                .iter()
                                .any(|c| c.id == v.collection_id && c.preset == "typography_base")
                    })
                    .map(|v| std::collections::BTreeMap::from([("fill".into(), v.id)]))
                    .unwrap_or_default()
            } else {
                Default::default()
            },
            variable_modes: Default::default(),
            id,
            page_id: document.active_page,
            parent_id: 0,
            clip_content: kind == "frame",
            image: None,
            constraints: Constraints::default(),
            appearance: None,
            auto_layout: None,
            layout_grids: vec![],
            guide_style: 0,
            effect_style: 0,
            text_style: 0,
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
        let id = shape.id;
        let mut document = self.document.clone();
        document.shapes.push(shape);
        self.commit(document)?;
        self.next_id += 1;
        Ok(id)
    }

    pub fn reset_starter_overrides(&mut self, id: u32) -> Result<(), String> {
        let mut document = self.document.clone();
        let shape = document
            .shapes
            .iter_mut()
            .find(|s| s.id == id)
            .ok_or("Missing starter")?;
        if matches!(
            shape.component,
            Some(components::Component::Instance { .. })
        ) {
            return Err("Reset the main component instead".into());
        }
        let control = shape.control.as_mut().ok_or("Missing control")?;
        control.shared_overrides.clear();
        self.commit(document)
    }

    pub fn insert_control_starter(&mut self, json: &str, variables: &str) -> Result<u32, String> {
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        staged.save_variables(variables)?;
        let id = staged.insert(json)?;
        if let Some(shape) = staged.document.shapes.iter_mut().find(|s| s.id == id) {
            if let Some(control) = &mut shape.control {
                control.starter_linked = true;
                shape.component = Some(components::Component::Master);
            }
        }
        self.commit(staged.document)?;
        self.next_id = staged.next_id;
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
            starter_defaults::record(
                document.shapes.iter().find(|s| s.id == id).unwrap(),
                &mut shape,
            );
            components::record_overrides(
                document.shapes.iter().find(|s| s.id == id).unwrap(),
                &mut shape,
            )?;
            *document.shapes.iter_mut().find(|s| s.id == id).unwrap() = shape;
        }
        validate(&document)?;
        grid::sync_area_size_edits(&self.document, &mut document, &ids);
        component_properties::propagate_edits(&self.document, &mut document, &ids)?;
        // The committed scene is parent-first. Explicit edits (including Scale's
        // entire subtree) win; other children inherit their immediate frame's change.
        for i in 0..document.shapes.len() {
            let child = &document.shapes[i];
            if ids.contains(&child.id) || child.parent_id == 0 {
                continue;
            }
            let mut parent = document
                .shapes
                .iter()
                .find(|s| s.id == child.parent_id)
                .unwrap();
            // Groups do not establish a constraint coordinate system. Use the
            // enclosing frame unless this edit explicitly transforms a group.
            while parent.kind == "group" && !ids.contains(&parent.id) {
                let Some(ancestor) = document.shapes.iter().find(|s| s.id == parent.parent_id)
                else {
                    break;
                };
                parent = ancestor;
            }
            let old = self
                .document
                .shapes
                .iter()
                .find(|s| s.id == parent.id)
                .unwrap();
            if old.auto_layout.is_some() && !child.layout_item.absolute {
                let (x, y) = (child.x + parent.x - old.x, child.y + parent.y - old.y);
                document.shapes[i].x = x;
                document.shapes[i].y = y;
                continue;
            }
            let group_resize = parent.kind == "group";
            let horizontal = if group_resize {
                &crate::Constraint::Scale
            } else {
                &child.constraints.horizontal
            };
            let vertical = if group_resize {
                &crate::Constraint::Scale
            } else {
                &child.constraints.vertical
            };
            let (x, width) = constrain_axis(
                child.x,
                child.width,
                old.x,
                old.width,
                parent.x,
                parent.width,
                horizontal,
            );
            let (y, height) = constrain_axis(
                child.y,
                child.height,
                old.y,
                old.height,
                parent.y,
                parent.height,
                vertical,
            );
            let child = &mut document.shapes[i];
            if group_resize && (child.width != width || child.height != height) {
                if let Some(style) = &mut child.typography {
                    style.sizing = "fixed".into();
                }
            }
            child.x = x;
            child.y = y;
            child.width = width;
            child.height = height;
        }
        self.commit(document)
    }

    // Apply inspector changes across pages as one atomic history entry.
    pub fn update_across_pages(&mut self, json: &str) -> Result<(), String> {
        let shapes: Vec<Shape> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if shapes.is_empty() {
            return Ok(());
        }
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        let mut pages: Vec<u32> = shapes.iter().map(|s| s.page_id).collect();
        pages.sort_unstable();
        pages.dedup();
        for page in pages {
            if !staged.document.pages.iter().any(|p| p.id == page) {
                return Err("Page not found".into());
            }
            staged.document.active_page = page;
            let updates: Vec<_> = shapes.iter().filter(|s| s.page_id == page).collect();
            staged.update_many(&serde_json::to_string(&updates).map_err(|e| e.to_string())?)?;
        }
        staged.document.active_page = self.document.active_page;
        self.commit(staged.document)
    }

    pub fn preview_update_many(&self, json: &str) -> Result<String, String> {
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
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
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
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
        self.duplicate_many_offset(json, 24.0, 24.0)
    }

    /// Explicit translation for automation; zero duplicates in place.
    pub fn duplicate_many_offset(&mut self, json: &str, x: f64, y: f64) -> Result<String, String> {
        if !x.is_finite() || !y.is_finite() {
            return Err("Duplicate offsets must be finite".into());
        }
        let ids = self.descendants(&self.selection_ids(json)?);
        let next_id = self
            .next_id
            .checked_add(ids.len() as u32)
            .ok_or("Shape ID limit reached")?;
        let mut document = self.document.clone();
        let mut created = vec![];
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
                copy.x += x;
                copy.y += y;
                created.push(copy.id);
                document.shapes.push(copy);
            }
        }
        component_properties::duplicate_definitions(&mut document, &mapping)?;
        variants::duplicate_definitions(&mut document, &mapping)?;
        self.commit(document)?;
        self.next_id = self.next_id.max(next_id);
        Ok(serde_json::to_string(&created).unwrap())
    }

    // Browser-resolved tracks provide exact cells for intrinsic and relative CSS sizing.
    pub fn move_into_cells(
        &mut self,
        json: &str,
        parent: u32,
        placements: &str,
    ) -> Result<(), String> {
        let cells: Vec<(u32, u32, u32)> =
            serde_json::from_str(placements).map_err(|e| e.to_string())?;
        let roots: Vec<Shape> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if cells
            .iter()
            .any(|(id, _, _)| !roots.iter().any(|s| s.id == *id))
        {
            return Err("Grid targets must belong to dragged layers".into());
        }
        if self
            .document
            .shapes
            .iter()
            .find(|s| s.id == parent)
            .and_then(|s| s.auto_layout.as_ref())
            .and_then(|l| l.grid.as_ref())
            .is_some_and(|g| g.options.masonry)
        {
            return self.move_into_before(
                &serde_json::to_string(&roots.iter().map(|s| s.id).collect::<Vec<_>>()).unwrap(),
                parent,
                0,
            );
        }
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        let use_containers = staged
            .document
            .shapes
            .iter()
            .find(|s| s.id == parent)
            .and_then(|s| s.auto_layout.as_ref())
            .and_then(|l| l.grid.as_ref())
            .is_some_and(|g| g.options.cell_containers);
        if use_containers {
            for s in &mut staged.document.shapes {
                if let Some(g) = s.auto_layout.as_mut().and_then(|l| l.grid.as_mut()) {
                    g.options.cell_containers = false;
                }
            }
        }
        let frame = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == parent)
            .ok_or("Grid frame not found")?;
        let items: Vec<_> = self
            .document
            .shapes
            .iter()
            .enumerate()
            .filter(|(_, s)| s.parent_id == parent && !s.hidden && !s.layout_item.absolute)
            .map(|(i, _)| i)
            .collect();
        let mut occupied: Vec<_> = grid::plan(&self.document.shapes, frame, &items, false, false)
            .placements
            .into_iter()
            .filter(|p| !roots.iter().any(|s| s.id == p.id))
            .collect();
        staged.move_into(json, parent)?;
        let mut updates = vec![];
        for (id, column, row) in cells {
            let mut s = staged
                .document
                .shapes
                .iter()
                .find(|s| s.id == id && s.parent_id == parent)
                .ok_or("Grid child not found")?
                .clone();
            let c = s.layout_item.grid_cell.get_or_insert_with(Default::default);
            c.column = Some(column);
            c.row = Some(row);
            c.area = staged
                .document
                .shapes
                .iter()
                .find(|s| s.id == parent)
                .and_then(|s| s.auto_layout.as_ref())
                .and_then(|l| l.grid.as_ref())
                .and_then(|g| {
                    g.options.areas.iter().find(|a| {
                        column >= a.column
                            && column < a.column + a.column_span
                            && row >= a.row
                            && row < a.row + a.row_span
                    })
                })
                .map(|a| a.name.clone())
                .unwrap_or_default();
            if !use_containers && !frame.layout_item.grid_container && c.area.is_empty() {
                let mut candidate = row as usize;
                while occupied.iter().any(|p| {
                    (column as usize) < p.column + p.column_span
                        && p.column < (column + c.column_span) as usize
                        && candidate < p.row + p.row_span
                        && p.row < candidate + c.row_span as usize
                }) {
                    candidate += 1;
                    if candidate > 128 {
                        return Err("No available grid row".into());
                    }
                }
                c.row = Some(candidate as u32);
                occupied.push(grid::Placement {
                    id,
                    column: column as usize,
                    row: candidate,
                    column_span: c.column_span as usize,
                    row_span: c.row_span as usize,
                    x: 0.0,
                    y: 0.0,
                    width: 0.0,
                    height: 0.0,
                });
            }
            updates.push(s);
        }
        staged.update_many(&serde_json::to_string(&updates).map_err(|e| e.to_string())?)?;
        if use_containers {
            for s in &mut staged.document.shapes {
                if let Some(g) = s.auto_layout.as_mut().and_then(|l| l.grid.as_mut()) {
                    g.options.cell_containers = self
                        .document
                        .shapes
                        .iter()
                        .find(|old| old.id == s.id)
                        .and_then(|old| old.auto_layout.as_ref())
                        .and_then(|l| l.grid.as_ref())
                        .is_some_and(|old| old.options.cell_containers);
                }
            }
        }
        self.commit(staged.document)
    }

    // Canvas insertion uses document order, unlike the reversed layer tree.
    pub fn move_into_before(&mut self, json: &str, parent: u32, before: u32) -> Result<(), String> {
        let ids = groups::roots(&self.document.shapes, &self.selection_ids(json)?);
        if ids.contains(&parent) {
            return Err("Cannot move a frame inside itself".into());
        }
        if before != 0
            && !self
                .document
                .shapes
                .iter()
                .any(|s| s.id == before && s.parent_id == parent && !ids.contains(&s.id))
        {
            return Err("Invalid insertion target".into());
        }
        let ordered: Vec<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .map(|s| s.id)
            .collect();
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        staged.drop_layers(&serde_json::to_string(&ordered).unwrap(), parent, "inside")?;
        let mut moved = vec![];
        staged.document.shapes.retain(|s| {
            if ordered.contains(&s.id) {
                moved.push(s.clone());
                false
            } else {
                true
            }
        });
        moved.sort_by_key(|s| ordered.iter().position(|id| *id == s.id).unwrap());
        let index = if before == 0 {
            staged.document.shapes.len()
        } else {
            staged
                .document
                .shapes
                .iter()
                .position(|s| s.id == before)
                .ok_or("Insertion target missing")?
        };
        staged.document.shapes.splice(index..index, moved);
        self.commit(staged.document)
    }

    pub fn preview_grid_drop(
        &self,
        json: &str,
        grid: u32,
        parent: u32,
        before: u32,
        column: u32,
        row: u32,
    ) -> Result<String, String> {
        let ids = groups::roots(&self.document.shapes, &self.selection_ids(json)?);
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        if parent != 0 {
            staged.move_into_before(&serde_json::to_string(&ids).unwrap(), parent, before)?;
        } else {
            let shapes: Vec<_> = self
                .document
                .shapes
                .iter()
                .filter(|s| ids.contains(&s.id))
                .cloned()
                .collect();
            let cells: Vec<_> = ids.iter().map(|id| (*id, column, row)).collect();
            staged.move_into_cells(
                &serde_json::to_string(&shapes).unwrap(),
                grid,
                &serde_json::to_string(&cells).unwrap(),
            )?;
        }
        Ok(staged.snapshot())
    }

    pub fn enable_grid_containers(&mut self) -> Result<(), String> {
        let mut document = self.document.clone();
        for s in &mut document.shapes {
            if s.layout_item.grid_container
                || matches!(s.component, Some(components::Component::Instance { .. }))
            {
                continue;
            }
            if let Some(g) = s
                .auto_layout
                .as_mut()
                .filter(|l| l.direction == "grid")
                .and_then(|l| l.grid.as_mut())
            {
                g.options.cell_containers = true;
            }
        }
        self.commit_document(document)
    }

    pub fn move_into(&mut self, json: &str, parent: u32) -> Result<(), String> {
        let shapes: Vec<Shape> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let ids: Vec<u32> = shapes.iter().map(|s| s.id).collect();
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
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
                                cell.area.clear();
                                components::record_overrides(&previous, s)?;
                            }
                        }
                    }
                    if layout.grid.as_ref().is_some_and(|g| g.options.masonry) {
                        None
                    } else {
                        staged
                            .document
                            .shapes
                            .iter()
                            .find(|s| s.parent_id == parent && !ids.contains(&s.id))
                            .map(|s| s.id)
                    }
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
        let ids = groups::roots(&self.document.shapes, &self.selection_ids(json)?);
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        let existing = ids.len() == 1
            && self
                .document
                .shapes
                .iter()
                .any(|s| s.id == ids[0] && s.is_container());
        let id = if existing {
            ids[0]
        } else {
            staged.frame_selection(&serde_json::to_string(&ids).unwrap())?
        };
        if staged
            .document
            .shapes
            .iter()
            .find(|s| s.id == id)
            .unwrap()
            .auto_layout
            .is_some()
        {
            return Ok(id);
        }
        layout::infer(&mut staged.document, id, !existing && ids.len() == 1);
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(id)
    }

    pub fn reparent_many(&mut self, json: &str, parent: u32) -> Result<(), String> {
        let ids = self.selection_ids(json)?;
        let mut document = self.document.clone();
        let moved = ids;
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
            .any(|s| s.id == id && s.is_container())
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
        shape.y += 24.0;
        let id = shape.id;
        let mut document = self.document.clone();
        document.shapes.push(shape);
        self.commit(document)?;
        self.next_id += 1;
        Ok(id)
    }

    pub fn sort_components(&mut self, json: &str) -> Result<(), String> {
        let order: Vec<String> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let grouped: std::collections::HashSet<u32> = self
            .document
            .component_sets
            .iter()
            .flat_map(|s| s.variants.iter().map(|v| v.component_id))
            .collect();
        let mut valid: std::collections::HashSet<String> = self
            .document
            .component_sets
            .iter()
            .map(|s| format!("set:{}", s.id))
            .collect();
        for s in &self.document.shapes {
            if s.component == Some(components::Component::Master) && !grouped.contains(&s.id) {
                valid.insert(format!("component:{}", s.id));
            }
        }
        if order.len() != valid.len()
            || order.iter().collect::<std::collections::HashSet<_>>().len() != order.len()
            || order.iter().any(|k| !valid.contains(k))
        {
            return Err("Component order must contain every component exactly once".into());
        }
        if self.document.component_order == order {
            return Ok(());
        }
        let mut document = self.document.clone();
        document.component_order = order;
        self.commit(document)
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
    /// Move a track before a zero-based insertion boundary (track count appends).
    /// Connected spans move together, and the entire move is one history entry.
    pub fn move_grid_track(
        &mut self,
        id: u32,
        axis: &str,
        index: usize,
        before: usize,
    ) -> Result<usize, String> {
        let (changes, next) = grid::move_track(&self.document, id, axis, index, before)?;
        if !changes.is_empty() {
            self.update_many(&serde_json::to_string(&changes).map_err(|e| e.to_string())?)?;
        }
        Ok(next)
    }
    pub fn delete_grid_area(&mut self, id: u32, name: &str) -> Result<(), String> {
        let mut frame = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id)
            .ok_or("Grid frame not found")?
            .clone();
        let grid = frame
            .auto_layout
            .as_mut()
            .filter(|l| l.direction == "grid")
            .and_then(|l| l.grid.as_mut())
            .ok_or("Grid layout required")?;
        let area = grid
            .options
            .areas
            .iter()
            .find(|a| a.name == name)
            .ok_or("Named area not found")?
            .clone();
        grid.options.areas.retain(|a| a.name != name);
        let mut changes = vec![frame];
        for child in self.document.shapes.iter().filter(|s| {
            s.parent_id == id
                && s.layout_item
                    .grid_cell
                    .as_ref()
                    .is_some_and(|c| c.area == name)
        }) {
            let mut child = child.clone();
            let cell = child.layout_item.grid_cell.as_mut().unwrap();
            cell.area.clear();
            cell.column = Some(area.column);
            cell.row = Some(area.row);
            cell.column_span = area.column_span;
            cell.row_span = area.row_span;
            changes.push(child);
        }
        self.update_many(&serde_json::to_string(&changes).map_err(|e| e.to_string())?)
    }

    pub fn rename_grid_area(
        &mut self,
        id: u32,
        old_name: &str,
        new_name: &str,
    ) -> Result<(), String> {
        let mut frame = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id)
            .ok_or("Grid frame not found")?
            .clone();
        let grid = frame
            .auto_layout
            .as_mut()
            .filter(|l| l.direction == "grid")
            .and_then(|l| l.grid.as_mut())
            .ok_or("Grid layout required")?;
        let area = grid
            .options
            .areas
            .iter_mut()
            .find(|a| a.name == old_name)
            .ok_or("Named area not found")?;
        if old_name == new_name {
            return Ok(());
        }
        area.name = new_name.to_string();
        for rule in &mut frame.layout_media {
            let Some(template) = rule
                .get_mut("declarations")
                .and_then(|d| d.get_mut("grid-template-areas"))
            else {
                continue;
            };
            let Some(text) = template.as_str().filter(|text| *text != "none") else {
                continue;
            };
            let separator = |c: char| c.is_whitespace() || c == '"';
            if text.split(separator).any(|token| token == new_name) {
                return Err("Area name already exists in a breakpoint template".into());
            }
            // Replace whole area names while retaining quoted rows and spacing.
            let renamed: String = text
                .split_inclusive(separator)
                .map(|part| {
                    let token = part.trim_end_matches(separator);
                    if token == old_name {
                        format!("{}{}", new_name, &part[token.len()..])
                    } else {
                        part.to_owned()
                    }
                })
                .collect();
            *template = serde_json::Value::String(renamed);
        }
        let mut changes = vec![frame];
        for child in self.document.shapes.iter().filter(|s| {
            s.parent_id == id
                && s.layout_item
                    .grid_cell
                    .as_ref()
                    .is_some_and(|c| c.area == old_name)
        }) {
            let mut child = child.clone();
            child.layout_item.grid_cell.as_mut().unwrap().area = new_name.to_string();
            changes.push(child);
        }
        self.update_many(&serde_json::to_string(&changes).map_err(|e| e.to_string())?)
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
                if s.page_id != self.document.active_page
                    || s.hidden
                    || s.locked
                    || s.kind == "group"
                {
                    return false;
                }
                let mut ancestors = Vec::new();
                let mut parent = s.parent_id;
                while parent != 0 {
                    let ancestor = self
                        .document
                        .shapes
                        .iter()
                        .find(|s| s.id == parent)
                        .unwrap();
                    ancestors.push(ancestor);
                    parent = ancestor.parent_id;
                }
                let (mut x, mut y) = (x, y);
                for ancestor in ancestors.into_iter().rev() {
                    if ancestor.hidden || ancestor.locked {
                        return false;
                    }
                    (x, y) = ancestor.unrotate_point(x, y);
                    if ancestor.clip_content && !in_rounded_rect(ancestor, x, y) {
                        return false;
                    }
                }
                let (x, y) = s.unrotate_point(x, y);
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
            variable_modes: Default::default(),
            id,
            name: format!("Page {}", number),
        });
        document.active_page = id;
        self.commit(document)?;
        self.next_page_id += 1;
        Ok(id)
    }

    pub fn duplicate_page(&mut self, id: u32) -> Result<u32, String> {
        let mut document = self.document.clone();
        let index = document
            .pages
            .iter()
            .position(|p| p.id == id)
            .ok_or("Page not found")?;
        let next_page_id = self
            .next_page_id
            .checked_add(1)
            .ok_or("Page ID limit reached")?;
        let mut page = document.pages[index].clone();
        let base = format!("{} copy", page.name);
        page.name = base.clone();
        let mut number = 2;
        while document.pages.iter().any(|p| p.name == page.name) {
            page.name = format!("{} {}", base, number);
            number += 1;
        }
        page.id = self.next_page_id;
        let mut copies: Vec<_> = document
            .shapes
            .iter()
            .filter(|s| s.page_id == id)
            .cloned()
            .collect();
        let next_id = self
            .next_id
            .checked_add(copies.len() as u32)
            .ok_or("Shape ID limit reached")?;
        let mapping: std::collections::HashMap<_, _> = copies
            .iter()
            .enumerate()
            .map(|(i, s)| (s.id, self.next_id + i as u32))
            .collect();
        for shape in &mut copies {
            paint::remap_sources(shape, &mapping, true);
            shape.id = mapping[&shape.id];
            shape.page_id = page.id;
            shape.parent_id = *mapping.get(&shape.parent_id).unwrap_or(&shape.parent_id);
            for interaction in shape.interactions_mut() {
                if ["navigate", "overlay", "swap"].contains(&interaction.action.as_str()) {
                    interaction.target = *mapping
                        .get(&interaction.target)
                        .unwrap_or(&interaction.target);
                }
            }
        }
        document.active_page = page.id;
        document.pages.insert(index + 1, page);
        document.shapes.extend(copies);
        component_properties::duplicate_definitions(&mut document, &mapping)?;
        variants::duplicate_definitions(&mut document, &mapping)?;
        self.commit(document)?;
        self.next_id = next_id;
        self.next_page_id = next_page_id;
        Ok(next_page_id - 1)
    }

    pub fn duplicate_page_at(&mut self, id: u32, target: u32, after: bool) -> Result<u32, String> {
        if !self.document.pages.iter().any(|p| p.id == target) {
            return Err("Destination page not found".into());
        }
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        let copy = staged.duplicate_page(id)?;
        staged.reorder_page(copy, target, after)?;
        self.commit(staged.document)?;
        self.next_id = staged.next_id;
        self.next_page_id = staged.next_page_id;
        Ok(copy)
    }

    pub fn reorder_page(&mut self, id: u32, target: u32, after: bool) -> Result<(), String> {
        let mut document = self.document.clone();
        let source = document
            .pages
            .iter()
            .position(|p| p.id == id)
            .ok_or("Page not found")?;
        if !document.pages.iter().any(|p| p.id == target) {
            return Err("Destination page not found".into());
        }
        if id == target {
            return Ok(());
        }
        let page = document.pages.remove(source);
        let index =
            document.pages.iter().position(|p| p.id == target).unwrap() + usize::from(after);
        document.pages.insert(index, page);
        if document.pages == self.document.pages {
            return Ok(());
        }
        self.commit(document)
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

    pub fn undo(&mut self) -> Result<(), String> {
        if let Some(document) = self.undo.last() {
            self.check_write(document, true)?;
        }
        if let Some(document) = self.undo.pop() {
            self.redo.push(self.document.clone());
            self.document = document;
        }
        Ok(())
    }
    pub fn redo(&mut self) -> Result<(), String> {
        if let Some(document) = self.redo.last() {
            self.check_write(document, true)?;
        }
        if let Some(document) = self.redo.pop() {
            self.undo.push(self.document.clone());
            self.document = document;
        }
        Ok(())
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
        editor.undo().unwrap();
        assert_eq!(editor.hit_test(20.0, 30.0), id);
        editor.undo().unwrap();
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
