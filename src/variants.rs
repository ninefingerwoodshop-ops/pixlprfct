use super::*;
use std::collections::HashSet;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Variant {
    pub component_id: u32,
    pub values: Vec<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ComponentSet {
    pub id: u32,
    #[serde(default, skip_serializing_if = "is_zero")]
    pub frame_id: u32,
    pub name: String,
    pub properties: Vec<String>,
    pub variants: Vec<Variant>,
}

fn is_zero(value: &u32) -> bool {
    *value == 0
}

pub fn validate_sets(doc: &Document) -> Result<(), String> {
    if doc.component_sets.len() > 1000 {
        return Err("Too many component sets".into());
    }
    let mut ids = HashSet::new();
    let mut members = HashSet::new();
    let mut frames = HashSet::new();
    let valid_name = |s: &str| !s.trim().is_empty() && s.len() <= 128;
    for set in &doc.component_sets {
        if set.id == 0
            || set.id == u32::MAX
            || !ids.insert(set.id)
            || !valid_name(&set.name)
            || set.properties.is_empty()
            || set.properties.len() > 16
            || set.properties.iter().any(|p| !valid_name(p))
            || set.properties.iter().collect::<HashSet<_>>().len() != set.properties.len()
            || set.variants.is_empty()
            || set.variants.len() > 1000
        {
            return Err("Invalid component set name, properties, or size".into());
        }
        if set.frame_id != 0 {
            let frame = doc
                .shapes
                .iter()
                .find(|s| s.id == set.frame_id && s.kind == "frame" && s.component.is_none())
                .ok_or("Component set container must be an ordinary frame")?;
            if !frames.insert(set.frame_id)
                || set.variants.iter().any(|v| {
                    !doc.shapes.iter().any(|s| {
                        s.id == v.component_id
                            && s.parent_id == frame.id
                            && s.page_id == frame.page_id
                    })
                })
            {
                return Err("Variants must be children of their component set".into());
            }
        }
        let mut combinations = HashSet::new();
        for variant in &set.variants {
            if !members.insert(variant.component_id)
                || !doc.shapes.iter().any(|s| {
                    s.id == variant.component_id
                        && s.kind == "frame"
                        && s.component == Some(components::Component::Master)
                })
            {
                return Err("Each variant must be a main component in exactly one set".into());
            }
            if variant.values.len() != set.properties.len()
                || variant.values.iter().any(|v| !valid_name(v))
                || !combinations.insert(&variant.values)
            {
                return Err("Each variant needs a unique combination of property values".into());
            }
        }
    }
    Ok(())
}

pub fn prune(doc: &mut Document) {
    let masters: HashSet<_> = doc
        .shapes
        .iter()
        .filter(|s| s.component == Some(components::Component::Master))
        .map(|s| s.id)
        .collect();
    for set in &mut doc.component_sets {
        if set.frame_id != 0
            && !doc
                .shapes
                .iter()
                .any(|s| s.id == set.frame_id && s.kind == "frame" && s.component.is_none())
        {
            set.frame_id = 0;
        }
        set.variants.retain(|v| {
            masters.contains(&v.component_id)
                && (set.frame_id == 0
                    || doc
                        .shapes
                        .iter()
                        .any(|s| s.id == v.component_id && s.parent_id == set.frame_id))
        });
        if let Some(frame) = doc.shapes.iter().find(|s| s.id == set.frame_id) {
            set.name = frame.name.clone();
        }
    }
    doc.component_sets.retain(|s| !s.variants.is_empty());
}

// Clone a whole set when its container (or every legacy member) is duplicated.
// A single copied main remains independent until Add variant is requested.
pub fn duplicate_definitions(
    doc: &mut Document,
    mapping: &std::collections::HashMap<u32, u32>,
) -> Result<(), String> {
    let mut next = doc.component_sets.iter().map(|s| s.id).max().unwrap_or(0);
    for mut set in doc.component_sets.clone() {
        if set
            .variants
            .iter()
            .all(|v| mapping.contains_key(&v.component_id))
            && (set.frame_id != 0 && mapping.contains_key(&set.frame_id)
                || set.frame_id == 0 && set.variants.len() > 1)
        {
            next = next
                .checked_add(1)
                .ok_or("Component set ID limit reached")?;
            set.id = next;
            set.frame_id = mapping.get(&set.frame_id).copied().unwrap_or(0);
            for v in &mut set.variants {
                v.component_id = mapping[&v.component_id];
            }
            doc.component_sets.push(set);
        }
    }
    Ok(())
}

fn short_name(value: &str) -> String {
    let mut end = value.len().min(128);
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    value[..end].trim().to_string()
}

fn variant_name(set: &ComponentSet, values: &[String]) -> String {
    let name = set
        .properties
        .iter()
        .zip(values)
        .map(|(p, v)| format!("{p}={v}"))
        .collect::<Vec<_>>()
        .join(", ");
    if name.len() <= 256 {
        name
    } else {
        values[0].clone()
    }
}

type NamedVariants = (Vec<String>, Vec<Variant>);

fn named_properties(shapes: &[Shape], names: &[String]) -> Result<Option<NamedVariants>, String> {
    if !names.iter().any(|name| name.contains('=')) {
        return Ok(None);
    }
    let mut properties = Vec::new();
    let mut variants = Vec::new();
    for (shape, name) in shapes.iter().zip(names) {
        let mut pairs = std::collections::BTreeMap::new();
        for part in name.split(',') {
            let (property, value) = part
                .split_once('=')
                .ok_or("Use Property=Value names for every variant")?;
            let (property, value) = (property.trim(), value.trim());
            if property.is_empty()
                || value.is_empty()
                || pairs
                    .insert(property.to_string(), value.to_string())
                    .is_some()
            {
                return Err("Variant names need nonempty, unique Property=Value pairs".into());
            }
            if variants.is_empty() {
                properties.push(property.to_string());
            }
        }
        if pairs.len() != properties.len() || properties.iter().any(|p| !pairs.contains_key(p)) {
            return Err("Use the same property names on every variant".into());
        }
        variants.push(Variant {
            component_id: shape.id,
            values: properties.iter().map(|p| pairs[p].clone()).collect(),
        });
    }
    Ok(Some((properties, variants)))
}

impl Editor {
    fn variant_stage(&self) -> Editor {
        Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            write_guard: self.write_guard.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        }
    }
    fn wrap_variant_set(&mut self, ids: &[u32], name: &str) -> Result<u32, String> {
        let frame_id = self.frame_selection(&serde_json::to_string(ids).unwrap())?;
        let frame = self
            .document
            .shapes
            .iter_mut()
            .find(|s| s.id == frame_id)
            .unwrap();
        frame.name = name.into();
        frame.x -= 20.0;
        frame.y -= 20.0;
        frame.width += 40.0;
        frame.height += 40.0;
        Ok(frame_id)
    }
}

