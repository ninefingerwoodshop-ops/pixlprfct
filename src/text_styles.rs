use super::*;
use std::collections::HashSet;

/// Shared type attributes. Alignment, wrapping and text-box sizing stay local.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TextStyle {
    pub id: u32,
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub typography: Typography,
}

pub fn style_values(style: Option<&Typography>) -> Option<Typography> {
    style.map(|t| Typography {
        align: "left".into(),
        vertical_align: "top".into(),
        sizing: "fixed".into(),
        wrap: true,
        ..t.clone()
    })
}
fn apply(shape: &mut Shape, style: &Typography) {
    let t = shape.typography.get_or_insert_with(Typography::default);
    t.font_family = style.font_family.clone();
    t.font_size = style.font_size;
    t.font_weight = style.font_weight;
    t.line_height = style.line_height;
    t.letter_spacing = style.letter_spacing;
    t.letter_spacing_unit = style.letter_spacing_unit.clone();
    t.text_case = style.text_case.clone();
    for field in ["font_family", "font_size", "font_weight", "line_height"] {
        shape
            .variable_bindings
            .remove(&format!("typography.{field}"));
    }
}
pub fn validate_typography(style: &Typography) -> Result<(), String> {
    if !style.letter_spacing.is_finite()
        || !(-1000.0..=1000.0).contains(&style.letter_spacing)
        || !["", "px", "%"].contains(&style.letter_spacing_unit.as_str())
        || !["", "original", "upper", "lower", "title"].contains(&style.text_case.as_str())
        || !style.font_size.is_finite()
        || !["fixed", "width", "height"].contains(&style.sizing.as_str())
        || !(1.0..=512.0).contains(&style.font_size)
        || !style.line_height.is_finite()
        || !(0.5..=4.0).contains(&style.line_height)
        || !(100..=900).contains(&style.font_weight)
        || style.font_family.is_empty()
        || style.font_family.len() > 100
        || !style
            .font_family
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == ' ' || c == '-')
        || !["left", "center", "right"].contains(&style.align.as_str())
        || !["top", "center", "bottom"].contains(&style.vertical_align.as_str())
    {
        return Err("Invalid typography settings".into());
    }
    Ok(())
}
pub fn validate_styles(doc: &Document) -> Result<(), String> {
    if doc.text_styles.len() > 1000 {
        return Err("Too many text styles".into());
    }
    let mut ids = HashSet::new();
    let mut names = HashSet::new();
    for style in &doc.text_styles {
        if style.id == 0
            || style.id == u32::MAX
            || !ids.insert(style.id)
            || style.name.trim().is_empty()
            || style.name.len() > 128
            || !names.insert(style.name.trim().to_lowercase())
            || style.description.len() > 2000
        {
            return Err("Text styles need unique IDs and names of at most 128 bytes, and descriptions of at most 2000 bytes".into());
        }
        validate_typography(&style.typography)?;
    }
    if doc
        .shapes
        .iter()
        .any(|s| s.text_style != 0 && (s.kind != "text" || !ids.contains(&s.text_style)))
    {
        return Err("Text style must reference a document style on a text layer".into());
    }
    Ok(())
}
pub fn resolve(doc: &mut Document) {
    for shape in &mut doc.shapes {
        if let Some(style) = doc.text_styles.iter().find(|s| s.id == shape.text_style) {
            apply(shape, &style.typography);
        }
    }
}
#[wasm_bindgen]
impl Editor {
    /// ID zero creates; layer_id zero saves without binding. Works across pages.
    pub fn save_text_style(&mut self, json: &str, layer_id: u32) -> Result<u32, String> {
        if json.len() > 20_000 {
            return Err("Text style is too large".into());
        }
        let mut style: TextStyle = serde_json::from_str(json).map_err(|e| e.to_string())?;
        style.name = style.name.trim().into();
        let mut doc = self.document.clone();
        if style.id == 0 {
            style.id = doc
                .text_styles
                .iter()
                .map(|s| s.id)
                .max()
                .unwrap_or(0)
                .checked_add(1)
                .ok_or("Text style ID limit reached")?;
            doc.text_styles.push(style.clone());
        } else {
            *doc.text_styles
                .iter_mut()
                .find(|s| s.id == style.id)
                .ok_or("Text style not found")? = style.clone();
        }
        if layer_id != 0 {
            let shape = doc
                .shapes
                .iter_mut()
                .find(|s| s.id == layer_id && s.kind == "text")
                .ok_or("Select a text layer")?;
            let old = shape.clone();
            shape.text_style = style.id;
            apply(shape, &style.typography);
            components::record_overrides(&old, shape)?;
            shape.text_style = style.id;
        }
        validate_styles(&doc)?;
        resolve(&mut doc);
        self.commit(doc)?;
        Ok(style.id)
    }
    /// Style zero detaches, retaining the current typography.
    pub fn apply_text_style(&mut self, selection: &str, style_id: u32) -> Result<(), String> {
        let ids: Vec<u32> = serde_json::from_str(selection).map_err(|e| e.to_string())?;
        if ids.is_empty()
            || ids.len() > 10_000
            || ids.iter().collect::<HashSet<_>>().len() != ids.len()
            || ids.iter().any(|id| {
                !self
                    .document
                    .shapes
                    .iter()
                    .any(|s| s.id == *id && s.kind == "text")
            })
        {
            return Err("Select valid text layers".into());
        }
        let style = if style_id == 0 {
            None
        } else {
            Some(
                self.document
                    .text_styles
                    .iter()
                    .find(|s| s.id == style_id)
                    .ok_or("Text style not found")?
                    .typography
                    .clone(),
            )
        };
        let mut doc = self.document.clone();
        for shape in doc.shapes.iter_mut().filter(|s| ids.contains(&s.id)) {
            let old = shape.clone();
            shape.text_style = style_id;
            if let Some(t) = &style {
                apply(shape, t);
            }
            components::record_overrides(&old, shape)?;
            shape.text_style = style_id;
        }
        self.commit(doc)
    }
    pub fn remove_text_style(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        if !doc.text_styles.iter().any(|s| s.id == id) {
            return Err("Text style not found".into());
        }
        doc.text_styles.retain(|s| s.id != id);
        for shape in &mut doc.shapes {
            if shape.text_style == id {
                shape.text_style = 0;
            }
        }
        self.commit(doc)
    }
}

pub fn zero(value: &f64) -> bool {
    *value == 0.0
}
