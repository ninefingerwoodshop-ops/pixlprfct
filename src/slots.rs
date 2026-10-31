use super::*;
use components::Component;
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct SlotSettings {
    pub description: String,
    pub min_children: Option<u32>,
    pub max_children: Option<u32>,
    pub preferred_instances: Vec<u32>,
    pub only_preferred_instances: bool,
    pub display_empty: bool,
    pub fill_counter_axis: bool,
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct SlotState {
    pub property: u32,
    #[serde(default)]
    pub modified: bool,
}

pub fn validate_property(
    doc: &Document,
    p: &component_properties::ComponentProperty,
) -> Result<(), String> {
    let settings = p.slot_settings.clone().unwrap_or_default();
    if settings.description.len() > 10_000
        || settings.preferred_instances.len() > 1000
        || settings
            .min_children
            .zip(settings.max_children)
            .is_some_and(|(min, max)| min > max)
        || settings.min_children.is_some_and(|v| v > 10_000)
        || settings.max_children.is_some_and(|v| v > 10_000)
    {
        return Err("Invalid slot description or layer limits".into());
    }
    for id in &settings.preferred_instances {
        if !doc
            .shapes
            .iter()
            .any(|s| s.id == *id && s.component == Some(Component::Master))
        {
            return Err("Preferred instances must reference main components".into());
        }
    }
    for id in &p.targets {
        let s = doc
            .shapes
            .iter()
            .find(|s| s.id == *id)
            .ok_or("Slot frame not found")?;
        if s.kind != "frame" || s.id == p.component_id || s.component.is_some() {
            return Err("A slot must be a nested frame inside a main component".into());
        }
        let mut parent = s.parent_id;
        while parent != p.component_id && parent != 0 {
            if doc
                .component_properties
                .iter()
                .any(|q| q.kind == "slot" && q.targets.contains(&parent))
            {
                return Err(
                    "Nest a separate component instance to use a slot inside another slot".into(),
                );
            }
            parent = doc
                .shapes
                .iter()
                .find(|s| s.id == parent)
                .map_or(0, |s| s.parent_id);
        }
    }
    Ok(())
}

// Slot identity is derived from the property binding, never from client-supplied flags.
pub fn bind(doc: &mut Document) {
    for s in &mut doc.shapes {
        if s.component.is_none() || s.component == Some(Component::Master) {
            s.slot = doc
                .component_properties
                .iter()
                .find(|p| p.kind == "slot" && p.targets.contains(&s.id))
                .map(|p| SlotState {
                    property: p.id,
                    modified: false,
                });
        }
    }
}

fn content(shapes: &[Shape], slot: &Shape) -> Vec<Shape> {
    let mut tree = components::subtree(shapes, slot.id);
    tree.remove(0);
    for child in &mut tree {
        child.x -= slot.x;
        child.y -= slot.y;
    }
    tree
}

pub fn prepare(old: &Document, doc: &mut Document) {
    bind(doc);
    let modified: HashSet<_> = doc
        .shapes
        .iter()
        .filter(|s| s.slot.is_some() && matches!(s.component, Some(Component::Instance { .. })))
        .filter(|s| {
            old.shapes
                .iter()
                .find(|p| p.id == s.id && p.slot.is_some())
                .is_some_and(|p| content(&old.shapes, p) != content(&doc.shapes, s))
        })
        .map(|s| s.id)
        .collect();
    for s in &mut doc.shapes {
        if modified.contains(&s.id) {
            s.slot.as_mut().unwrap().modified = true;
        }
    }
    // Stretch newly added items only. Existing sizing remains editable.
    let layouts: HashMap<_, _> = doc
        .shapes
        .iter()
        .filter(|s| s.slot.is_some())
        .filter_map(|s| {
            let settings = doc
                .component_properties
                .iter()
                .find(|p| p.id == s.slot.as_ref().unwrap().property)?
                .slot_settings
                .as_ref()?;
            if !settings.fill_counter_axis {
                return None;
            }
            Some((s.id, s.auto_layout.as_ref()?.direction.clone()))
        })
        .collect();
    for s in &mut doc.shapes {
        if old
            .shapes
            .iter()
            .any(|p| p.id == s.id && p.parent_id == s.parent_id)
        {
            continue;
        }
        if let Some(direction) = layouts.get(&s.parent_id) {
            if direction == "horizontal" {
                s.layout_item.fill_height = true;
            }
            if direction == "vertical" {
                s.layout_item.fill_width = true;
            }
        }
    }
}

pub fn build_content(
    source: &[Shape],
    old: &[Shape],
    src: &Shape,
    slot: &Shape,
    next: &mut u32,
) -> Result<Vec<Shape>, String> {
    let previous = old.iter().find(|s| s.id == slot.id);
    if slot.slot.as_ref().is_some_and(|s| s.modified) {
        let Some(previous) = previous else {
            return Ok(vec![]);
        };
        let mut children = components::subtree(old, previous.id);
        children.remove(0);
        for child in &mut children {
            child.x += slot.x - previous.x;
            child.y += slot.y - previous.y;
            child.page_id = slot.page_id;
        }
        return Ok(children);
    }
    let defaults = components::subtree(source, src.id);
    let old_children = previous
        .map(|p| components::subtree(old, p.id))
        .unwrap_or_default();
    let mut map = HashMap::from([(src.id, slot.id)]);
    for child in defaults.iter().skip(1) {
        let id = if let Some(previous) = old_children.iter().find(|s| s.slot_origin == child.id) {
            previous.id
        } else {
            let id = *next;
            *next = next.checked_add(1).ok_or("Shape ID limit reached")?;
            id
        };
        map.insert(child.id, id);
    }
    Ok(defaults
        .into_iter()
        .skip(1)
        .map(|mut s| {
            s.slot_origin = s.id;
            s.id = map[&s.id];
            // A default slot child still owns its CSS identity. Font reflow can
            // synchronize defaults without running commit's class assignment.
            if let Some(previous) = old_children.iter().find(|old| old.id == s.id) {
                s.layout_class = previous.layout_class.clone();
                s.layout_class_generated = previous.layout_class_generated;
                s.breakpoint_original = previous.breakpoint_original.clone();
            }
            s.parent_id = map[&s.parent_id];
            s.page_id = slot.page_id;
            s.x += slot.x - src.x;
            s.y += slot.y - src.y;
            s
        })
        .collect())
}

#[wasm_bindgen]
impl Editor {
    pub fn clear_slot(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        let slot = doc
            .shapes
            .iter()
            .find(|s| s.id == id && s.slot.is_some())
            .ok_or("Select a slot")?;
        let ids: HashSet<_> = components::subtree(&doc.shapes, slot.id)
            .iter()
            .skip(1)
            .map(|s| s.id)
            .collect();
        doc.shapes.retain(|s| !ids.contains(&s.id));
        if let Some(s) = doc.shapes.iter_mut().find(|s| s.id == id) {
            if matches!(s.component, Some(Component::Instance { .. })) {
                s.slot.as_mut().unwrap().modified = true;
            }
        }
        self.commit(doc)
    }
    pub fn reset_slot(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        let s = doc
            .shapes
            .iter_mut()
            .find(|s| {
                s.id == id
                    && s.slot.is_some()
                    && matches!(s.component, Some(Component::Instance { .. }))
            })
            .ok_or("Select an instance slot")?;
        s.slot.as_mut().unwrap().modified = false;
        self.commit(doc)
    }
    pub fn wrap_in_slot(&mut self, json: &str, name: &str) -> Result<u32, String> {
        let ids = self.selection_ids(json)?;
        let roots = groups::roots(&self.document.shapes, &ids);
        let first = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == roots[0])
            .unwrap();
        if !roots.iter().all(|id| {
            self.document
                .shapes
                .iter()
                .any(|s| s.id == *id && s.parent_id == first.parent_id)
        }) {
            return Err("Choose sibling layers inside a main component".into());
        }
        let mut parent = first.parent_id;
        let master = loop {
            let s = self
                .document
                .shapes
                .iter()
                .find(|s| s.id == parent)
                .ok_or("Slots belong inside main components")?;
            if s.component == Some(Component::Master) {
                break s.id;
            }
            if s.component.is_some() || s.slot.is_some() {
                return Err("Create slots in the main component".into());
            }
            parent = s.parent_id;
        };
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
        let frame = if roots.len() == 1 && first.kind == "frame" && first.component.is_none() {
            first.id
        } else {
            staged.frame_selection(json)?
        };
        let p = component_properties::ComponentProperty {
            id: 0,
            component_id: master,
            name: name.into(),
            kind: "slot".into(),
            targets: vec![frame],
            slot_settings: Some(SlotSettings::default()),
        };
        staged.save_component_property(&serde_json::to_string(&p).unwrap())?;
        staged
            .document
            .shapes
            .iter_mut()
            .find(|s| s.id == frame)
            .unwrap()
            .name = name.into();
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(frame)
    }
}