#[wasm_bindgen]
impl Editor {
    /// Combine sibling main components into a visible set without changing their artwork.
    pub fn combine_variants(&mut self, json: &str) -> Result<u32, String> {
        let ids = self.selection_ids(json)?;
        if ids.len() < 2 {
            return Err("Select at least two main components".into());
        }
        let shapes: Vec<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .cloned()
            .collect();
        if shapes.iter().any(|s| {
            s.component != Some(components::Component::Master) || s.parent_id != shapes[0].parent_id
        }) {
            return Err("Select main components in the same parent".into());
        }
        if self
            .document
            .component_sets
            .iter()
            .any(|set| set.variants.iter().any(|v| ids.contains(&v.component_id)))
        {
            return Err("These components already belong to a variant set".into());
        }
        let segments: Vec<Vec<_>> = shapes
            .iter()
            .map(|s| s.name.split('/').map(str::trim).collect())
            .collect();
        let shared = segments
            .iter()
            .all(|p| p.len() > 1 && p[0] == segments[0][0]);
        let parsed = named_properties(
            &shapes,
            &segments
                .iter()
                .map(|parts| {
                    if shared {
                        parts[1..].join(" / ")
                    } else {
                        parts.join(" / ")
                    }
                })
                .collect::<Vec<_>>(),
        )?;
        let name = short_name(if shared {
            segments[0][0]
        } else if parsed.is_some() {
            "Component set"
        } else {
            &shapes[0].name
        });
        let same_name = shapes.iter().all(|s| s.name == shapes[0].name);
        let mut seen = HashSet::new();
        let variants = shapes
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let value: String = if same_name {
                    if i == 0 {
                        "Default".into()
                    } else {
                        format!("Variant {}", i + 1)
                    }
                } else if shared {
                    segments[i][1..].join(" / ")
                } else {
                    s.name.clone()
                }
                .chars()
                .take(64)
                .collect();
                let value = short_name(&value);
                let mut value = if value.trim().is_empty() {
                    "Default".into()
                } else {
                    value
                };
                let mut n = 1;
                while !seen.insert(value.clone()) {
                    n += 1;
                    value = format!("Variant {n}");
                }
                Variant {
                    component_id: s.id,
                    values: vec![value],
                }
            })
            .collect();
        let (properties, variants) = parsed.unwrap_or((vec!["Property 1".into()], variants));
        let mut staged = self.variant_stage();
        let frame_id = staged.wrap_variant_set(&ids, &name)?;
        staged.save_component_set(
            &serde_json::to_string(&ComponentSet {
                id: 0,
                frame_id,
                name,
                properties,
                variants,
            })
            .unwrap(),
        )?;
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(frame_id)
    }

    /// Add a variant directly to a main component or an existing component set.
    pub fn add_variant(&mut self, id: u32) -> Result<u32, String> {
        let mut staged = self.variant_stage();
        let set = staged
            .document
            .component_sets
            .iter()
            .find(|s| s.frame_id == id || s.variants.iter().any(|v| v.component_id == id))
            .cloned();
        let main = if let Some(set) = &set {
            if set.frame_id == id {
                set.variants[0].component_id
            } else {
                id
            }
        } else {
            id
        };
        if set.is_none() {
            let shape = staged
                .document
                .shapes
                .iter()
                .find(|s| {
                    s.id == id
                        && s.page_id == staged.document.active_page
                        && s.component == Some(components::Component::Master)
                })
                .ok_or("Select a main component or component set")?;
            let name = short_name(&shape.name);
            let frame_id = staged.wrap_variant_set(&[id], &name)?;
            staged.save_component_set(
                &serde_json::to_string(&ComponentSet {
                    id: 0,
                    frame_id,
                    name,
                    properties: vec!["Property 1".into()],
                    variants: vec![Variant {
                        component_id: id,
                        values: vec!["Default".into()],
                    }],
                })
                .unwrap(),
            )?;
        }
        if let Some(mut set) = set.filter(|s| s.frame_id == 0) {
            let members: Vec<_> = staged
                .document
                .shapes
                .iter()
                .filter(|s| set.variants.iter().any(|v| v.component_id == s.id))
                .collect();
            if members.iter().all(|s| {
                s.page_id == staged.document.active_page && s.parent_id == members[0].parent_id
            }) {
                let ids = set
                    .variants
                    .iter()
                    .map(|v| v.component_id)
                    .collect::<Vec<_>>();
                set.frame_id = staged.wrap_variant_set(&ids, &set.name)?;
                staged.save_component_set(&serde_json::to_string(&set).unwrap())?;
            }
        }
        let root = staged.duplicate_variant(main)?;
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(root)
    }
}

