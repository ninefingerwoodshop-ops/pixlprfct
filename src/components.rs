use super::*;
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Component {
    Master,
    Instance {
        master: u32,
        source: u32,
        #[serde(default)]
        overrides: Vec<String>,
    },
}
const FIELDS: &[&str] = &[
    "control_state",
    "control",
    "behaviors",
    "custom_css",
    "rotation",
    "border_widths",
    "variable_bindings",
    "variable_modes",
    "name",
    "text",
    "fill",
    "appearance",
    "typography",
    "hidden",
    "locked",
    "image",
    "stroke_width",
    "points",
    "handles",
    "closed",
    "clip_content",
    "aspect_ratio_locked",
    "auto_layout",
    "layout_grids",
    "guide_style",
    "effect_style",
    "text_style",
    "fill_style",
    "stroke_style",
    "prototype",
    "additional_interactions",
    "layout_item",
    "constraints",
    "width",
    "height",
    "x",
    "y",
];

// Old detach only removed the component link, leaving native button text with
// no editable layer. Materialize that label and remove the native overlay.
pub(crate) fn restore_detached_button_labels(
    doc: &mut Document,
    next: &mut u32,
) -> Result<(), String> {
    let buttons: Vec<_> = doc
        .shapes
        .iter()
        .filter(|s| {
            s.component.is_none()
                && s.control
                    .as_ref()
                    .is_some_and(|c| c.kind == "button" && !c.starter)
        })
        .filter(|s| {
            let mut parent = s.parent_id;
            while let Some(p) = doc.shapes.iter().find(|p| p.id == parent) {
                if p.component.is_some() {
                    return false;
                }
                parent = p.parent_id;
            }
            true
        })
        .cloned()
        .collect();
    for button in buttons {
        let control = button.control.as_ref().unwrap();
        let existing = subtree(&doc.shapes, button.id)
            .into_iter()
            .find(|s| s.kind == "text");
        let mut label = existing.clone().unwrap_or_else(|| button.clone());
        if existing.is_none() {
            label.id = *next;
            *next = next.checked_add(1).ok_or("Shape ID limit reached")?;
            label.parent_id = button.id;
            label.kind = "text".into();
            label.name = "Label".into();
            label.appearance = None;
            label.auto_layout = None;
            label.layout_item = LayoutItem::default();
            label.constraints = Constraints::default();
            label.variable_bindings.clear();
            label.variable_modes.clear();
            label.rotation = 0.0;
            label.aspect_ratio_locked = false;
            label.clip_content = false;
            label.points.clear();
            label.handles.clear();
            label.closed = false;
            label.image = None;
            label.border_widths = None;
            label.behaviors.clear();
            label.layout_grids.clear();
            label.guide_style = 0;
            label.effect_style = 0;
            label.text_style = 0;
            label.fill_style = 0;
            label.stroke_style = 0;
            label.prototype = None;
            label.additional_interactions.clear();
            label.flow_name.clear();
            let horizontal = crate::layout::padding(&button, true);
            let vertical = crate::layout::padding(&button, false);
            label.width = (button.width - horizontal).max(1.0);
            label.height = (button.height - vertical).max(1.0);
            label.x = button.x + button.auto_layout.as_ref().map_or(0.0, |l| l.padding_left);
            label.y = button.y + button.auto_layout.as_ref().map_or(0.0, |l| l.padding_top);
        }
        label.component = None;
        label.control = None;
        label.control_state.clear();
        label.hidden = false;
        label.locked = false;
        label.text = control.label.clone();
        let mut typography = button
            .typography
            .clone()
            .or(label.typography.clone())
            .unwrap_or(Typography {
                font_size: 16.0,
                font_weight: 400,
                line_height: 1.2,
                ..Typography::default()
            });
        typography.sizing = if button.auto_layout.as_ref().is_some_and(|l| l.hug_width) {
            "width"
        } else {
            "fixed"
        }
        .into();
        typography.align = "center".into();
        typography.vertical_align = "center".into();
        label.typography = Some(typography);
        label.fill = "#222222".into();
        let root = doc.shapes.iter_mut().find(|s| s.id == button.id).unwrap();
        let mut appearance: Appearance =
            serde_json::from_value(effective_value(root)["appearance"].clone())
                .map_err(|e| e.to_string())?;
        for state in ["default", button.control_state.as_str()] {
            if let Some(style) = control.states.get(state) {
                if style.color.starts_with('#') && style.color.len() == 7 {
                    label.fill = style.color.clone();
                }
                if style.background.starts_with('#') && style.background.len() == 7 {
                    root.fill = style.background.clone();
                    appearance.fill_enabled = true;
                    root.variable_bindings.remove("fill");
                    root.variable_bindings.remove("appearance.fill_enabled");
                }
                if style.border_color.starts_with('#') && style.border_color.len() == 7 {
                    appearance.stroke_color = style.border_color.clone();
                    root.variable_bindings.remove("appearance.stroke_color");
                }
                if let Some(opacity) = style.opacity {
                    appearance.opacity = opacity;
                    root.variable_bindings.remove("appearance.opacity");
                }
                if let Some(radius) = style.radius {
                    appearance.corner_radius = radius;
                    appearance.corner_radii = None;
                    root.variable_bindings.remove("appearance.corner_radius");
                    root.variable_bindings.remove("appearance.corner_radii");
                }
            }
        }
        root.appearance = Some(appearance);
        root.control = None;
        root.control_state.clear();
        root.variable_bindings
            .retain(|path, _| !path.starts_with("control.states."));
        if let Some(old) = doc.shapes.iter_mut().find(|s| s.id == label.id) {
            *old = label;
        } else {
            doc.shapes.push(label);
        }
    }
    Ok(())
}

