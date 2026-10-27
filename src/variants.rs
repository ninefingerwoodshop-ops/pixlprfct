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
    pub name: String,
    pub properties: Vec<String>,
    pub variants: Vec<Variant>,
}

pub fn validate_sets(doc: &Document) -> Result<(), String> {
    if doc.component_sets.len() > 1000 {
        return Err("Too many component sets".into());
    }
    let mut ids = HashSet::new();
    let mut members = HashSet::new();
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
        set.variants.retain(|v| masters.contains(&v.component_id));
    }
    doc.component_sets.retain(|s| !s.variants.is_empty());
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
        duplicate.name = format!("{} / {}", set.name, values.join(", "));
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
        self.commit(doc)?;
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
