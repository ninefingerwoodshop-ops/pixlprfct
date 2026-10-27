use super::*;
use std::collections::HashSet;

impl Shape {
    pub(crate) fn is_container(&self) -> bool {
        matches!(self.kind.as_str(), "frame" | "group")
    }
}

pub(crate) fn roots(shapes: &[Shape], ids: &[u32]) -> Vec<u32> {
    ids.iter()
        .copied()
        .filter(|id| {
            let mut parent = shapes
                .iter()
                .find(|s| s.id == *id)
                .map_or(0, |s| s.parent_id);
            while parent != 0 {
                if ids.contains(&parent) {
                    return false;
                }
                parent = shapes
                    .iter()
                    .find(|s| s.id == parent)
                    .map_or(0, |s| s.parent_id);
            }
            true
        })
        .collect()
}

fn unlocked(shapes: &[Shape], ids: &[u32]) -> Result<(), String> {
    for &id in ids {
        let mut node = shapes.iter().find(|s| s.id == id);
        while let Some(s) = node {
            if s.locked {
                return Err("Unlock the layer or its parent first".into());
            }
            node = shapes.iter().find(|p| p.id == s.parent_id);
        }
    }
    Ok(())
}

// An empty group has no independent geometry. Removing its last child also
// removes the group (and any newly empty ancestors), in the same history step.
pub(crate) fn prune_empty(document: &mut Document) {
    loop {
        let parents: HashSet<_> = document.shapes.iter().map(|s| s.parent_id).collect();
        let before = document.shapes.len();
        document
            .shapes
            .retain(|s| s.kind != "group" || parents.contains(&s.id));
        if document.shapes.len() == before {
            break;
        }
    }
}

pub(crate) fn fit(shapes: &mut [Shape], index: usize, children: &[usize]) {
    let children: Vec<_> = children
        .iter()
        .copied()
        .filter(|&c| !shapes[c].hidden)
        .collect();
    if children.is_empty() {
        shapes[index].width = 0.0;
        shapes[index].height = 0.0;
        return;
    }
    let x = children
        .iter()
        .map(|&c| shapes[c].visual_bounds().0)
        .fold(f64::INFINITY, f64::min);
    let y = children
        .iter()
        .map(|&c| shapes[c].visual_bounds().1)
        .fold(f64::INFINITY, f64::min);
    let right = children
        .iter()
        .map(|&c| {
            let (x, _, w, _) = shapes[c].visual_bounds();
            x + w
        })
        .fold(f64::NEG_INFINITY, f64::max);
    let bottom = children
        .iter()
        .map(|&c| {
            let (_, y, _, h) = shapes[c].visual_bounds();
            y + h
        })
        .fold(f64::NEG_INFINITY, f64::max);
    // Refitting a rotated group changes its local origin. Rebase the subtree
    // so that unedited children do not move on the canvas when bounds change.
    let (sin, cos) = shapes[index].rotation.to_radians().sin_cos();
    let (dx, dy) = (x - shapes[index].x, y - shapes[index].y);
    let (tx, ty) = (dx * cos + dy * sin - dx, -dx * sin + dy * cos - dy);
    if tx.abs() + ty.abs() > 1e-10 {
        let mut subtree = HashSet::from([shapes[index].id]);
        loop {
            let before = subtree.len();
            for s in shapes.iter() {
                if subtree.contains(&s.parent_id) {
                    subtree.insert(s.id);
                }
            }
            if before == subtree.len() {
                break;
            }
        }
        let group_id = shapes[index].id;
        for s in shapes.iter_mut() {
            if s.id != group_id && subtree.contains(&s.id) {
                s.x += tx;
                s.y += ty;
            }
        }
    }
    let group = &mut shapes[index];
    group.x = x + tx;
    group.y = y + ty;
    group.width = (right - x).max(1.0);
    group.height = (bottom - y).max(1.0);
}

