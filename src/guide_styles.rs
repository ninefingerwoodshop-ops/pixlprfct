use super::*;
use std::collections::HashSet;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GuideStyle {
    pub id: u32,
    pub name: String,
    pub grids: Vec<LayoutGrid>,
}

pub fn validate_grids(grids: &[LayoutGrid]) -> Result<(), String> {
    if grids.len() > 8 {
        return Err("At most eight layout guides are allowed".into());
    }
    for grid in grids {
        if !["grid", "columns", "rows"].contains(&grid.kind.as_str())
            || !["stretch", "start", "center", "end"].contains(&grid.alignment.as_str())
            || !grid.size.is_finite()
            || !(1.0..=1_000_000.0).contains(&grid.size)
            || !(1..=256).contains(&grid.count)
            || [grid.gutter, grid.margin]
                .iter()
                .any(|v| !v.is_finite() || !(0.0..=1_000_000.0).contains(v))
            || !grid.opacity.is_finite()
            || !(0.0..=1.0).contains(&grid.opacity)
            || grid.color.len() != 7
            || !grid.color.starts_with('#')
            || !grid.color[1..].bytes().all(|c| c.is_ascii_hexdigit())
        {
            return Err("Invalid layout guide settings".into());
        }
    }
    Ok(())
}
pub fn validate_styles(doc: &Document) -> Result<(), String> {
    if doc.guide_styles.len() > 1000 {
        return Err("Too many guide styles".into());
    }
    let mut ids = HashSet::new();
    let mut names = HashSet::new();
    for style in &doc.guide_styles {
        if style.id == 0
            || style.id == u32::MAX
            || !ids.insert(style.id)
            || style.name.trim().is_empty()
            || style.name.len() > 128
            || !names.insert(style.name.trim().to_lowercase())
        {
            return Err("Guide styles need unique IDs and names of at most 128 bytes".into());
        }
        validate_grids(&style.grids)?;
    }
    for s in &doc.shapes {
        if s.guide_style != 0 && (s.kind != "frame" || !ids.contains(&s.guide_style)) {
            return Err("Guide style must reference a document style on a frame".into());
        }
    }
    Ok(())
}
pub fn resolve(doc: &mut Document) {
    for s in &mut doc.shapes {
        if let Some(style) = doc
            .guide_styles
            .iter()
            .find(|style| style.id == s.guide_style)
        {
            s.layout_grids = style.grids.clone();
        }
    }
}

#[wasm_bindgen]
impl Editor {
    // Optional frame binding makes creating-and-applying a style one undo step.
    pub fn save_guide_style(&mut self, json: &str, frame_id: u32) -> Result<u32, String> {
        if json.len() > 20_000 {
            return Err("Guide style is too large".into());
        }
        let mut style: GuideStyle = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut doc = self.document.clone();
        style.name = style.name.trim().into();
        if style.id == 0 {
            style.id = doc
                .guide_styles
                .iter()
                .map(|s| s.id)
                .max()
                .unwrap_or(0)
                .checked_add(1)
                .ok_or("Guide style ID limit reached")?;
            doc.guide_styles.push(style.clone());
        } else {
            *doc.guide_styles
                .iter_mut()
                .find(|s| s.id == style.id)
                .ok_or("Guide style not found")? = style.clone();
        }
        if frame_id != 0 {
            let s = doc
                .shapes
                .iter_mut()
                .find(|s| s.id == frame_id && s.page_id == doc.active_page && s.kind == "frame")
                .ok_or("Select a frame on this page")?;
            let old = s.clone();
            s.guide_style = style.id;
            s.layout_grids = style.grids.clone();
            components::record_overrides(&old, s)?;
            s.guide_style = style.id;
        }
        validate_styles(&doc)?;
        resolve(&mut doc);
        self.commit(doc)?;
        Ok(style.id)
    }
    pub fn apply_guide_style(&mut self, selection: &str, style_id: u32) -> Result<(), String> {
        let ids = self.selection_ids(selection)?;
        let grids = if style_id == 0 {
            None
        } else {
            Some(
                self.document
                    .guide_styles
                    .iter()
                    .find(|s| s.id == style_id)
                    .ok_or("Guide style not found")?
                    .grids
                    .clone(),
            )
        };
        let mut doc = self.document.clone();
        for s in doc.shapes.iter_mut().filter(|s| ids.contains(&s.id)) {
            if s.kind != "frame" {
                return Err("Guide styles require frames".into());
            }
            let old = s.clone();
            s.guide_style = style_id;
            if let Some(g) = &grids {
                s.layout_grids = g.clone();
            }
            components::record_overrides(&old, s)?;
        }
        self.commit(doc)
    }
    pub fn remove_guide_style(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        if !doc.guide_styles.iter().any(|s| s.id == id) {
            return Err("Guide style not found".into());
        }
        doc.guide_styles.retain(|s| s.id != id);
        for s in &mut doc.shapes {
            if s.guide_style == id {
                s.guide_style = 0;
            }
        }
        self.commit(doc)
    }
}
