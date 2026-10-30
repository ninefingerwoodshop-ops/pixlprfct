use super::*;
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ComponentProperty {
    pub id: u32,
    pub component_id: u32,
    pub name: String,
    pub kind: String,
    pub targets: Vec<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub slot_settings: Option<slots::SlotSettings>,
}
pub fn field(p: &ComponentProperty) -> &str {
    if p.kind == "text" {
        "text"
    } else {
        "hidden"
    }
}
fn value(s: &Shape, p: &ComponentProperty) -> serde_json::Value {
    if p.kind == "text" {
        serde_json::json!(s.text)
    } else {
        serde_json::json!(!s.hidden)
    }
}
fn assign(s: &mut Shape, p: &ComponentProperty, v: &serde_json::Value) -> Result<(), String> {
    match p.kind.as_str() {
        "text" => {
            s.text = v
                .as_str()
                .filter(|s| s.len() <= 10_000)
                .ok_or("Text property must be a string of at most 10,000 bytes")?
                .into()
        }
        "boolean" => {
            s.hidden = !v
                .as_bool()
                .ok_or("Visibility property must be true or false")?
        }
        _ => return Err("Unknown component property type".into()),
    }
    Ok(())
}

pub fn validate_properties(doc: &Document) -> Result<(), String> {
    if doc.component_properties.len() > 10_000 {
        return Err("Too many component properties".into());
    }
    let mut ids = HashSet::new();
    let mut names = HashSet::new();
    let mut bindings = HashSet::new();
    for p in &doc.component_properties {
        if p.targets.is_empty() && p.kind != "slot" {
            return Err("Choose at least one layer for this component property".into());
        }
        if !names.insert((p.component_id, &p.name)) {
            return Err("Property names must be unique within a component".into());
        }
        if p.id == 0
            || p.id == u32::MAX
            || !ids.insert(p.id)
            || p.name.trim().is_empty()
            || p.name.len() > 128
            || !["text", "boolean", "slot"].contains(&p.kind.as_str())
            || p.targets.len() > 1000
        {
            return Err("Invalid component property ID, name, or type".into());
        }
        let tree = components::subtree(&doc.shapes, p.component_id);
        if tree
            .first()
            .is_none_or(|s| s.component != Some(components::Component::Master))
        {
            return Err("Property must belong to a main component".into());
        }
        if p.kind == "slot" {
            slots::validate_property(doc, p)?;
        }
        for id in &p.targets {
            let mut ancestor = doc
                .shapes
                .iter()
                .find(|s| s.id == *id)
                .map_or(0, |s| s.parent_id);
            while ancestor != 0 && ancestor != p.component_id {
                if doc
                    .component_properties
                    .iter()
                    .any(|q| q.kind == "slot" && q.targets.contains(&ancestor))
                {
                    return Err("Component property bindings cannot target slot contents".into());
                }
                ancestor = doc
                    .shapes
                    .iter()
                    .find(|s| s.id == ancestor)
                    .map_or(0, |s| s.parent_id);
            }

            let s = tree
                .iter()
                .find(|s| s.id == *id)
                .ok_or("Property target must be inside its main component")?;
            if (p.kind == "text" && s.kind != "text") || !bindings.insert((*id, &p.kind)) {
                return Err("Each layer field can bind to one compatible property".into());
            }
        }
    }
    Ok(())
}
pub fn prune(doc: &mut Document) {
    let trees: HashMap<_, HashSet<_>> = doc
        .component_properties
        .iter()
        .map(|p| {
            let ids = doc
                .shapes
                .iter()
                .filter(|s| {
                    let mut current = s.id;
                    let mut seen = HashSet::new();
                    while current != 0 && seen.insert(current) {
                        if current == p.component_id {
                            return true;
                        }
                        current = doc
                            .shapes
                            .iter()
                            .find(|s| s.id == current)
                            .map_or(0, |s| s.parent_id);
                    }
                    false
                })
                .map(|s| s.id)
                .collect();
            (p.component_id, ids)
        })
        .collect();
    for p in &mut doc.component_properties {
        p.targets.retain(|id| trees[&p.component_id].contains(id));
        if let Some(settings) = &mut p.slot_settings {
            settings.preferred_instances.retain(|id| {
                doc.shapes
                    .iter()
                    .any(|s| s.id == *id && s.component == Some(components::Component::Master))
            });
        }
    }
    doc.component_properties.retain(|p| {
        (!p.targets.is_empty() || p.kind == "slot")
            && doc.shapes.iter().any(|s| {
                s.id == p.component_id && s.component == Some(components::Component::Master)
            })
    });
}
pub fn targets(doc: &Document, root: u32, p: &ComponentProperty) -> Vec<u32> {
    if root == p.component_id {
        return p.targets.clone();
    }
    components::subtree(&doc.shapes,root).iter().filter(|s|matches!(&s.component,Some(components::Component::Instance{master,source,..}) if *master==p.component_id&&p.targets.contains(source))).map(|s|s.id).collect()
}

