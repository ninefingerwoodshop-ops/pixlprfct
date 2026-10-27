use super::*;
use std::collections::HashSet;

#[wasm_bindgen]
impl Editor {
    pub fn arrange_many(&mut self, json: &str, direction: &str) -> Result<(), String> {
        if !["forward", "backward", "front", "back"].contains(&direction) {
            return Err("Unknown layer arrangement".into());
        }
        let selected: HashSet<u32> = self.selection_ids(json)?.into_iter().collect();
        // A selected ancestor moves its entire paint subtree. Do not also change
        // the order of selected descendants inside it.
        let roots: HashSet<u32> = selected
            .iter()
            .copied()
            .filter(|id| {
                let mut parent = self
                    .document
                    .shapes
                    .iter()
                    .find(|s| s.id == *id)
                    .unwrap()
                    .parent_id;
                while parent != 0 {
                    if selected.contains(&parent) {
                        return false;
                    }
                    parent = self
                        .document
                        .shapes
                        .iter()
                        .find(|s| s.id == parent)
                        .unwrap()
                        .parent_id;
                }
                true
            })
            .collect();
        let parents: HashSet<u32> = self
            .document
            .shapes
            .iter()
            .filter(|s| roots.contains(&s.id))
            .map(|s| s.parent_id)
            .collect();
        let mut document = self.document.clone();
        for parent in parents {
            let slots: Vec<usize> = document
                .shapes
                .iter()
                .enumerate()
                .filter(|(_, s)| s.page_id == document.active_page && s.parent_id == parent)
                .map(|(i, _)| i)
                .collect();
            // Each sibling is a unit; containers carry their paint subtree.
            let mut units: Vec<Vec<Shape>> = slots
                .iter()
                .map(|&slot| vec![document.shapes[slot].clone()])
                .collect();
            let chosen = |unit: &Vec<Shape>| unit.iter().any(|s| roots.contains(&s.id));
            match direction {
                "front" => units.sort_by_key(|u| chosen(u)),
                "back" => units.sort_by_key(|u| !chosen(u)),
                "forward" => {
                    for i in (0..units.len().saturating_sub(1)).rev() {
                        if chosen(&units[i]) && !chosen(&units[i + 1]) {
                            units.swap(i, i + 1);
                        }
                    }
                }
                _ => {
                    for i in 1..units.len() {
                        if chosen(&units[i]) && !chosen(&units[i - 1]) {
                            units.swap(i, i - 1);
                        }
                    }
                }
            }
            for (slot, shape) in slots.into_iter().zip(units.into_iter().flatten()) {
                document.shapes[slot] = shape;
            }
        }
        if document == self.document {
            return Ok(());
        }
        self.commit(document)
    }
}
