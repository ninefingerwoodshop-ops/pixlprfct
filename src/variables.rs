use super::*;
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Variables {
    pub collections: Vec<Collection>,
    pub values: Vec<Variable>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Collection {
    #[serde(default)]
    pub preset: String,
    pub id: u32,
    pub name: String,
    pub modes: Vec<Mode>,
    pub default_mode: u32,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Mode {
    pub id: u32,
    pub name: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Variable {
    #[serde(default)]
    pub control_path: String,
    pub id: u32,
    pub collection_id: u32,
    pub name: String,
    pub kind: String,
    pub values: BTreeMap<u32, Value>,
}
fn name(s: &str) -> bool {
    !s.trim().is_empty() && s.len() <= 128
}
fn color(v: &Value) -> bool {
    v.as_str().is_some_and(|s| {
        s.len() == 7 && s.starts_with('#') && s[1..].bytes().all(|c| c.is_ascii_hexdigit())
    })
}
fn spacing_values(value: &Value, negative: bool) -> Option<Vec<f64>> {
    let text = value.as_str()?.trim();
    let tokens: Vec<_> = if text.contains(',') {
        text.split(',').map(str::trim).collect()
    } else {
        text.split_whitespace().collect()
    };
    let values: Vec<f64> = tokens
        .iter()
        .map(|v| v.strip_suffix("px").unwrap_or(v).parse::<f64>().ok())
        .collect::<Option<Vec<_>>>()?;
    if !values
        .iter()
        .all(|n| n.is_finite() && n.abs() <= 1_000_000.0 && (negative || *n >= 0.0))
    {
        return None;
    }
    match values.as_slice() {
        [a] => Some(vec![*a, *a, *a, *a]),
        [a, b] => Some(vec![*a, *b, *a, *b]),
        [a, b, c] => Some(vec![*a, *b, *c, *b]),
        [a, b, c, d] => Some(vec![*a, *b, *c, *d]),
        _ => None,
    }
}
fn padding(value: &Value) -> Option<Vec<f64>> {
    spacing_values(value, false)
}
fn compatible_property_kind(path: &str, kind: &str) -> bool {
    property_kind(path) == Some(kind)
        || (kind == "number"
            && path.starts_with("control.states.")
            && path.contains(".parts.")
            && path.ends_with(".radius"))
}
pub fn property_kind(path: &str) -> Option<&'static str> {
    if let Some(key) = path
        .strip_prefix("control.left_adornment.")
        .or_else(|| path.strip_prefix("control.right_adornment."))
    {
        return match key {
            "color" => Some("color"),
            "size" | "weight" | "gap" | "offset" => Some("number"),
            _ => None,
        };
    }
    if let Some(rest) = path.strip_prefix("control.states.") {
        let (state, field) = rest.split_once('.')?;
        if ![
            "default",
            "hover",
            "focus",
            "active",
            "selected",
            "indeterminate",
            "readonly",
            "required",
            "invalid",
            "disabled",
        ]
        .contains(&state)
        {
            return None;
        }
        if let Some(rest) = field.strip_prefix("parts.") {
            let (part, key) = rest.split_once('.')?;
            if ![
                "calendar",
                "calendar_day",
                "calendar_selected",
                "calendar_header",
                "dot",
                "thumb",
                "container",
                "input",
                "label",
                "placeholder",
                "helper",
                "validation",
                "menu",
                "option",
                "option_hover",
                "option_selected",
                "category",
                "pill",
                "more",
                "actions",
                "checkbox",
                "checkbox_selected",
                "search",
                "actions_hover",
                "bulk_indicator",
            ]
            .contains(&part)
            {
                return None;
            }
            return match key {
                "color" | "background" | "border_color" | "halo_color" => Some("color"),
                "padding" => Some("padding"),
                "margin" => Some("margin"),
                "radius" => Some("border_radius"),
                "border_width" => Some("border_width"),
                "font_family" | "text_align" | "font_style" | "text_decoration"
                | "border_style" | "direction" | "align_items" | "visibility" => Some("string"),
                "font_size" | "font_weight" | "line_height" | "letter_spacing" | "gap"
                | "height" | "min_height" | "width" | "size" | "opacity" | "halo_width"
                | "halo_offset" => Some("number"),
                _ => None,
            };
        }
        return match field {
            "background" | "color" | "border_color" => Some("color"),
            "opacity" | "radius" => Some("number"),
            _ => None,
        };
    }
    match path {
        "control.required_icon_color" => Some("color"),
        "control.required_icon" | "control.required_svg" => Some("string"),
        "control.required_icon_size"
        | "control.required_icon_weight"
        | "control.required_icon_offset" => Some("number"),
        "auto_layout.padding" => Some("padding"),
        "appearance.corner_radii" => Some("border_radius"),
        "border_widths" => Some("border_width"),
        "layout_item.margin" => Some("margin"),
        "fill" | "appearance.stroke_color" => Some("color"),
        "text" | "typography.font_family" => Some("string"),
        "hidden" | "clip_content" => Some("boolean"),
        "x"
        | "y"
        | "rotation"
        | "appearance.fill_opacity"
        | "appearance.stroke_opacity"
        | "appearance.layer_blur"
        | "appearance.backdrop_blur"
        | "typography.font_weight"
        | "typography.line_height"
        | "appearance.corner_radii.0"
        | "appearance.corner_radii.1"
        | "appearance.corner_radii.2"
        | "appearance.corner_radii.3"
        | "width"
        | "height"
        | "stroke_width"
        | "appearance.opacity"
        | "appearance.corner_radius"
        | "typography.font_size"
        | "auto_layout.gap"
        | "auto_layout.cross_gap"
        | "auto_layout.padding_top"
        | "auto_layout.padding_right"
        | "auto_layout.padding_bottom"
        | "auto_layout.padding_left" => Some("number"),
        _ => None,
    }
}
fn resolved(
    vars: &Variables,
    id: u32,
    modes: &BTreeMap<u32, u32>,
    visiting: &mut HashSet<u32>,
) -> Result<Value, String> {
    if !visiting.insert(id) || visiting.len() > 64 {
        return Err("Variable aliases cannot contain cycles or exceed 64 links".into());
    }
    let v = vars
        .values
        .iter()
        .find(|v| v.id == id)
        .ok_or("Variable not found")?;
    let c = vars
        .collections
        .iter()
        .find(|c| c.id == v.collection_id)
        .ok_or("Variable collection not found")?;
    let mode = modes.get(&c.id).copied().unwrap_or(c.default_mode);
    let value = v
        .values
        .get(&mode)
        .ok_or("Variable value missing for mode")?;
    if let Some(alias) = value.get("alias").and_then(Value::as_u64) {
        let target = vars
            .values
            .iter()
            .find(|v| v.id as u64 == alias)
            .ok_or("Alias target not found")?;
        if target.kind != v.kind {
            return Err("Aliases must have the same variable type".into());
        }
        resolved(vars, target.id, modes, visiting)
    } else {
        Ok(value.clone())
    }
}
pub fn validate_variables(doc: &Document) -> Result<(), String> {
    let vars = &doc.variables;
    if vars.collections.len() > 100 || vars.values.len() > 2000 {
        return Err("Variable limit reached".into());
    }
    let mut ids = HashSet::new();
    for c in &vars.collections {
        if c.id == 0
            || !ids.insert(c.id)
            || !name(&c.name)
            || c.modes.is_empty()
            || c.modes.len() > 32
        {
            return Err("Invalid variable collection".into());
        }
        let mut modes = HashSet::new();
        for m in &c.modes {
            if m.id == 0 || !modes.insert(m.id) || !name(&m.name) {
                return Err("Invalid variable mode".into());
            }
        }
        if !modes.contains(&c.default_mode) {
            return Err("Default mode must belong to its collection".into());
        }
    }
    ids.clear();
    for v in &vars.values {
        let c = vars
            .collections
            .iter()
            .find(|c| c.id == v.collection_id)
            .ok_or("Variable collection missing")?;
        if !v.control_path.is_empty()
            && (![
                "input_base",
                "dropdown_base",
                "checkbox_base",
                "switch_base",
                "button_base",
                "segmented_base",
                "radio_base",
                "calendar_base",
            ]
            .contains(&c.preset.as_str())
                || !(v.control_path.starts_with("control.states.")
                    || v.control_path.starts_with("control.left_adornment.")
                    || v.control_path.starts_with("control.right_adornment.")
                    || [
                        "control.required_icon",
                        "control.required_svg",
                        "control.required_icon_size",
                        "control.required_icon_weight",
                        "control.required_icon_offset",
                        "control.required_icon_color",
                    ]
                    .contains(&v.control_path.as_str()))
                || !compatible_property_kind(&v.control_path, &v.kind))
        {
            return Err("Invalid input variable property".into());
        }
        if v.id == 0
            || !ids.insert(v.id)
            || !name(&v.name)
            || ![
                "color",
                "number",
                "string",
                "boolean",
                "padding",
                "margin",
                "border_radius",
                "border_width",
            ]
            .contains(&v.kind.as_str())
            || v.values.len() != c.modes.len()
        {
            return Err("Invalid variable definition".into());
        }
        for m in &c.modes {
            let val = v
                .values
                .get(&m.id)
                .ok_or("Each variable needs a value for every mode")?;
            if val.is_object() {
                if val.as_object().unwrap().len() != 1
                    || val.get("alias").and_then(Value::as_u64).is_none()
                {
                    return Err("Invalid variable alias".into());
                }
            } else if !match v.kind.as_str() {
                "color" => color(val),
                "padding" | "border_radius" | "border_width" => padding(val).is_some(),
                "margin" => spacing_values(val, true).is_some(),
                "number" => val
                    .as_f64()
                    .is_some_and(|n| n.is_finite() && n.abs() <= 1_000_000.0),
                "string" => val.as_str().is_some_and(|s| s.len() <= 10000),
                "boolean" => val.is_boolean(),
                _ => false,
            } {
                return Err(if v.kind == "margin" {
                    "Margin needs 1–4 numbers in CSS shorthand order"
                } else if v.kind == "border_radius" {
                    "Border radius needs 1–4 non-negative numbers in CSS corner order"
                } else if v.kind == "border_width" {
                    "Border width needs 1–4 non-negative numbers in CSS shorthand order"
                } else if v.kind == "padding" {
                    "Padding needs 1–4 non-negative numbers in CSS shorthand order"
                } else {
                    "Value does not match variable type"
                }
                .into());
            }
            resolved(
                vars,
                v.id,
                &BTreeMap::from([(c.id, m.id)]),
                &mut HashSet::new(),
            )?;
        }
    }
    for page in &doc.pages {
        for (collection, mode) in &page.variable_modes {
            if !vars
                .collections
                .iter()
                .any(|c| c.id == *collection && c.modes.iter().any(|m| m.id == *mode))
            {
                return Err("Page references a missing variable mode".into());
            }
        }
    }
    for s in &doc.shapes {
        for (collection, mode) in &s.variable_modes {
            if !vars
                .collections
                .iter()
                .any(|c| c.id == *collection && c.modes.iter().any(|m| m.id == *mode))
            {
                return Err("Layer references a missing variable mode".into());
            }
        }
        for (path, id) in &s.variable_bindings {
            let v = vars
                .values
                .iter()
                .find(|v| v.id == *id)
                .ok_or("Layer references a missing variable")?;
            if !compatible_property_kind(path, v.kind.as_str()) {
                return Err("Variable type does not match property".into());
            }
            if (path.starts_with("control.") && s.control.is_none())
                || (path.starts_with("auto_layout.") && s.auto_layout.is_none())
                || ((path == "text" || path.starts_with("typography.")) && s.kind != "text")
            {
                return Err("Variable cannot be applied to this layer property".into());
            }
        }
    }
    Ok(())
}
fn modes_for(doc: &Document, s: &Shape) -> BTreeMap<u32, u32> {
    let mut modes = s.variable_modes.clone();
    let mut parent = s.parent_id;
    let mut visited = HashSet::new();
    while parent != 0 && visited.insert(parent) {
        let Some(p) = doc.shapes.iter().find(|s| s.id == parent) else {
            break;
        };
        for (c, m) in &p.variable_modes {
            modes.entry(*c).or_insert(*m);
        }
        parent = p.parent_id;
    }
    if let Some(page) = doc.pages.iter().find(|p| p.id == s.page_id) {
        for (c, m) in &page.variable_modes {
            modes.entry(*c).or_insert(*m);
        }
    }
    modes
}
fn assign(shape: &mut Shape, path: &str, value: Value) -> Result<(), String> {
    if let Some(rest) = path.strip_prefix("control.") {
        if let Some((side, key)) = rest.split_once('.') {
            if side == "left_adornment" || side == "right_adornment" {
                let control = shape.control.as_mut().ok_or("Select a native control")?;
                let adornment = if side == "left_adornment" {
                    &mut control.left_adornment
                } else {
                    &mut control.right_adornment
                };
                match key {
                    "color" => adornment.color = value.as_str().ok_or("Invalid color")?.into(),
                    "size" => adornment.size = Some(value.as_f64().ok_or("Invalid number")?),
                    "weight" => adornment.weight = Some(value.as_f64().ok_or("Invalid number")?),
                    "gap" => adornment.gap = Some(value.as_f64().ok_or("Invalid number")?),
                    "offset" => adornment.offset = Some(value.as_f64().ok_or("Invalid number")?),
                    _ => return Err("Invalid icon property".into()),
                }
                return Ok(());
            }
        }
    }
    if let Some(rest) = path.strip_prefix("control.states.") {
        let (state, field) = rest.split_once('.').ok_or("Invalid control state")?;
        let control = shape.control.as_mut().ok_or("Select a native control")?;
        let style = control.states.entry(state.into()).or_default();
        if let Some(rest) = field.strip_prefix("parts.") {
            let (part, key) = rest.split_once('.').ok_or("Invalid control part")?;
            if property_kind(path).is_none() {
                return Err("Invalid control part style".into());
            }
            style
                .parts
                .entry(part.into())
                .or_default()
                .insert(key.into(), value);
            return Ok(());
        }
        match field {
            "background" => style.background = value.as_str().ok_or("Invalid color")?.into(),
            "color" => style.color = value.as_str().ok_or("Invalid color")?.into(),
            "border_color" => style.border_color = value.as_str().ok_or("Invalid color")?.into(),
            "opacity" => {
                style.opacity = Some(value.as_f64().ok_or("Invalid number")?.clamp(0.0, 1.0))
            }
            "radius" => style.radius = Some(value.as_f64().ok_or("Invalid number")?.max(0.0)),
            _ => return Err("Invalid control style".into()),
        }
        return Ok(());
    }
    if path == "layout_item.margin" {
        shape.layout_item.margin = spacing_values(&value, true)
            .ok_or("Invalid margin")?
            .try_into()
            .unwrap();
        return Ok(());
    }
    if path == "border_widths" {
        shape.border_widths = Some(
            padding(&value)
                .ok_or("Invalid border widths")?
                .try_into()
                .unwrap(),
        );
        let mut effective = components::effective_value(shape);
        effective["appearance"]["stroke_enabled"] = Value::Bool(true);
        effective["appearance"]["stroke_alignment"] = Value::String("inside".into());
        shape.appearance = Some(
            serde_json::from_value(effective["appearance"].clone()).map_err(|e| e.to_string())?,
        );
        return Ok(());
    }
    if path == "auto_layout.padding" {
        let values = padding(&value).ok_or("Invalid padding variable")?;
        let layout = shape
            .auto_layout
            .as_mut()
            .ok_or("Padding requires auto layout")?;
        layout.padding_top = values[0];
        layout.padding_right = values[1];
        layout.padding_bottom = values[2];
        layout.padding_left = values[3];
        return Ok(());
    }
    let mut json = serde_json::to_value(&shape).unwrap();
    if path == "appearance.corner_radii" || path.starts_with("appearance.corner_radii.") {
        if !json["appearance"].is_object() {
            json["appearance"] = components::effective_value(shape)["appearance"].clone();
        }
        if path == "appearance.corner_radii" {
            json["appearance"]["corner_radii"] =
                serde_json::to_value(padding(&value).ok_or("Invalid border radius variable")?)
                    .unwrap();
        } else {
            let index = path
                .rsplit('.')
                .next()
                .unwrap()
                .parse::<usize>()
                .map_err(|_| "Invalid corner")?;
            if json["appearance"]["corner_radii"].is_null() {
                let radius = json["appearance"]["corner_radius"].clone();
                json["appearance"]["corner_radii"] =
                    serde_json::json!([radius, radius, radius, radius]);
            }
            json["appearance"]["corner_radii"][index] = value;
        }
        *shape = serde_json::from_value(json).map_err(|e| e.to_string())?;
        return Ok(());
    }

    if let Some((field, property)) = path.split_once('.') {
        if !json[field].is_object() {
            json[field] = components::effective_value(shape)[field].clone();
        }
        json[field][property] = value;
        if path == "appearance.corner_radius" {
            json[field]["corner_radii"] = Value::Null;
        }
        if path == "appearance.stroke_color" {
            json[field]["stroke_gradient"] = Value::Null;
            json[field]["stroke_enabled"] = Value::Bool(true);
        }
    } else {
        json[path] = value;
    }
    if path == "fill" && json["appearance"].is_object() {
        json["appearance"]["gradient"] = Value::Null;
        json["appearance"]["fill_enabled"] = Value::Bool(true);
    }
    *shape = serde_json::from_value(json).map_err(|e| e.to_string())?;
    Ok(())
}
pub fn resolve(doc: &mut Document) -> Result<(), String> {
    if doc.variables.values.is_empty() {
        return Ok(());
    }
    let mut shapes = doc.shapes.clone();
    for s in &mut shapes {
        let modes = modes_for(doc, s);
        for (path, id) in s.variable_bindings.clone() {
            assign(
                s,
                &path,
                resolved(&doc.variables, id, &modes, &mut HashSet::new())?,
            )?;
        }
    }
    doc.shapes = shapes;
    Ok(())
}
// A direct property edit detaches its token, retaining the new literal value.
pub fn detach_edited(old: &Shape, new: &mut Shape) {
    let a = components::effective_value(old);
    let b = components::effective_value(new);
    let stroke_changed = old.stroke_width != new.stroke_width;
    if stroke_changed {
        new.border_widths = None;
    }
    new.variable_bindings.retain(|path, id| {
        if old.variable_bindings.get(path) != Some(id) {
            return true;
        }
        if path == "auto_layout.padding" {
            return [
                "padding_top",
                "padding_right",
                "padding_bottom",
                "padding_left",
            ]
            .iter()
            .all(|key| a["auto_layout"][key] == b["auto_layout"][key]);
        }
        if path == "border_widths" && stroke_changed {
            return false;
        }
        let pointer = format!("/{}", path.replace('.', "/"));
        a.pointer(&pointer) == b.pointer(&pointer)
    });
    if new.control.is_none() {
        new.variable_bindings
            .retain(|p, _| !p.starts_with("control."));
    }
    if new.auto_layout.is_none() {
        new.variable_bindings
            .retain(|p, _| !p.starts_with("auto_layout."));
    }
}
#[wasm_bindgen]
impl Editor {
    pub fn save_variables(&mut self, json: &str) -> Result<(), String> {
        if json.len() > 1_000_000 {
            return Err("Variable definitions too large".into());
        }
        let vars: Variables = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut doc = self.document.clone();
        doc.variables = vars;
        for page in &mut doc.pages {
            page.variable_modes.retain(|c, m| {
                doc.variables
                    .collections
                    .iter()
                    .any(|v| v.id == *c && v.modes.iter().any(|v| v.id == *m))
            });
        }
        // Native control styles inherit when their variable is deleted. Other
        // layer properties retain their last resolved value when detached.
        for s in &mut doc.shapes {
            let removed: Vec<String> = s
                .variable_bindings
                .iter()
                .filter(|(_, id)| !doc.variables.values.iter().any(|v| v.id == **id))
                .map(|(path, _)| path.clone())
                .collect();
            if let Some(control) = &mut s.control {
                for path in &removed {
                    if let Some(rest) = path.strip_prefix("control.states.") {
                        if let Some((state, field)) = rest.split_once('.') {
                            if let Some(style) = control.states.get_mut(state) {
                                if let Some(rest) = field.strip_prefix("parts.") {
                                    if let Some((part, key)) = rest.split_once('.') {
                                        if let Some(values) = style.parts.get_mut(part) {
                                            values.remove(key);
                                        }
                                    }
                                } else {
                                    match field {
                                        "background" => style.background.clear(),
                                        "color" => style.color.clear(),
                                        "border_color" => style.border_color.clear(),
                                        "opacity" => style.opacity = None,
                                        "radius" => style.radius = None,
                                        _ => {}
                                    }
                                }
                            }
                        }
                    } else {
                        if let Some((side, key)) = path
                            .strip_prefix("control.")
                            .and_then(|p| p.split_once('.'))
                        {
                            let adornment = match side {
                                "left_adornment" => Some(&mut control.left_adornment),
                                "right_adornment" => Some(&mut control.right_adornment),
                                _ => None,
                            };
                            if let Some(a) = adornment {
                                match key {
                                    "color" => a.color.clear(),
                                    "size" => a.size = None,
                                    "weight" => a.weight = None,
                                    "gap" => a.gap = None,
                                    "offset" => a.offset = None,
                                    _ => {}
                                }
                            }
                        }
                        match path.as_str() {
                            "control.required_icon" => control.required_icon.clear(),
                            "control.required_svg" => control.required_svg.clear(),
                            "control.required_icon_color" => control.required_icon_color.clear(),
                            "control.required_icon_size" => control.required_icon_size = 0.0,
                            "control.required_icon_weight" => control.required_icon_weight = 0.0,
                            "control.required_icon_offset" => control.required_icon_offset = 0.0,
                            _ => {}
                        }
                    }
                }
            }
            s.variable_bindings
                .retain(|_, id| doc.variables.values.iter().any(|v| v.id == *id));
            s.variable_modes.retain(|c, m| {
                doc.variables
                    .collections
                    .iter()
                    .any(|v| v.id == *c && v.modes.iter().any(|v| v.id == *m))
            });
            // Newly added input tokens join subscribed starters; explicit local
            // styles and existing bindings remain untouched. Instances inherit.
            if let Some(control) = &s.control {
                if control.base_collection != 0
                    && !matches!(s.component, Some(components::Component::Instance { .. }))
                {
                    let value = serde_json::to_value(&*s).unwrap();
                    for v in &doc.variables.values {
                        if v.collection_id != control.base_collection
                            || v.control_path.is_empty()
                            || self
                                .document
                                .variables
                                .values
                                .iter()
                                .any(|old| old.id == v.id)
                        {
                            continue;
                        }
                        let pointer = format!("/{}", v.control_path.replace('.', "/"));
                        let default_marker = match v.control_path.as_str() {
                            "control.left_adornment.color" => {
                                control.left_adornment.color.is_empty()
                            }
                            "control.right_adornment.color" => {
                                control.right_adornment.color.is_empty()
                            }
                            "control.required_icon" => {
                                control.required_icon.is_empty()
                                    || control.required_icon == "asterisk"
                            }
                            "control.required_svg" => control.required_svg.is_empty(),
                            "control.required_icon_size" => {
                                control.required_icon_size == 0.0
                                    || control.required_icon_size == 14.0
                            }
                            "control.required_icon_color" => control.required_icon_color.is_empty(),
                            "control.required_icon_offset" => control.required_icon_offset == 0.0,
                            "control.required_icon_weight" => {
                                control.required_icon_weight == 0.0
                                    || control.required_icon_weight == 1.5
                            }
                            _ => false,
                        };
                        if default_marker
                            || value.pointer(&pointer).is_none_or(|value| value.is_null())
                        {
                            s.variable_bindings
                                .entry(v.control_path.clone())
                                .or_insert(v.id);
                        }
                    }
                }
            }
        }
        validate_variables(&doc)?;
        resolve(&mut doc)?;
        self.commit(doc)
    }
    pub fn bind_variable(&mut self, id: u32, path: &str, variable: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        if variable != 0 {
            let v = doc
                .variables
                .values
                .iter()
                .find(|v| v.id == variable)
                .ok_or("Variable not found")?;
            let target = doc
                .shapes
                .iter()
                .find(|s| s.id == id)
                .ok_or("Layer not found")?;
            if !compatible_property_kind(path, v.kind.as_str())
                || (path.starts_with("control.states.") && target.control.is_none())
                || (path.starts_with("auto_layout.") && target.auto_layout.is_none())
                || ((path == "text" || path.starts_with("typography.")) && target.kind != "text")
            {
                return Err("Variable cannot be applied to this layer property".into());
            }
        }
        let s = doc
            .shapes
            .iter_mut()
            .find(|s| s.id == id && s.page_id == doc.active_page)
            .ok_or("Select a layer on this page")?;
        let old = s.clone();
        if variable == 0 {
            s.variable_bindings.remove(path);
        } else {
            if path == "border_widths" {
                s.variable_bindings.remove("stroke_width");
            } else if path == "stroke_width" {
                s.variable_bindings.remove("border_widths");
                s.border_widths = None;
            }
            if path == "appearance.corner_radii" || path == "appearance.corner_radius" {
                s.variable_bindings.retain(|p, _| {
                    p != "appearance.corner_radius" && !p.starts_with("appearance.corner_radii")
                });
            } else if path.starts_with("appearance.corner_radii.") {
                s.variable_bindings.remove("appearance.corner_radii");
                s.variable_bindings.remove("appearance.corner_radius");
            }
            if path == "auto_layout.padding" {
                s.variable_bindings
                    .retain(|p, _| !p.starts_with("auto_layout.padding_"));
            } else if path.starts_with("auto_layout.padding_") {
                s.variable_bindings.remove("auto_layout.padding");
            }
            s.variable_bindings.insert(path.into(), variable);
        }
        crate::starter_defaults::record(&old, s);
        components::record_overrides(&old, s)?;
        validate_variables(&doc)?;
        resolve(&mut doc)?;
        self.commit(doc)
    }
    pub fn set_page_variable_mode(
        &mut self,
        id: u32,
        collection: u32,
        mode: u32,
    ) -> Result<(), String> {
        let mut doc = self.document.clone();
        let page = doc
            .pages
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or("Page not found")?;
        if mode == 0 {
            page.variable_modes.remove(&collection);
        } else {
            page.variable_modes.insert(collection, mode);
        }
        validate_variables(&doc)?;
        resolve(&mut doc)?;
        self.commit(doc)
    }
    pub fn set_variable_mode(&mut self, id: u32, collection: u32, mode: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        let s = doc
            .shapes
            .iter_mut()
            .find(|s| s.id == id && s.page_id == doc.active_page)
            .ok_or("Select a layer on this page")?;
        let old = s.clone();
        if mode == 0 {
            s.variable_modes.remove(&collection);
        } else {
            s.variable_modes.insert(collection, mode);
        }
        crate::starter_defaults::record(&old, s);
        components::record_overrides(&old, s)?;
        validate_variables(&doc)?;
        resolve(&mut doc)?;
        self.commit(doc)
    }
}