pub fn propagate_edits(old: &Document, doc: &mut Document, explicit: &[u32]) -> Result<(), String> {
    for p in doc
        .component_properties
        .clone()
        .into_iter()
        .filter(|p| p.kind != "slot")
    {
        let mut roots = vec![p.component_id];
        roots.extend(doc.shapes.iter().filter(|s|matches!(&s.component,Some(components::Component::Instance{master,source,..}) if *master==p.component_id&&master==source)).map(|s|s.id));
        for root in roots {
            let bound = targets(doc, root, &p);
            let mut changed = None;
            for id in bound.iter().filter(|id| explicit.contains(id)) {
                let before = old.shapes.iter().find(|s| s.id == *id).unwrap();
                let after = doc.shapes.iter().find(|s| s.id == *id).unwrap();
                let v = value(after, &p);
                if v == value(before, &p) {
                    continue;
                }
                if changed.as_ref().is_some_and(|previous| previous != &v) {
                    return Err("Bound component layers must share the same property value".into());
                }
                changed = Some(v);
            }
            if let Some(v) = changed {
                for s in doc.shapes.iter_mut().filter(|s| bound.contains(&s.id)) {
                    let before = s.clone();
                    assign(s, &p, &v)?;
                    components::record_overrides(&before, s)?;
                }
            }
        }
    }
    Ok(())
}
pub fn duplicate_definitions(
    doc: &mut Document,
    mapping: &HashMap<u32, u32>,
) -> Result<(), String> {
    let mut next = doc
        .component_properties
        .iter()
        .map(|p| p.id)
        .max()
        .unwrap_or(0);
    for mut p in doc.component_properties.clone() {
        if let Some(&component) = mapping.get(&p.component_id) {
            next = next.checked_add(1).ok_or("Property ID limit reached")?;
            p.id = next;
            p.component_id = component;
            if let Some(settings) = &mut p.slot_settings {
                for id in &mut settings.preferred_instances {
                    if let Some(next) = mapping.get(id) {
                        *id = *next;
                    }
                }
            }
            p.targets = p
                .targets
                .iter()
                .filter_map(|id| mapping.get(id).copied())
                .collect();
            doc.component_properties.push(p);
        }
    }
    Ok(())
}

pub fn transfer_on_swap(
    old: &Document,
    doc: &mut Document,
    root: u32,
    old_master: u32,
    new_master: u32,
) -> Result<(), String> {
    for p in old
        .component_properties
        .iter()
        .filter(|p| p.component_id == old_master && p.kind != "slot")
    {
        let bound = targets(old, root, p);
        let changed=old.shapes.iter().find(|s|bound.contains(&s.id)&&matches!(&s.component,Some(components::Component::Instance{overrides,..}) if overrides.iter().any(|f|f==field(p))));
        let Some(changed) = changed else {
            continue;
        };
        let Some(replacement) = doc
            .component_properties
            .iter()
            .find(|q| q.component_id == new_master && q.name == p.name && q.kind == p.kind)
            .cloned()
        else {
            continue;
        };
        let v = value(changed, p);
        let bound = targets(doc, root, &replacement);
        for s in doc.shapes.iter_mut().filter(|s| bound.contains(&s.id)) {
            let before = s.clone();
            assign(s, &replacement, &v)?;
            components::record_overrides(&before, s)?;
        }
    }
    Ok(())
}

#[wasm_bindgen]
impl Editor {
    pub fn save_component_property(&mut self, json: &str) -> Result<u32, String> {
        if json.len() > 100_000 {
            return Err("Component property is too large".into());
        }
        let mut p: ComponentProperty = serde_json::from_str(json).map_err(|e| e.to_string())?;
        p.name = p.name.trim().into();
        let mut doc = self.document.clone();
        if p.id == 0 {
            p.id = doc
                .component_properties
                .iter()
                .map(|p| p.id)
                .max()
                .unwrap_or(0)
                .checked_add(1)
                .ok_or("Property ID limit reached")?;
            doc.component_properties.push(p.clone());
        } else {
            *doc.component_properties
                .iter_mut()
                .find(|old| old.id == p.id && old.component_id == p.component_id)
                .ok_or("Component property not found")? = p.clone();
        }
        validate_properties(&doc)?;
        if p.kind == "slot" {
            slots::bind(&mut doc);
            self.commit(doc)?;
            return Ok(p.id);
        }
        let v = value(
            doc.shapes.iter().find(|s| s.id == p.targets[0]).unwrap(),
            &p,
        );
        for s in doc.shapes.iter_mut().filter(|s| p.targets.contains(&s.id)) {
            assign(s, &p, &v)?;
        }
        self.commit(doc)?;
        Ok(p.id)
    }
    pub fn remove_component_property(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        if !doc.component_properties.iter().any(|p| p.id == id) {
            return Err("Component property not found".into());
        }
        doc.component_properties.retain(|p| p.id != id);
        self.commit(doc)
    }
    pub fn set_component_property(
        &mut self,
        id: u32,
        property: u32,
        json: &str,
    ) -> Result<(), String> {
        let p = self
            .document
            .component_properties
            .iter()
            .find(|p| p.id == property)
            .ok_or("Component property not found")?
            .clone();
        let root = if id == p.component_id {
            id
        } else {
            self.instance_root(id)?
        };
        let bound = targets(&self.document, root, &p);
        if bound.is_empty() {
            return Err("Property does not belong to this component".into());
        }
        let v: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut edits: Vec<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| bound.contains(&s.id))
            .cloned()
            .collect();
        for s in &mut edits {
            assign(s, &p, &v)?;
        }
        self.update_many(&serde_json::to_string(&edits).unwrap())
    }
    pub fn reset_component_property(&mut self, id: u32, property: u32) -> Result<(), String> {
        let p = self
            .document
            .component_properties
            .iter()
            .find(|p| p.id == property)
            .ok_or("Component property not found")?
            .clone();
        let root = self.instance_root(id)?;
        let bound = targets(&self.document, root, &p);
        if bound.is_empty() {
            return Err("Property does not belong to this component".into());
        }
        let mut doc = self.document.clone();
        for s in doc.shapes.iter_mut().filter(|s| bound.contains(&s.id)) {
            if p.kind == "slot" {
                if let Some(slot) = &mut s.slot {
                    slot.modified = false;
                }
            }
            if let Some(components::Component::Instance { overrides, .. }) = &mut s.component {
                overrides.retain(|f| f != field(&p));
            }
        }
        self.commit(doc)
    }
}
