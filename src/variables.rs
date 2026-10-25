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
pub fn property_kind(path: &str) -> Option<&'static str> {
    match path {
        "fill" | "appearance.stroke_color" => Some("color"),
        "text" | "typography.font_family" => Some("string"),
        "hidden" | "clip_content" => Some("boolean"),
        "width"
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
        if v.id == 0
            || !ids.insert(v.id)
            || !name(&v.name)
            || !["color", "number", "string", "boolean"].contains(&v.kind.as_str())
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
                "number" => val
                    .as_f64()
                    .is_some_and(|n| n.is_finite() && n.abs() <= 1_000_000.0),
                "string" => val.as_str().is_some_and(|s| s.len() <= 10000),
                "boolean" => val.is_boolean(),
                _ => false,
            } {
                return Err("Value does not match variable type".into());
            }
            resolved(
                vars,
                v.id,
                &BTreeMap::from([(c.id, m.id)]),
                &mut HashSet::new(),
            )?;
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
            if property_kind(path) != Some(v.kind.as_str()) {
                return Err("Variable type does not match property".into());
            }
            if (path.starts_with("auto_layout.") && s.auto_layout.is_none())
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
    modes
}
fn assign(shape: &mut Shape, path: &str, value: Value) -> Result<(), String> {
    let mut json = serde_json::to_value(&shape).unwrap();
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
    new.variable_bindings.retain(|path, id| {
        if old.variable_bindings.get(path) != Some(id) {
            return true;
        }
        let pointer = format!("/{}", path.replace('.', "/"));
        a.pointer(&pointer) == b.pointer(&pointer)
    });
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
        // Removing definitions detaches bindings at their last resolved value.
        for s in &mut doc.shapes {
            s.variable_bindings
                .retain(|_, id| doc.variables.values.iter().any(|v| v.id == *id));
            s.variable_modes.retain(|c, m| {
                doc.variables
                    .collections
                    .iter()
                    .any(|v| v.id == *c && v.modes.iter().any(|v| v.id == *m))
            });
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
            if property_kind(path) != Some(v.kind.as_str())
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
            s.variable_bindings.insert(path.into(), variable);
        }
        components::record_overrides(&old, s)?;
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
        components::record_overrides(&old, s)?;
        validate_variables(&doc)?;
        resolve(&mut doc)?;
        self.commit(doc)
    }
}
