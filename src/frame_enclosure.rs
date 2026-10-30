use super::*;

fn available(shape: &Shape, shapes: &[Shape]) -> bool {
    let mut node = Some(shape);
    while let Some(s) = node {
        if s.hidden || s.locked {
            return false;
        }
        node = shapes.iter().find(|p| p.id == s.parent_id);
    }
    true
}

// Both shapes share a parent coordinate system. Test the actual rotated box,
// rather than its axis-aligned bounds or center, so partial overlaps stay out.
fn contains(frame: &Shape, shape: &Shape) -> bool {
    let (sin, cos) = shape.rotation.to_radians().sin_cos();
    [
        (0.0, 0.0),
        (shape.width, 0.0),
        (0.0, shape.height),
        (shape.width, shape.height),
    ]
    .into_iter()
    .all(|(x, y)| {
        let (x, y) = frame.unrotate_point(shape.x + x * cos + y * sin, shape.y - x * sin + y * cos);
        let epsilon = 1e-7;
        x >= frame.x - epsilon
            && y >= frame.y - epsilon
            && x <= frame.x + frame.width + epsilon
            && y <= frame.y + frame.height + epsilon
    })
}

fn enclose(document: &mut Document, frames: &[u32], moving: &[u32]) -> Result<(), String> {
    // Frontmost selected frame wins when two moved frames enclose a sibling.
    let frames: Vec<_> = document
        .shapes
        .iter()
        .rev()
        .filter(|s| {
            frames.contains(&s.id)
                && s.kind == "frame"
                && s.component.is_none()
                && !s.layout_item.grid_container
                && s.editor_meta.as_ref().is_none_or(|m| m.role.is_empty())
                && !document
                    .component_sets
                    .iter()
                    .any(|set| set.frame_id == s.id)
                && available(s, &document.shapes)
        })
        .cloned()
        .collect();
    for frame in frames {
        // Only sibling roots are adopted. A group, component, or nested frame
        // remains intact; never take individual children out of another tree.
        let candidates: Vec<_> = document
            .shapes
            .iter()
            .filter(|s| {
                s.id != frame.id
                    && !moving.contains(&s.id)
                    && s.page_id == frame.page_id
                    && s.parent_id == frame.parent_id
                    && available(s, &document.shapes)
                    && contains(&frame, s)
            })
            .cloned()
            .collect();
        for old in candidates {
            let mut next = old.clone();
            next.parent_id = frame.id;
            (next.x, next.y) = frame.unrotate_point(old.x, old.y);
            next.rotation = (old.rotation - frame.rotation + 180.0).rem_euclid(360.0) - 180.0;
            components::record_overrides(&old, &mut next)?;
            let (dx, dy) = (next.x - old.x, next.y - old.y);
            let descendants: Vec<_> = components::subtree(&document.shapes, old.id)
                .iter()
                .map(|s| s.id)
                .collect();
            for shape in &mut document.shapes {
                if shape.id == old.id {
                    *shape = next.clone();
                } else if descendants.contains(&shape.id) {
                    // Rebase the subtree when a rotated frame changes its root's
                    // local origin, preserving every descendant's visible pose.
                    shape.x += dx;
                    shape.y += dy;
                }
            }
        }
    }
    Ok(())
}

impl Editor {
    fn enclosure_stage(&self) -> Self {
        Self {
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
}

#[wasm_bindgen]
impl Editor {
    /// Insert a drawn frame and adopt fully enclosed, unlocked sibling trees.
    pub fn insert_enclosing_frame(&mut self, json: &str) -> Result<u32, String> {
        let shape: Shape = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if shape.kind != "frame" {
            return Err("Select the Frame tool to enclose layers".into());
        }
        let mut staged = self.enclosure_stage();
        let id = staged.insert(json)?;
        enclose(&mut staged.document, &[id], &[id])?;
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(id)
    }

    /// Commit a canvas move and frame enclosure as one undo step. If reparent
    /// is false, retain the dragged roots' current parents.
    pub fn move_and_enclose(
        &mut self,
        json: &str,
        parent: u32,
        reparent: bool,
    ) -> Result<(), String> {
        let shapes: Vec<Shape> = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let moving: Vec<_> = shapes.iter().map(|s| s.id).collect();
        let frames: Vec<_> = shapes
            .iter()
            .filter(|s| {
                s.kind == "frame"
                    && self
                        .document
                        .shapes
                        .iter()
                        .any(|old| old.id == s.id && (old.x != s.x || old.y != s.y))
            })
            .map(|s| s.id)
            .collect();
        let mut staged = self.enclosure_stage();
        if reparent {
            staged.move_into(json, parent)?;
        } else {
            staged.update_many(json)?;
        }
        enclose(&mut staged.document, &frames, &moving)?;
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(())
    }
}
