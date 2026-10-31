use super::*;
use std::collections::{BTreeMap, HashSet};

/// A color style shares an ordered paint stack. Stroke geometry remains local.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ColorStyle {
    pub id: u32,
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub paints: Vec<Paint>,
    #[serde(default)]
    pub color_variables: BTreeMap<u32, u32>,
}

fn channel(stroke: bool) -> &'static str {
    if stroke {
        "strokes"
    } else {
        "fills"
    }
}
pub fn values(shape: &Shape, stroke: bool) -> serde_json::Value {
    let a = shape.appearance.as_ref();
    // Compare both the stack and its legacy summary, so direct API edits detach too.
    if stroke {
        serde_json::json!([
            a.map(|a| &a.strokes),
            a.map(|a| &a.stroke_color),
            a.map(|a| a.stroke_opacity),
            a.map(|a| &a.stroke_gradient),
            a.map(|a| a.stroke_enabled),
            a.map(|a| a.stroke_hidden)
        ])
    } else {
        serde_json::json!([
            a.map(|a| &a.fills),
            shape.fill,
            a.map(|a| a.fill_opacity),
            a.map(|a| &a.gradient),
            a.map(|a| a.fill_enabled),
            a.map(|a| a.fill_hidden)
        ])
    }
}
fn apply(shape: &mut Shape, style: &ColorStyle, stroke: bool) {
    let prefix = format!("appearance.{}.", channel(stroke));
    shape.variable_bindings.retain(|path, _| {
        !path.starts_with(&prefix)
            && path
                != if stroke {
                    "appearance.stroke_color"
                } else {
                    "fill"
                }
    });
    let a = shape.appearance.get_or_insert_with(|| serde_json::from_value(serde_json::json!({"opacity":1,"corner_radius":0,"fill_enabled":shape.points.is_empty()||shape.closed,"stroke_enabled":!shape.points.is_empty(),"stroke_color":if shape.points.is_empty(){"#000000"}else{&shape.fill}})).expect("valid appearance"));
    if stroke {
        a.strokes = Some(style.paints.clone());
    } else {
        a.fills = Some(style.paints.clone());
    }
    for (paint, variable) in &style.color_variables {
        shape
            .variable_bindings
            .insert(format!("{prefix}{paint}.color"), *variable);
    }
}
pub fn validate_styles(doc: &Document) -> Result<(), String> {
    if doc.color_styles.len() > 1000 {
        return Err("Too many color styles".into());
    }
    let mut ids = HashSet::new();
    let mut names = HashSet::new();
    for style in &doc.color_styles {
        if style.id == 0
            || style.id == u32::MAX
            || !ids.insert(style.id)
            || style.name.trim().is_empty()
            || style.name.len() > 128
            || !names.insert(style.name.trim().to_lowercase())
            || style.description.len() > 2000
        {
            return Err("Color styles need unique IDs and names of at most 128 bytes, and descriptions of at most 2000 bytes".into());
        }
        paint::validate_stack(&style.paints)?;
        for p in &style.paints {
            if let Some(g) = &p.gradient {
                paint::validate_gradient(g)?;
            }
        }
        for (paint, variable) in &style.color_variables {
            if !style.paints.iter().any(|p| p.id == *paint)
                || !doc
                    .variables
                    .values
                    .iter()
                    .any(|v| v.id == *variable && v.kind == "color")
            {
                return Err(
                    "Color style binding must reference a paint and a color variable".into(),
                );
            }
        }
    }
    if doc.shapes.iter().any(|s| {
        [s.fill_style, s.stroke_style]
            .iter()
            .any(|id| *id != 0 && !ids.contains(id))
    }) {
        return Err("Color style must reference a document style".into());
    }
    Ok(())
}
pub fn resolve(doc: &mut Document) {
    for shape in &mut doc.shapes {
        for stroke in [false, true] {
            let id = if stroke {
                shape.stroke_style
            } else {
                shape.fill_style
            };
            if let Some(style) = doc.color_styles.iter().find(|s| s.id == id) {
                apply(shape, style, stroke);
            }
        }
    }
}
#[wasm_bindgen]
impl Editor {
    /// ID zero creates a style. Layer zero saves without applying it.
    pub fn save_color_style(
        &mut self,
        json: &str,
        layer_id: u32,
        stroke: bool,
    ) -> Result<u32, String> {
        if json.len() > 4_000_000 {
            return Err("Color style is too large".into());
        }
        let mut style: ColorStyle = serde_json::from_str(json).map_err(|e| e.to_string())?;
        style.name = style.name.trim().into();
        let mut doc = self.document.clone();
        if style.id == 0 {
            style.id = doc
                .color_styles
                .iter()
                .map(|s| s.id)
                .max()
                .unwrap_or(0)
                .checked_add(1)
                .ok_or("Color style ID limit reached")?;
            doc.color_styles.push(style.clone());
        } else {
            *doc.color_styles
                .iter_mut()
                .find(|s| s.id == style.id)
                .ok_or("Color style not found")? = style.clone();
        }
        if layer_id != 0 {
            let shape = doc
                .shapes
                .iter_mut()
                .find(|s| s.id == layer_id)
                .ok_or("Layer not found")?;
            let old = shape.clone();
            if stroke {
                shape.stroke_style = style.id;
            } else {
                shape.fill_style = style.id;
            }
            apply(shape, &style, stroke);
            components::record_overrides(&old, shape)?;
            if stroke {
                shape.stroke_style = style.id;
            } else {
                shape.fill_style = style.id;
            }
        }
        validate_styles(&doc)?;
        resolve(&mut doc);
        sync_paint_stacks(&mut doc);
        self.commit(doc)?;
        Ok(style.id)
    }
    /// Style zero detaches, retaining the resolved paint stack.
    pub fn apply_color_style(
        &mut self,
        selection: &str,
        style_id: u32,
        stroke: bool,
    ) -> Result<(), String> {
        let ids: Vec<u32> = serde_json::from_str(selection).map_err(|e| e.to_string())?;
        if ids.is_empty()
            || ids.len() > 10000
            || ids.iter().collect::<HashSet<_>>().len() != ids.len()
            || ids
                .iter()
                .any(|id| !self.document.shapes.iter().any(|s| s.id == *id))
        {
            return Err("Select valid layers".into());
        }
        let style = if style_id == 0 {
            None
        } else {
            Some(
                self.document
                    .color_styles
                    .iter()
                    .find(|s| s.id == style_id)
                    .ok_or("Color style not found")?
                    .clone(),
            )
        };
        let mut doc = self.document.clone();
        for shape in doc.shapes.iter_mut().filter(|s| ids.contains(&s.id)) {
            let old = shape.clone();
            if stroke {
                shape.stroke_style = style_id;
            } else {
                shape.fill_style = style_id;
            }
            if let Some(style) = &style {
                apply(shape, style, stroke);
            }
            components::record_overrides(&old, shape)?;
            if stroke {
                shape.stroke_style = style_id;
            } else {
                shape.fill_style = style_id;
            }
        }
        sync_paint_stacks(&mut doc);
        self.commit(doc)
    }
    pub fn remove_color_style(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        if !doc.color_styles.iter().any(|s| s.id == id) {
            return Err("Color style not found".into());
        }
        doc.color_styles.retain(|s| s.id != id);
        for shape in &mut doc.shapes {
            if shape.fill_style == id {
                shape.fill_style = 0;
            }
            if shape.stroke_style == id {
                shape.stroke_style = 0;
            }
        }
        self.commit(doc)
    }
}
