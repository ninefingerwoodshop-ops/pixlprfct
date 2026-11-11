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

/// One step from a parent to a child layer: its name, its position among
/// same-named siblings, and its position among all siblings.
type PathStep = (String, usize, usize);

fn layer_path(shapes: &[Shape], master: u32, id: u32) -> Option<Vec<PathStep>> {
    let mut steps = vec![];
    let mut current = shapes.iter().find(|s| s.id == id)?;
    while current.id != master {
        let siblings: Vec<_> = shapes
            .iter()
            .filter(|s| s.parent_id == current.parent_id)
            .collect();
        let index = siblings.iter().position(|s| s.id == current.id)?;
        let ordinal = siblings[..index]
            .iter()
            .filter(|s| s.name == current.name)
            .count();
        steps.push((current.name.clone(), ordinal, index));
        current = shapes.iter().find(|s| s.id == current.parent_id)?;
    }
    steps.reverse();
    Some(steps)
}

// Variants are usually structural copies whose layers were renamed apart, so a
// step that finds no layer by name falls back to the same sibling position.
fn resolve_path(shapes: &[Shape], master: u32, path: &[PathStep]) -> Option<u32> {
    let mut current = master;
    for (name, ordinal, index) in path {
        let siblings: Vec<_> = shapes.iter().filter(|s| s.parent_id == current).collect();
        current = siblings
            .iter()
            .filter(|s| s.name == *name)
            .nth(*ordinal)
            .or_else(|| siblings.get(*index))?
            .id;
    }
    Some(current)
}

#[derive(Default, Serialize)]
pub struct VariantSlotReport {
    pub id: u32,
    pub created: u32,
    pub updated: u32,
    pub unchanged: u32,
    pub skipped: Vec<SkippedVariant>,
}
#[derive(Serialize)]
pub struct SkippedVariant {
    pub component_id: u32,
    pub name: String,
    pub reason: String,
}