#[wasm_bindgen]
impl Editor {
    pub fn group_many(&mut self, json: &str) -> Result<u32, String> {
        let ids = roots(&self.document.shapes, &self.selection_ids(json)?);
        unlocked(&self.document.shapes, &ids)?;
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let first = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == ids[0])
            .unwrap();
        // Grouping across nesting levels uses the nearest common parent.
        let mut ancestors = vec![first.parent_id];
        while *ancestors.last().unwrap() != 0 {
            let p = self
                .document
                .shapes
                .iter()
                .find(|s| s.id == *ancestors.last().unwrap())
                .unwrap();
            ancestors.push(p.parent_id);
        }
        let parent = *ancestors
            .iter()
            .find(|&&candidate| {
                ids.iter().all(|id| {
                    let mut p = self
                        .document
                        .shapes
                        .iter()
                        .find(|s| s.id == *id)
                        .unwrap()
                        .parent_id;
                    loop {
                        if p == candidate {
                            return true;
                        }
                        if p == 0 {
                            return false;
                        }
                        p = self
                            .document
                            .shapes
                            .iter()
                            .find(|s| s.id == p)
                            .unwrap()
                            .parent_id;
                    }
                })
            })
            .unwrap();
        let top = self
            .document
            .shapes
            .iter()
            .rposition(|s| ids.contains(&s.id))
            .unwrap();
        let mut group = first.clone();
        group.id = self.next_id;
        group.kind = "group".into();
        group.rotation = 0.0;
        let mut number = 1;
        while self
            .document
            .shapes
            .iter()
            .any(|s| s.name == format!("Group {number}"))
        {
            number += 1;
        }
        group.name = format!("Group {number}");
        group.parent_id = parent;
        group.component = None;
        group.clip_content = false;
        group.auto_layout = None;
        group.layout_grids.clear();
        group.guide_style = 0;
        group.image = None;
        group.typography = None;
        group.points.clear();
        group.handles.clear();
        group.closed = false;
        group.text.clear();
        group.hidden = false;
        group.locked = false;
        group.aspect_ratio_locked = false;
        group.prototype = None;
        group.additional_interactions.clear();
        group.flow_name.clear();
        group.variable_bindings.clear();
        group.variable_modes.clear();
        group.layout_item = LayoutItem::default();
        group.constraints = Constraints::default();
        group.appearance = Some(
            serde_json::from_value(serde_json::json!({
                "opacity":1.0,"corner_radius":0.0,"fill_enabled":false,
                "stroke_enabled":false,"stroke_color":"#000000","blend_mode":"pass-through"
            }))
            .map_err(|e| e.to_string())?,
        );
        let id = group.id;
        let mut document = self.document.clone();
        document.shapes.insert(top + 1, group);
        for s in &mut document.shapes {
            if ids.contains(&s.id) {
                s.parent_id = id;
                s.layout_item = LayoutItem::default();
            }
        }
        self.commit(document)?;
        self.next_id = self.next_id.max(id + 1);
        Ok(id)
    }

    pub fn ungroup_many(&mut self, json: &str) -> Result<String, String> {
        let ids = roots(&self.document.shapes, &self.selection_ids(json)?);
        unlocked(&self.document.shapes, &ids)?;
        let containers: Vec<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id) && s.is_container() && s.component.is_none())
            .cloned()
            .collect();
        if containers.is_empty() {
            return Err("Select a group or frame to ungroup".into());
        }
        let mut document = self.document.clone();
        let mut selected = vec![];
        // Replacing each container in paint order preserves its children's
        // stacking relative to siblings, including when ungrouping many groups.
        for container in &containers {
            let children: Vec<_> = document
                .shapes
                .iter()
                .filter(|s| s.parent_id == container.id)
                .map(|s| {
                    let mut child = s.clone();
                    child.parent_id = container.parent_id;
                    child
                })
                .collect();
            selected.extend(children.iter().map(|s| s.id));
            document.shapes.retain(|s| s.parent_id != container.id);
            let slot = document
                .shapes
                .iter()
                .position(|s| s.id == container.id)
                .unwrap();
            document.shapes.splice(slot..=slot, children);
        }
        selected.extend(
            ids.into_iter()
                .filter(|id| !containers.iter().any(|s| s.id == *id)),
        );
        self.commit(document)?;
        Ok(serde_json::to_string(&selected).unwrap())
    }

    pub fn rename_group(&mut self, id: u32, name: &str) -> Result<(), String> {
        if name.trim().is_empty() || name.len() > 256 {
            return Err("Enter a group name between 1 and 256 characters".into());
        }
        let mut document = self.document.clone();
        let group = document
            .shapes
            .iter_mut()
            .find(|s| s.id == id && s.kind == "group" && s.page_id == document.active_page)
            .ok_or("Group not found")?;
        group.name = name.trim().into();
        self.commit(document)
    }
}