fn subfields(field: &str) -> &'static [&'static str] {
    match field {
        "control" => &[
            "segmented",
            "password",
            "number",
            "upload",
            "textarea",
            "calendar",
            "selected_values",
            "dropdown",
            "shared_overrides",
            "starter_linked",
            "validation_trigger",
            "pattern",
            "min_length",
            "max_length",
            "left_adornment",
            "right_adornment",
            "base_collection",
            "kind",
            "label",
            "label_position",
            "width_sizing",
            "name",
            "value",
            "placeholder",
            "helper_message",
            "hide_helper",
            "validation_message",
            "invalid",
            "disabled",
            "readonly",
            "checked",
            "required",
            "required_icon",
            "required_svg",
            "required_icon_size",
            "required_icon_weight",
            "required_icon_offset",
            "required_icon_color",
            "multiple",
            "min",
            "max",
            "step",
            "accept",
            "src",
            "options",
            "states",
            "toggle",
        ],
        "typography" => &[
            "sizing",
            "font_size",
            "font_family",
            "font_weight",
            "align",
            "vertical_align",
            "line_height",
            "letter_spacing",
            "letter_spacing_unit",
            "text_case",
            "wrap",
        ],
        "appearance" => &[
            "fills",
            "image_opacity",
            "strokes",
            "shadows",
            "layer_blur",
            "layer_blur_enabled",
            "layer_blur_present",
            "backdrop_blur_present",
            "backdrop_blur",
            "backdrop_blur_enabled",
            "blend_mode",
            "gradient",
            "stroke_gradient",
            "opacity",
            "fill_opacity",
            "stroke_opacity",
            "corner_radius",
            "corner_radii",
            "fill_enabled",
            "fill_hidden",
            "stroke_enabled",
            "stroke_hidden",
            "stroke_color",
            "stroke_dash",
            "stroke_dash_offset",
            "stroke_cap",
            "stroke_alignment",
            "stroke_start",
            "stroke_end",
            "stroke_join",
            "stroke_miter_limit",
        ],
        "constraints" => &["horizontal", "vertical"],
        "layout_item" => &[
            "grid_cell",
            "fill_width",
            "fill_height",
            "absolute",
            "min_width",
            "max_width",
            "min_height",
            "max_height",
        ],
        "auto_layout" => &[
            "grid",
            "direction",
            "wrap",
            "cross_gap",
            "align_content",
            "gap",
            "padding_top",
            "padding_right",
            "padding_bottom",
            "padding_left",
            "align",
            "justify",
            "hug_width",
            "hug_height",
            "strokes_included",
            "text_baseline",
            "canvas_stacking",
        ],
        _ => &[],
    }
}
fn valid_override(path: &str) -> bool {
    if let Some((field, property)) = path.split_once('.') {
        subfields(field).contains(&property)
    } else {
        FIELDS.contains(&path)
    }
}
// Legacy paint defaults must be compared by appearance, not by whether the
// optional object was serialized. Otherwise changing opacity also overrides fill.
pub(crate) fn effective_value(s: &Shape) -> serde_json::Value {
    let mut value = serde_json::to_value(s).unwrap();
    if s.appearance.is_none() {
        value["appearance"] = serde_json::json!({"blend_mode":"pass-through","backdrop_blur":0.0,"backdrop_blur_enabled":true,"layer_blur":0.0,"layer_blur_enabled":true,"shadows":[],"gradient":null,"stroke_gradient":null,"opacity":1.0,"fill_opacity":1.0,"stroke_opacity":1.0,"corner_radius":0.0,"corner_radii":null,"stroke_dash":[],"stroke_dash_offset":0.0,"stroke_cap":"round","stroke_alignment":"center","stroke_join":"round","stroke_miter_limit":10.0,"fill_enabled":s.points.is_empty()||s.closed,"stroke_enabled":!s.points.is_empty(),"stroke_color":if s.points.is_empty(){"#000000"}else{&s.fill}});
    }
    if s.typography.is_none() {
        value["typography"] = serde_json::to_value(Typography::default()).unwrap();
    }
    value
}
fn apply_overrides(
    shape: &mut Shape,
    previous: &Shape,
    overrides: &[String],
) -> Result<(), String> {
    // Position is handled by sync itself. Most descendants inherit everything,
    // so they need no JSON round trip when there are no other overrides.
    if overrides.iter().all(|path| path == "x" || path == "y") {
        return Ok(());
    }
    let mut value = serde_json::to_value(&shape).unwrap();
    let defaults = effective_value(shape);
    let old = effective_value(previous);
    for path in overrides {
        if path == "prototype" {
            value["additional_interactions"] =
                serde_json::to_value(&previous.additional_interactions).unwrap();
        }
        if path == "x" || path == "y" {
            continue;
        }
        if let Some((field, property)) = path.split_once('.') {
            if !value[field].is_object() {
                value[field] = if defaults[field].is_object() {
                    defaults[field].clone()
                } else {
                    old[field].clone()
                };
            }
            if value[field].is_object() {
                value[field][property] = old[field][property].clone();
            }
        } else {
            value[path] = serde_json::to_value(previous).unwrap()[path].clone();
        }
    }
    *shape = serde_json::from_value(value).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn subtree(shapes: &[Shape], root: u32) -> Vec<Shape> {
    fn walk(shapes: &[Shape], id: u32, out: &mut Vec<Shape>) {
        if let Some(s) = shapes.iter().find(|s| s.id == id) {
            out.push(s.clone());
            for child in shapes.iter().filter(|s| s.parent_id == id) {
                walk(shapes, child.id, out);
            }
        }
    }
    let mut out = vec![];
    walk(shapes, root, &mut out);
    out
}

pub fn validate_links(doc: &Document) -> Result<(), String> {
    let by_id: HashMap<_, _> = doc.shapes.iter().map(|s| (s.id, s)).collect();
    let mut sources = HashSet::new();
    for s in &doc.shapes {
        let parent = by_id.get(&s.parent_id).and_then(|p| p.component.as_ref());
        match &s.component {
            Some(Component::Master) => {
                if s.kind != "frame" {
                    return Err("Components must be frames".into());
                }
            }
            Some(Component::Instance {
                master,
                source,
                overrides,
            }) => {
                if *master == 0
                    || *source == 0
                    || overrides.len() > 64
                    || overrides.iter().any(|f| !valid_override(f))
                    || overrides.iter().collect::<HashSet<_>>().len() != overrides.len()
                {
                    return Err("Invalid component link or override".into());
                }
                if master == source {
                    if s.kind != "frame" {
                        return Err("Instances must be frames".into());
                    }
                } else if !matches!(parent, Some(Component::Instance { master: m, .. }) if m == master)
                {
                    return Err("Detach the instance before changing its structure".into());
                }
                let mut root = s;
                while matches!(&root.component,Some(Component::Instance{master,source,..}) if master != source)
                {
                    root = by_id
                        .get(&root.parent_id)
                        .copied()
                        .ok_or("Invalid instance ancestry")?;
                }
                if !sources.insert((root.id, *source)) {
                    return Err("Duplicate component source in an instance".into());
                }
            }
            None => {
                if matches!(parent, Some(Component::Instance { .. }))
                    && by_id.get(&s.parent_id).is_none_or(|p| p.slot.is_none())
                {
                    return Err("Detach the instance before adding layers".into());
                }
            }
        }
        if matches!(s.component, Some(Component::Master))
            || matches!(&s.component,Some(Component::Instance{master,source,..}) if master==source)
        {
            let mut p = s.parent_id;
            while let Some(ancestor) = by_id.get(&p) {
                if ancestor.slot.is_some() && s.component != Some(Component::Master) {
                    break;
                }
                if matches!(ancestor.component, Some(Component::Instance { .. }))
                    || (s.component == Some(Component::Master)
                        && ancestor.component == Some(Component::Master))
                {
                    return Err("Nested main components are not supported; nest linked instances inside main components instead".into());
                }
                p = ancestor.parent_id;
            }
        }
    }
    Ok(())
}

pub fn record_overrides(old: &Shape, new: &mut Shape) -> Result<(), String> {
    variables::detach_edited(old, new);
    if new.text_style == old.text_style
        && (text_styles::style_values(old.typography.as_ref())
            != text_styles::style_values(new.typography.as_ref())
            || old
                .variable_bindings
                .iter()
                .chain(new.variable_bindings.iter())
                .any(|(path, _)| {
                    path.starts_with("typography.")
                        && old.variable_bindings.get(path) != new.variable_bindings.get(path)
                }))
    {
        new.text_style = 0;
    }
    for stroke in [false, true] {
        let prefix = format!("appearance.{}.", if stroke { "strokes" } else { "fills" });
        let same = if stroke {
            new.stroke_style == old.stroke_style
        } else {
            new.fill_style == old.fill_style
        };
        let changed = color_styles::values(old, stroke) != color_styles::values(new, stroke)
            || old
                .variable_bindings
                .iter()
                .chain(new.variable_bindings.iter())
                .any(|(path, _)| {
                    (path.starts_with(&prefix)
                        || path
                            == if stroke {
                                "appearance.stroke_color"
                            } else {
                                "fill"
                            })
                        && old.variable_bindings.get(path) != new.variable_bindings.get(path)
                });
        if same && changed {
            if stroke {
                new.stroke_style = 0;
            } else {
                new.fill_style = 0;
            }
        }
    }
    if new.guide_style == old.guide_style && new.layout_grids != old.layout_grids {
        new.guide_style = 0;
    }
    if new.effect_style == old.effect_style
        && (effect_styles::Effects::from_appearance(new.appearance.as_ref())
            != effect_styles::Effects::from_appearance(old.appearance.as_ref())
            || ["appearance.layer_blur", "appearance.backdrop_blur"]
                .iter()
                .any(|path| old.variable_bindings.get(*path) != new.variable_bindings.get(*path)))
    {
        new.effect_style = 0;
    }
    if old.slot != new.slot || old.slot_origin != new.slot_origin {
        return Err("Use the slot actions to change slot definitions".into());
    }
    if old.component != new.component {
        return Err("Use the component actions to change component links".into());
    }
    if let Some(Component::Instance {
        master,
        source,
        overrides,
    }) = &old.component
    {
        if new.kind != old.kind || (master != source && new.parent_id != old.parent_id) {
            return Err("Detach the instance before changing its structure".into());
        }
        let a = effective_value(old);
        let b = effective_value(new);
        // Instances expose content and state, not design-system appearance overrides.
        for field in FIELDS {
            if a[field] == b[field] {
                continue;
            }
            let allowed = match *field {
                "name" | "text" | "hidden" | "locked" | "control_state" => true,
                "x" | "y" | "width" => master == source,
                "layout_item" | "auto_layout" if master == source => {
                    let mut before = a[*field].clone();
                    let mut after = b[*field].clone();
                    let keys = if *field == "layout_item" {
                        vec!["fill_width", "min_width", "max_width", "grid_cell"]
                    } else {
                        vec!["hug_width"]
                    };
                    for key in keys {
                        if let Some(v) = before.as_object_mut() {
                            v.remove(key);
                        }
                        if let Some(v) = after.as_object_mut() {
                            v.remove(key);
                        }
                    }
                    before == after
                }
                "control" => {
                    let mut before = a["control"].clone();
                    let mut after = b["control"].clone();
                    if old.control.as_ref().is_some_and(|c| c.kind == "radio") {
                        if let Some(v) = before.as_object_mut() {
                            v.remove("name");
                        }
                        if let Some(v) = after.as_object_mut() {
                            v.remove("name");
                        }
                    }
                    for key in [
                        "width_sizing",
                        "selected_values",
                        "label",
                        "value",
                        "placeholder",
                        "helper_message",
                        "hide_helper",
                        "validation_message",
                        "invalid",
                    ] {
                        if let Some(v) = before.as_object_mut() {
                            v.remove(key);
                        }
                        if let Some(v) = after.as_object_mut() {
                            v.remove(key);
                        }
                    }
                    before == after
                }
                _ => {
                    old.slot.is_some()
                        && matches!(
                            *field,
                            "fill"
                                | "appearance"
                                | "stroke_width"
                                | "effect_style"
                                | "fill_style"
                                | "stroke_style"
                                | "variable_bindings"
                        )
                }
            };
            if !allowed {
                return Err(
                    "Instance appearance is protected. Edit the main component instead.".into(),
                );
            }
        }

        let mut changed = overrides.clone();
        for field in FIELDS {
            if a[field] == b[field] || changed.iter().any(|f| f == field) {
                continue;
            }
            if !subfields(field).is_empty() && a[field].is_object() && b[field].is_object() {
                for property in subfields(field) {
                    let path = format!("{field}.{property}");
                    if a[field][property] != b[field][property] && !changed.contains(&path) {
                        changed.push(path);
                    }
                }
            } else {
                changed.retain(|f| !f.starts_with(&format!("{field}.")));
                changed.push((*field).into());
            }
        }
        if a["layout_grids"] != b["layout_grids"] || a["guide_style"] != b["guide_style"] {
            for field in ["layout_grids", "guide_style"] {
                if !changed.iter().any(|p| p == field) {
                    changed.push(field.into());
                }
            }
        }
        if a["prototype"] != b["prototype"]
            || a["additional_interactions"] != b["additional_interactions"]
        {
            for field in ["prototype", "additional_interactions"] {
                if !changed.iter().any(|p| p == field) {
                    changed.push(field.into());
                }
            }
        }
        new.component = Some(Component::Instance {
            master: *master,
            source: *source,
            overrides: changed,
        });
    }
    Ok(())
}

// Structural edits to instance descendants must be explicit detaches. Whole
// instances may still be moved, duplicated, removed and reordered normally.
pub fn protect_structure(old: &Document, new: &Document) -> Result<(), String> {
    // Many instance descendants share one main component and one parent. Check
    // each structure once per transaction, without weakening detach protection.
    let mut changed_masters = std::collections::HashMap::new();
    let mut changed_orders = std::collections::HashMap::new();
    let old_by_id: std::collections::HashMap<_, _> = old.shapes.iter().map(|s| (s.id, s)).collect();
    let new_by_id: std::collections::HashMap<_, _> = new.shapes.iter().map(|s| (s.id, s)).collect();
    for s in &old.shapes {
        if let Some(Component::Instance { master, source, .. }) = &s.component {
            if master == source {
                continue;
            }
            let structure = |doc: &Document| {
                subtree(&doc.shapes, *master)
                    .iter()
                    .map(|s| (s.id, s.parent_id))
                    .collect::<Vec<_>>()
            };
            // Staged operations may already have synchronized a main-component
            // structural edit before the outer transaction is committed.
            if *changed_masters
                .entry(*master)
                .or_insert_with(|| structure(old) != structure(new))
            {
                continue;
            }
            let mut root = s;
            while let Some(Component::Instance { master, source, .. }) = &root.component {
                if master == source {
                    break;
                }
                root = old_by_id[&root.parent_id];
            }
            let Some(new_root) = new_by_id.get(&root.id) else {
                continue;
            };
            if new_root.component.is_none() {
                continue;
            }
            let Some(n) = new_by_id.get(&s.id) else {
                return Err("Detach the instance before removing its layers".into());
            };
            if n.parent_id != s.parent_id || n.component.as_ref().is_none() {
                return Err("Detach the instance before changing its structure".into());
            }
            let order = |doc: &Document| {
                doc.shapes
                    .iter()
                    .filter(|n| n.parent_id == s.parent_id)
                    .map(|n| n.id)
                    .collect::<Vec<_>>()
            };
            if *changed_orders
                .entry(s.parent_id)
                .or_insert_with(|| order(old) != order(new))
            {
                return Err("Detach the instance before reordering its layers".into());
            }
        }
    }
    Ok(())
}

pub fn sync(doc: &mut Document, next: &mut u32) -> Result<(), String> {
    // A designed text layer remains the editable source of a main button's
    // native label and typography. Resolve it before copying to instances.
    let labels: Vec<_> = doc
        .shapes
        .iter()
        .filter(|s| {
            s.component == Some(Component::Master)
                && s.control
                    .as_ref()
                    .is_some_and(|c| c.kind == "button" && !c.starter)
        })
        .filter_map(|root| {
            subtree(&doc.shapes, root.id)
                .into_iter()
                .find(|child| child.kind == "text" && !child.hidden)
                .map(|child| (root.id, child.text.clone(), child.typography.clone()))
        })
        .collect();
    for (id, label, typography) in labels {
        if let Some(root) = doc.shapes.iter_mut().find(|s| s.id == id) {
            root.control.as_mut().unwrap().label = label;
            root.typography = typography;
        }
    }
    let pending_roots: Vec<_> = doc.shapes.iter().filter(|s|matches!(&s.component,Some(Component::Instance{master,source,..}) if master==source)).map(|s|s.id).collect();
    let root_ids: HashSet<_> = pending_roots.iter().copied().collect();
    let mut pending: Vec<_> = pending_roots
        .iter()
        .map(|id| {
            let shape = doc.shapes.iter().find(|s| s.id == *id).unwrap();
            let Some(Component::Instance { master, .. }) = shape.component else {
                unreachable!()
            };
            let dependencies: HashSet<_> = subtree(&doc.shapes, master)
                .iter()
                .filter(|s| root_ids.contains(&s.id))
                .map(|s| s.id)
                .collect();
            (*id, dependencies)
        })
        .collect();
    let mut roots = Vec::new();
    let mut resolved = HashSet::new();
    while !pending.is_empty() {
        let ready = pending
            .iter()
            .position(|(_, deps)| deps.iter().all(|id| resolved.contains(id)))
            .ok_or("Component reference cycle: an instance cannot contain itself")?;
        let (id, _) = pending.remove(ready);
        roots.push(id);
        resolved.insert(id);
    }
    for id in roots {
        let old = subtree(&doc.shapes, id);
        if old.is_empty() {
            continue;
        }
        let root = &old[0];
        let Some(Component::Instance { master, .. }) = root.component else {
            unreachable!()
        };
        let source = subtree(&doc.shapes, master);
        if source
            .first()
            .is_none_or(|s| s.component != Some(Component::Master))
        {
            let ids: HashSet<_> = old.iter().map(|s| s.id).collect();
            for s in &mut doc.shapes {
                if ids.contains(&s.id) {
                    s.component = None;
                }
            }
            continue;
        }
        let allocate = |next: &mut u32| -> Result<u32, String> {
            let id = *next;
            *next = next.checked_add(1).ok_or("Shape ID limit reached")?;
            Ok(id)
        };
        let old_slot_children: HashSet<_> = old
            .iter()
            .filter(|s| s.slot.is_some())
            .flat_map(|s| subtree(&old, s.id).into_iter().skip(1).map(|s| s.id))
            .collect();
        let mut built: Vec<Shape> = vec![];
        let mut map = HashMap::new();
        let slot_children: HashSet<_> = source
            .iter()
            .filter(|s| s.slot.is_some())
            .flat_map(|s| subtree(&source, s.id).into_iter().skip(1).map(|s| s.id))
            .collect();
        for src in source.iter().filter(|s| !slot_children.contains(&s.id)) {
            let previous = old.iter().find(
                |s| !old_slot_children.contains(&s.id) && matches!(&s.component,Some(Component::Instance{source,..}) if *source==src.id),
            );
            let new_id = if let Some(p) = previous {
                p.id
            } else {
                allocate(next)?
            };
            map.insert(src.id, new_id);
            let mut shape = src.clone();
            shape.flow_name = previous.map_or_else(String::new, |p| p.flow_name.clone());
            shape.id = new_id;
            shape.page_id = root.page_id;
            shape.parent_id = if src.id == master {
                root.parent_id
            } else {
                map[&src.parent_id]
            };
            if src.id == master {
                shape.x = root.x;
                shape.y = root.y;
            } else {
                let mut sp = source.iter().find(|s| s.id == src.parent_id).unwrap();
                while sp.kind == "group" {
                    let transformed = old.iter().find(|s| s.id == map[&sp.id]).is_some_and(|s| {
                        matches!(&s.component, Some(Component::Instance { overrides, .. })
                            if overrides.iter().any(|f| matches!(f.as_str(), "x" | "y" | "width" | "height")))
                    });
                    if transformed {
                        break;
                    }
                    let Some(ancestor) = source.iter().find(|s| s.id == sp.parent_id) else {
                        break;
                    };
                    sp = ancestor;
                }
                let np = built.iter().find(|s| s.id == map[&sp.id]).unwrap();
                let mut constrained = src.clone();
                if let Some(p) = previous {
                    if let Some(Component::Instance { overrides, .. }) = &p.component {
                        apply_overrides(&mut constrained, p, overrides)?;
                    }
                }
                (shape.x, shape.width) = constrain_axis(
                    src.x,
                    src.width,
                    sp.x,
                    sp.width,
                    np.x,
                    np.width,
                    if sp.kind == "group" {
                        &crate::Constraint::Scale
                    } else {
                        &constrained.constraints.horizontal
                    },
                );
                (shape.y, shape.height) = constrain_axis(
                    src.y,
                    src.height,
                    sp.y,
                    sp.height,
                    np.y,
                    np.height,
                    if sp.kind == "group" {
                        &crate::Constraint::Scale
                    } else {
                        &constrained.constraints.vertical
                    },
                );
            }
            let overrides = match previous.and_then(|s| s.component.as_ref()) {
                Some(Component::Instance { overrides, .. }) => overrides.clone(),
                _ => vec![],
            };
            if let Some(p) = previous {
                // CSS identity belongs to the instance, not its appearance source.
                shape.layout_class = p.layout_class.clone();
                shape.layout_class_generated = p.layout_class_generated;
                shape.breakpoint_original = p.breakpoint_original.clone();
                apply_overrides(&mut shape, p, &overrides)?;
                if src.id != master {
                    let op = old.iter().find(|s| s.id == p.parent_id).unwrap();
                    let np = built.iter().find(|s| s.id == shape.parent_id).unwrap();
                    if overrides.iter().any(|f| f == "x") {
                        shape.x = np.x + p.x - op.x;
                    }
                    if overrides.iter().any(|f| f == "y") {
                        shape.y = np.y + p.y - op.y;
                    }
                }
            }
            shape.component = Some(Component::Instance {
                master,
                source: src.id,
                overrides,
            });
            if let Some(slot) = &mut shape.slot {
                slot.modified = previous
                    .and_then(|p| p.slot.as_ref())
                    .is_some_and(|p| p.modified);
            }
            let content = if shape.slot.is_some() {
                slots::build_content(&source, &old, src, &shape, next)?
            } else {
                vec![]
            };
            built.push(shape);
            built.extend(content);
        }
        let ids: HashSet<_> = old.iter().map(|s| s.id).collect();
        let slot = doc.shapes.iter().position(|s| s.id == id).unwrap();
        doc.shapes.retain(|s| !ids.contains(&s.id));
        doc.shapes.splice(slot..slot, built);
        if doc.shapes.len() > 10_000 {
            return Err("Document exceeds 10,000 layers".into());
        }
    }
    Ok(())
}

#[wasm_bindgen]
impl Editor {
    pub fn create_component_selection(&mut self, json: &str) -> Result<u32, String> {
        self.wrap_selection(json, true)
    }
    pub fn frame_selection(&mut self, json: &str) -> Result<u32, String> {
        self.wrap_selection(json, false)
    }

    pub fn create_component(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        let tree = subtree(&doc.shapes, id);
        if tree.is_empty()
            || tree[0].component.is_some()
            || tree.iter().any(|s| s.component == Some(Component::Master))
        {
            return Err("Select an ordinary frame to create a component".into());
        }
        let root = doc
            .shapes
            .iter_mut()
            .find(|s| s.id == id && s.page_id == doc.active_page)
            .ok_or("Frame not found on this page")?;
        if root.kind != "frame" {
            return Err("Select a frame to create a component".into());
        }
        root.component = Some(Component::Master);
        self.commit(doc)
    }

    pub fn create_instance(&mut self, master: u32, x: f64, y: f64) -> Result<u32, String> {
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let mut root = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == master && s.component == Some(Component::Master))
            .ok_or("Main component not found")?
            .clone();
        let id = self.next_id;
        root.id = id;
        root.parent_id = 0;
        root.flow_name.clear();
        root.page_id = self.document.active_page;
        root.x = x;
        root.y = y;
        root.component = Some(Component::Instance {
            master,
            source: master,
            overrides: vec![],
        });
        let mut doc = self.document.clone();
        doc.shapes.push(root);
        self.commit(doc)?;
        self.next_id = self.next_id.max(id + 1);
        Ok(id)
    }

    pub fn detach_instance(&mut self, id: u32) -> Result<(), String> {
        let root = self.instance_root(id)?;
        let ids: HashSet<_> = subtree(&self.document.shapes, root)
            .iter()
            .map(|s| s.id)
            .collect();
        let master = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == root)
            .and_then(|s| s.component.as_ref())
            .and_then(|c| {
                if let Component::Instance { master, .. } = c {
                    Some(*master)
                } else {
                    None
                }
            })
            .unwrap();
        let mut doc = self.document.clone();
        for s in &mut doc.shapes {
            if ids.contains(&s.id)
                && matches!(s.component,Some(Component::Instance{master:m,..}) if m==master)
            {
                s.slot = None;
                s.component = None;
            }
        }
        let mut next = self.next_id;
        restore_detached_button_labels(&mut doc, &mut next)?;
        self.commit(doc)?;
        self.next_id = self.next_id.max(next);
        Ok(())
    }

    pub fn place_instance(
        &mut self,
        master: u32,
        x: f64,
        y: f64,
        parent: u32,
    ) -> Result<u32, String> {
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
        let id = staged.create_instance(master, x, y)?;
        if parent != 0 {
            let shape = staged
                .document
                .shapes
                .iter()
                .find(|s| s.id == id)
                .unwrap()
                .clone();
            staged.move_into(
                &serde_json::to_string(&vec![shape]).map_err(|e| e.to_string())?,
                parent,
            )?;
        }
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(id)
    }

    pub fn swap_instance(&mut self, id: u32, master: u32) -> Result<u32, String> {
        let root = self.instance_root(id)?;
        let old = subtree(&self.document.shapes, root);
        let Some(Component::Instance {
            master: old_master, ..
        }) = old[0].component
        else {
            unreachable!()
        };
        if old_master == master {
            return Ok(root);
        }
        let target = subtree(&self.document.shapes, master);
        if target
            .first()
            .is_none_or(|s| s.component != Some(Component::Master))
        {
            return Err("Main component not found".into());
        }
        let original = subtree(&self.document.shapes, old_master);
        // Match layer names, kinds and hierarchy. Repeated sibling names match
        // by occurrence in paint order; instance renames do not alter identity.
        fn match_children(
            old: &[Shape],
            new: &[Shape],
            a: u32,
            b: u32,
            map: &mut HashMap<u32, u32>,
        ) {
            let mut used = HashSet::new();
            for child in old.iter().filter(|s| s.parent_id == a) {
                if let Some(other) = new.iter().find(|s| {
                    s.parent_id == b
                        && s.name == child.name
                        && s.kind == child.kind
                        && !used.contains(&s.id)
                }) {
                    used.insert(other.id);
                    map.insert(child.id, other.id);
                    match_children(old, new, child.id, other.id, map);
                }
            }
        }
        let mut mapping = HashMap::from([(old_master, master)]);
        match_children(&original, &target, old_master, master, &mut mapping);
        for property in self
            .document
            .component_properties
            .iter()
            .filter(|p| p.component_id == old_master && p.kind == "slot")
        {
            if let Some(replacement) =
                self.document.component_properties.iter().find(|p| {
                    p.component_id == master && p.kind == "slot" && p.name == property.name
                })
            {
                for (old, new) in property.targets.iter().zip(&replacement.targets) {
                    mapping.insert(*old, *new);
                }
            }
        }
        let mut kept = vec![];
        for mut s in old.clone() {
            if let Some(Component::Instance {
                source, overrides, ..
            }) = &s.component
            {
                if let Some(&source) = mapping.get(source) {
                    s.component = Some(Component::Instance {
                        master,
                        source,
                        overrides: overrides.clone(),
                    });
                    kept.push(s);
                }
            }
        }
        let kept_ids: HashSet<_> = kept.iter().map(|s| s.id).collect();
        for s in &old {
            if s.slot.as_ref().is_some_and(|v| v.modified) && kept_ids.contains(&s.id) {
                kept.extend(subtree(&old, s.id).into_iter().skip(1));
            }
        }
        let ids: HashSet<_> = old.iter().map(|s| s.id).collect();
        let mut doc = self.document.clone();
        let slot = doc.shapes.iter().position(|s| s.id == root).unwrap();
        doc.shapes.retain(|s| !ids.contains(&s.id));
        doc.shapes.splice(slot..slot, kept);
        let mut next = self.next_id.max(
            doc.shapes
                .iter()
                .map(|s| s.id)
                .max()
                .unwrap_or(0)
                .saturating_add(1),
        );
        sync(&mut doc, &mut next)?;
        component_properties::transfer_on_swap(&self.document, &mut doc, root, old_master, master)?;
        self.commit_document(doc)?;
        self.next_id = self.next_id.max(next);
        Ok(root)
    }

    pub fn reset_override(&mut self, id: u32, path: &str) -> Result<(), String> {
        if !valid_override(path) {
            return Err("Unknown override property".into());
        }
        if let Some(shape) = self.document.shapes.iter().find(|s| s.id == id) {
            if let Some(Component::Instance { master, source, .. }) = &shape.component {
                if let Some(p) = self.document.component_properties.iter().find(|p| {
                    p.component_id == *master
                        && p.targets.contains(source)
                        && component_properties::field(p) == path
                }) {
                    return self.reset_component_property(id, p.id);
                }
            }
        }
        let mut doc = self.document.clone();
        let shape = doc
            .shapes
            .iter_mut()
            .find(|s| s.id == id && s.page_id == doc.active_page)
            .ok_or("Layer not found")?;
        let Some(Component::Instance { overrides, .. }) = &mut shape.component else {
            return Err("Select an instance layer".into());
        };
        overrides.retain(|p| {
            !(p == path
                || p.starts_with(&format!("{path}."))
                || (["prototype", "additional_interactions"].contains(&path)
                    && ["prototype", "additional_interactions"].contains(&p.as_str()))
                || (["layout_grids", "guide_style"].contains(&path)
                    && ["layout_grids", "guide_style"].contains(&p.as_str())))
        });
        self.commit(doc)
    }

    pub fn reset_instance(&mut self, id: u32) -> Result<(), String> {
        let root = self.instance_root(id)?;
        let ids: HashSet<_> = subtree(&self.document.shapes, root)
            .iter()
            .map(|s| s.id)
            .collect();
        let mut doc = self.document.clone();
        for s in &mut doc.shapes {
            if ids.contains(&s.id) {
                if let Some(slot) = &mut s.slot {
                    slot.modified = false;
                }
                if let Some(Component::Instance { overrides, .. }) = &mut s.component {
                    overrides.clear();
                }
            }
        }
        self.commit_document(doc)
    }

    pub fn push_style_overrides(&mut self, id: u32) -> Result<(), String> {
        let root = self.instance_root(id)?;
        let tree = subtree(&self.document.shapes, root);
        let mut doc = self.document.clone();
        let mut changed = false;
        for instance in tree {
            let Some(Component::Instance {
                source, overrides, ..
            }) = &instance.component
            else {
                continue;
            };
            let paths: Vec<_> = overrides
                .iter()
                .filter(|p| {
                    let field = p.split('.').next().unwrap_or("");
                    [
                        "name",
                        "text",
                        "fill",
                        "appearance",
                        "typography",
                        "hidden",
                        "locked",
                        "image",
                        "stroke_width",
                        "layout_grids",
                        "guide_style",
                        "effect_style",
                        "text_style",
                        "fill_style",
                        "stroke_style",
                    ]
                    .contains(&field)
                })
                .cloned()
                .collect();
            if paths.is_empty() {
                continue;
            }
            let target = doc
                .shapes
                .iter_mut()
                .find(|s| s.id == *source)
                .ok_or("Main component layer not found")?;
            let previous = target.clone();
            apply_overrides(target, &instance, &paths)?;
            // A source may itself be a nested instance. Record the local source
            // override so synchronizing its own main does not erase the push.
            record_overrides(&previous, target)?;
            let selected = doc.shapes.iter_mut().find(|s| s.id == instance.id).unwrap();
            if let Some(Component::Instance { overrides, .. }) = &mut selected.component {
                overrides.retain(|p| !paths.contains(p));
            }
            changed = true;
        }
        if !changed {
            return Ok(());
        }
        self.commit(doc)
    }
}

