use super::*;
use std::collections::HashSet;

/// Only effects are shared: paints, opacity and geometry remain layer properties.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Effects {
    #[serde(default)]
    pub shadows: Vec<DropShadow>,
    #[serde(default)]
    pub layer_blur: f64,
    #[serde(default = "effect_enabled")]
    pub layer_blur_enabled: bool,
    #[serde(default)]
    pub layer_blur_present: bool,
    #[serde(default)]
    pub backdrop_blur: f64,
    #[serde(default = "effect_enabled")]
    pub backdrop_blur_enabled: bool,
    #[serde(default)]
    pub backdrop_blur_present: bool,
}

impl Effects {
    pub fn from_appearance(a: Option<&Appearance>) -> Self {
        Self {
            shadows: a.map(|a| a.shadows.clone()).unwrap_or_default(),
            layer_blur: a.map_or(0.0, |a| a.layer_blur),
            layer_blur_enabled: a.is_none_or(|a| a.layer_blur_enabled),
            layer_blur_present: a.is_some_and(|a| a.layer_blur_present),
            backdrop_blur: a.map_or(0.0, |a| a.backdrop_blur),
            backdrop_blur_enabled: a.is_none_or(|a| a.backdrop_blur_enabled),
            backdrop_blur_present: a.is_some_and(|a| a.backdrop_blur_present),
        }
    }
    pub fn apply(&self, s: &mut Shape) {
        s.variable_bindings.remove("appearance.layer_blur");
        s.variable_bindings.remove("appearance.backdrop_blur");
        let a = s.appearance.get_or_insert_with(|| serde_json::from_value(serde_json::json!({
            "opacity":1, "corner_radius":0, "fill_enabled":s.points.is_empty() || s.closed,
            "stroke_enabled":!s.points.is_empty(), "stroke_color":if s.points.is_empty(){"#000000"}else{&s.fill}
        })).expect("valid legacy appearance defaults"));
        a.shadows = self.shadows.clone();
        a.layer_blur = self.layer_blur;
        a.layer_blur_enabled = self.layer_blur_enabled;
        a.layer_blur_present = self.layer_blur_present;
        a.backdrop_blur = self.backdrop_blur;
        a.backdrop_blur_enabled = self.backdrop_blur_enabled;
        a.backdrop_blur_present = self.backdrop_blur_present;
    }
    pub fn validate(&self) -> Result<(), String> {
        if !self.layer_blur.is_finite() || !(0.0..=100_000.0).contains(&self.layer_blur) {
            return Err("Layer blur must be between 0 and 100000".into());
        }
        if !self.backdrop_blur.is_finite() || !(0.0..=200.0).contains(&self.backdrop_blur) {
            return Err("Background blur must be between 0 and 200".into());
        }
        if self.shadows.len() > 8
            || self.shadows.iter().any(|s| {
                !["drop", "inner"].contains(&s.kind.as_str())
                    || [s.x, s.y, s.spread]
                        .iter()
                        .any(|v| !v.is_finite() || v.abs() > 100_000.0)
                    || !s.blur.is_finite()
                    || !(0.0..=100_000.0).contains(&s.blur)
                    || !s.opacity.is_finite()
                    || !(0.0..=1.0).contains(&s.opacity)
                    || s.color.len() != 7
                    || !s.color.starts_with('#')
                    || !s.color[1..].bytes().all(|c| c.is_ascii_hexdigit())
            })
        {
            return Err("Invalid drop shadows: use at most eight with bounded geometry, hex colors and 0–1 opacity".into());
        }
        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct EffectStyle {
    pub id: u32,
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub effects: Effects,
}

pub fn validate_styles(doc: &Document) -> Result<(), String> {
    if doc.effect_styles.len() > 1000 {
        return Err("Too many effect styles".into());
    }
    let mut ids = HashSet::new();
    let mut names = HashSet::new();
    for style in &doc.effect_styles {
        if style.id == 0
            || style.id == u32::MAX
            || !ids.insert(style.id)
            || style.name.trim().is_empty()
            || style.name.len() > 128
            || !names.insert(style.name.trim().to_lowercase())
            || style.description.len() > 2000
        {
            return Err("Effect styles need unique IDs and names of at most 128 bytes, and descriptions of at most 2000 bytes".into());
        }
        style.effects.validate()?;
    }
    if doc
        .shapes
        .iter()
        .any(|s| s.effect_style != 0 && !ids.contains(&s.effect_style))
    {
        return Err("Effect style must reference a document style".into());
    }
    Ok(())
}
pub fn resolve(doc: &mut Document) {
    for s in &mut doc.shapes {
        if let Some(style) = doc
            .effect_styles
            .iter()
            .find(|style| style.id == s.effect_style)
        {
            style.effects.apply(s);
        }
    }
}

#[wasm_bindgen]
impl Editor {
    /// ID zero creates a style. layer_id zero saves without applying to a layer.
    pub fn save_effect_style(&mut self, json: &str, layer_id: u32) -> Result<u32, String> {
        if json.len() > 20_000 {
            return Err("Effect style is too large".into());
        }
        let mut style: EffectStyle = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let mut doc = self.document.clone();
        style.name = style.name.trim().into();
        if style.id == 0 {
            style.id = doc
                .effect_styles
                .iter()
                .map(|s| s.id)
                .max()
                .unwrap_or(0)
                .checked_add(1)
                .ok_or("Effect style ID limit reached")?;
            doc.effect_styles.push(style.clone());
        } else {
            *doc.effect_styles
                .iter_mut()
                .find(|s| s.id == style.id)
                .ok_or("Effect style not found")? = style.clone();
        }
        if layer_id != 0 {
            let s = doc
                .shapes
                .iter_mut()
                .find(|s| s.id == layer_id && s.page_id == doc.active_page)
                .ok_or("Select a layer on this page")?;
            let old = s.clone();
            s.effect_style = style.id;
            style.effects.apply(s);
            components::record_overrides(&old, s)?;
            s.effect_style = style.id;
        }
        validate_styles(&doc)?;
        resolve(&mut doc);
        self.commit(doc)?;
        Ok(style.id)
    }
    /// Style zero detaches while preserving the current effects.
    pub fn apply_effect_style(&mut self, selection: &str, style_id: u32) -> Result<(), String> {
        let ids = self.selection_ids(selection)?;
        let effects = if style_id == 0 {
            None
        } else {
            Some(
                self.document
                    .effect_styles
                    .iter()
                    .find(|s| s.id == style_id)
                    .ok_or("Effect style not found")?
                    .effects
                    .clone(),
            )
        };
        let mut doc = self.document.clone();
        for s in doc.shapes.iter_mut().filter(|s| ids.contains(&s.id)) {
            let old = s.clone();
            s.effect_style = style_id;
            if let Some(e) = &effects {
                e.apply(s);
            }
            components::record_overrides(&old, s)?;
            s.effect_style = style_id;
        }
        self.commit(doc)
    }
    pub fn remove_effect_style(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        if !doc.effect_styles.iter().any(|s| s.id == id) {
            return Err("Effect style not found".into());
        }
        doc.effect_styles.retain(|s| s.id != id);
        for s in &mut doc.shapes {
            if s.effect_style == id {
                s.effect_style = 0;
            }
        }
        self.commit(doc)
    }
}
