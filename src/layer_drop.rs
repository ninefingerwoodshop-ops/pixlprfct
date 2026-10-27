use super::*;

#[wasm_bindgen]
impl Editor {
    pub fn duplicate_drop_layers(
        &mut self,
        json: &str,
        target: u32,
        position: &str,
    ) -> Result<String, String> {
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        let copies = staged.duplicate_many(json)?;
        let ids: Vec<u32> = serde_json::from_str(&copies).map_err(|e| e.to_string())?;
        // A layer-tree copy keeps its canvas position; only its stack/parent changes.
        for shape in &mut staged.document.shapes {
            if ids.contains(&shape.id) {
                shape.x -= 24.0;
                shape.y -= 24.0;
            }
        }
        let roots = groups::roots(&staged.document.shapes, &ids);
        staged.drop_layers(&serde_json::to_string(&roots).unwrap(), target, position)?;
        self.commit(staged.document)?;
        self.next_id = self.next_id.max(staged.next_id);
        Ok(serde_json::to_string(&roots).unwrap())
    }

    pub fn drop_layers(&mut self, json: &str, target: u32, position: &str) -> Result<(), String> {
        let ids = groups::roots(&self.document.shapes, &self.selection_ids(json)?);
        if ids.contains(&target) {
            return Ok(());
        }
        let mut ordered: Vec<_> = self
            .document
            .shapes
            .iter()
            .filter(|s| ids.contains(&s.id))
            .map(|s| s.id)
            .collect();
        if position == "before" {
            ordered.reverse();
        }
        let mut staged = Editor {
            clipboard_origin: self.clipboard_origin.clone(),
            text_measurer: self.text_measurer.clone(),
            document: self.document.clone(),
            undo: vec![],
            redo: vec![],
            next_id: self.next_id,
            next_page_id: self.next_page_id,
        };
        for id in ordered {
            staged.drop_layer(id, target, position)?;
        }
        self.commit(staged.document)
    }

    // The layer tree displays the paint stack in reverse order.
    pub fn drop_layer(&mut self, id: u32, target: u32, position: &str) -> Result<(), String> {
        if !["before", "after", "inside"].contains(&position) {
            return Err("Invalid drop position".into());
        }
        if id == target {
            return Ok(());
        }
        let _source = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id && s.page_id == self.document.active_page)
            .ok_or("Layer not found")?;
        let destination = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == target && s.page_id == self.document.active_page)
            .ok_or("Drop target not found")?;
        if position == "inside" && !destination.is_container() {
            return Err("Drop inside a frame or group".into());
        }
        let parent = if position == "inside" {
            target
        } else {
            destination.parent_id
        };
        let moving: Vec<u32> = self
            .document
            .shapes
            .iter()
            .filter(|s| s.id == id)
            .map(|s| s.id)
            .collect();
        if moving.contains(&target) {
            return Ok(());
        }
        for start in moving.iter().copied().chain(std::iter::once(parent)) {
            let mut cursor = start;
            while cursor != 0 {
                let s = self
                    .document
                    .shapes
                    .iter()
                    .find(|s| s.id == cursor)
                    .ok_or("Parent not found")?;
                if s.locked {
                    return Err("Unlock the layer or its parent before moving it".into());
                }
                cursor = s.parent_id;
            }
        }
        let mut ancestor = parent;
        while ancestor != 0 {
            if moving.contains(&ancestor) {
                return Err("Cannot move a frame inside itself".into());
            }
            ancestor = self
                .document
                .shapes
                .iter()
                .find(|s| s.id == ancestor)
                .unwrap()
                .parent_id;
        }
        let mut document = self.document.clone();
        let mut moved: Vec<Shape> = document
            .shapes
            .iter()
            .filter(|s| moving.contains(&s.id))
            .cloned()
            .collect();
        for s in &mut moved {
            s.parent_id = parent;
        }
        document.shapes.retain(|s| !moving.contains(&s.id));
        let index = if position == "inside" {
            document.shapes.len()
        } else {
            let matches = |s: &Shape| s.id == target;
            if position == "before" {
                document.shapes.iter().rposition(matches).unwrap() + 1
            } else {
                document.shapes.iter().position(matches).unwrap()
            }
        };
        document.shapes.splice(index..index, moved);
        if document == self.document {
            return Ok(());
        }
        self.commit(document)
    }
}