impl Editor {
    pub(crate) fn instance_root(&self, id: u32) -> Result<u32, String> {
        let mut s = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id && s.page_id == self.document.active_page)
            .ok_or("Instance not found")?;
        loop {
            match &s.component {
                Some(Component::Instance { master, source, .. }) if master == source => {
                    return Ok(s.id)
                }
                Some(Component::Instance { .. }) => {
                    s = self
                        .document
                        .shapes
                        .iter()
                        .find(|p| p.id == s.parent_id)
                        .ok_or("Instance parent not found")?
                }
                _ => return Err("Select an instance".into()),
            }
        }
    }
}

impl Editor {
    fn wrap_selection(&mut self, json: &str, component: bool) -> Result<u32, String> {
        let ids = self.selection_ids(json)?;
        let roots: Vec<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .filter(|s| {
                let mut parent = s.parent_id;
                while parent != 0 {
                    if ids.contains(&parent) {
                        return false;
                    }
                    parent = self
                        .document
                        .shapes
                        .iter()
                        .find(|p| p.id == parent)
                        .map_or(0, |p| p.parent_id);
                }
                true
            })
            .cloned()
            .collect();
        if component && roots.len() == 1 && roots[0].kind == "frame" && roots[0].component.is_none()
        {
            self.create_component(roots[0].id)?;
            return Ok(roots[0].id);
        }
        let first = roots
            .first()
            .ok_or("Select layers to frame the selection")?;
        if roots.iter().any(|s| s.parent_id != first.parent_id) {
            return Err("Select layers in the same parent to frame the selection".into());
        }
        for root in &roots {
            if component
                && subtree(&self.document.shapes, root.id)
                    .iter()
                    .any(|s| s.component == Some(Component::Master))
            {
                return Err(
                    "Nested main components are not supported; use linked instances".into(),
                );
            }
        }
        let x = roots
            .iter()
            .map(|s| s.visual_bounds().0)
            .fold(f64::INFINITY, f64::min);
        let y = roots
            .iter()
            .map(|s| s.visual_bounds().1)
            .fold(f64::INFINITY, f64::min);
        let width = roots
            .iter()
            .map(|s| {
                let (x, _, w, _) = s.visual_bounds();
                x + w
            })
            .fold(f64::NEG_INFINITY, f64::max)
            - x;
        let height = roots
            .iter()
            .map(|s| {
                let (_, y, _, h) = s.visual_bounds();
                y + h
            })
            .fold(f64::NEG_INFINITY, f64::max)
            - y;
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
        let id = staged.add("frame", x, y)?;
        let index = staged
            .document
            .shapes
            .iter()
            .position(|s| s.id == id)
            .unwrap();
        let mut frame = staged.document.shapes.remove(index);
        frame.width = width.max(1.0);
        frame.height = height.max(1.0);
        frame.parent_id = first.parent_id;
        frame.name = if roots.len() == 1 {
            first.name.clone()
        } else {
            if component {
                "Component".into()
            } else {
                "Frame".into()
            }
        };
        frame.clip_content = false;
        frame.component = if component {
            Some(Component::Master)
        } else {
            None
        };
        frame.appearance = Some(
            serde_json::from_value(serde_json::json!({
                "opacity":1.0,"corner_radius":0.0,"fill_enabled":false,
                "stroke_enabled":false,"stroke_color":"#000000"
            }))
            .map_err(|e| e.to_string())?,
        );
        if roots.len() == 1 {
            frame.layout_item = first.layout_item.clone();
            frame.constraints = first.constraints.clone();
        }
        let slot = staged
            .document
            .shapes
            .iter()
            .position(|s| s.id == first.id)
            .unwrap();
        staged.document.shapes.insert(slot, frame);
        for s in &mut staged.document.shapes {
            if roots.iter().any(|r| r.id == s.id) {
                s.parent_id = id;
                s.layout_item = Default::default();
            }
        }
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(id)
    }
}
