use super::*;
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PageBackground {
    pub color: String,
    pub opacity: f64,
    pub visible: bool,
}
pub fn validate(value: &PageBackground) -> Result<(), String> {
    if value.color.len() != 7
        || !value.color.starts_with('#')
        || !value.color[1..].bytes().all(|c| c.is_ascii_hexdigit())
        || !value.opacity.is_finite()
        || !(0.0..=1.0).contains(&value.opacity)
    {
        return Err("Invalid page background".into());
    }
    Ok(())
}
#[wasm_bindgen]
impl Editor {
    pub fn set_page_background(&mut self, id: u32, json: &str) -> Result<(), String> {
        let value: PageBackground = serde_json::from_str(json).map_err(|e| e.to_string())?;
        validate(&value)?;
        let mut document = self.document.clone();
        document
            .pages
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or("Page not found")?
            .background = Some(value);
        self.commit(document)
    }
}