/// Give every other variant in the property's component set a slot property
/// with the same name and settings, bound to the layers matching its targets.
/// Existing same-named slot properties keep their own targets and gain matches.
pub fn sync_variants(doc: &mut Document, property: u32) -> Result<VariantSlotReport, String> {
    let source = doc
        .component_properties
        .iter()
        .find(|p| p.id == property && p.kind == "slot")
        .cloned()
        .ok_or("Slot property not found")?;
    let variants: Vec<u32> = doc
        .component_sets
        .iter()
        .find(|set| {
            set.variants
                .iter()
                .any(|v| v.component_id == source.component_id)
        })
        .ok_or("Slot properties apply across variants only inside a component set")?
        .variants
        .iter()
        .map(|v| v.component_id)
        .filter(|id| *id != source.component_id)
        .collect();
    let paths: Vec<_> = source
        .targets
        .iter()
        .filter_map(|id| layer_path(&doc.shapes, source.component_id, *id))
        .collect();
    let mut report = VariantSlotReport {
        id: property,
        ..Default::default()
    };
    for variant in variants {
        let name = doc
            .shapes
            .iter()
            .find(|s| s.id == variant)
            .map_or_else(String::new, |s| s.name.clone());
        let mut skip = |reason: &str| {
            report.skipped.push(SkippedVariant {
                component_id: variant,
                name: name.clone(),
                reason: reason.into(),
            })
        };
        let existing = doc
            .component_properties
            .iter()
            .position(|p| p.component_id == variant && p.name == source.name);
        if existing.is_some_and(|i| doc.component_properties[i].kind != "slot") {
            skip("another property already uses this name");
            continue;
        }
        let existing_id = existing.map(|i| doc.component_properties[i].id);
        let slot_targets: HashSet<u32> = doc
            .component_properties
            .iter()
            .filter(|p| p.kind == "slot" && Some(p.id) != existing_id)
            .flat_map(|p| p.targets.iter().copied())
            .collect();
        let eligible = |id: u32| {
            let Some(s) = doc.shapes.iter().find(|s| s.id == id) else {
                return false;
            };
            if s.kind != "frame" || s.id == variant || s.component.is_some() {
                return false;
            }
            // Neither another slot nor content nested inside one.
            let mut at = id;
            while at != variant && at != 0 {
                if slot_targets.contains(&at) {
                    return false;
                }
                at = doc
                    .shapes
                    .iter()
                    .find(|s| s.id == at)
                    .map_or(0, |s| s.parent_id);
            }
            at == variant
        };
        let mut targets =
            existing.map_or_else(Vec::new, |i| doc.component_properties[i].targets.clone());
        let mut matched = vec![];
        for path in &paths {
            if let Some(id) = resolve_path(&doc.shapes, variant, path).filter(|id| eligible(*id)) {
                if !targets.contains(&id) {
                    targets.push(id);
                    matched.push(id);
                }
            }
        }
        match existing {
            Some(i) => {
                let p = &mut doc.component_properties[i];
                if p.targets == targets && p.slot_settings == source.slot_settings {
                    report.unchanged += 1;
                } else {
                    p.targets = targets;
                    p.slot_settings = source.slot_settings.clone();
                    report.updated += 1;
                }
            }
            None if !paths.is_empty() && matched.is_empty() => skip("no matching layer"),
            None => {
                let id = doc
                    .component_properties
                    .iter()
                    .map(|p| p.id)
                    .max()
                    .unwrap_or(0)
                    .checked_add(1)
                    .ok_or("Property ID limit reached")?;
                doc.component_properties
                    .push(component_properties::ComponentProperty {
                        id,
                        component_id: variant,
                        targets: matched.clone(),
                        ..source.clone()
                    });
                // As when wrapping a selection, a new slot frame takes the slot's name.
                for s in doc.shapes.iter_mut().filter(|s| matched.contains(&s.id)) {
                    s.name = source.name.clone();
                }
                report.created += 1;
            }
        }
    }
    Ok(report)
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
            snapshot_cache: Default::default(),
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
    /// Save a slot property and apply it to every variant of its component
    /// set in one history entry. Returns a JSON report: the property id and
    /// how many variants were created, updated, unchanged or skipped.
    pub fn save_slot_across_variants(&mut self, json: &str) -> Result<String, String> {
        if json.len() > 100_000 {
            return Err("Component property is too large".into());
        }
        let mut p: component_properties::ComponentProperty =
            serde_json::from_str(json).map_err(|e| e.to_string())?;
        if p.kind != "slot" {
            return Err("Only slot properties are applied across variants".into());
        }
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
            let old = doc
                .component_properties
                .iter_mut()
                .find(|old| old.id == p.id && old.component_id == p.component_id)
                .ok_or("Component property not found")?;
            let previous = std::mem::replace(old, p.clone()).name;
            // A rename follows the slot into the other variants, unless the new
            // name is already taken there.
            if previous != p.name {
                let siblings: Vec<u32> = doc
                    .component_sets
                    .iter()
                    .find(|set| {
                        set.variants
                            .iter()
                            .any(|v| v.component_id == p.component_id)
                    })
                    .map_or_else(Vec::new, |set| {
                        set.variants.iter().map(|v| v.component_id).collect()
                    });
                let taken: HashSet<u32> = doc
                    .component_properties
                    .iter()
                    .filter(|q| q.name == p.name)
                    .map(|q| q.component_id)
                    .collect();
                for q in doc.component_properties.iter_mut().filter(|q| {
                    q.kind == "slot"
                        && q.name == previous
                        && q.component_id != p.component_id
                        && siblings.contains(&q.component_id)
                        && !taken.contains(&q.component_id)
                }) {
                    q.name = p.name.clone();
                }
            }
        }
        let report = sync_variants(&mut doc, p.id)?;
        component_properties::validate_properties(&doc)?;
        bind(&mut doc);
        self.commit(doc)?;
        serde_json::to_string(&report).map_err(|e| e.to_string())
    }
    /// Remove a slot property together with the same-named slot properties of
    /// the other variants in its component set. Returns how many were removed.
    pub fn remove_slot_across_variants(&mut self, id: u32) -> Result<u32, String> {
        let mut doc = self.document.clone();
        let p = doc
            .component_properties
            .iter()
            .find(|p| p.id == id && p.kind == "slot")
            .cloned()
            .ok_or("Slot property not found")?;
        let siblings: Vec<u32> = doc
            .component_sets
            .iter()
            .find(|set| {
                set.variants
                    .iter()
                    .any(|v| v.component_id == p.component_id)
            })
            .map_or_else(Vec::new, |set| {
                set.variants.iter().map(|v| v.component_id).collect()
            });
        let before = doc.component_properties.len();
        doc.component_properties.retain(|q| {
            q.id != id
                && !(q.kind == "slot" && q.name == p.name && siblings.contains(&q.component_id))
        });
        let removed = (before - doc.component_properties.len()) as u32;
        self.commit(doc)?;
        Ok(removed)
    }
}