#[wasm_bindgen]
impl Editor {
    pub fn duplicate_variant(&mut self, id: u32) -> Result<u32, String> {
        let set = self
            .document
            .component_sets
            .iter()
            .find(|s| s.variants.iter().any(|v| v.component_id == id))
            .ok_or("Select a main component in a variant set")?
            .clone();
        let original = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id && s.page_id == self.document.active_page)
            .ok_or("Main component not found on this page")?
            .clone();
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
        let ids: Vec<u32> = serde_json::from_str(
            &staged.duplicate_many(&serde_json::to_string(&vec![id]).unwrap())?,
        )
        .unwrap();
        let root = ids[0];
        let mut duplicate = staged
            .document
            .shapes
            .iter()
            .find(|s| s.id == root)
            .unwrap()
            .clone();
        duplicate.x = original.x + original.width + 40.0;
        duplicate.y = original.y;
        if set.frame_id != 0 {
            duplicate.x = original.x;
            duplicate.y = self
                .document
                .shapes
                .iter()
                .filter(|s| s.parent_id == set.frame_id)
                .map(|s| s.y + s.height)
                .fold(original.y + original.height, f64::max)
                + 20.0;
        }
        let mut values = set
            .variants
            .iter()
            .find(|v| v.component_id == id)
            .unwrap()
            .values
            .clone();
        let last = values.len() - 1;
        let mut number = 2;
        loop {
            values[last] = format!("Variant {number}");
            if !set.variants.iter().any(|v| v.values == values) {
                break;
            }
            number += 1;
        }
        duplicate.name = variant_name(&set, &values);
        if duplicate.name.len() > 256 {
            duplicate.name = "New variant".into();
        }
        staged.update(&serde_json::to_string(&duplicate).unwrap())?;
        staged
            .document
            .component_sets
            .iter_mut()
            .find(|s| s.id == set.id)
            .unwrap()
            .variants
            .push(Variant {
                component_id: root,
                values,
            });
        if set.frame_id != 0 {
            let members: Vec<_> = staged
                .document
                .shapes
                .iter()
                .filter(|s| s.parent_id == set.frame_id)
                .cloned()
                .collect();
            if let Some(frame) = staged
                .document
                .shapes
                .iter_mut()
                .find(|s| s.id == set.frame_id)
            {
                frame.width = members
                    .iter()
                    .map(|s| s.x + s.width - frame.x + 20.0)
                    .fold(frame.width, f64::max);
                frame.height = members
                    .iter()
                    .map(|s| s.y + s.height - frame.y + 20.0)
                    .fold(frame.height, f64::max);
            }
        }
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(root)
    }

    pub fn save_component_set(&mut self, json: &str) -> Result<u32, String> {
        if json.len() > 500_000 {
            return Err("Component set is too large".into());
        }
        let mut set: ComponentSet = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut doc = self.document.clone();
        if set.frame_id == 0 {
            set.frame_id = doc
                .component_sets
                .iter()
                .find(|s| s.id == set.id)
                .map_or(0, |s| s.frame_id);
        }
        set.name = set.name.trim().into();
        for p in &mut set.properties {
            *p = p.trim().into();
        }
        for v in &mut set.variants {
            for value in &mut v.values {
                *value = value.trim().into();
            }
        }
        if set.id == 0 {
            set.id = doc
                .component_sets
                .iter()
                .map(|s| s.id)
                .max()
                .unwrap_or(0)
                .checked_add(1)
                .ok_or("Component set ID limit reached")?;
            doc.component_sets.push(set.clone());
        } else {
            *doc.component_sets
                .iter_mut()
                .find(|s| s.id == set.id)
                .ok_or("Component set not found")? = set.clone();
        }
        // Validate before pruning so a bad request cannot silently drop members.
        validate_sets(&doc)?;
        let mut next_id = self.next_id;
        if set.frame_id == 0 {
            let members: Vec<_> = set
                .variants
                .iter()
                .map(|v| doc.shapes.iter().find(|s| s.id == v.component_id).unwrap())
                .collect();
            // Legacy cross-page definitions remain valid. Sibling definitions
            // become visible sets, including when authored directly through MCP.
            if members
                .iter()
                .all(|s| s.page_id == members[0].page_id && s.parent_id == members[0].parent_id)
            {
                let page = members[0].page_id;
                let ids: Vec<_> = members.iter().map(|s| s.id).collect();
                let mut staged = self.variant_stage();
                staged.document = doc;
                staged.document.active_page = page;
                set.frame_id = staged.wrap_variant_set(&ids, &set.name)?;
                next_id = staged.next_id;
                doc = staged.document;
                doc.active_page = self.document.active_page;
                doc.component_sets
                    .iter_mut()
                    .find(|s| s.id == set.id)
                    .unwrap()
                    .frame_id = set.frame_id;
            }
        }
        if let Some(frame) = doc.shapes.iter_mut().find(|s| s.id == set.frame_id) {
            frame.name = set.name.clone();
        }
        for variant in &set.variants {
            if let Some(main) = doc.shapes.iter_mut().find(|s| s.id == variant.component_id) {
                main.name = variant_name(&set, &variant.values);
            }
        }
        self.commit(doc)?;
        self.next_id = self.next_id.max(next_id);
        Ok(set.id)
    }

    pub fn remove_component_set(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        if !doc.component_sets.iter().any(|s| s.id == id) {
            return Err("Component set not found".into());
        }
        doc.component_sets.retain(|s| s.id != id);
        self.commit(doc)
    }

    pub fn set_variant_property(
        &mut self,
        id: u32,
        property: &str,
        value: &str,
    ) -> Result<u32, String> {
        if self
            .document
            .shapes
            .iter()
            .any(|s| s.id == id && s.component == Some(components::Component::Master))
        {
            let mut set = self
                .document
                .component_sets
                .iter()
                .find(|s| s.variants.iter().any(|v| v.component_id == id))
                .cloned()
                .ok_or("Main component does not belong to a variant set")?;
            let index = set
                .properties
                .iter()
                .position(|p| p == property)
                .ok_or("Variant property not found")?;
            set.variants
                .iter_mut()
                .find(|v| v.component_id == id)
                .unwrap()
                .values[index] = value.trim().into();
            self.save_component_set(&serde_json::to_string(&set).unwrap())?;
            return Ok(id);
        }
        let root = self.instance_root(id)?;
        let shape = self.document.shapes.iter().find(|s| s.id == root).unwrap();
        let Some(components::Component::Instance { master, .. }) = shape.component else {
            unreachable!()
        };
        let set = self
            .document
            .component_sets
            .iter()
            .find(|set| set.variants.iter().any(|v| v.component_id == master))
            .ok_or("Instance does not belong to a variant set")?;
        let index = set
            .properties
            .iter()
            .position(|p| p == property)
            .ok_or("Variant property not found")?;
        let current = set
            .variants
            .iter()
            .find(|v| v.component_id == master)
            .unwrap();
        // Sparse sets may not contain every Cartesian combination. Prefer the
        // candidate retaining the most other values; ties use the set order.
        let mut candidates: Vec<_> = set
            .variants
            .iter()
            .filter(|v| v.values[index] == value)
            .collect();
        candidates.sort_by_key(|v| {
            std::cmp::Reverse(
                v.values
                    .iter()
                    .zip(&current.values)
                    .enumerate()
                    .filter(|(i, (a, b))| *i != index && a == b)
                    .count(),
            )
        });
        let target = candidates
            .first()
            .ok_or("Variant value not found")?
            .component_id;
        self.swap_instance(root, target)
    }
}
