use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Shape {
    pub id: u32,
    #[serde(default = "first_page")]
    pub page_id: u32,
    pub kind: String,
    pub name: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub fill: String,
    pub text: String,
    pub hidden: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Document {
    pub version: u32,
    pub name: String,
    pub shapes: Vec<Shape>,
    #[serde(default = "default_pages")]
    pub pages: Vec<Page>,
    #[serde(default = "first_page")]
    pub active_page: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Page {
    pub id: u32,
    pub name: String,
}

fn first_page() -> u32 {
    1
}
fn default_pages() -> Vec<Page> {
    vec![Page {
        id: 1,
        name: "Page 1".into(),
    }]
}

#[wasm_bindgen]
pub struct Editor {
    document: Document,
    undo: Vec<Document>,
    redo: Vec<Document>,
    next_id: u32,
    next_page_id: u32,
}

fn validate(document: &Document) -> Result<(), String> {
    if document.version != 2 || document.shapes.len() > 10_000 || document.name.len() > 256 {
        return Err("Unsupported document version or document too large".into());
    }
    let mut ids = std::collections::HashSet::new();
    let mut pages = std::collections::HashSet::new();
    if document.pages.is_empty() || document.pages.len() > 100 {
        return Err("Documents must have between 1 and 100 pages".into());
    }
    for page in &document.pages {
        if page.id == 0
            || page.id == u32::MAX
            || !pages.insert(page.id)
            || page.name.trim().is_empty()
            || page.name.len() > 256
        {
            return Err("Invalid page name or ID".into());
        }
    }
    if !pages.contains(&document.active_page) {
        return Err("Active page not found".into());
    }
    for shape in &document.shapes {
        if !pages.contains(&shape.page_id) {
            return Err("Shape belongs to a missing page".into());
        }
        if !ids.insert(shape.id) || shape.id == 0 || shape.id == u32::MAX {
            return Err("Invalid or duplicate shape ID".into());
        }
        if !["rectangle", "ellipse", "frame", "text"].contains(&shape.kind.as_str())
            || shape.name.len() > 256
            || shape.text.len() > 10_000
            || shape.fill.len() != 7
            || !shape.fill.starts_with('#')
            || !shape.fill[1..].bytes().all(|c| c.is_ascii_hexdigit())
            || ![shape.x, shape.y, shape.width, shape.height]
                .iter()
                .all(|v| v.is_finite() && v.abs() <= 1_000_000.0)
            || shape.width < 1.0
            || shape.height < 1.0
        {
            return Err("Invalid shape data".into());
        }
    }
    Ok(())
}

impl Editor {
    fn commit(&mut self, document: Document) -> Result<(), String> {
        validate(&document)?;
        if document != self.document {
            self.undo.push(self.document.clone());
            if self.undo.len() > 100 {
                self.undo.remove(0);
            }
            self.redo.clear();
            self.document = document;
        }
        Ok(())
    }
}

impl Default for Editor {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl Editor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            document: Document {
                version: 2,
                name: "Untitled design".into(),
                shapes: vec![],
                pages: default_pages(),
                active_page: 1,
            },
            undo: vec![],
            redo: vec![],
            next_id: 1,
            next_page_id: 2,
        }
    }

    pub fn snapshot(&self) -> String {
        serde_json::to_string(&self.document).unwrap()
    }

    pub fn load(&mut self, json: &str) -> Result<(), String> {
        if json.len() > 5_000_000 {
            return Err("Document exceeds 5 MB".into());
        }
        let mut document: Document = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if document.version == 1 {
            document.version = 2;
            document.pages = default_pages();
            document.active_page = 1;
            for shape in &mut document.shapes {
                shape.page_id = 1;
            }
        }
        validate(&document)?;
        self.next_page_id = self
            .next_page_id
            .max(document.pages.iter().map(|p| p.id).max().unwrap_or(1) + 1);
        self.next_id = self
            .next_id
            .max(document.shapes.iter().map(|s| s.id).max().unwrap_or(0) + 1);
        self.commit(document)
    }

    pub fn add(&mut self, kind: &str, x: f64, y: f64) -> Result<u32, String> {
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let id = self.next_id;
        let mut document = self.document.clone();
        let (width, height, fill) = match kind {
            "frame" => (600.0, 400.0, "#ffffff"),
            "text" => (240.0, 56.0, "#20252b"),
            _ => (160.0, 120.0, "#a3e635"),
        };
        document.shapes.push(Shape {
            id,
            page_id: document.active_page,
            kind: kind.into(),
            name: format!("{} {}", kind, id),
            x,
            y,
            width,
            height,
            fill: fill.into(),
            text: "Your next big idea".into(),
            hidden: false,
        });
        self.commit(document)?;
        self.next_id += 1;
        Ok(id)
    }

    pub fn update(&mut self, json: &str) -> Result<(), String> {
        let shape: Shape = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut document = self.document.clone();
        let entry = document
            .shapes
            .iter_mut()
            .find(|s| {
                s.id == shape.id && s.page_id == document.active_page && shape.page_id == s.page_id
            })
            .ok_or("Shape not found")?;
        *entry = shape;
        self.commit(document)
    }

    pub fn remove(&mut self, id: u32) -> Result<(), String> {
        let mut document = self.document.clone();
        document
            .shapes
            .retain(|s| s.id != id || s.page_id != document.active_page);
        self.commit(document)
    }

    pub fn duplicate(&mut self, id: u32) -> Result<u32, String> {
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let mut shape = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id && s.page_id == self.document.active_page)
            .ok_or("Shape not found")?
            .clone();
        shape.id = self.next_id;
        shape.x += 24.0;
        shape.y += 24.0;
        let id = shape.id;
        let mut document = self.document.clone();
        document.shapes.push(shape);
        self.commit(document)?;
        self.next_id += 1;
        Ok(id)
    }

    pub fn reorder(&mut self, id: u32, delta: i32) -> Result<(), String> {
        let mut document = self.document.clone();
        let indices: Vec<usize> = document
            .shapes
            .iter()
            .enumerate()
            .filter(|(_, s)| s.page_id == document.active_page)
            .map(|(i, _)| i)
            .collect();
        let index = indices
            .iter()
            .position(|&i| document.shapes[i].id == id)
            .ok_or("Shape not found")?;
        let target = (index as i64 + delta as i64).clamp(0, indices.len() as i64 - 1) as usize;
        // Rotate only this page's slots, leaving every other page's order intact.
        let mut shapes: Vec<Shape> = indices
            .iter()
            .map(|&i| document.shapes[i].clone())
            .collect();
        let shape = shapes.remove(index);
        shapes.insert(target, shape);
        for (&i, shape) in indices.iter().zip(shapes) {
            document.shapes[i] = shape;
        }
        self.commit(document)
    }

    pub fn hit_test(&self, x: f64, y: f64) -> u32 {
        self.document
            .shapes
            .iter()
            .rev()
            .find(|s| {
                if s.page_id != self.document.active_page
                    || s.hidden
                    || x < s.x
                    || x > s.x + s.width
                    || y < s.y
                    || y > s.y + s.height
                {
                    return false;
                }
                if s.kind == "ellipse" {
                    let dx = (x - s.x - s.width / 2.0) / (s.width / 2.0);
                    let dy = (y - s.y - s.height / 2.0) / (s.height / 2.0);
                    dx * dx + dy * dy <= 1.0
                } else {
                    true
                }
            })
            .map(|s| s.id)
            .unwrap_or(0)
    }

    pub fn add_page(&mut self) -> Result<u32, String> {
        if self.next_page_id == u32::MAX {
            return Err("Page ID limit reached".into());
        }
        let id = self.next_page_id;
        let mut document = self.document.clone();
        let mut number = 1;
        while document
            .pages
            .iter()
            .any(|p| p.name == format!("Page {}", number))
        {
            number += 1;
        }
        document.pages.push(Page {
            id,
            name: format!("Page {}", number),
        });
        document.active_page = id;
        self.commit(document)?;
        self.next_page_id += 1;
        Ok(id)
    }

    pub fn select_page(&mut self, id: u32) -> Result<(), String> {
        if !self.document.pages.iter().any(|p| p.id == id) {
            return Err("Page not found".into());
        }
        // Navigation is not an edit and must not consume undo or discard redo.
        self.document.active_page = id;
        Ok(())
    }

    pub fn rename_page(&mut self, id: u32, name: &str) -> Result<(), String> {
        let mut document = self.document.clone();
        let page = document
            .pages
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or("Page not found")?;
        page.name = name.trim().into();
        self.commit(document)
    }

    pub fn delete_page(&mut self, id: u32) -> Result<(), String> {
        if self.document.pages.len() == 1 {
            return Err("Keep at least one page in your document".into());
        }
        let mut document = self.document.clone();
        let index = document
            .pages
            .iter()
            .position(|p| p.id == id)
            .ok_or("Page not found")?;
        document.pages.remove(index);
        document.shapes.retain(|s| s.page_id != id);
        if document.active_page == id {
            document.active_page = document.pages[index.min(document.pages.len() - 1)].id;
        }
        self.commit(document)
    }

    pub fn undo(&mut self) {
        if let Some(document) = self.undo.pop() {
            self.redo.push(self.document.clone());
            self.document = document;
        }
    }
    pub fn redo(&mut self) {
        if let Some(document) = self.redo.pop() {
            self.undo.push(self.document.clone());
            self.document = document;
        }
    }
    pub fn can_undo(&self) -> bool {
        !self.undo.is_empty()
    }
    pub fn can_redo(&self) -> bool {
        !self.redo.is_empty()
    }
    pub fn clear_history(&mut self) {
        self.undo.clear();
        self.redo.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn history_restores_edits_and_invalidates_redo() {
        let mut editor = Editor::new();
        let id = editor.add("rectangle", 10.0, 20.0).unwrap();
        editor.remove(id).unwrap();
        editor.undo();
        assert_eq!(editor.hit_test(20.0, 30.0), id);
        editor.undo();
        editor.add("ellipse", 10.0, 20.0).unwrap();
        assert!(!editor.can_redo());
    }
    #[test]
    fn load_is_atomic_and_roundtrips() {
        let mut editor = Editor::new();
        editor.add("rectangle", 0.0, 0.0).unwrap();
        let original = editor.snapshot();
        assert!(editor
            .load(&original.replace("#a3e635", "invalid"))
            .is_err());
        assert_eq!(editor.snapshot(), original);
        let mut restored = Editor::new();
        restored.load(&original).unwrap();
        assert_eq!(restored.snapshot(), original);
        assert_eq!(restored.add("text", 0.0, 0.0).unwrap(), 2);
    }
    #[test]
    fn hit_testing_respects_ellipses_visibility_and_order() {
        let mut editor = Editor::new();
        let back = editor.add("rectangle", 0.0, 0.0).unwrap();
        let front = editor.add("ellipse", 0.0, 0.0).unwrap();
        assert_eq!(editor.hit_test(0.0, 0.0), back);
        assert_eq!(editor.hit_test(80.0, 60.0), front);
        editor.reorder(front, -1).unwrap();
        assert_eq!(editor.hit_test(80.0, 60.0), back);
        let mut shape = editor.document.shapes[1].clone();
        shape.hidden = true;
        editor
            .update(&serde_json::to_string(&shape).unwrap())
            .unwrap();
        assert_eq!(editor.hit_test(80.0, 60.0), front);
    }
}
