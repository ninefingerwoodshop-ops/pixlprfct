use crate::{Document, Shape};
use serde_json::Value;
use std::collections::BTreeMap;
fn eligible(s: &Shape) -> bool {
    s.control
        .as_ref()
        .is_some_and(|c| c.starter_linked && c.base_collection != 0)
        && !matches!(
            s.component,
            Some(crate::components::Component::Instance { .. })
        )
}
fn dropdown_path(path: &str) -> bool {
    path.contains("/parts/")
        && ![
            "input",
            "label",
            "placeholder",
            "helper",
            "validation",
            "container",
        ]
        .iter()
        .any(|p| path.contains(&format!("/parts/{p}/")))
}
fn shared(key: &str) -> bool {
    key == "states" || key.starts_with("required_")
}
fn flatten(v: &Value, path: String, out: &mut BTreeMap<String, Value>) {
    if let Value::Object(map) = v {
        for (k, v) in map {
            flatten(v, format!("{path}/{k}"), out);
        }
    } else if !v.is_null() {
        out.insert(path, v.clone());
    }
}
fn values(s: &Shape) -> BTreeMap<String, Value> {
    let mut out = BTreeMap::new();
    let v = serde_json::to_value(s.control.as_ref().unwrap()).unwrap();
    for (k, v) in v.as_object().unwrap() {
        if shared(k) {
            flatten(v, format!("/{k}"), &mut out);
        }
    }
    out
}
fn put(v: &mut Value, path: &str, value: Value) {
    let keys: Vec<_> = path.trim_start_matches('/').split('/').collect();
    let mut at = v;
    for key in &keys[..keys.len() - 1] {
        if !at.is_object() {
            *at = serde_json::json!({});
        }
        at = at
            .as_object_mut()
            .unwrap()
            .entry(*key)
            .or_insert(serde_json::json!({}));
    }
    if !at.is_object() {
        *at = serde_json::json!({});
    }
    at.as_object_mut()
        .unwrap()
        .insert(keys[keys.len() - 1].into(), value);
}
pub fn record(old: &Shape, new: &mut Shape) {
    if !eligible(old) || !eligible(new) {
        return;
    }
    let a = values(old);
    let b = values(new);
    let overrides = &mut new.control.as_mut().unwrap().shared_overrides;
    let binding_paths: Vec<String> = old
        .variable_bindings
        .keys()
        .chain(new.variable_bindings.keys())
        .filter_map(|p| p.strip_prefix("control."))
        .filter(|p| shared(p.split('.').next().unwrap_or("")))
        .map(|p| format!("/{}", p.replace('.', "/")))
        .collect();
    for path in a.keys().chain(b.keys()).chain(binding_paths.iter()) {
        let binding = format!("control{}", path.replace('/', "."));
        if (a.get(path) != b.get(path)
            || old.variable_bindings.get(&binding) != new.variable_bindings.get(&binding))
            && !overrides.contains(path)
        {
            overrides.push(path.clone());
        }
    }
}
pub fn sync(doc: &mut Document) {
    let mut sources = BTreeMap::new();
    for s in doc.shapes.iter().filter(|s| eligible(s)) {
        let c = s.control.as_ref().unwrap();
        let entry = sources.entry(c.base_collection).or_insert(s.clone());
        if s.id < entry.id {
            *entry = s.clone();
        }
    }
    for s in &mut doc.shapes {
        if !eligible(s) {
            continue;
        }
        let c = s.control.as_ref().unwrap();
        let Some(source) = sources.get(&c.base_collection) else {
            continue;
        };
        if s.id == source.id {
            continue;
        }
        let overrides = c.shared_overrides.clone();
        let source_values = values(source);
        let mut value = serde_json::to_value(c).unwrap();
        let binding_paths: Vec<String> = source
            .variable_bindings
            .keys()
            .chain(s.variable_bindings.keys())
            .filter_map(|p| p.strip_prefix("control."))
            .filter(|p| shared(p.split('.').next().unwrap_or("")))
            .map(|p| format!("/{}", p.replace('.', "/")))
            .collect();
        for path in values(s)
            .keys()
            .chain(source_values.keys())
            .chain(binding_paths.iter())
        {
            if overrides.contains(path) || dropdown_path(path) {
                continue;
            }
            put(
                &mut value,
                path,
                source_values.get(path).cloned().unwrap_or(Value::Null),
            );
            let binding = format!("control{}", path.replace('/', "."));
            s.variable_bindings.remove(&binding);
            if let Some(id) = source.variable_bindings.get(&binding) {
                s.variable_bindings.insert(binding, *id);
            }
        }
        // Required marker fields are non-optional; source always supplies their defaults.
        s.control = Some(
            serde_json::from_value(value).expect("shared control properties retain their types"),
        );
    }
}

pub fn sync_dropdown(doc: &mut Document) {
    let tokens: Vec<_> = doc
        .variables
        .values
        .iter()
        .filter(|v| {
            doc.variables.collections.iter().any(|c| {
                c.id == v.collection_id
                    && matches!(c.preset.as_str(), "dropdown_base" | "calendar_base")
            })
        })
        .cloned()
        .collect();
    for s in &mut doc.shapes {
        if !eligible(s) || !matches!(s.control.as_ref().unwrap().kind.as_str(), "select" | "date") {
            continue;
        }
        for v in &tokens {
            let preset = if s.control.as_ref().unwrap().kind == "date" {
                "calendar_base"
            } else {
                "dropdown_base"
            };
            if !doc
                .variables
                .collections
                .iter()
                .any(|c| c.id == v.collection_id && c.preset == preset)
            {
                continue;
            }
            if v.control_path.is_empty() {
                continue;
            }
            let path = format!(
                "/{}",
                v.control_path
                    .trim_start_matches("control.")
                    .replace('.', "/")
            );
            if s.control.as_ref().unwrap().shared_overrides.contains(&path) {
                continue;
            }
            s.variable_bindings.insert(v.control_path.clone(), v.id);
        }
    }
}
